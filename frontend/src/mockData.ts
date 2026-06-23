import type {
  ActionRecommendation,
  DashboardSummary,
  DatasetHistoryItem,
  DatasetImportPreview,
  DatasetInfo,
  DatasetPreview,
  ForecastResponse,
  InventoryProduct,
  PurchaseOrderDraft,
  ScenarioResponse,
} from "./types";

const today = "2026-06-17";

const products: InventoryProduct[] = [
  {
    product_id: "laptop",
    product_name: "Aster Pro Laptop",
    category: "Computers",
    current_stock: 318,
    avg_daily_demand: 41.8,
    days_of_cover: 7.6,
    reorder_point: 428,
    recommended_order: 1247,
    risk: "Stockout risk",
  },
  {
    product_id: "dock",
    product_name: "LinkLift Dock",
    category: "Accessories",
    current_stock: 890,
    avg_daily_demand: 22.4,
    days_of_cover: 39.7,
    reorder_point: 224,
    recommended_order: 0,
    risk: "Healthy",
  },
  {
    product_id: "keyboard",
    product_name: "TypeOne Keyboard",
    category: "Accessories",
    current_stock: 1950,
    avg_daily_demand: 18.7,
    days_of_cover: 104.3,
    reorder_point: 181,
    recommended_order: 0,
    risk: "Overstock",
  },
  {
    product_id: "monitor",
    product_name: "Aster 4K Monitor",
    category: "Displays",
    current_stock: 482,
    avg_daily_demand: 33.1,
    days_of_cover: 14.6,
    reorder_point: 302,
    recommended_order: 641,
    risk: "Healthy",
  },
  {
    product_id: "webcam",
    product_name: "ClearView Webcam",
    category: "Accessories",
    current_stock: 128,
    avg_daily_demand: 17.5,
    days_of_cover: 7.3,
    reorder_point: 176,
    recommended_order: 514,
    risk: "Stockout risk",
  },
];

const actions: ActionRecommendation[] = [
  {
    action_id: "reorder-laptop",
    product_id: "laptop",
    product_name: "Aster Pro Laptop",
    category: "Computers",
    action_type: "reorder",
    priority: "Critical",
    title: "Create replenishment order now",
    rationale: "Only 7.6 days of cover remain against a reorder point of 428 units.",
    recommended_quantity: 1247,
    due_date: "2026-06-18",
    estimated_impact: "Avoid projected stockout",
    confidence_pct: 94,
    status: "Open",
  },
  {
    action_id: "reorder-webcam",
    product_id: "webcam",
    product_name: "ClearView Webcam",
    category: "Accessories",
    action_type: "reorder",
    priority: "Critical",
    title: "Create replenishment order now",
    rationale: "Only 7.3 days of cover remain while supplier lead time is 10 days.",
    recommended_quantity: 514,
    due_date: "2026-06-18",
    estimated_impact: "Avoid projected stockout",
    confidence_pct: 91,
    status: "Open",
  },
  {
    action_id: "reorder-monitor",
    product_id: "monitor",
    product_name: "Aster 4K Monitor",
    category: "Displays",
    action_type: "reorder",
    priority: "Planned",
    title: "Schedule the next replenishment",
    rationale: "Demand is trending above the current service-level buffer.",
    recommended_quantity: 641,
    due_date: "2026-06-22",
    estimated_impact: "Protect the next 30-day service level",
    confidence_pct: 86,
    status: "Open",
  },
  {
    action_id: "markdown-keyboard",
    product_id: "keyboard",
    product_name: "TypeOne Keyboard",
    category: "Accessories",
    action_type: "markdown",
    priority: "Medium",
    title: "Reduce price by 10%",
    rationale: "104 days of cover is tying up working capital above the target range.",
    recommended_quantity: null,
    due_date: "2026-06-24",
    estimated_impact: "Release about 59 days of excess stock",
    confidence_pct: 88,
    status: "Open",
  },
];

