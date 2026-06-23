from datetime import date, datetime
from typing import Any

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


class DataQualityReport(BaseModel):
    row_count: int
    accepted_rows: int
    rejected_rows: int
    duplicate_rows: int
    missing_values: int
    unique_products: int
    unique_stores: int
    date_start: date
    date_end: date
    history_days: int
    acceptance_rate: float
    quality_score: int
    readiness: str
    warnings: list[str] = Field(default_factory=list)


class DatasetInfo(BaseModel):
    dataset_id: str
    name: str
    filename: str
    source: str
    activated_at: datetime
    quality: DataQualityReport


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]


class DatasetColumnMapping(BaseModel):
    source_column: str
    canonical_column: str
    mapping_type: str


class DatasetImportPreview(BaseModel):
    dataset: DatasetInfo
    preview: DatasetPreview
    column_mappings: list[DatasetColumnMapping]


class DatasetHistoryItem(DatasetInfo):
    status: str


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


class ForecastModelCandidate(BaseModel):
    rank: int
    name: str
    validation_mae: float
    validation_wape: float


class ForecastResponse(BaseModel):
    product_id: str
    product_name: str
    horizon_days: int
    model_name: str
    validation_mae: float
    validation_wape: float
    model_candidates: list[ForecastModelCandidate]
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
    insight: str
    forecast: list[ForecastPoint]


class ActionRecommendation(BaseModel):
    action_id: str
    product_id: str
    product_name: str
    category: str
    action_type: str
    priority: str
    title: str
    rationale: str
    recommended_quantity: int | None = None
    due_date: date
    estimated_impact: str
    confidence_pct: int
    status: str = "Open"


class PurchaseOrderDraft(BaseModel):
    draft_id: str
    action_id: str
    product_id: str
    product_name: str
    quantity: int
    due_date: date
    status: str = "Draft"
    created_at: datetime
    export_filename: str
