from pathlib import Path

from fastapi.testclient import TestClient

import app.main as main_module
from app.services.dataset_registry import DatasetRegistry
from app.services.demo_data import generate_demo_dataset


app = main_module.app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_dashboard_contract():
    with TestClient(app) as client:
        response = client.get("/api/v1/dashboard/summary")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["metrics"]) == 5
    assert payload["revenue_by_product"]


def test_action_queue_and_draft_contract():
    with TestClient(app) as client:
        response = client.get("/api/v1/actions")
        actions = response.json()
        reorder = next(item for item in actions if item["action_type"] == "reorder")
        draft_response = client.post(
            f"/api/v1/actions/{reorder['action_id']}/draft"
        )

    assert response.status_code == 200
    assert draft_response.status_code == 200
    assert draft_response.json()["status"] == "Draft"
    assert draft_response.json()["quantity"] == reorder["recommended_quantity"]


def test_dataset_import_endpoint(tmp_path: Path, monkeypatch):
    demo_path = generate_demo_dataset(tmp_path / "demo.csv", days=120)
    test_registry = DatasetRegistry(demo_path, tmp_path / "uploads")
    monkeypatch.setattr(main_module, "dataset_registry", test_registry)
    dates = "\n".join(
        f"2026-01-{day:02d},sku-1,{day},10"
        for day in range(1, 21)
    )
    content = f"date,product_id,units_sold,unit_price\n{dates}\n"

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/datasets/import",
            files={"file": ("sales.csv", content, "text/csv")},
        )

    assert response.status_code == 200
    assert response.json()["quality"]["accepted_rows"] == 20
