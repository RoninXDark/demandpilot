from pathlib import Path

import pandas as pd

from app.services.analytics import inventory_status, simulate_scenario
from app.services.data_service import SalesDataService
from app.services.demo_data import generate_demo_dataset
from app.services.forecasting import forecast_product
from app.schemas import ScenarioRequest


def build_frame(tmp_path: Path):
    path = generate_demo_dataset(tmp_path / "sales.csv", days=120)
    return SalesDataService(path).load()


def test_forecast_returns_requested_horizon(tmp_path):
    frame = build_frame(tmp_path)

    result = forecast_product(frame, "laptop", 30)

    assert result.product_id == "laptop"
    assert len(result.forecast) == 30
    assert result.validation_mae >= 0
    assert all(point.lower >= 0 for point in result.forecast)


def test_inventory_produces_replenishment_metrics(tmp_path):
    frame = build_frame(tmp_path)

    products = inventory_status(frame)

    assert len(products) == 6
    assert all(product.reorder_point >= 0 for product in products)
    assert all(product.recommended_order >= 0 for product in products)
    assert {product.risk for product in products} <= {
        "Healthy",
        "Stockout risk",
        "Overstock",
    }


def test_inventory_does_not_double_count_repeated_store_snapshot(tmp_path):
    frame = build_frame(tmp_path)
    baseline = next(
        product for product in inventory_status(frame) if product.product_id == "laptop"
    )
    latest_laptop = frame.loc[
        (frame["product_id"] == "laptop")
        & (frame["date"] == frame["date"].max())
    ].iloc[[0]]
    repeated = pd.concat([frame, latest_laptop], ignore_index=True)

    result = next(
        product for product in inventory_status(repeated) if product.product_id == "laptop"
    )

    assert result.current_stock == baseline.current_stock


def test_scenario_changes_demand(tmp_path):
    frame = build_frame(tmp_path)
    request = ScenarioRequest(
        product_id="monitor",
        price_change_pct=-10,
        promotion_lift_pct=20,
        lead_time_days=14,
    )

    result = simulate_scenario(frame, request)

    assert result.scenario_units > result.baseline_units
    assert result.projected_revenue > 0
