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
};
