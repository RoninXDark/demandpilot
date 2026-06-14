from functools import lru_cache
from pathlib import Path

import pandas as pd

from app.services.demo_data import generate_demo_dataset


REQUIRED_COLUMNS = {
    "date",
    "store_id",
    "product_id",
    "product_name",
    "category",
    "units_sold",
    "unit_price",
    "stock_on_hand",
    "lead_time_days",
}


class SalesDataService:
    def __init__(self, data_path: Path):
        self.data_path = data_path

    def load(self) -> pd.DataFrame:
        if not self.data_path.exists():
            generate_demo_dataset(self.data_path)

        frame = pd.read_csv(self.data_path, parse_dates=["date"])
        missing = REQUIRED_COLUMNS - set(frame.columns)
        if missing:
            raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

        numeric_columns = ["units_sold", "unit_price", "stock_on_hand", "lead_time_days"]
        for column in numeric_columns:
            frame[column] = pd.to_numeric(frame[column], errors="coerce")

        frame = frame.dropna(subset=["date", "product_id", "units_sold", "unit_price"])
        frame["units_sold"] = frame["units_sold"].clip(lower=0)
        frame["revenue"] = frame["units_sold"] * frame["unit_price"]
        return frame.sort_values("date").reset_index(drop=True)


@lru_cache(maxsize=4)
def get_data_service(data_path: str) -> SalesDataService:
    return SalesDataService(Path(data_path))
