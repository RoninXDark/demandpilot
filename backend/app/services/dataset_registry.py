from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import json
from pathlib import Path
import re
from uuid import uuid4

import pandas as pd
from pydantic import ValidationError

from app.schemas import DataQualityReport, DatasetInfo, DatasetPreview


CORE_COLUMNS = {"date", "product_id", "units_sold", "unit_price"}
STANDARD_COLUMNS = [
    "date",
    "store_id",
    "product_id",
    "product_name",
    "category",
    "units_sold",
    "unit_price",
    "stock_on_hand",
    "lead_time_days",
]
COLUMN_ALIASES = {
    "sales_date": "date",
    "order_date": "date",
    "timestamp": "date",
    "sku": "product_id",
    "item_id": "product_id",
    "product": "product_name",
    "item_name": "product_name",
    "location": "store_id",
    "store": "store_id",
    "warehouse": "store_id",
    "quantity": "units_sold",
    "qty": "units_sold",
    "sales_units": "units_sold",
    "price": "unit_price",
    "sales_price": "unit_price",
    "inventory": "stock_on_hand",
    "stock": "stock_on_hand",
    "on_hand": "stock_on_hand",
    "lead_time": "lead_time_days",
}


class DatasetValidationError(ValueError):
    """Raised when an uploaded dataset cannot support DemandPilot analytics."""


def _column_name(value: object) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")
    return COLUMN_ALIASES.get(normalized, normalized)


def _safe_stem(filename: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(filename).stem).strip("-")
    return stem[:60] or "dataset"


