import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  BarChart3,
  Bell,
  Box,
  Boxes,
  Check,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  Database,
  Eye,
  FileDown,
  FileSpreadsheet,
  Gauge,
  Headphones,
  Keyboard,
  Laptop,
  LayoutDashboard,
  ListChecks,
  Monitor,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../api";
import type {
  ActionRecommendation,
  DashboardMetric,
  DashboardSummary,
  DatasetInfo,
  DatasetPreview,
  ForecastResponse,
  InventoryProduct,
  PurchaseOrderDraft,
  ScenarioResponse,
} from "../types";

type ControlTowerProps = {
  onExitDemo: () => void;
};

type ActionFilter = "all" | "critical" | "reorder" | "excess";
type ActionLifecycleStatus = "Open" | "Draft created" | "Reviewed" | "Dismissed";

const horizons = [7, 30, 90];

const navigation: { label: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Control Tower", icon: LayoutDashboard, active: true },
  { label: "Action Center", icon: ClipboardCheck },
  { label: "Demand Analytics", icon: BarChart3 },
  { label: "Product Directory", icon: Box },
  { label: "Inventory Hub", icon: Boxes },
  { label: "Data Control", icon: Database },
  { label: "Supplier Network", icon: Users },
];

const productIcons: Record<string, LucideIcon> = {
  laptop: Laptop,
  dock: Box,
  keyboard: Keyboard,
  monitor: Monitor,
  webcam: Video,
  headset: Headphones,
};

const actionFilters: { id: ActionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "reorder", label: "Reorders" },
  { id: "excess", label: "Excess" },
];

const requiredColumns = ["date", "product_id", "units_sold", "unit_price"];
const optionalColumns = [
  "store_id",
  "product_name",
  "category",
  "stock_on_hand",
  "lead_time_days",
];
const sampleTemplateRows = [
  "date,store_id,product_id,product_name,category,units_sold,unit_price,stock_on_hand,lead_time_days",
  "2026-01-01,warehouse-a,sku-1001,Everyday Laptop,Electronics,18,799,420,9",
  "2026-01-02,warehouse-a,sku-1001,Everyday Laptop,Electronics,22,799,398,9",
  "2026-01-01,warehouse-b,sku-2040,USB-C Dock,Accessories,31,119,260,7",
].join("\n");

function readStoredRecord<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredRecord<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is a convenience for the demo workflow.
  }
}

