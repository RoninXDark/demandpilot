export type DashboardMetric = {
  label: string;
  value: number;
  change_pct: number | null;
  format: "currency" | "number" | "risk" | "percent";
};

export type ProductRevenue = {
  product_id: string;
  product_name: string;
  revenue: number;
  units: number;
};

export type DashboardSummary = {
  as_of: string;
  metrics: DashboardMetric[];
  revenue_by_product: ProductRevenue[];
};

export type DataQualityReport = {
  row_count: number;
  accepted_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  missing_values: number;
  unique_products: number;
  unique_stores: number;
  date_start: string;
  date_end: string;
  history_days: number;
  acceptance_rate: number;
  quality_score: number;
  readiness: string;
  warnings: string[];
};

export type DatasetInfo = {
  dataset_id: string;
  name: string;
  filename: string;
  source: "demo" | "upload";
  activated_at: string;
  quality: DataQualityReport;
};

export type DatasetPreview = {
  columns: string[];
  rows: Record<string, string | number | null>[];
};

export type ForecastModelCandidate = {
  rank: number;
  name: string;
  validation_mae: number;
  validation_wape: number;
};

export type InventoryProduct = {
  product_id: string;
  product_name: string;
  category: string;
  current_stock: number;
  avg_daily_demand: number;
  days_of_cover: number;
  reorder_point: number;
  recommended_order: number;
  risk: "Healthy" | "Stockout risk" | "Overstock";
};

export type ForecastResponse = {
  product_id: string;
  product_name: string;
  horizon_days: number;
  model_name: string;
  validation_mae: number;
  validation_wape: number;
  model_candidates: ForecastModelCandidate[];
  history: { date: string; value: number }[];
  forecast: {
    date: string;
    forecast: number;
    lower: number;
    upper: number;
  }[];
};

export type ScenarioRequest = {
  product_id: string;
  horizon_days: number;
  price_change_pct: number;
  promotion_lift_pct: number;
  lead_time_days: number;
};

export type ScenarioResponse = {
  product_id: string;
  baseline_units: number;
  scenario_units: number;
  projected_revenue: number;
  demand_change_pct: number;
  recommended_order: number;
  risk: string;
  insight: string;
  forecast: {
    date: string;
    forecast: number;
    lower: number;
    upper: number;
  }[];
};

export type ActionRecommendation = {
  action_id: string;
  product_id: string;
  product_name: string;
  category: string;
  action_type: "reorder" | "markdown" | "transfer";
  priority: "Critical" | "Planned" | "Medium";
  title: string;
  rationale: string;
  recommended_quantity: number | null;
  due_date: string;
  estimated_impact: string;
  confidence_pct: number;
  status: string;
};

export type PurchaseOrderDraft = {
  draft_id: string;
  action_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  due_date: string;
  status: "Draft";
  created_at: string;
  export_filename: string;
};