class DatasetRegistry:
    def __init__(self, demo_path: Path, uploads_path: Path):
        self.demo_path = demo_path
        self.uploads_path = uploads_path
        self.metadata_path = uploads_path / "active-dataset.json"

    def active_path(self) -> Path:
        metadata = self._read_metadata()
        if metadata:
            candidate = Path(metadata["file_path"])
            if candidate.exists() and candidate.resolve().parent == self.uploads_path.resolve():
                return candidate
        return self.demo_path

    def active_info(self) -> DatasetInfo:
        metadata = self._read_metadata()
        if metadata and self.active_path() != self.demo_path:
            try:
                return DatasetInfo.model_validate(metadata["dataset"])
            except (KeyError, TypeError, ValidationError):
                frame = pd.read_csv(self.active_path())
                _, quality = self._normalize(frame)
                dataset = metadata.get("dataset", {})
                if not isinstance(dataset, dict):
                    dataset = {}
                return DatasetInfo(
                    dataset_id=str(dataset.get("dataset_id", "uploaded")),
                    name=str(dataset.get("name", "Uploaded dataset")),
                    filename=str(dataset.get("filename", self.active_path().name)),
                    source="upload",
                    activated_at=datetime.now(timezone.utc),
                    quality=quality,
                )

        frame = pd.read_csv(self.demo_path)
        _, quality = self._normalize(frame)
        activated_at = datetime.fromtimestamp(
            self.demo_path.stat().st_mtime,
            tz=timezone.utc,
        )
        return DatasetInfo(
            dataset_id="demo-retail",
            name="Demo Retail Operations",
            filename=self.demo_path.name,
            source="demo",
            activated_at=activated_at,
            quality=quality,
        )

    def active_preview(self, limit: int = 8) -> DatasetPreview:
        frame = pd.read_csv(self.active_path())
        visible = [column for column in STANDARD_COLUMNS if column in frame.columns]
        preview = frame.loc[:, visible].head(limit)
        preview = preview.where(pd.notna(preview), None)
        return DatasetPreview(
            columns=visible,
            rows=preview.to_dict(orient="records"),
        )

    def import_file(self, filename: str, content: bytes) -> DatasetInfo:
        suffix = Path(filename).suffix.lower()
        if suffix not in {".csv", ".xlsx"}:
            raise DatasetValidationError("Only CSV and XLSX files are supported.")
        if not content:
            raise DatasetValidationError("The uploaded file is empty.")

        try:
            if suffix == ".csv":
                frame = pd.read_csv(BytesIO(content))
            else:
                frame = pd.read_excel(BytesIO(content), engine="openpyxl")
        except Exception as exc:
            raise DatasetValidationError(
                "The file could not be parsed. Check its format and encoding."
            ) from exc

        normalized, quality = self._normalize(frame)
        dataset_id = uuid4().hex[:12]
        safe_name = _safe_stem(filename)
        stored_path = self.uploads_path / f"{dataset_id}-{safe_name}.csv"
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        normalized.to_csv(stored_path, index=False)

        info = DatasetInfo(
            dataset_id=dataset_id,
            name=Path(filename).stem,
            filename=filename,
            source="upload",
            activated_at=datetime.now(timezone.utc),
            quality=quality,
        )
        metadata = {
            "file_path": str(stored_path.resolve()),
            "dataset": info.model_dump(mode="json"),
        }
        self.metadata_path.write_text(
            json.dumps(metadata, indent=2),
            encoding="utf-8",
        )
        return info

    def reset(self) -> DatasetInfo:
        if self.metadata_path.exists():
            self.metadata_path.unlink()
        return self.active_info()

    def _read_metadata(self) -> dict[str, object] | None:
        if not self.metadata_path.exists():
            return None
        try:
            return json.loads(self.metadata_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError, KeyError):
            return None

    def _normalize(
        self,
        source: pd.DataFrame,
    ) -> tuple[pd.DataFrame, DataQualityReport]:
        if source.empty:
            raise DatasetValidationError("The dataset does not contain any rows.")

        frame = source.copy()
        frame.columns = [_column_name(column) for column in frame.columns]
        if frame.columns.duplicated().any():
            duplicates = frame.columns[frame.columns.duplicated()].tolist()
            raise DatasetValidationError(
                f"Multiple columns map to the same field: {sorted(set(duplicates))}"
            )

        missing_core = CORE_COLUMNS - set(frame.columns)
        if missing_core:
            raise DatasetValidationError(
                "Missing required columns: " + ", ".join(sorted(missing_core))
            )

        warnings: list[str] = []
        missing_values = int(frame.isna().sum().sum())
        duplicate_rows = int(frame.duplicated().sum())
        frame = frame.drop_duplicates().copy()

        frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
        for column in ("units_sold", "unit_price"):
            frame[column] = pd.to_numeric(frame[column], errors="coerce")

        invalid = (
            frame[["date", "product_id", "units_sold", "unit_price"]].isna().any(axis=1)
            | (frame["units_sold"] < 0)
            | (frame["unit_price"] < 0)
        )
        rejected_rows = int(invalid.sum())
        frame = frame.loc[~invalid].copy()
        if frame.empty:
            raise DatasetValidationError("No valid rows remain after validation.")

        optional_defaults: dict[str, object] = {
            "store_id": "default",
            "product_name": None,
            "category": "Uncategorized",
            "stock_on_hand": 0,
            "lead_time_days": 7,
        }
        for column, default in optional_defaults.items():
            if column not in frame.columns:
                frame[column] = default
                warnings.append(f"{column} was missing and a default value was applied.")

        frame["product_name"] = frame["product_name"].fillna(frame["product_id"])
        frame["store_id"] = frame["store_id"].fillna("default").astype(str)
        frame["category"] = frame["category"].fillna("Uncategorized").astype(str)
        frame["product_id"] = frame["product_id"].astype(str)
        frame["product_name"] = frame["product_name"].astype(str)

        for column, default in (("stock_on_hand", 0), ("lead_time_days", 7)):
            frame[column] = (
                pd.to_numeric(frame[column], errors="coerce")
                .fillna(default)
                .clip(lower=0)
            )

        unique_dates = int(frame["date"].nunique())
        if unique_dates < 14:
            raise DatasetValidationError(
                "At least 14 distinct dates are required for forecasting."
            )
        if unique_dates < 90:
            warnings.append(
                "Less than 90 days of history may reduce forecast reliability."
            )
        if rejected_rows:
            warnings.append(f"{rejected_rows} invalid rows were excluded.")
        if duplicate_rows:
            warnings.append(f"{duplicate_rows} duplicate rows were removed.")

        frame = frame[STANDARD_COLUMNS].sort_values("date").reset_index(drop=True)
        row_count = len(source)
        accepted_rows = len(frame)
        history_days = int((frame["date"].max().date() - frame["date"].min().date()).days + 1)
        acceptance_rate = round(accepted_rows / max(row_count, 1) * 100, 1)
        rejected_rate = rejected_rows / max(row_count, 1)
        duplicate_rate = duplicate_rows / max(row_count, 1)
        missing_rate = missing_values / max(row_count * len(source.columns), 1)
        quality_score = int(
            round(
                max(
                    0,
                    min(
                        100,
                        100
                        - rejected_rate * 45
                        - duplicate_rate * 20
                        - missing_rate * 30
                        - len(warnings) * 3,
                    ),
                )
            )
        )
        if quality_score >= 88 and unique_dates >= 90:
            readiness = "Forecast ready"
        elif quality_score >= 75:
            readiness = "Usable with warnings"
        else:
            readiness = "Needs cleanup"

        quality = DataQualityReport(
            row_count=len(source),
            accepted_rows=accepted_rows,
            rejected_rows=rejected_rows,
            duplicate_rows=duplicate_rows,
            missing_values=missing_values,
            unique_products=int(frame["product_id"].nunique()),
            unique_stores=int(frame["store_id"].nunique()),
            date_start=frame["date"].min().date(),
            date_end=frame["date"].max().date(),
            history_days=history_days,
            acceptance_rate=acceptance_rate,
            quality_score=quality_score,
            readiness=readiness,
            warnings=warnings,
        )
        frame["date"] = frame["date"].dt.date.astype(str)
        return frame, quality
