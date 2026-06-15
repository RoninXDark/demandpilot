import math

import numpy as np
import pandas as pd

from app.schemas import (
    DashboardMetric,
    DashboardSummary,
    InventoryProduct,
    ProductRevenue,
    ScenarioRequest,
    ScenarioResponse,
)
from app.services.forecasting import forecast_product


def _period_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def dashboard_summary(frame: pd.DataFrame) -> DashboardSummary:
    as_of = frame["date"].max()
    current_start = as_of - pd.Timedelta(days=29)
    previous_start = current_start - pd.Timedelta(days=30)
    current = frame.loc[frame["date"].between(current_start, as_of)]
    previous = frame.loc[
        frame["date"].between(previous_start, current_start - pd.Timedelta(days=1))
    ]

    current_revenue = float(current["revenue"].sum())
    previous_revenue = float(previous["revenue"].sum())
    current_units = int(current["units_sold"].sum())
    previous_units = int(previous["units_sold"].sum())

    inventory = inventory_status(frame)
    at_risk = sum(item.risk == "Stockout risk" for item in inventory)

    forecast_units = 0.0
    wapes: list[float] = []
    for product_id in frame["product_id"].unique():
        result = forecast_product(frame, str(product_id), 30)
        forecast_units += sum(point.forecast for point in result.forecast)
        wapes.append(result.validation_wape)

    product_revenue = (
        current.groupby(["product_id", "product_name"], as_index=False)
        .agg(revenue=("revenue", "sum"), units=("units_sold", "sum"))
        .sort_values("revenue", ascending=False)
    )

    return DashboardSummary(
        as_of=as_of.date(),
        metrics=[
            DashboardMetric(
                label="Revenue (30d)",
                value=round(current_revenue, 2),
                change_pct=_period_change(current_revenue, previous_revenue),
                format="currency",
            ),
            DashboardMetric(
                label="Units sold (30d)",
                value=current_units,
                change_pct=_period_change(current_units, previous_units),
            ),
            DashboardMetric(
                label="Forecast units (30d)",
                value=round(forecast_units),
                format="number",
            ),
            DashboardMetric(
                label="Products at risk",
                value=at_risk,
                format="risk",
            ),
            DashboardMetric(
                label="Forecast accuracy",
                value=round(max(0.0, 1 - float(np.mean(wapes))) * 100, 1),
                format="percent",
            ),
        ],
        revenue_by_product=[
            ProductRevenue(
                product_id=str(row.product_id),
                product_name=str(row.product_name),
                revenue=round(float(row.revenue), 2),
                units=int(row.units),
            )
            for row in product_revenue.itertuples()
        ],
    )


def inventory_status(frame: pd.DataFrame) -> list[InventoryProduct]:
    results: list[InventoryProduct] = []
    recent_start = frame["date"].max() - pd.Timedelta(days=27)

    for product_id, product in frame.groupby("product_id"):
        latest_date = product["date"].max()
        latest = product.loc[product["date"] == latest_date]
        recent = product.loc[product["date"] >= recent_start]
        daily = recent.groupby("date")["units_sold"].sum()

        current_stock = int(
            latest.groupby("store_id")["stock_on_hand"].max().sum()
        )
        avg_daily = float(daily.mean()) if not daily.empty else 0.0
        demand_std = float(daily.std(ddof=0)) if len(daily) > 1 else 0.0
        lead_time = int(round(float(latest["lead_time_days"].median())))
        safety_stock = 1.65 * demand_std * math.sqrt(lead_time)
        reorder_point = int(math.ceil(avg_daily * lead_time + safety_stock))
        target_stock = int(math.ceil(avg_daily * (lead_time + 21) + safety_stock))
        recommended_order = max(0, target_stock - current_stock)
        days_of_cover = current_stock / avg_daily if avg_daily else 999.0

        if days_of_cover < lead_time:
            risk = "Stockout risk"
        elif days_of_cover > lead_time + 42:
            risk = "Overstock"
        else:
            risk = "Healthy"

        first = product.iloc[0]
        results.append(
            InventoryProduct(
                product_id=str(product_id),
                product_name=str(first["product_name"]),
                category=str(first["category"]),
                current_stock=current_stock,
                avg_daily_demand=round(avg_daily, 1),
                days_of_cover=round(days_of_cover, 1),
                reorder_point=reorder_point,
                recommended_order=recommended_order,
                risk=risk,
            )
        )

    risk_order = {"Stockout risk": 0, "Overstock": 1, "Healthy": 2}
    return sorted(results, key=lambda item: (risk_order[item.risk], item.days_of_cover))


def simulate_scenario(frame: pd.DataFrame, request: ScenarioRequest) -> ScenarioResponse:
    forecast = forecast_product(frame, request.product_id, request.horizon_days)
    baseline_units = sum(point.forecast for point in forecast.forecast)
    price_multiplier = 1 + request.price_change_pct / 100
    demand_price_effect = max(0.25, 1 - 1.2 * request.price_change_pct / 100)
    promotion_effect = 1 + request.promotion_lift_pct / 100
    scenario_units = baseline_units * demand_price_effect * promotion_effect

    product = frame.loc[frame["product_id"] == request.product_id]
    if product.empty:
        raise KeyError(request.product_id)
    base_price = float(product["unit_price"].median())
    latest = product.loc[product["date"] == product["date"].max()]
    current_stock = int(
        latest.groupby("store_id")["stock_on_hand"].max().sum()
    )
    avg_daily = scenario_units / request.horizon_days
    reorder_point = math.ceil(avg_daily * request.lead_time_days * 1.2)
    target_stock = math.ceil(avg_daily * (request.lead_time_days + 21) * 1.2)
    recommended_order = max(0, target_stock - current_stock)
    risk = "Stockout risk" if current_stock < reorder_point else "Healthy"

    return ScenarioResponse(
        product_id=request.product_id,
        baseline_units=round(baseline_units, 1),
        scenario_units=round(scenario_units, 1),
        projected_revenue=round(scenario_units * base_price * price_multiplier, 2),
        demand_change_pct=round(
            ((scenario_units / baseline_units) - 1) * 100 if baseline_units else 0,
            1,
        ),
        recommended_order=recommended_order,
        risk=risk,
    )
