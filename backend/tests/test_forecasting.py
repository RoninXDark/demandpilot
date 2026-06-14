from pathlib import Path

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