const dataset: DatasetInfo = {
  dataset_id: "offline-demo-retail",
  name: "Demo Retail Operations",
  filename: "sample_sales.csv",
  source: "demo",
  activated_at: "2026-06-17T12:00:00Z",
  quality: {
    row_count: 5760,
    accepted_rows: 5760,
    rejected_rows: 0,
    duplicate_rows: 0,
    missing_values: 0,
    unique_products: 6,
    unique_stores: 4,
    date_start: "2025-10-21",
    date_end: today,
    history_days: 240,
    acceptance_rate: 100,
    quality_score: 97,
    readiness: "Forecast ready",
    warnings: [],
  },
};

const preview: DatasetPreview = {
  columns: [
    "date",
    "store_id",
    "product_id",
    "product_name",
    "category",
    "units_sold",
  ],
  rows: [
    {
      date: "2025-10-21",
      store_id: "warehouse-a",
      product_id: "laptop",
      product_name: "Aster Pro Laptop",
      category: "Computers",
      units_sold: 34,
    },
    {
      date: "2025-10-21",
      store_id: "warehouse-b",
      product_id: "dock",
      product_name: "LinkLift Dock",
      category: "Accessories",
      units_sold: 25,
    },
    {
      date: "2025-10-22",
      store_id: "warehouse-a",
      product_id: "keyboard",
      product_name: "TypeOne Keyboard",
      category: "Accessories",
      units_sold: 18,
    },
    {
      date: "2025-10-22",
      store_id: "warehouse-c",
      product_id: "monitor",
      product_name: "Aster 4K Monitor",
      category: "Displays",
      units_sold: 29,
    },
  ],
};

function selectedProduct(productId: string) {
  return products.find((product) => product.product_id === productId) ?? products[0];
}

function buildForecast(productId: string, horizon: number): ForecastResponse {
  const product = selectedProduct(productId);
  const history = Array.from({ length: 60 }, (_, index) => ({
    date: `2026-05-${String((index % 30) + 1).padStart(2, "0")}`,
    value: Math.round(24 + Math.sin(index / 2) * 8 + index * 0.22),
  }));
  const forecast = Array.from({ length: horizon }, (_, index) => ({
    date: `2026-06-${String(index + 18).padStart(2, "0")}`,
    forecast: Math.round(product.avg_daily_demand + Math.sin(index / 2) * 5),
    lower: Math.round(product.avg_daily_demand - 9),
    upper: Math.round(product.avg_daily_demand + 12),
  }));

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    horizon_days: horizon,
    model_name: "Weighted moving average",
    validation_mae: 4.6,
    validation_wape: 0.094,
    model_candidates: [
      {
        rank: 1,
        name: "Weighted moving average",
        validation_mae: 4.6,
        validation_wape: 0.094,
      },
      {
        rank: 2,
        name: "Trend + weekday",
        validation_mae: 5.2,
        validation_wape: 0.108,
      },
      {
        rank: 3,
        name: "Seasonal naive (7-day)",
        validation_mae: 6.1,
        validation_wape: 0.124,
      },
    ],
    history,
    forecast,
  };
}

let offlineActiveDataset: DatasetInfo = dataset;
let offlineStagedDataset: DatasetInfo | null = null;

function offlineImportDataset(options?: RequestInit): DatasetInfo {
  const file = options?.body instanceof FormData ? options.body.get("file") : null;
  const filename = file instanceof File ? file.name : "offline-sales.csv";
  return {
    ...dataset,
    dataset_id: "offline-upload",
    name: filename.replace(/\.(csv|xlsx)$/i, ""),
    filename,
    source: "upload",
  };
}

function offlineStageDataset(options?: RequestInit): DatasetImportPreview {
  offlineStagedDataset = offlineImportDataset(options);
  return {
    dataset: offlineStagedDataset,
    preview,
    column_mappings: [
      { source_column: "Order Date", canonical_column: "date", mapping_type: "alias" },
      { source_column: "SKU", canonical_column: "product_id", mapping_type: "alias" },
      { source_column: "Quantity", canonical_column: "units_sold", mapping_type: "alias" },
      { source_column: "Price", canonical_column: "unit_price", mapping_type: "alias" },
      { source_column: "Store", canonical_column: "store_id", mapping_type: "alias" },
    ],
  };
}

