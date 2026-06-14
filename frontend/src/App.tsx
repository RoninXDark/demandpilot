import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronDown,
  CircleGauge,
  FlaskConical,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "./api";
import type {
  DashboardMetric,
  DashboardSummary,
  ForecastResponse,
  InventoryProduct,
  ScenarioResponse,
} from "./types";

const horizons = [7, 30, 90];

function formatMetric(metric: DashboardMetric): string {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(metric.value);
  }
  if (metric.format === "percent") return `${metric.value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    metric.value,
  );
}

function MetricTile({ metric, index }: { metric: DashboardMetric; index: number }) {
  const icons = [TrendingUp, Boxes, BarChart3, AlertTriangle, CircleGauge];
  const Icon = icons[index] ?? CircleGauge;
  return (
    <article className="metric-tile">
      <div className="metric-heading">
        <span>{metric.label}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <strong>{formatMetric(metric)}</strong>
      <small className={metric.change_pct && metric.change_pct < 0 ? "down" : ""}>
        {metric.change_pct == null
          ? "Current planning window"
          : `${metric.change_pct >= 0 ? "+" : ""}${metric.change_pct}% vs prior period`}
      </small>
    </article>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return <span className={`risk risk-${risk.toLowerCase().replaceAll(" ", "-")}`}>{risk}</span>;
}

export default function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("laptop");
  const [horizon, setHorizon] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceChange, setPriceChange] = useState(0);
  const [promotionLift, setPromotionLift] = useState(15);
  const [leadTime, setLeadTime] = useState(7);
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [activeSection, setActiveSection] = useState("overview");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, productData] = await Promise.all([
        api.summary(),
        api.products(),
      ]);
      setSummary(summaryData);
      setProducts(productData);
      if (productData.length && !productData.some((item) => item.product_id === selectedProduct)) {
        setSelectedProduct(productData[0].product_id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedProduct]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    let active = true;
    api
      .forecast(selectedProduct, horizon)
      .then((data) => active && setForecast(data))
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Forecast failed");
      });
    return () => {
      active = false;
    };
  }, [selectedProduct, horizon]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    return [
      ...forecast.history.map((point) => ({
        date: point.date.slice(5),
        actual: point.value,
        forecast: null,
        lower: null,
        upper: null,
      })),
      ...forecast.forecast.map((point) => ({
        date: point.date.slice(5),
        actual: null,
        forecast: point.forecast,
        lower: point.lower,
        upper: point.upper,
      })),
    ];
  }, [forecast]);

  async function runScenario() {
    const result = await api.scenario({
      product_id: selectedProduct,
      horizon_days: horizon,
      price_change_pct: priceChange,
      promotion_lift_pct: promotionLift,
      lead_time_days: leadTime,
    });
    setScenario(result);
  }

  function exportInventory() {
    const headers = [
      "product_id",
      "product_name",
      "category",
      "risk",
      "current_stock",
      "avg_daily_demand",
      "days_of_cover",
      "reorder_point",
      "recommended_order",
    ];
    const rows = products.map((product) =>
      headers
        .map((key) => JSON.stringify(product[key as keyof InventoryProduct] ?? ""))
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `demandpilot-inventory-${summary?.as_of ?? "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">DP</span>
          <span>DemandPilot</span>
        </div>
        <nav aria-label="Primary navigation">
          <a
            className={`nav-item ${activeSection === "overview" ? "active" : ""}`}
            href="#overview"
            title="Overview"
            onClick={() => setActiveSection("overview")}
          >
            <CircleGauge size={18} />
            <span>Overview</span>
          </a>
          <a
            className={`nav-item ${activeSection === "forecast" ? "active" : ""}`}
            href="#forecast"
            title="Forecasts"
            onClick={() => setActiveSection("forecast")}
          >
            <TrendingUp size={18} />
            <span>Forecasts</span>
          </a>
          <a
            className={`nav-item ${activeSection === "inventory" ? "active" : ""}`}
            href="#inventory"
            title="Inventory"
            onClick={() => setActiveSection("inventory")}
          >
            <Boxes size={18} />
            <span>Inventory</span>
          </a>
          <a
            className={`nav-item ${activeSection === "scenarios" ? "active" : ""}`}
            href="#scenarios"
            title="Scenarios"
            onClick={() => setActiveSection("scenarios")}
          >
            <FlaskConical size={18} />
            <span>Scenarios</span>
          </a>
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">OPERATIONS / DEMO RETAIL</p>
            <h1>Demand control room</h1>
          </div>
          <div className="topbar-actions">
            <span className="status-dot">Live data</span>
            <button className="icon-button" onClick={() => void loadDashboard()} title="Refresh data">
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <div className="profile-button" title="Current workspace">
              SM
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="workspace">
          {error && <div className="error-banner">{error}</div>}

          <section className="section-heading" id="overview">
            <div>
              <h2>Portfolio pulse</h2>
              <p>As of {summary?.as_of ?? "loading"}</p>
            </div>
          </section>

          <section className="metrics-grid">
            {summary?.metrics.map((metric, index) => (
              <MetricTile key={metric.label} metric={metric} index={index} />
            ))}
          </section>

          <section className="analysis-grid">
            <div className="panel forecast-panel" id="forecast">
              <div className="panel-header">
                <div>
                  <h2>Demand forecast</h2>
                  <p>
                    {forecast
                      ? `${forecast.model_name} · MAE ${forecast.validation_mae}`
                      : "Loading model"}
                  </p>
                </div>
                <div className="forecast-controls">
                  <label className="select-control">
                    <span className="sr-only">Product</span>
                    <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
                      {products.map((product) => (
                        <option value={product.product_id} key={product.product_id}>
                          {product.product_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="segmented" aria-label="Forecast horizon">
                    {horizons.map((value) => (
                      <button
                        key={value}
                        className={horizon === value ? "selected" : ""}
                        onClick={() => setHorizon(value)}
                      >
                        {value}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#e7e9e5" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 6, borderColor: "#d8ddd7" }} />
                    <Area dataKey="upper" stroke="none" fill="#dcebe5" isAnimationActive={false} />
                    <Area dataKey="lower" stroke="none" fill="#ffffff" isAnimationActive={false} />
                    <Line dataKey="actual" stroke="#17211b" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                    <Line dataKey="forecast" stroke="#147d64" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel revenue-panel">
              <div className="panel-header">
                <div>
                  <h2>Revenue mix</h2>
                  <p>Last 30 days</p>
                </div>
              </div>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary?.revenue_by_product ?? []}
                    layout="vertical"
                    margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid stroke="#e7e9e5" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="product_name"
                      width={112}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#e56b4d" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel inventory-panel" id="inventory">
            <div className="panel-header">
              <div>
                <h2>Inventory decisions</h2>
                <p>Prioritized by operational risk</p>
              </div>
              <button className="text-button" onClick={exportInventory}>Export CSV</button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>On hand</th>
                    <th>Daily demand</th>
                    <th>Days cover</th>
                    <th>Reorder point</th>
                    <th>Suggested order</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <strong>{product.product_name}</strong>
                        <span>{product.category}</span>
                      </td>
                      <td><RiskBadge risk={product.risk} /></td>
                      <td>{product.current_stock.toLocaleString()}</td>
                      <td>{product.avg_daily_demand}</td>
                      <td>{product.days_of_cover}</td>
                      <td>{product.reorder_point.toLocaleString()}</td>
                      <td className="order-value">{product.recommended_order.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="scenario-section" id="scenarios">
            <div className="scenario-heading">
              <span className="section-icon"><FlaskConical size={20} /></span>
              <div>
                <h2>Scenario lab</h2>
                <p>Stress-test the current replenishment plan</p>
              </div>
            </div>
            <div className="scenario-controls">
              <label>
                <span>Price change <strong>{priceChange}%</strong></span>
                <input type="range" min="-30" max="30" value={priceChange} onChange={(event) => setPriceChange(Number(event.target.value))} />
              </label>
              <label>
                <span>Promotion lift <strong>{promotionLift}%</strong></span>
                <input type="range" min="0" max="100" value={promotionLift} onChange={(event) => setPromotionLift(Number(event.target.value))} />
              </label>
              <label>
                <span>Supplier lead time</span>
                <input type="number" min="1" max="60" value={leadTime} onChange={(event) => setLeadTime(Number(event.target.value))} />
              </label>
              <button className="primary-button" onClick={() => void runScenario()}>
                <Sparkles size={17} />
                Run scenario
              </button>
            </div>
            {scenario && (
              <div className="scenario-result">
                <span>Projected units <strong>{scenario.scenario_units.toLocaleString()}</strong></span>
                <span>Demand shift <strong>{scenario.demand_change_pct > 0 ? "+" : ""}{scenario.demand_change_pct}%</strong></span>
                <span>Projected revenue <strong>${scenario.projected_revenue.toLocaleString()}</strong></span>
                <span>Suggested order <strong>{scenario.recommended_order.toLocaleString()}</strong></span>
                <RiskBadge risk={scenario.risk} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
