from io import BytesIO
import json
from pathlib import Path

import pandas as pd
import pytest

from app.services.dataset_registry import DatasetRegistry, DatasetValidationError
from app.services.demo_data import generate_demo_dataset


def registry(tmp_path: Path) -> DatasetRegistry:
    demo_path = generate_demo_dataset(tmp_path / "sample_sales.csv", days=120)
    return DatasetRegistry(demo_path, tmp_path / "uploads")


def test_import_normalizes_aliases_and_activates_dataset(tmp_path):
    service = registry(tmp_path)
    dates = pd.date_range("2026-01-01", periods=30, freq="D")
    frame = pd.DataFrame(
        {
            "Order Date": dates,
            "SKU": ["sku-1"] * 30,
            "Product": ["Example Item"] * 30,
            "Store": ["online"] * 30,
            "Quantity": range(1, 31),
            "Price": [25.0] * 30,
            "Inventory": [100] * 30,
        }
    )

    info = service.import_file("sales export.csv", frame.to_csv(index=False).encode())

    assert info.source == "upload"
    assert info.quality.accepted_rows == 30
    assert info.quality.unique_products == 1
    assert service.active_path().exists()
    assert service.active_info().dataset_id == info.dataset_id


def test_import_supports_xlsx(tmp_path):
    service = registry(tmp_path)
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    frame = pd.DataFrame(
        {
            "date": dates,
            "product_id": ["sku-2"] * 20,
            "units_sold": [5] * 20,
            "unit_price": [12.5] * 20,
        }
    )
    buffer = BytesIO()
    frame.to_excel(buffer, index=False)

    info = service.import_file("sales.xlsx", buffer.getvalue())

    assert info.quality.accepted_rows == 20
    assert any("stock_on_hand" in warning for warning in info.quality.warnings)


def test_import_rejects_missing_core_columns(tmp_path):
    service = registry(tmp_path)
    content = b"date,product_id\n2026-01-01,sku-1\n"

    with pytest.raises(DatasetValidationError, match="Missing required columns"):
        service.import_file("broken.csv", content)


def test_reset_returns_to_demo_dataset(tmp_path):
    service = registry(tmp_path)
    dates = pd.date_range("2026-01-01", periods=14, freq="D")
    frame = pd.DataFrame(
        {
            "date": dates,
            "product_id": ["sku-1"] * 14,
            "units_sold": [1] * 14,
            "unit_price": [5] * 14,
        }
    )
    service.import_file("sales.csv", frame.to_csv(index=False).encode())

    info = service.reset()

    assert info.source == "demo"
    assert service.active_path() == service.demo_path


def test_active_info_recovers_old_upload_metadata(tmp_path):
    service = registry(tmp_path)
    dates = pd.date_range("2026-01-01", periods=20, freq="D")
    frame = pd.DataFrame(
        {
            "date": dates,
            "product_id": ["sku-old"] * 20,
            "units_sold": [3] * 20,
            "unit_price": [11] * 20,
        }
    )
    info = service.import_file("legacy.csv", frame.to_csv(index=False).encode())
    metadata = json.loads(service.metadata_path.read_text(encoding="utf-8"))
    metadata["dataset"]["quality"].pop("quality_score")
    metadata["dataset"]["quality"].pop("acceptance_rate")
    metadata["dataset"]["quality"].pop("history_days")
    metadata["dataset"]["quality"].pop("readiness")
    service.metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

    recovered = service.active_info()

    assert recovered.dataset_id == info.dataset_id
    assert recovered.quality.quality_score > 0
    assert recovered.quality.readiness