function offlineHistory(): DatasetHistoryItem[] {
  const items: DatasetHistoryItem[] = [
    {
      ...dataset,
      status: offlineActiveDataset.dataset_id === dataset.dataset_id ? "active" : "demo",
    },
  ];
  if (offlineStagedDataset) {
    items.unshift({
      ...offlineStagedDataset,
      status:
        offlineActiveDataset.dataset_id === offlineStagedDataset.dataset_id
          ? "active"
          : "ready",
    });
  }
  return items;
}

export function offlineResponse<T>(path: string, options?: RequestInit): T | null {
  if (path === "/dashboard/summary") {
    return {
      as_of: today,
      metrics: [
        {
          label: "Revenue (30d)",
          value: 2311240,
          change_pct: 12.4,
          format: "currency",
        },
        {
          label: "Units sold (30d)",
          value: 9751,
          change_pct: 8.2,
          format: "number",
        },
        {
          label: "Forecast units (30d)",
          value: 11280,
          change_pct: null,
          format: "number",
        },
        {
          label: "Products at risk",
          value: 2,
          change_pct: null,
          format: "risk",
        },
        {
          label: "Forecast accuracy",
          value: 90.6,
          change_pct: null,
          format: "percent",
        },
      ],
      revenue_by_product: [],
    } satisfies DashboardSummary as T;
  }
  if (path === "/datasets/active") return offlineActiveDataset as T;
  if (path === "/datasets") return offlineHistory() as T;
  if (path.startsWith("/datasets/active/preview")) return preview as T;
  if (path === "/datasets/preview") return offlineStageDataset(options) as T;
  if (path.startsWith("/datasets/") && path.endsWith("/activate")) {
    const datasetId = path.split("/")[2];
    if (offlineStagedDataset?.dataset_id === datasetId) {
      offlineActiveDataset = offlineStagedDataset;
    }
    return offlineActiveDataset as T;
  }
  if (path.startsWith("/datasets/") && options?.method === "DELETE") {
    offlineStagedDataset = null;
    return undefined as T;
  }
  if (path === "/datasets/import") return offlineImportDataset(options) as T;
  if (path === "/datasets/reset") {
    offlineActiveDataset = dataset;
    offlineStagedDataset = null;
    return dataset as T;
  }
  if (path === "/products") return products as T;
  if (path === "/actions") return actions as T;
  if (path.startsWith("/actions/") && path.endsWith("/draft")) {
    const actionId = path.split("/")[2];
    const action = actions.find((item) => item.action_id === actionId) ?? actions[0];
    return {
      draft_id: "PO-DEMO05",
      action_id: action.action_id,
      product_id: action.product_id,
      product_name: action.product_name,
      quantity: action.recommended_quantity ?? 1,
      due_date: action.due_date,
      status: "Draft",
      created_at: "2026-06-17T12:00:00Z",
      export_filename: `po-demo05-${action.product_id}.csv`,
    } satisfies PurchaseOrderDraft as T;
  }
  if (path.startsWith("/forecast/")) {
    const [productId, query = ""] = path.replace("/forecast/", "").split("?");
    const horizon = Number(new URLSearchParams(query).get("horizon") ?? 30);
    return buildForecast(productId, horizon) as T;
  }
  if (path === "/scenarios") {
    const forecast = buildForecast("laptop", 30).forecast.map((point) => ({
      ...point,
      forecast: Math.round(point.forecast * 1.15),
    }));
    return {
      product_id: "laptop",
      baseline_units: 1254,
      scenario_units: 1442,
      projected_revenue: 1150716,
      demand_change_pct: 15,
      recommended_order: 1386,
      risk: "Stockout risk",
      insight:
        "Demand is projected to increase by 15.0%. Keep 1,386 units in the replenishment plan for a 7-day supplier lead time.",
      forecast,
    } satisfies ScenarioResponse as T;
  }
  return null;
}
