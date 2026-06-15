import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  Database,
  FileDown,
  Gauge,
  Headphones,
  Keyboard,
  Laptop,
  LayoutDashboard,
  Monitor,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings,
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
  ForecastResponse,
  InventoryProduct,
  PurchaseOrderDraft,
  ScenarioResponse,
} from "../types";

type ControlTowerProps = {
  onExitDemo: () => void;
};

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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("laptop");
  const [horizon, setHorizon] = useState(30);
  const [priceChange, setPriceChange] = useState(0);
  const [promotionLift, setPromotionLift] = useState(15);
  const [leadTime, setLeadTime] = useState(7);
  const [drafts, setDrafts] = useState<Record<string, PurchaseOrderDraft>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<DatasetInfo | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, productData, actionData, datasetData] =
        await Promise.all([
          api.summary(),
          api.products(),
          api.actions(),
          api.activeDataset(),
        ]);
      setSummary(summaryData);
      setProducts(productData);
      setActions(actionData);
      setDataset(datasetData);
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

  async function createDraft(action: ActionRecommendation) {
    try {
      const draft = await api.createDraft(action.action_id);
      setDrafts((current) => ({ ...current, [action.action_id]: draft }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create draft");
    }
  }

  function focusAction(action: ActionRecommendation) {
    setSelectedProduct(action.product_id);
    document.getElementById("forecast-workspace")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function importDataset() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.importDataset(selectedFile);
      setImportResult(result);
      setScenario(null);
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
            <button className={active ? "active" : ""} key={label} title={label}>
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
              <kbd>⌘ K</kbd>
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
              ? `${dataset.quality.unique_products} SKUs · ${dataset.quality.unique_stores} locations · ${dataset.quality.accepted_rows.toLocaleString()} rows`
              : "Loading dataset"}
          </span>
          <span className="dataset-date">
            As of {summary ? formatDate(summary.as_of) : "—"}
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
              <span className="count-badge">{actions.length}</span>
            </div>
            <div className="queue-filters">
              <button className="active">All</button>
              <button>Critical</button>
              <button>Reorders</button>
              <button>Excess</button>
            </div>
            <div className="action-list">
              {loading && <div className="panel-loading">Ranking decisions…</div>}
              {actions.map((action) => {
                const Icon = productIcons[action.product_id] ?? Box;
                const draft = drafts[action.action_id];
                const isReviewed = reviewed.has(action.action_id);
                return (
                  <article
                    className={`action-card ${action.priority.toLowerCase()}`}
                    key={action.action_id}
                  >
                    <button className="action-main" onClick={() => focusAction(action)}>
                      <span className="product-icon">
                        <Icon size={22} />
                      </span>
                      <span className="action-copy">
                        <span className="action-meta">
                          <b>{action.priority}</b>
                          <i>AI optimized · {action.confidence_pct}%</i>
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
                          className={isReviewed ? "draft-button" : "queue-action"}
                          onClick={() =>
                            setReviewed((current) => new Set(current).add(action.action_id))
                          }
                        >
                          {isReviewed ? <Check size={15} /> : null}
                          {isReviewed ? "Reviewed" : "Review action"}
                        </button>
                      )}
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
                    ? `${forecast.product_name} · ${forecast.model_name} · ${(100 - forecast.validation_wape * 100).toFixed(1)}% validation accuracy`
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
                    <strong>{scenarioLoading ? "Recalculating scenario…" : "AI scenario insight"}</strong>
                    <p>{scenario?.insight ?? "Adjust the controls to model an operating decision."}</p>
                  </div>
                  {scenario && (
                    <span className={scenario.demand_change_pct >= 0 ? "impact-up" : "impact-down"}>
                      {scenario.demand_change_pct > 0 ? "+" : ""}
                      {scenario.demand_change_pct}% demand
                    </span>
                  )}
                </div>
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
                  <strong>{scenario?.recommended_order.toLocaleString() ?? "—"}</strong>
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
                      : "—"}
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
              <div><span>On hand</span><strong>{selectedInventory?.current_stock.toLocaleString() ?? "—"}</strong><small>units</small></div>
              <div><span>Days of cover</span><strong>{selectedInventory?.days_of_cover ?? "—"}</strong><small>days</small></div>
              <div><span>Reorder point</span><strong>{selectedInventory?.reorder_point.toLocaleString() ?? "—"}</strong><small>units</small></div>
              <div><span>Avg. demand</span><strong>{selectedInventory?.avg_daily_demand ?? "—"}</strong><small>units / day</small></div>
            </div>
          </div>
        </section>
      </main>

      {importOpen && (
        <div className="modal-backdrop" onMouseDown={() => setImportOpen(false)}>
          <section className="import-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span className="eyebrow">Data Control</span>
                <h2>Import sales history</h2>
                <p>Activate a validated CSV or Excel dataset across the Control Tower.</p>
              </div>
              <button className="icon-command" onClick={() => setImportOpen(false)} title="Close">
                <X size={18} />
              </button>
            </header>
            <label className="file-drop">
              <Upload size={24} />
              <strong>{selectedFile?.name ?? "Choose a CSV or XLSX file"}</strong>
              <span>Maximum 10 MB. Required: date, product ID, units sold, price.</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {importResult && (
              <div className="quality-result">
                <span className="quality-check"><Check size={18} /></span>
                <div>
                  <strong>{importResult.name} is active</strong>
                  <p>
                    {importResult.quality.accepted_rows.toLocaleString()} rows accepted · {importResult.quality.duplicate_rows} duplicates removed · {importResult.quality.missing_values} missing values
                  </p>
                </div>
              </div>
            )}
            <footer>
              <button className="button-quiet" onClick={() => void resetDataset()} disabled={uploading}>
                Reset demo data
              </button>
              <div>
                <button className="button-outline dark-outline" onClick={() => setImportOpen(false)}>Cancel</button>
                <button className="button-solid compact" disabled={!selectedFile || uploading} onClick={() => void importDataset()}>
                  {uploading ? "Validating…" : "Import & activate"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