function toStatusClass(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function formatMetric(metric: DashboardMetric) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(metric.value);
  }
  if (metric.format === "percent") return `${metric.value}%`;
  return new Intl.NumberFormat("en-US", {
    notation: metric.value > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(metric.value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPreviewValue(value: string | number | null) {
  if (value == null || value === "") return "--";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  return value;
}

function scoreClass(score?: number) {
  if (score == null) return "unknown";
  if (score >= 88) return "strong";
  if (score >= 75) return "warning";
  return "risk";
}

function downloadCsvTemplate() {
  const url = URL.createObjectURL(
    new Blob([sampleTemplateRows], { type: "text/csv" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "demandpilot-sales-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDraft(draft: PurchaseOrderDraft) {
  const csv = [
    "purchase_order,status,product_id,product_name,quantity,required_by,created_at",
    [
      draft.draft_id,
      draft.status,
      draft.product_id,
      JSON.stringify(draft.product_name),
      draft.quantity,
      draft.due_date,
      draft.created_at,
    ].join(","),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = draft.export_filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDraftRegister(drafts: PurchaseOrderDraft[]) {
  const headers = [
    "purchase_order",
    "status",
    "product_id",
    "product_name",
    "quantity",
    "required_by",
    "created_at",
  ];
  const rows = drafts.map((draft) =>
    [
      draft.draft_id,
      draft.status,
      draft.product_id,
      JSON.stringify(draft.product_name),
      draft.quantity,
      draft.due_date,
      draft.created_at,
    ].join(","),
  );
  const url = URL.createObjectURL(
    new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "demandpilot-draft-po-register.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function MetricTile({ metric, index }: { metric: DashboardMetric; index: number }) {
  const icons = [Store, PackageCheck, BarChart3, AlertTriangle, CircleGauge];
  const Icon = icons[index] ?? CircleGauge;
  return (
    <article className="metric-tile">
      <div className="metric-label">
        <span>{metric.label}</span>
        <Icon size={16} />
      </div>
      <strong>{formatMetric(metric)}</strong>
      <small className={metric.change_pct && metric.change_pct < 0 ? "negative" : ""}>
        {metric.change_pct == null
          ? "Current planning window"
          : `${metric.change_pct > 0 ? "+" : ""}${metric.change_pct}% vs previous`}
      </small>
    </article>
  );
}

export function ControlTower({ onExitDemo }: ControlTowerProps) {
  const initialParams = new URLSearchParams(window.location.search);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState(
    initialParams.get("sku") ?? "laptop",
  );
  const [horizon, setHorizon] = useState(30);
  const [priceChange, setPriceChange] = useState(0);
  const [promotionLift, setPromotionLift] = useState(15);
  const [leadTime, setLeadTime] = useState(7);
  const [drafts, setDrafts] = useState<Record<string, PurchaseOrderDraft>>(() =>
    readStoredRecord<Record<string, PurchaseOrderDraft>>(
      "demandpilot-draft-pos",
      {},
    ),
  );
  const [actionStates, setActionStates] = useState<
    Record<string, ActionLifecycleStatus>
  >(() =>
    readStoredRecord<Record<string, ActionLifecycleStatus>>(
      "demandpilot-action-states",
      {},
    ),
  );
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(initialParams.has("sku"));
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(initialParams.has("data-control"));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<DatasetInfo | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, productData, actionData, datasetData, previewData] =
        await Promise.all([
          api.summary(),
          api.products(),
          api.actions(),
          api.activeDataset(),
          api.activeDatasetPreview(8),
        ]);
      setSummary(summaryData);
      setProducts(productData);
      setActions(actionData);
      setDataset(datasetData);
      setDatasetPreview(previewData);
      setSelectedProduct((current) =>
        productData.some((item) => item.product_id === current)
          ? current
          : (productData[0]?.product_id ?? ""),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    saveStoredRecord("demandpilot-draft-pos", drafts);
  }, [drafts]);

  useEffect(() => {
    saveStoredRecord("demandpilot-action-states", actionStates);
  }, [actionStates]);

  useEffect(() => {
    if (!selectedProduct) return;
    let active = true;
    api
      .forecast(selectedProduct, horizon)
      .then((result) => active && setForecast(result))
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Forecast failed"));
    return () => {
      active = false;
    };
  }, [selectedProduct, horizon]);

  useEffect(() => {
    if (!selectedProduct) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setScenarioLoading(true);
      api
        .scenario({
          product_id: selectedProduct,
          horizon_days: horizon,
          price_change_pct: priceChange,
          promotion_lift_pct: promotionLift,
          lead_time_days: leadTime,
        })
        .then((result) => active && setScenario(result))
        .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Scenario failed"))
        .finally(() => active && setScenarioLoading(false));
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedProduct, horizon, priceChange, promotionLift, leadTime]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    const scenarioByDate = new Map(
      scenario?.forecast.map((point) => [point.date, point.forecast]) ?? [],
    );
    return [
      ...forecast.history.slice(-45).map((point) => ({
        date: point.date,
        actual: point.value,
        baseline: null,
        scenario: null,
      })),
      ...forecast.forecast.map((point) => ({
        date: point.date,
        actual: null,
        baseline: point.forecast,
        scenario: scenarioByDate.get(point.date) ?? null,
      })),
    ];
  }, [forecast, scenario]);

  const inventoryHealth = useMemo(() => {
    const groups = new Map<string, { category: string; healthy: number; risk: number; excess: number }>();
    for (const product of products) {
      const entry = groups.get(product.category) ?? {
        category: product.category,
        healthy: 0,
        risk: 0,
        excess: 0,
      };
      if (product.risk === "Healthy") entry.healthy += 1;
      if (product.risk === "Stockout risk") entry.risk += 1;
      if (product.risk === "Overstock") entry.excess += 1;
      groups.set(product.category, entry);
    }
    return [...groups.values()];
  }, [products]);

  const selectedInventory = products.find(
    (product) => product.product_id === selectedProduct,
  );

  function getActionStatus(action: ActionRecommendation): ActionLifecycleStatus {
    return actionStates[action.action_id] ?? "Open";
  }

  const visibleActions = useMemo(() => {
    return actions.filter((action) => {
      if (actionFilter === "critical") return action.priority === "Critical";
      if (actionFilter === "reorder") return action.action_type === "reorder";
      if (actionFilter === "excess") return action.action_type === "markdown";
      return true;
    });
  }, [actions, actionFilter]);

  const filterCounts = useMemo(
    () => ({
      all: actions.length,
      critical: actions.filter((action) => action.priority === "Critical").length,
      reorder: actions.filter((action) => action.action_type === "reorder").length,
      excess: actions.filter((action) => action.action_type === "markdown").length,
    }),
    [actions],
  );

  const draftList = useMemo(
    () =>
      Object.values(drafts).sort((left, right) =>
        left.due_date.localeCompare(right.due_date),
      ),
    [drafts],
  );

  const selectedAction =
    actions.find(
      (action) =>
        action.product_id === selectedProduct &&
        getActionStatus(action) !== "Dismissed",
    ) ?? actions.find((action) => action.product_id === selectedProduct);

  const selectedActionStatus = selectedAction
    ? getActionStatus(selectedAction)
    : "Open";

  const selectedDraft = selectedAction
    ? drafts[selectedAction.action_id]
    : undefined;

  const selectedForecastAccuracy = forecast
    ? Math.max(0, 100 - forecast.validation_wape * 100).toFixed(1)
    : null;
  const quality = dataset?.quality;
  const qualityScore = quality?.quality_score ?? 0;
  const previewColumns = datasetPreview?.columns.slice(0, 6) ?? [];
  const modelCandidates = forecast?.model_candidates.slice(0, 3) ?? [];

  function updateActionStatus(
    actionId: string,
    status: ActionLifecycleStatus,
  ) {
    setActionStates((current) => ({ ...current, [actionId]: status }));
  }

  async function createDraft(action: ActionRecommendation) {
    try {
      const draft = await api.createDraft(action.action_id);
      setDrafts((current) => ({ ...current, [action.action_id]: draft }));
      updateActionStatus(action.action_id, "Draft created");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create draft");
    }
  }

  function focusAction(action: ActionRecommendation) {
    setSelectedProduct(action.product_id);
    setDrawerOpen(true);
  }

  async function importDataset() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.importDataset(selectedFile);
      setImportResult(result);
      setScenario(null);
      setDrafts({});
      setActionStates({});
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  async function resetDataset() {
    setUploading(true);
    try {
      const result = await api.resetDataset();
      setImportResult(result);
      setSelectedFile(null);
      setScenario(null);
      setDrafts({});
      setActionStates({});
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="brand-mark">
            <Gauge size={18} />
          </span>
          {!collapsed && <span>DemandPilot</span>}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <nav className="app-navigation" aria-label="Product navigation">
          {navigation.map(({ label, icon: Icon, active }) => (
            <button
              className={active ? "active" : ""}
              key={label}
              onClick={() => label === "Data Control" && setImportOpen(true)}
              title={label}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && label === "Action Center" && (
                <b>{actions.filter((action) => action.priority === "Critical").length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button title="Settings">
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button onClick={onExitDemo} title="Exit demo">
            <ArrowLeft size={18} />
            {!collapsed && <span>Exit demo</span>}
          </button>
          <div className="profile">
            <span>SM</span>
            {!collapsed && (
              <div>
                <strong>Stanislav M.</strong>
                <small>Demand planner</small>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="control-main">
        <header className="control-header">
          <div>
            <span className="breadcrumb">Operations / Control Tower</span>
            <h1>Inventory Control Tower</h1>
          </div>
          <div className="header-tools">
            <label className="command-search">
              <Search size={16} />
              <input aria-label="Search" placeholder="Search products or actions" />
              <kbd>Ctrl K</kbd>
            </label>
            <button className="icon-command" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <button className="button-solid compact" onClick={() => setImportOpen(true)}>
              <Upload size={16} />
              Import data
            </button>
          </div>
        </header>

        <div className="dataset-bar">
          <span className="live-dot" />
          <strong>{dataset?.source === "upload" ? dataset.name : "Portfolio demo dataset"}</strong>
          <span>
            {dataset
              ? `${dataset.quality.unique_products} SKUs - ${dataset.quality.unique_stores} locations - ${dataset.quality.accepted_rows.toLocaleString()} rows - ${dataset.quality.history_days} days`
              : "Loading dataset"}
          </span>
          <button
            className={`quality-badge ${scoreClass(dataset?.quality.quality_score)}`}
            onClick={() => setImportOpen(true)}
            title="Open Data Control"
          >
            <ShieldCheck size={13} />
            {dataset?.quality.quality_score ?? "--"} data score
          </button>
          <span className="dataset-date">
            As of {summary ? formatDate(summary.as_of) : "--"}
          </span>
          <button onClick={() => void loadDashboard()} title="Refresh data">
            <RefreshCw size={15} />
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={17} />
            <span>{error}</span>
            <button onClick={() => setError("")} title="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="decision-workspace">
          <div className="action-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Prioritized by operational risk</span>
                <h2>Action Queue</h2>
              </div>
              <span className="count-badge">{visibleActions.length}</span>
            </div>
            <div className="queue-filters">
              {actionFilters.map((filter) => (
                <button
                  className={actionFilter === filter.id ? "active" : ""}
                  key={filter.id}
                  onClick={() => setActionFilter(filter.id)}
                >
                  {filter.label}
                  <span>{filterCounts[filter.id]}</span>
                </button>
              ))}
            </div>
            <div className="action-list">
              {loading && <div className="panel-loading">Ranking decisions...</div>}
              {!loading && visibleActions.length === 0 && (
                <div className="panel-loading">No actions match this filter.</div>
              )}
              {visibleActions.map((action) => {
                const Icon = productIcons[action.product_id] ?? Box;
                const draft = drafts[action.action_id];
                const status = getActionStatus(action);
                return (
                  <article
                    className={`action-card ${action.priority.toLowerCase()} status-${toStatusClass(status)}`}
                    key={action.action_id}
                  >
                    <button className="action-main" onClick={() => focusAction(action)}>
                      <span className="product-icon">
                        <Icon size={22} />
                      </span>
                      <span className="action-copy">
                        <span className="action-meta">
                          <b>{action.priority}</b>
                          <i>AI optimized - {action.confidence_pct}%</i>
                          <em className={`workflow-status ${toStatusClass(status)}`}>
                            {status}
                          </em>
                        </span>
                        <strong>{action.product_name}</strong>
                        <span>{action.title}</span>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                    <p>{action.rationale}</p>
                    <div className="action-facts">
                      <span>
                        Due <strong>{formatDate(action.due_date)}</strong>
                      </span>
                      {action.recommended_quantity != null && (
                        <span>
                          Quantity <strong>{action.recommended_quantity.toLocaleString()}</strong>
                        </span>
                      )}
                    </div>
                    <div className="action-footer">
                      <small>{action.estimated_impact}</small>
                      <div className="action-buttons">
                        {draft ? (
                          <button className="draft-button" onClick={() => downloadDraft(draft)}>
                            <FileDown size={15} />
                            {draft.draft_id}
                          </button>
                        ) : action.action_type === "reorder" ? (
                          <button className="queue-action" onClick={() => void createDraft(action)}>
                            Create Draft PO
                          </button>
                        ) : (
                          <button
                            className="queue-action"
                            onClick={() => updateActionStatus(action.action_id, "Reviewed")}
                          >
                            Review action
                          </button>
                        )}
                        {status !== "Dismissed" && (
                          <button
                            className="ghost-action"
                            onClick={() => updateActionStatus(action.action_id, "Dismissed")}
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="forecast-workspace" id="forecast-workspace">
            <div className="forecast-header">
              <div>
                <span className="eyebrow">Decision context</span>
                <h2>Demand Forecast</h2>
                <p>
                  {forecast
                    ? `${forecast.product_name} - ${forecast.model_name} - ${(100 - forecast.validation_wape * 100).toFixed(1)}% validation accuracy`
                    : "Preparing forecast model"}
                </p>
              </div>
              <div className="forecast-selectors">
                <select
                  value={selectedProduct}
                  onChange={(event) => setSelectedProduct(event.target.value)}
                  aria-label="Select product"
                >
                  {products.map((product) => (
                    <option value={product.product_id} key={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
                <div className="segmented-control" aria-label="Forecast horizon">
                  {horizons.map((days) => (
                    <button
                      className={horizon === days ? "active" : ""}
                      key={days}
                      onClick={() => setHorizon(days)}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="forecast-body">
              <div className="chart-column">
                <div className="chart-legend">
                  <span><i className="actual-line" />Actual</span>
                  <span><i className="baseline-line" />Baseline</span>
                  <span><i className="scenario-line" />Scenario</span>
                </div>
                <div className="forecast-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 14, right: 12, bottom: 0, left: -22 }}>
                      <defs>
                        <linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#17a68f" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#17a68f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e7ecea" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={34} tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip
                        labelFormatter={(value) => formatDate(String(value))}
                        contentStyle={{ borderRadius: 6, borderColor: "#dce4e1" }}
                      />
                      <Line dataKey="actual" stroke="#17324d" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                      <Line dataKey="baseline" stroke="#80919f" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} isAnimationActive={false} />
                      <Area dataKey="scenario" stroke="#12947f" strokeWidth={2.6} fill="url(#scenarioFill)" dot={false} connectNulls={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="ai-insight">
                  <span className="insight-icon"><Sparkles size={15} /></span>
                  <div>
                    <strong>{scenarioLoading ? "Recalculating scenario..." : "AI scenario insight"}</strong>
                    <p>{scenario?.insight ?? "Adjust the controls to model an operating decision."}</p>
                  </div>
                  {scenario && (
                    <span className={scenario.demand_change_pct >= 0 ? "impact-up" : "impact-down"}>
                      {scenario.demand_change_pct > 0 ? "+" : ""}
                      {scenario.demand_change_pct}% demand
                    </span>
                  )}
                </div>
                {modelCandidates.length > 0 && (
                  <div className="model-board">
                    <span><ListChecks size={14} /> Forecast model test</span>
                    {modelCandidates.map((candidate) => (
                      <div
                        className={candidate.rank === 1 ? "winner" : ""}
                        key={candidate.name}
                      >
                        <strong>{candidate.rank}. {candidate.name}</strong>
                        <small>
                          MAE {candidate.validation_mae} - WAPE{" "}
                          {(candidate.validation_wape * 100).toFixed(1)}%
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <aside className="scenario-controls">
                <div className="scenario-title">
                  <span><SlidersHorizontal size={17} /> Scenario Lab</span>
                  <button
                    title="Reset scenario"
                    onClick={() => {
                      setPriceChange(0);
                      setPromotionLift(15);
                      setLeadTime(7);
                    }}
                  >
                    Reset
                  </button>
                </div>
                <label>
                  <span>Price change <b>{priceChange}%</b></span>
                  <input type="range" min="-30" max="30" value={priceChange} onChange={(event) => setPriceChange(Number(event.target.value))} />
                  <small><i>-30%</i><i>+30%</i></small>
                </label>
                <label>
                  <span>Promotion lift <b>+{promotionLift}%</b></span>
                  <input type="range" min="0" max="100" value={promotionLift} onChange={(event) => setPromotionLift(Number(event.target.value))} />
                  <small><i>0%</i><i>100%</i></small>
                </label>
                <label>
                  <span>Supplier lead time <b>{leadTime}d</b></span>
                  <input type="range" min="1" max="60" value={leadTime} onChange={(event) => setLeadTime(Number(event.target.value))} />
                  <small><i>1 day</i><i>60 days</i></small>
                </label>
                <div className="scenario-output">
                  <span>Recommended order</span>
                  <strong>{scenario?.recommended_order.toLocaleString() ?? "--"}</strong>
                  <small>units for this scenario</small>
                </div>
                <div className="scenario-output secondary">
                  <span>Projected revenue</span>
                  <strong>
                    {scenario
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(scenario.projected_revenue)
                      : "--"}
                  </strong>
                  <small>{scenario?.risk ?? "Planning window"}</small>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="metric-strip">
          {summary?.metrics.map((metric, index) => (
            <MetricTile metric={metric} index={index} key={metric.label} />
          ))}
        </section>

        <section className="operations-grid">
          <div className="operations-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Portfolio pulse</span>
                <h2>Inventory health by category</h2>
              </div>
              <button className="icon-command" title="Download report">
                <ArrowDownToLine size={17} />
              </button>
            </div>
            <div className="health-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryHealth} margin={{ top: 20, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#e7ecea" vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 6, borderColor: "#dce4e1" }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="healthy" name="Healthy" stackId="health" fill="#15947f" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="risk" name="Stockout risk" stackId="health" fill="#e5a43a" />
                  <Bar dataKey="excess" name="Excess" stackId="health" fill="#8796a3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="operations-panel decision-impact">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Selected SKU</span>
                <h2>Decision impact</h2>
              </div>
              <span className={`risk-pill ${selectedInventory?.risk.toLowerCase().replaceAll(" ", "-")}`}>
                {selectedInventory?.risk ?? "Loading"}
              </span>
            </div>
            <div className="impact-product">
              {(() => {
                const Icon = productIcons[selectedProduct] ?? Box;
                return <Icon size={28} />;
              })()}
              <div>
                <strong>{selectedInventory?.product_name ?? "Product"}</strong>
                <span>{selectedInventory?.category}</span>
              </div>
            </div>
            <div className="impact-grid">
              <div><span>On hand</span><strong>{selectedInventory?.current_stock.toLocaleString() ?? "--"}</strong><small>units</small></div>
              <div><span>Days of cover</span><strong>{selectedInventory?.days_of_cover ?? "--"}</strong><small>days</small></div>
              <div><span>Reorder point</span><strong>{selectedInventory?.reorder_point.toLocaleString() ?? "--"}</strong><small>units</small></div>
              <div><span>Avg. demand</span><strong>{selectedInventory?.avg_daily_demand ?? "--"}</strong><small>units / day</small></div>
            </div>
          </div>

          <div className="operations-panel draft-center">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Decision workflow</span>
                <h2>Draft PO Center</h2>
              </div>
              <span className="count-badge">{draftList.length}</span>
            </div>
            {draftList.length === 0 ? (
              <div className="draft-empty">
                <ClipboardList size={28} />
                <strong>No Draft POs yet</strong>
                <span>Create one from a reorder action to stage an export.</span>
              </div>
            ) : (
              <>
                <div className="draft-list">
                  {draftList.map((draft) => {
                    const sourceAction = actions.find(
                      (action) => action.action_id === draft.action_id,
                    );
                    const status = sourceAction
                      ? getActionStatus(sourceAction)
                      : "Draft created";
                    return (
                      <article className="draft-row" key={draft.draft_id}>
                        <div>
                          <strong>{draft.draft_id}</strong>
                          <span>{draft.product_name}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>Qty</dt>
                            <dd>{draft.quantity.toLocaleString()}</dd>
                          </div>
                          <div>
                            <dt>Due</dt>
                            <dd>{formatDate(draft.due_date)}</dd>
                          </div>
                        </dl>
                        <span className={`workflow-status ${toStatusClass(status)}`}>
                          {status}
                        </span>
                        <div className="draft-actions">
                          <button
                            className="icon-command"
                            onClick={() => downloadDraft(draft)}
                            title="Download PO CSV"
                          >
                            <FileDown size={16} />
                          </button>
                          {sourceAction && status !== "Reviewed" && (
                            <button
                              className="draft-button"
                              onClick={() =>
                                updateActionStatus(sourceAction.action_id, "Reviewed")
                              }
                            >
                              <Check size={14} />
                              Review
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="draft-center-footer">
                  <button
                    className="button-outline dark-outline"
                    onClick={() => downloadDraftRegister(draftList)}
                  >
                    <FileDown size={16} />
                    Export register
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="operations-panel data-control-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Data Control</span>
                <h2>Forecast readiness</h2>
              </div>
              <span className={`data-score ${scoreClass(qualityScore)}`}>
                {qualityScore}
              </span>
            </div>
            <div className="data-control-body">
              <div className="data-readiness">
                <ShieldCheck size={21} />
                <div>
                  <strong>{quality?.readiness ?? "Checking dataset"}</strong>
                  <span>
                    {quality
                      ? `${quality.acceptance_rate}% accepted - ${quality.history_days} days of history`
                      : "Waiting for dataset profile"}
                  </span>
                </div>
              </div>
              <div className="quality-grid">
                <div><span>Rows</span><strong>{quality?.accepted_rows.toLocaleString() ?? "--"}</strong></div>
                <div><span>Rejected</span><strong>{quality?.rejected_rows ?? "--"}</strong></div>
                <div><span>Duplicates</span><strong>{quality?.duplicate_rows ?? "--"}</strong></div>
                <div><span>Missing</span><strong>{quality?.missing_values ?? "--"}</strong></div>
              </div>
              <div className="mini-preview">
                <div className="mini-preview-head">
                  <span><FileSpreadsheet size={14} /> Active sample</span>
                  <button onClick={() => setImportOpen(true)}>Open</button>
                </div>
                <div className="mini-preview-table">
                  <table>
                    <thead>
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasetPreview?.rows.slice(0, 3).map((row, index) => (
                        <tr key={`${row.product_id ?? "row"}-${index}`}>
                          {previewColumns.map((column) => (
                            <td key={column}>{formatPreviewValue(row[column])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {quality?.warnings.length ? (
                <ul className="data-warnings">
                  {quality.warnings.slice(0, 2).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <div className="data-clean">
                  <Check size={14} />
                  No blocking data quality issues.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {drawerOpen && selectedInventory && (
        <div className="drawer-backdrop" onMouseDown={() => setDrawerOpen(false)}>
          <aside
            className="sku-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="SKU decision context"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">SKU decision context</span>
                <h2>{selectedInventory.product_name}</h2>
              </div>
              <button
                className="icon-command"
                onClick={() => setDrawerOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="drawer-product">
              <span className="product-icon large">
                {(() => {
                  const Icon = productIcons[selectedInventory.product_id] ?? Box;
                  return <Icon size={30} />;
                })()}
              </span>
              <div>
                <strong>{selectedInventory.category}</strong>
                <span className={`risk-pill ${toStatusClass(selectedInventory.risk)}`}>
                  {selectedInventory.risk}
                </span>
              </div>
            </div>

            <div className="drawer-metrics">
              <div>
                <span>Stock on hand</span>
                <strong>{selectedInventory.current_stock.toLocaleString()}</strong>
                <small>units</small>
              </div>
              <div>
                <span>Days of cover</span>
                <strong>{selectedInventory.days_of_cover}</strong>
                <small>days</small>
              </div>
              <div>
                <span>Reorder point</span>
                <strong>{selectedInventory.reorder_point.toLocaleString()}</strong>
                <small>units</small>
              </div>
              <div>
                <span>Forecast accuracy</span>
                <strong>
                  {selectedForecastAccuracy ? `${selectedForecastAccuracy}%` : "--"}
                </strong>
                <small>validation</small>
              </div>
            </div>

            <section className="drawer-section">
              <div className="drawer-section-heading">
                <span><Sparkles size={15} /> Recommended action</span>
                {selectedAction && (
                  <em className={`workflow-status ${toStatusClass(selectedActionStatus)}`}>
                    {selectedActionStatus}
                  </em>
                )}
              </div>
              {selectedAction ? (
                <article className="drawer-action-card">
                  <strong>{selectedAction.title}</strong>
                  <p>{selectedAction.rationale}</p>
                  <dl>
                    <div>
                      <dt>Due date</dt>
                      <dd>{formatDate(selectedAction.due_date)}</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>
                        {selectedAction.recommended_quantity?.toLocaleString() ?? "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt>Confidence</dt>
                      <dd>{selectedAction.confidence_pct}%</dd>
                    </div>
                  </dl>
                </article>
              ) : (
                <div className="draft-empty compact">
                  <Eye size={22} />
                  <span>No active recommendation for this SKU.</span>
                </div>
              )}
            </section>

            <section className="drawer-section">
              <div className="drawer-section-heading">
                <span><SlidersHorizontal size={15} /> Scenario note</span>
              </div>
              <p className="drawer-note">
                {scenario?.insight ??
                  "Use Scenario Lab to test price, promotion, and supplier lead-time changes before creating an order."}
              </p>
            </section>

            <footer>
              {selectedAction?.action_type === "reorder" && !selectedDraft && (
                <button
                  className="button-solid"
                  onClick={() => void createDraft(selectedAction)}
                >
                  <ClipboardCheck size={17} />
                  Create Draft PO
                </button>
              )}
              {selectedDraft && (
                <button
                  className="button-solid"
                  onClick={() => downloadDraft(selectedDraft)}
                >
                  <FileDown size={17} />
                  Download {selectedDraft.draft_id}
                </button>
              )}
              {selectedAction && selectedActionStatus !== "Reviewed" && (
                <button
                  className="button-outline dark-outline"
                  onClick={() =>
                    updateActionStatus(selectedAction.action_id, "Reviewed")
                  }
                >
                  <Check size={17} />
                  Mark reviewed
                </button>
              )}
              {selectedAction && selectedActionStatus !== "Dismissed" && (
                <button
                  className="button-quiet danger"
                  onClick={() =>
                    updateActionStatus(selectedAction.action_id, "Dismissed")
                  }
                >
                  <Archive size={17} />
                  Dismiss
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop" onMouseDown={() => setImportOpen(false)}>
          <section className="import-modal data-control-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Data Control</span>
                <h2>Dataset readiness center</h2>
                <p>Validate sales history, inspect active rows, and refresh the forecast engine.</p>
              </div>
              <button className="icon-command" onClick={() => setImportOpen(false)} title="Close">
                <X size={18} />
              </button>
            </header>
            <div className="data-modal-grid">
              <aside className="data-profile-card">
                <span className={`data-score-orb ${scoreClass(qualityScore)}`}>
                  {qualityScore}
                </span>
                <div>
                  <strong>{quality?.readiness ?? "Dataset profile loading"}</strong>
                  <p>
                    {dataset?.source === "upload" ? dataset.name : "Demo Retail Operations"}
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Accepted rows</dt>
                    <dd>{quality?.accepted_rows.toLocaleString() ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>Acceptance</dt>
                    <dd>{quality?.acceptance_rate ?? "--"}%</dd>
                  </div>
                  <div>
                    <dt>Products</dt>
                    <dd>{quality?.unique_products ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>History</dt>
                    <dd>{quality?.history_days ?? "--"} days</dd>
                  </div>
                </dl>
                <div className="profile-range">
                  <span>{quality?.date_start ?? "--"}</span>
                  <i />
                  <span>{quality?.date_end ?? "--"}</span>
                </div>
              </aside>

              <div className="data-import-stack">
                <label className="file-drop">
                  <Upload size={24} />
                  <strong>{selectedFile?.name ?? "Choose a CSV or XLSX file"}</strong>
                  <span>Maximum 10 MB. Required fields are mapped automatically.</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="schema-panel">
                  <div>
                    <span><Database size={14} /> Required fields</span>
                    <div className="schema-chips">
                      {requiredColumns.map((column) => (
                        <em key={column}>{column}</em>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span><ListChecks size={14} /> Optional planning fields</span>
                    <div className="schema-chips muted">
                      {optionalColumns.map((column) => (
                        <em key={column}>{column}</em>
                      ))}
                    </div>
                  </div>
                </div>
                {importResult && (
                  <div className="quality-result">
                    <span className="quality-check"><Check size={18} /></span>
                    <div>
                      <strong>{importResult.name} is active</strong>
                      <p>
                        {importResult.quality.accepted_rows.toLocaleString()} rows accepted - {importResult.quality.quality_score} quality score - {importResult.quality.readiness}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="data-preview-card">
                <div className="data-preview-title">
                  <span><FileSpreadsheet size={15} /> Active dataset preview</span>
                  <button onClick={downloadCsvTemplate}>
                    <FileDown size={14} />
                    Template
                  </button>
                </div>
                <div className="data-preview-table">
                  <table>
                    <thead>
                      <tr>
                        {previewColumns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasetPreview?.rows.map((row, index) => (
                        <tr key={`${row.product_id ?? "preview"}-${index}`}>
                          {previewColumns.map((column) => (
                            <td key={column}>{formatPreviewValue(row[column])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {quality?.warnings.length ? (
                  <ul className="data-warnings modal-warnings">
                    {quality.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="data-clean modal-clean">
                    <Check size={14} />
                    Dataset is ready for forecast and replenishment calculations.
                  </div>
                )}
              </div>
            </div>
            <footer>
              <div>
                <button className="button-quiet" onClick={() => void resetDataset()} disabled={uploading}>
                  Reset demo data
                </button>
                <button className="button-outline dark-outline" onClick={downloadCsvTemplate}>
                  <FileDown size={16} />
                  Download template
                </button>
              </div>
              <div>
                <button className="button-outline dark-outline" onClick={() => setImportOpen(false)}>Cancel</button>
                <button className="button-solid compact" disabled={!selectedFile || uploading} onClick={() => void importDataset()}>
                  {uploading ? "Validating..." : "Import & activate"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
