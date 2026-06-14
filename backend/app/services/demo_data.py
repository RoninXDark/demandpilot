from pathlib import Path

import numpy as np
import pandas as pd


PRODUCTS = [
    ("laptop", "Aster Pro Laptop", "Computing", 1199.0, 8.0),
    ("monitor", "Vista 27 Monitor", "Displays", 349.0, 14.0),
    ("headset", "Pulse Wireless Headset", "Accessories", 129.0, 22.0),
    ("keyboard", "TypeOne Keyboard", "Accessories", 89.0, 28.0),
    ("webcam", "Focus HD Webcam", "Video", 109.0, 18.0),
    ("dock", "LinkHub Dock", "Accessories", 179.0, 15.0),
]
STORES = ["warsaw", "krakow", "lublin"]


def generate_demo_dataset(path: Path, days: int = 240, seed: int = 42) -> Path:
    rng = np.random.default_rng(seed)
    end_date = pd.Timestamp.today().normalize() - pd.Timedelta(days=1)
    dates = pd.date_range(end=end_date, periods=days, freq="D")
    records: list[dict[str, object]] = []

    for product_index, (product_id, name, category, price, base_demand) in enumerate(PRODUCTS):
        stock = int(base_demand * 35)
        lead_time = 5 + product_index * 2

        for store_index, store_id in enumerate(STORES):
            store_factor = 1.0 + (store_index - 1) * 0.12

            for day_index, current_date in enumerate(dates):
                weekday_factor = 1.22 if current_date.dayofweek in (4, 5) else 0.92
                yearly_wave = 1 + 0.18 * np.sin((day_index + product_index * 9) / 24)
                trend = 1 + (day_index / days) * (0.08 + product_index * 0.015)
                promotion = day_index % (47 + product_index * 3) in range(4)
                discount = 0.15 if promotion else 0.0
                promo_factor = 1.45 if promotion else 1.0
                expected = base_demand * store_factor * weekday_factor * yearly_wave * trend * promo_factor
                units = max(0, int(rng.poisson(max(expected, 0.2))))

                if day_index % max(14, lead_time * 2) == 0:
                    stock += int(base_demand * 42)
                fulfilled_units = min(units, stock)
                stock = max(0, stock - fulfilled_units)

                records.append(
                    {
                        "date": current_date.date().isoformat(),
                        "store_id": store_id,
                        "product_id": product_id,
                        "product_name": name,
                        "category": category,
                        "units_sold": fulfilled_units,
                        "unit_price": round(price * (1 - discount), 2),
                        "discount_pct": discount,
                        "stock_on_hand": stock,
                        "lead_time_days": lead_time,
                    }
                )

    frame = pd.DataFrame.from_records(records)
    latest_date = frame["date"].max()
    target_cover_days = {
        "laptop": 3,
        "monitor": 17,
        "headset": 24,
        "keyboard": 72,
        "webcam": 19,
        "dock": 7,
    }
    base_demand_by_product = {product[0]: product[4] for product in PRODUCTS}
    store_factors = {"warsaw": 0.88, "krakow": 1.0, "lublin": 1.12}

    # Give the final snapshot a useful mix of stockout, healthy, and overstock cases.
    for product_id, cover_days in target_cover_days.items():
        for store_id, store_factor in store_factors.items():
            mask = (
                (frame["date"] == latest_date)
                & (frame["product_id"] == product_id)
                & (frame["store_id"] == store_id)
            )
            frame.loc[mask, "stock_on_hand"] = int(
                base_demand_by_product[product_id] * cover_days * store_factor
            )

    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)
    return path
