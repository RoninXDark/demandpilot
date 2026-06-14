from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.schemas import ForecastPoint, ForecastResponse, TimePoint


@dataclass(frozen=True)
class CandidateResult:
    name: str
    mae: float
    wape: float


def _daily_series(frame: pd.DataFrame, product_id: str) -> pd.Series:
    product = frame.loc[frame["product_id"] == product_id]
    if product.empty:
        raise KeyError(product_id)

    series = product.groupby("date")["units_sold"].sum().sort_index()
    full_index = pd.date_range(series.index.min(), series.index.max(), freq="D")
    return series.reindex(full_index, fill_value=0).astype(float)


def _seasonal_naive(train: np.ndarray, horizon: int) -> np.ndarray:
    season = train[-7:] if len(train) >= 7 else train
    if len(season) == 0:
        return np.zeros(horizon)
    return np.resize(season, horizon).astype(float)


def _trend_weekday(train: np.ndarray, horizon: int) -> np.ndarray:
    if len(train) < 14:
        return np.full(horizon, float(np.mean(train) if len(train) else 0))

    x = np.arange(len(train), dtype=float)
    slope, intercept = np.polyfit(x, train, 1)
    fitted_trend = np.maximum(intercept + slope * x, 0.1)
    ratios = train / fitted_trend
    weekday_factors = np.array(
        [np.mean(ratios[index::7]) if len(ratios[index::7]) else 1.0 for index in range(7)]
    )
    future_x = np.arange(len(train), len(train) + horizon, dtype=float)
    trend = np.maximum(intercept + slope * future_x, 0)
    future_factors = np.resize(weekday_factors, horizon)
    return np.maximum(trend * future_factors, 0)


def _metrics(actual: np.ndarray, predicted: np.ndarray) -> tuple[float, float]:
    errors = np.abs(actual - predicted)
    mae = float(np.mean(errors))
    denominator = float(np.sum(np.abs(actual)))
    wape = float(np.sum(errors) / denominator) if denominator else 0.0
    return mae, wape


def _select_model(series: pd.Series) -> CandidateResult:
    values = series.to_numpy(dtype=float)
    holdout = min(28, max(7, len(values) // 5))
    train, actual = values[:-holdout], values[-holdout:]
    candidates = {
        "Seasonal naive (7-day)": _seasonal_naive(train, holdout),
        "Trend + weekday": _trend_weekday(train, holdout),
    }
    results = []
    for name, prediction in candidates.items():
        mae, wape = _metrics(actual, prediction)
        results.append(CandidateResult(name=name, mae=mae, wape=wape))
    return min(results, key=lambda result: result.mae)


def forecast_product(
    frame: pd.DataFrame,
    product_id: str,
    horizon_days: int,
) -> ForecastResponse:
    series = _daily_series(frame, product_id)
    selected = _select_model(series)
    values = series.to_numpy(dtype=float)

    if selected.name.startswith("Seasonal"):
        predictions = _seasonal_naive(values, horizon_days)
        fitted = _seasonal_naive(values[:-7], 7) if len(values) >= 14 else values[-7:]
        residuals = values[-len(fitted):] - fitted
    else:
        predictions = _trend_weekday(values, horizon_days)
        validation_size = min(28, max(7, len(values) // 5))
        fitted = _trend_weekday(values[:-validation_size], validation_size)
        residuals = values[-validation_size:] - fitted

    residual_std = float(np.std(residuals)) if len(residuals) else 0.0
    interval = 1.65 * residual_std
    start_date = series.index.max() + pd.Timedelta(days=1)
    future_dates = pd.date_range(start=start_date, periods=horizon_days, freq="D")

    product_name = str(
        frame.loc[frame["product_id"] == product_id, "product_name"].iloc[0]
    )
    history = [
        TimePoint(date=index.date(), value=round(float(value), 2))
        for index, value in series.iloc[-90:].items()
    ]
    future = [
        ForecastPoint(
            date=current_date.date(),
            forecast=round(float(prediction), 2),
            lower=round(max(0.0, float(prediction - interval)), 2),
            upper=round(float(prediction + interval), 2),
        )
        for current_date, prediction in zip(future_dates, predictions, strict=True)
    ]

    return ForecastResponse(
        product_id=product_id,
        product_name=product_name,
        horizon_days=horizon_days,
        model_name=selected.name,
        validation_mae=round(selected.mae, 2),
        validation_wape=round(selected.wape, 4),
        history=history,
        forecast=future,
    )
