from datetime import date

from pydantic import BaseModel, Field


class DashboardMetric(BaseModel):
    label: str
    value: float
    change_pct: float | None = None
    format: str = "number"


class ProductRevenue(BaseModel):
    product_id: str
    product_name: str
    revenue: float
    units: int


class DashboardSummary(BaseModel):
    as_of: date
    metrics: list[DashboardMetric]
    revenue_by_product: list[ProductRevenue]


class InventoryProduct(BaseModel):
    product_id: str
    product_name: str
    category: str
    current_stock: int
    avg_daily_demand: float
    days_of_cover: float
    reorder_point: int
    recommended_order: int
    risk: str


class TimePoint(BaseModel):
    date: date
    value: float


class ForecastPoint(BaseModel):
    date: date
    forecast: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    product_id: str
    product_name: str
    horizon_days: int
    model_name: str
    validation_mae: float
    validation_wape: float
    history: list[TimePoint]
    forecast: list[ForecastPoint]


class ScenarioRequest(BaseModel):
    product_id: str
    horizon_days: int = Field(default=30, ge=7, le=90)
    price_change_pct: float = Field(default=0, ge=-30, le=30)
    promotion_lift_pct: float = Field(default=0, ge=0, le=100)
    lead_time_days: int = Field(default=7, ge=1, le=60)


class ScenarioResponse(BaseModel):
    product_id: str
    baseline_units: float
    scenario_units: float
    projected_revenue: float
    demand_change_pct: float
    recommended_order: int
    risk: str
