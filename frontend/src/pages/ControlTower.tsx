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
  Building2,
  CalendarClock,
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
  GitCompareArrows,
  Headphones,
  Keyboard,
  Laptop,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Monitor,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Truck,
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
  DatasetHistoryItem,
  DatasetImportPreview,
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

type AppView = "control-tower" | "product-directory" | "inventory-hub" | "supplier-network";
type ActionFilter = "all" | "critical" | "reorder" | "excess";
type ActionLifecycleStatus = "Open" | "Draft created" | "Reviewed" | "Dismissed";
type ProductRiskFilter = "all" | InventoryProduct["risk"];
type SupplierStatus = "On track" | "Watch" | "Constrained";

type ScenarioSnapshot = {
  id: string;
  label: string;
  productId: string;
  productName: string;
  createdAt: string;
  horizon: number;
  priceChangePct: number;
  promotionLiftPct: number;
  leadTimeDays: number;
  baselineUnits: number;
  scenarioUnits: number;
  projectedRevenue: number;
  demandChangePct: number;
  recommendedOrder: number;
  risk: string;
};

type SupplierPartner = {
  id: string;
  name: string;
  region: string;
  manager: string;
  contract: string;
  reliabilityPct: number;
  leadTimeDays: number;
  minimumOrderQty: number;
  status: SupplierStatus;
  products: InventoryProduct[];
  openActions: ActionRecommendation[];
  openRisk: number;
  recommendedUnits: number;
  nextAction: string;
};

const horizons = [7, 30, 90];

const navigation: {
  label: string;
  icon: LucideIcon;
  view?: AppView;
  anchor?: string;
  dataControl?: boolean;
}[] = [
  { label: "Control Tower", icon: LayoutDashboard, view: "control-tower" },
  { label: "Action Center", icon: ClipboardCheck, anchor: "action-center" },
  { label: "Demand Analytics", icon: BarChart3, anchor: "forecast-workspace" },
  { label: "Product Directory", icon: Box, view: "product-directory" },
  { label: "Inventory Hub", icon: Boxes, view: "inventory-hub" },
  { label: "Data Control", icon: Database, dataControl: true },
  { label: "Supplier Network", icon: Users, view: "supplier-network" },
];

const productIcons: Record<string, LucideIcon> = {
  laptop: Laptop,
  dock: Box,
  keyboard: Keyboard,
  monitor: Monitor,
  webcam: Video,
  headset: Headphones,
};

const supplierProfiles: Record<
  string,
  {
    name: string;
    region: string;
    manager: string;
    contract: string;
    reliabilityPct: number;
    leadTimeDays: number;
    minimumOrderQty: number;
  }
> = {
  laptop: {
    name: "Aster Components",
    region: "EU distribution",
    manager: "Marta Novak",
    contract: "Quarterly capacity reserve",
    reliabilityPct: 92,
    leadTimeDays: 8,
    minimumOrderQty: 400,
  },
  monitor: {
    name: "Aster Components",
    region: "EU distribution",
    manager: "Marta Novak",
    contract: "Quarterly capacity reserve",
    reliabilityPct: 92,
    leadTimeDays: 14,
    minimumOrderQty: 240,
  },
  dock: {
    name: "NorthDock Logistics",
    region: "Central Europe",
    manager: "Piotr Zielinski",
    contract: "Monthly replenishment lane",
    reliabilityPct: 86,
    leadTimeDays: 7,
    minimumOrderQty: 180,
  },
  keyboard: {
    name: "NorthDock Logistics",
    region: "Central Europe",
    manager: "Piotr Zielinski",
    contract: "Monthly replenishment lane",
    reliabilityPct: 86,
    leadTimeDays: 9,
    minimumOrderQty: 300,
  },
  webcam: {
    name: "ClearView Optics",
    region: "Asia consolidation",
    manager: "Ewa Kowalska",
    contract: "Expedited shortage coverage",
    reliabilityPct: 78,
    leadTimeDays: 10,
    minimumOrderQty: 220,
  },
  headset: {
    name: "ClearView Optics",
    region: "Asia consolidation",
    manager: "Ewa Kowalska",
    contract: "Expedited shortage coverage",
    reliabilityPct: 78,
    leadTimeDays: 12,
    minimumOrderQty: 260,
  },
};

const defaultSupplierProfile = {
  name: "Unassigned Supplier",
  region: "Needs sourcing owner",
  manager: "Operations team",
  contract: "Manual review",
  reliabilityPct: 72,
  leadTimeDays: 14,
  minimumOrderQty: 100,
};

const defaultScenarioSnapshots: ScenarioSnapshot[] = [
  {
    id: "demo-promo-laptop",
    label: "Promotion lift stress test",
    productId: "laptop",
    productName: "Aster Pro Laptop",
    createdAt: "2026-06-17T09:00:00Z",
    horizon: 30,
    priceChangePct: 0,
    promotionLiftPct: 35,
    leadTimeDays: 9,
    baselineUnits: 1254,
    scenarioUnits: 1693,
    projectedRevenue: 2030000,
    demandChangePct: 35,
    recommendedOrder: 1590,
    risk: "Stockout risk",
  },
  {
    id: "demo-delay-webcam",
    label: "Supplier delay buffer",
    productId: "webcam",
    productName: "ClearView Webcam",
    createdAt: "2026-06-17T09:15:00Z",
    horizon: 30,
    priceChangePct: 0,
    promotionLiftPct: 18,
    leadTimeDays: 14,
    baselineUnits: 525,
    scenarioUnits: 620,
    projectedRevenue: 67580,
    demandChangePct: 18,
    recommendedOrder: 716,
    risk: "Stockout risk",
  },
  {
    id: "demo-markdown-keyboard",
    label: "Markdown recovery",
    productId: "keyboard",
    productName: "TypeOne Keyboard",
    createdAt: "2026-06-17T09:30:00Z",
    horizon: 30,
    priceChangePct: -10,
    promotionLiftPct: 12,
    leadTimeDays: 7,
    baselineUnits: 561,
    scenarioUnits: 701,
    projectedRevenue: 56150,
    demandChangePct: 25,
    recommendedOrder: 0,
    risk: "Healthy",
  },
];

const actionFilters: { id: ActionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "reorder", label: "Reorders" },
  { id: "excess", label: "Excess" },
];

const productRiskFilters: { id: ProductRiskFilter; label: string }[] = [
  { id: "all", label: "All health states" },
  { id: "Stockout risk", label: "Stockout risk" },
  { id: "Overstock", label: "Overstock" },
  { id: "Healthy", label: "Healthy" },
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

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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

function riskOrder(risk: InventoryProduct["risk"]) {
  if (risk === "Stockout risk") return 0;
  if (risk === "Overstock") return 1;
  return 2;
}

function buildSupplierPartners(
  products: InventoryProduct[],
  actions: ActionRecommendation[],
): SupplierPartner[] {
  const partners = new Map<string, SupplierPartner>();

  for (const product of products) {
    const profile = supplierProfiles[product.product_id] ?? defaultSupplierProfile;
    const productActions = actions.filter(
      (action) => action.product_id === product.product_id,
    );
    const existing =
      partners.get(profile.name) ??
      ({
        id: profile.name.toLowerCase().replaceAll(" ", "-"),
        name: profile.name,
        region: profile.region,
        manager: profile.manager,
        contract: profile.contract,
        reliabilityPct: profile.reliabilityPct,
        leadTimeDays: profile.leadTimeDays,
        minimumOrderQty: profile.minimumOrderQty,
        status: "On track",
        products: [],
        openActions: [],
        openRisk: 0,
        recommendedUnits: 0,
        nextAction: "Monitor demand signals",
      } satisfies SupplierPartner);

    existing.products.push(product);
    existing.openActions.push(...productActions);
    existing.openRisk += product.risk === "Stockout risk" ? 1 : 0;
    existing.recommendedUnits += product.recommended_order;
    existing.leadTimeDays = Math.round(
      (existing.leadTimeDays * Math.max(existing.products.length - 1, 0) +
        profile.leadTimeDays) /
        existing.products.length,
    );
    existing.minimumOrderQty = Math.max(existing.minimumOrderQty, profile.minimumOrderQty);
    partners.set(profile.name, existing);
  }

  return [...partners.values()]
    .map((partner) => {
      let status: SupplierStatus = "On track";
      if (partner.openRisk > 0 && partner.reliabilityPct < 85) status = "Constrained";
      else if (partner.openRisk > 0 || partner.recommendedUnits > partner.minimumOrderQty) status = "Watch";

      const nextAction =
        status === "Constrained"
          ? "Escalate capacity and confirm expedited dates"
          : partner.recommendedUnits > 0
            ? "Bundle open replenishment into the next supplier PO"
            : "Keep normal replenishment cadence";

      return { ...partner, status, nextAction };
    })
    .sort(
      (left, right) =>
        (right.openRisk - left.openRisk) ||
        (right.recommendedUnits - left.recommendedUnits) ||
        left.name.localeCompare(right.name),
    );
}

type ProductWorkspaceProps = {
  products: InventoryProduct[];
  loading: boolean;
  categories: string[];
  categoryFilter: string;
  riskFilter: ProductRiskFilter;
  onCategoryChange: (value: string) => void;
  onRiskChange: (value: ProductRiskFilter) => void;
  onOpenProduct: (product: InventoryProduct) => void;
};

function ProductDirectoryWorkspace({
  products,
  loading,
  categories,
  categoryFilter,
  riskFilter,
  onCategoryChange,
  onRiskChange,
  onOpenProduct,
}: ProductWorkspaceProps) {
  const atRisk = products.filter((product) => product.risk === "Stockout risk").length;
  const healthy = products.filter((product) => product.risk === "Healthy").length;
  const averageCover = products.length
    ? Math.round(products.reduce((total, product) => total + product.days_of_cover, 0) / products.length)
    : 0;

  return (
    <section className="catalog-workspace" aria-labelledby="product-directory-heading">
      <div className="catalog-intro">
        <div>
          <span className="eyebrow">Catalog operations</span>
          <h2 id="product-directory-heading">Product Directory</h2>
          <p>Search the product catalog, compare inventory signals, and open a SKU decision context.</p>
        </div>
        <span className="catalog-count">{products.length} matching SKUs</span>
      </div>

      <div className="catalog-stat-grid">
        <article>
          <span>Total catalog</span>
          <strong>{products.length}</strong>
          <small>active SKUs in planning</small>
        </article>
        <article className="warning">
          <span>Stockout risk</span>
          <strong>{atRisk}</strong>
          <small>need replenishment review</small>
        </article>
        <article>
          <span>Healthy coverage</span>
          <strong>{healthy}</strong>
          <small>SKUs in target range</small>
        </article>
        <article>
          <span>Average cover</span>
          <strong>{averageCover}d</strong>
          <small>across this result set</small>
        </article>
      </div>

      <section className="catalog-table-surface">
        <div className="catalog-toolbar">
          <div>
            <span className="eyebrow">Filtered inventory catalog</span>
            <strong>SKU planning profile</strong>
          </div>
          <div className="catalog-filters">
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option value={category} key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Health</span>
              <select
                value={riskFilter}
                onChange={(event) => onRiskChange(event.target.value as ProductRiskFilter)}
              >
                {productRiskFilters.map((filter) => (
                  <option value={filter.id} key={filter.id}>{filter.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="catalog-table-scroll">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>On hand</th>
                <th>Daily demand</th>
                <th>Days of cover</th>
                <th>Reorder point</th>
                <th>Recommended order</th>
                <th>Health</th>
                <th><span className="sr-only">Open SKU</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="catalog-empty">Loading product catalog...</td></tr>
              )}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="catalog-empty">No SKUs match the current search and filters.</td></tr>
              )}
              {products.map((product) => {
                const Icon = productIcons[product.product_id] ?? Box;
                return (
                  <tr key={product.product_id}>
                    <td>
                      <button className="catalog-product" onClick={() => onOpenProduct(product)}>
                        <span className="product-icon"><Icon size={19} /></span>
                        <span><strong>{product.product_name}</strong><small>{product.category}</small></span>
                      </button>
                    </td>
                    <td><strong>{product.current_stock.toLocaleString()}</strong><small>units</small></td>
                    <td>{product.avg_daily_demand.toLocaleString()} / day</td>
                    <td><strong>{product.days_of_cover}d</strong></td>
                    <td>{product.reorder_point.toLocaleString()}</td>
                    <td>{product.recommended_order > 0 ? product.recommended_order.toLocaleString() : "--"}</td>
                    <td><span className={`risk-pill ${toStatusClass(product.risk)}`}>{product.risk}</span></td>
                    <td>
                      <button className="table-open-button" onClick={() => onOpenProduct(product)} title={`Open ${product.product_name}`}>
                        <ChevronRight size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function InventoryHubWorkspace({
  products,
  loading,
  categories,
  categoryFilter,
  riskFilter,
  onCategoryChange,
  onRiskChange,
  onOpenProduct,
}: ProductWorkspaceProps) {
  const atRisk = products.filter((product) => product.risk === "Stockout risk").length;
  const overstock = products.filter((product) => product.risk === "Overstock").length;
  const totalStock = products.reduce((total, product) => total + product.current_stock, 0);
  const recommendedUnits = products.reduce((total, product) => total + product.recommended_order, 0);
  const sortedProducts = [...products].sort(
    (left, right) => riskOrder(left.risk) - riskOrder(right.risk) || left.days_of_cover - right.days_of_cover,
  );

  return (
    <section className="catalog-workspace inventory-workspace" aria-labelledby="inventory-hub-heading">
      <div className="catalog-intro">
        <div>
          <span className="eyebrow">Inventory operations</span>
          <h2 id="inventory-hub-heading">Inventory Hub</h2>
          <p>Review stock positions against reorder points and act on the most urgent coverage gaps.</p>
        </div>
        <span className="catalog-count">Prioritized by coverage risk</span>
      </div>

      <div className="catalog-stat-grid inventory-stat-grid">
        <article>
          <span>Units on hand</span>
          <strong>{totalStock.toLocaleString()}</strong>
          <small>across visible SKUs</small>
        </article>
        <article className="risk">
          <span>Critical coverage</span>
          <strong>{atRisk}</strong>
          <small>SKUs below safe cover</small>
        </article>
        <article className="warning">
          <span>Excess inventory</span>
          <strong>{overstock}</strong>
          <small>SKUs worth reviewing</small>
        </article>
        <article className="teal">
          <span>Suggested replenishment</span>
          <strong>{recommendedUnits.toLocaleString()}</strong>
          <small>units from current signals</small>
        </article>
      </div>

      <section className="catalog-table-surface inventory-table-surface">
        <div className="catalog-toolbar">
          <div>
            <span className="eyebrow">Stock position monitor</span>
            <strong>Inventory health and replenishment</strong>
          </div>
          <div className="catalog-filters">
            <label>
              <span>Category</span>
              <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option value={category} key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Health</span>
              <select
                value={riskFilter}
                onChange={(event) => onRiskChange(event.target.value as ProductRiskFilter)}
              >
                {productRiskFilters.map((filter) => (
                  <option value={filter.id} key={filter.id}>{filter.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="catalog-table-scroll">
          <table className="catalog-table inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Stock position</th>
                <th>Coverage</th>
                <th>Reorder point</th>
                <th>Recommended order</th>
                <th>Health</th>
                <th><span className="sr-only">Open SKU</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="catalog-empty">Calculating inventory positions...</td></tr>
              )}
              {!loading && sortedProducts.length === 0 && (
                <tr><td colSpan={7} className="catalog-empty">No inventory positions match the current filters.</td></tr>
              )}
              {sortedProducts.map((product) => {
                const Icon = productIcons[product.product_id] ?? Box;
                const stockPosition = Math.min(
                  100,
                  Math.max(8, Math.round((product.current_stock / Math.max(product.reorder_point, 1)) * 100)),
                );
                return (
                  <tr key={product.product_id}>
                    <td>
                      <button className="catalog-product" onClick={() => onOpenProduct(product)}>
                        <span className="product-icon"><Icon size={19} /></span>
                        <span><strong>{product.product_name}</strong><small>{product.category}</small></span>
                      </button>
                    </td>
                    <td>
                      <div className="stock-position">
                        <span><strong>{product.current_stock.toLocaleString()}</strong> / {product.reorder_point.toLocaleString()} units</span>
                        <i><b className={toStatusClass(product.risk)} style={{ width: `${stockPosition}%` }} /></i>
                      </div>
                    </td>
                    <td><strong>{product.days_of_cover}d</strong><small>{product.avg_daily_demand.toLocaleString()} / day</small></td>
                    <td>{product.reorder_point.toLocaleString()}</td>
                    <td>{product.recommended_order > 0 ? <strong>{product.recommended_order.toLocaleString()} units</strong> : "No order"}</td>
                    <td><span className={`risk-pill ${toStatusClass(product.risk)}`}>{product.risk}</span></td>
                    <td>
                      <button className="table-open-button" onClick={() => onOpenProduct(product)} title={`Open ${product.product_name}`}>
                        <ChevronRight size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

type ScenarioComparisonProps = {
  snapshots: ScenarioSnapshot[];
  onApply: (snapshot: ScenarioSnapshot) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

function ScenarioComparison({
  snapshots,
  onApply,
  onRemove,
  onClear,
}: ScenarioComparisonProps) {
  return (
    <section className="scenario-comparison" aria-labelledby="scenario-comparison-heading">
      <div className="scenario-comparison-heading">
        <div>
          <span className="eyebrow">Scenario comparison</span>
          <h3 id="scenario-comparison-heading">
            <GitCompareArrows size={16} />
            Saved planning options
          </h3>
        </div>
        {snapshots.length > 0 && (
          <button className="button-quiet danger compact-text" onClick={onClear}>
            <Trash2 size={14} />
            Clear
          </button>
        )}
      </div>

      {snapshots.length === 0 ? (
        <div className="scenario-empty">
          <GitCompareArrows size={23} />
          <strong>No saved scenarios yet</strong>
          <span>Adjust Scenario Lab and save the current option to compare order impact.</span>
        </div>
      ) : (
        <div className="scenario-comparison-grid">
          {snapshots.map((snapshot) => {
            const delta = snapshot.scenarioUnits - snapshot.baselineUnits;
            const maxUnits = Math.max(snapshot.scenarioUnits, snapshot.baselineUnits, 1);
            return (
              <article className="scenario-card" key={snapshot.id}>
                <header>
                  <div>
                    <strong>{snapshot.label}</strong>
                    <span>{snapshot.productName}</span>
                  </div>
                  <em className={`risk-pill ${toStatusClass(snapshot.risk)}`}>
                    {snapshot.risk}
                  </em>
                </header>
                <div className="scenario-card-metrics">
                  <div>
                    <span>Demand change</span>
                    <strong className={snapshot.demandChangePct >= 0 ? "impact-up" : "impact-down"}>
                      {snapshot.demandChangePct > 0 ? "+" : ""}
                      {snapshot.demandChangePct}%
                    </strong>
                  </div>
                  <div>
                    <span>Order</span>
                    <strong>{formatCompactNumber(snapshot.recommendedOrder)}</strong>
                  </div>
                  <div>
                    <span>Revenue</span>
                    <strong>{formatCompactCurrency(snapshot.projectedRevenue)}</strong>
                  </div>
                </div>
                <div className="scenario-bars" aria-label="Scenario demand comparison">
                  <span>
                    <i style={{ width: `${Math.max(8, (snapshot.baselineUnits / maxUnits) * 100)}%` }} />
                    Baseline {formatCompactNumber(snapshot.baselineUnits)}
                  </span>
                  <span>
                    <i className="scenario" style={{ width: `${Math.max(8, (snapshot.scenarioUnits / maxUnits) * 100)}%` }} />
                    Scenario {formatCompactNumber(snapshot.scenarioUnits)}
                  </span>
                </div>
                <footer>
                  <span>
                    <CalendarClock size={13} />
                    {formatDate(snapshot.createdAt.slice(0, 10))} - {snapshot.horizon}d
                  </span>
                  <span>{delta >= 0 ? "+" : ""}{formatCompactNumber(delta)} units</span>
                </footer>
                <div className="scenario-card-actions">
                  <button onClick={() => onApply(snapshot)}>Apply</button>
                  <button
                    className="icon-command"
                    onClick={() => onRemove(snapshot.id)}
                    title="Remove scenario"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

type SupplierNetworkWorkspaceProps = {
  products: InventoryProduct[];
  actions: ActionRecommendation[];
  loading: boolean;
  onOpenProduct: (product: InventoryProduct) => void;
};

function SupplierNetworkWorkspace({
  products,
  actions,
  loading,
  onOpenProduct,
}: SupplierNetworkWorkspaceProps) {
  const partners = useMemo(
    () => buildSupplierPartners(products, actions),
    [products, actions],
  );
  const averageReliability = partners.length
    ? Math.round(partners.reduce((total, partner) => total + partner.reliabilityPct, 0) / partners.length)
    : 0;
  const constrained = partners.filter((partner) => partner.status === "Constrained").length;
  const recommendedUnits = partners.reduce((total, partner) => total + partner.recommendedUnits, 0);
  const lanes = partners.flatMap((partner) =>
    partner.products.map((product) => ({ partner, product })),
  ).sort(
    (left, right) =>
      riskOrder(left.product.risk) - riskOrder(right.product.risk) ||
      right.product.recommended_order - left.product.recommended_order,
  );

  return (
    <section className="catalog-workspace supplier-workspace" aria-labelledby="supplier-network-heading">
      <div className="catalog-intro">
        <div>
          <span className="eyebrow">Supplier operations</span>
          <h2 id="supplier-network-heading">Supplier Network</h2>
          <p>Connect replenishment decisions to supplier capacity, reliability, lead times, and order lanes.</p>
        </div>
        <span className="catalog-count">{partners.length} supplier partners</span>
      </div>

      <div className="catalog-stat-grid supplier-stat-grid">
        <article>
          <span>Supplier partners</span>
          <strong>{partners.length}</strong>
          <small>linked to active SKUs</small>
        </article>
        <article className="teal">
          <span>Avg reliability</span>
          <strong>{averageReliability}%</strong>
          <small>portfolio service signal</small>
        </article>
        <article className={constrained ? "risk" : ""}>
          <span>Constrained lanes</span>
          <strong>{constrained}</strong>
          <small>need escalation</small>
        </article>
        <article className="warning">
          <span>Suggested PO units</span>
          <strong>{formatCompactNumber(recommendedUnits)}</strong>
          <small>from current inventory state</small>
        </article>
      </div>

      <div className="supplier-grid">
        <section className="supplier-board" aria-label="Supplier readiness board">
          <div className="supplier-section-heading">
            <div>
              <span className="eyebrow">Readiness board</span>
              <strong>Partner capacity and service health</strong>
            </div>
            <Truck size={18} />
          </div>
          {loading && <div className="catalog-empty">Loading supplier network...</div>}
          {!loading && partners.map((partner) => (
            <article className={`supplier-card status-${toStatusClass(partner.status)}`} key={partner.id}>
              <header>
                <span className="supplier-icon"><Building2 size={19} /></span>
                <div>
                  <strong>{partner.name}</strong>
                  <span><MapPinned size={12} /> {partner.region}</span>
                </div>
                <em>{partner.status}</em>
              </header>
              <div className="supplier-card-grid">
                <div>
                  <span>Reliability</span>
                  <strong>{partner.reliabilityPct}%</strong>
                </div>
                <div>
                  <span>Lead time</span>
                  <strong>{partner.leadTimeDays}d</strong>
                </div>
                <div>
                  <span>Open risk</span>
                  <strong>{partner.openRisk}</strong>
                </div>
                <div>
                  <span>Suggested PO</span>
                  <strong>{formatCompactNumber(partner.recommendedUnits)}</strong>
                </div>
              </div>
              <div className="supplier-progress">
                <span>
                  <i style={{ width: `${partner.reliabilityPct}%` }} />
                </span>
                <b>{partner.contract}</b>
              </div>
              <footer>
                <span>{partner.manager}</span>
                <strong>{partner.nextAction}</strong>
              </footer>
            </article>
          ))}
        </section>

        <section className="supplier-lanes" aria-label="Supplier replenishment lanes">
          <div className="supplier-section-heading">
            <div>
              <span className="eyebrow">Replenishment lanes</span>
              <strong>SKU to supplier action map</strong>
            </div>
            <PackageCheck size={18} />
          </div>
          <div className="supplier-lane-list">
            {loading && <div className="catalog-empty">Calculating supplier lanes...</div>}
            {!loading && lanes.map(({ partner, product }) => {
              const Icon = productIcons[product.product_id] ?? Box;
              const action = actions.find((item) => item.product_id === product.product_id);
              return (
                <article className="supplier-lane" key={`${partner.id}-${product.product_id}`}>
                  <button className="supplier-lane-product" onClick={() => onOpenProduct(product)}>
                    <span className="product-icon"><Icon size={18} /></span>
                    <span>
                      <strong>{product.product_name}</strong>
                      <small>{partner.name}</small>
                    </span>
                  </button>
                  <span className={`risk-pill ${toStatusClass(product.risk)}`}>
                    {product.risk}
                  </span>
                  <dl>
                    <div>
                      <dt>Cover</dt>
                      <dd>{product.days_of_cover}d</dd>
                    </div>
                    <div>
                      <dt>MOQ</dt>
                      <dd>{partner.minimumOrderQty.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Suggested</dt>
                      <dd>{product.recommended_order.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <button className="table-open-button" onClick={() => onOpenProduct(product)} title={`Open ${product.product_name}`}>
                    <ChevronRight size={17} />
                  </button>
                  <p>{action?.title ?? "No immediate supplier action required."}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
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
  const initialView = initialParams.get("view");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [datasetHistory, setDatasetHistory] = useState<DatasetHistoryItem[]>([]);
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
  const [savedScenarios, setSavedScenarios] = useState<ScenarioSnapshot[]>(() =>
    readStoredRecord<ScenarioSnapshot[]>(
      "demandpilot-scenario-snapshots",
      defaultScenarioSnapshots,
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
  const [activeView, setActiveView] = useState<AppView>(
    initialView === "product-directory" ||
      initialView === "inventory-hub" ||
      initialView === "supplier-network"
      ? initialView
      : "control-tower",
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<ProductRiskFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(initialParams.has("sku"));
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(initialParams.has("data-control"));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stagedDataset, setStagedDataset] = useState<DatasetImportPreview | null>(null);
  const [importResult, setImportResult] = useState<DatasetInfo | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, productData, actionData, datasetData, previewData, historyData] =
        await Promise.all([
          api.summary(),
          api.products(),
          api.actions(),
          api.activeDataset(),
          api.activeDatasetPreview(8),
          api.datasets(),
        ]);
      setSummary(summaryData);
      setProducts(productData);
      setActions(actionData);
      setDataset(datasetData);
      setDatasetPreview(previewData);
      setDatasetHistory(historyData);
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
    saveStoredRecord("demandpilot-scenario-snapshots", savedScenarios);
  }, [savedScenarios]);

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

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query || [product.product_name, product.product_id, product.category]
        .some((value) => value.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesRisk = riskFilter === "all" || product.risk === riskFilter;
      return matchesQuery && matchesCategory && matchesRisk;
    });
  }, [products, catalogSearch, categoryFilter, riskFilter]);

  const selectedInventory = products.find(
    (product) => product.product_id === selectedProduct,
  );

  function getActionStatus(action: ActionRecommendation): ActionLifecycleStatus {
    return actionStates[action.action_id] ?? "Open";
  }

  const visibleActions = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return actions.filter((action) => {
      const matchesQuery = !query || [
        action.product_name,
        action.product_id,
        action.category,
        action.title,
      ].some((value) => value.toLowerCase().includes(query));
      if (!matchesQuery) return false;
      if (actionFilter === "critical") return action.priority === "Critical";
      if (actionFilter === "reorder") return action.action_type === "reorder";
      if (actionFilter === "excess") return action.action_type === "markdown";
      return true;
    });
  }, [actions, actionFilter, catalogSearch]);

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
  const lifecycleDataset = stagedDataset?.dataset ?? dataset;
  const lifecycleQuality = lifecycleDataset?.quality ?? quality;
  const lifecyclePreview = stagedDataset?.preview ?? datasetPreview;
  const lifecycleColumns = lifecyclePreview?.columns.slice(0, 6) ?? [];
  const mappedColumns = stagedDataset?.column_mappings.filter(
    (mapping) => mapping.mapping_type !== "ignored",
  ) ?? [];
  const modelCandidates = forecast?.model_candidates.slice(0, 3) ?? [];
  const pageMeta = {
    "control-tower": {
      breadcrumb: "Operations / Control Tower",
      title: "Inventory Control Tower",
      placeholder: "Search products or actions",
    },
    "product-directory": {
      breadcrumb: "Operations / Product Directory",
      title: "Product Directory",
      placeholder: "Search SKU, product, or category",
    },
    "inventory-hub": {
      breadcrumb: "Operations / Inventory Hub",
      title: "Inventory Hub",
      placeholder: "Search inventory positions",
    },
    "supplier-network": {
      breadcrumb: "Operations / Supplier Network",
      title: "Supplier Network",
      placeholder: "Search supplier SKUs or actions",
    },
  }[activeView];

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

  function saveScenarioSnapshot() {
    if (!scenario || !selectedInventory) return;
    const labelParts = [
      priceChange === 0 ? "Base price" : `${priceChange > 0 ? "+" : ""}${priceChange}% price`,
      promotionLift === 0 ? "no promo" : `+${promotionLift}% promo`,
      `${leadTime}d lead`,
    ];
    const snapshot: ScenarioSnapshot = {
      id: `${selectedProduct}-${Date.now()}`,
      label: labelParts.join(" / "),
      productId: selectedProduct,
      productName: selectedInventory.product_name,
      createdAt: new Date().toISOString(),
      horizon,
      priceChangePct: priceChange,
      promotionLiftPct: promotionLift,
      leadTimeDays: leadTime,
      baselineUnits: scenario.baseline_units,
      scenarioUnits: scenario.scenario_units,
      projectedRevenue: scenario.projected_revenue,
      demandChangePct: scenario.demand_change_pct,
      recommendedOrder: scenario.recommended_order,
      risk: scenario.risk,
    };
    setSavedScenarios((current) => [snapshot, ...current].slice(0, 6));
  }

  function applyScenarioSnapshot(snapshot: ScenarioSnapshot) {
    setActiveView("control-tower");
    setSelectedProduct(snapshot.productId);
    setHorizon(snapshot.horizon);
    setPriceChange(snapshot.priceChangePct);
    setPromotionLift(snapshot.promotionLiftPct);
    setLeadTime(snapshot.leadTimeDays);
    window.setTimeout(() => {
      document.getElementById("forecast-workspace")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function removeScenarioSnapshot(id: string) {
    setSavedScenarios((current) => current.filter((snapshot) => snapshot.id !== id));
  }

  function focusAction(action: ActionRecommendation) {
    setSelectedProduct(action.product_id);
    setDrawerOpen(true);
  }

  function focusProduct(product: InventoryProduct) {
    setSelectedProduct(product.product_id);
    setDrawerOpen(true);
  }

  function handleNavigation(item: (typeof navigation)[number]) {
    if (item.dataControl) {
      setImportOpen(true);
      return;
    }
    if (item.view) {
      setActiveView(item.view);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (item.anchor) {
      setActiveView("control-tower");
      window.setTimeout(() => {
        document.getElementById(item.anchor ?? "")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }
  }

  function clearDecisionWorkflow() {
    setScenario(null);
    setDrafts({});
    setActionStates({});
  }

  async function previewDataset() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.previewDataset(selectedFile);
      setStagedDataset(result);
      setImportResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dataset preview failed");
    } finally {
      setUploading(false);
    }
  }

  async function activateStagedDataset() {
    if (!stagedDataset) return;
    setUploading(true);
    setError("");
    try {
      const result = await api.activateDataset(stagedDataset.dataset.dataset_id);
      setImportResult(result);
      setSelectedFile(null);
      setStagedDataset(null);
      clearDecisionWorkflow();
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dataset activation failed");
    } finally {
      setUploading(false);
    }
  }

  async function discardStagedDataset() {
    if (!stagedDataset) return;
    setUploading(true);
    try {
      await api.discardDataset(stagedDataset.dataset.dataset_id);
      setStagedDataset(null);
      setSelectedFile(null);
      setImportResult(null);
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to discard dataset");
    } finally {
      setUploading(false);
    }
  }

  async function activateHistoryDataset(item: DatasetHistoryItem) {
    if (item.status === "active") return;
    setUploading(true);
    setError("");
    try {
      const result =
        item.source === "demo"
          ? await api.resetDataset()
          : await api.activateDataset(item.dataset_id);
      setImportResult(result);
      setStagedDataset(null);
      setSelectedFile(null);
      clearDecisionWorkflow();
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to activate dataset");
    } finally {
      setUploading(false);
    }
  }

  async function discardHistoryDataset(item: DatasetHistoryItem) {
    if (item.status === "active") return;
    setUploading(true);
    try {
      await api.discardDataset(item.dataset_id);
      if (stagedDataset?.dataset.dataset_id === item.dataset_id) {
        setStagedDataset(null);
        setSelectedFile(null);
      }
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to discard dataset");
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
      setStagedDataset(null);
      clearDecisionWorkflow();
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
          {navigation.map((item) => {
            const { label, icon: Icon } = item;
            const active = item.view === activeView;
            return (
            <button
              className={active ? "active" : ""}
              key={label}
              onClick={() => handleNavigation(item)}
              title={label}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && label === "Action Center" && (
                <b>{actions.filter((action) => action.priority === "Critical").length}</b>
              )}
            </button>
            );
          })}
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
            <span className="breadcrumb">{pageMeta.breadcrumb}</span>
            <h1>{pageMeta.title}</h1>
          </div>
          <div className="header-tools">
            <label className="command-search">
              <Search size={16} />
              <input
                aria-label="Search products"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder={pageMeta.placeholder}
              />
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

        {activeView === "product-directory" && (
          <ProductDirectoryWorkspace
            products={filteredProducts}
            loading={loading}
            categories={categories}
            categoryFilter={categoryFilter}
            riskFilter={riskFilter}
            onCategoryChange={setCategoryFilter}
            onRiskChange={setRiskFilter}
            onOpenProduct={focusProduct}
          />
        )}

        {activeView === "inventory-hub" && (
          <InventoryHubWorkspace
            products={filteredProducts}
            loading={loading}
            categories={categories}
            categoryFilter={categoryFilter}
            riskFilter={riskFilter}
            onCategoryChange={setCategoryFilter}
            onRiskChange={setRiskFilter}
            onOpenProduct={focusProduct}
          />
        )}

        {activeView === "supplier-network" && (
          <SupplierNetworkWorkspace
            products={filteredProducts}
            actions={actions}
            loading={loading}
            onOpenProduct={focusProduct}
          />
        )}

        {activeView === "control-tower" && (
          <>
        <section className="decision-workspace">
          <div className="action-panel" id="action-center">
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
                    {scenario ? formatCompactCurrency(scenario.projected_revenue) : "--"}
                  </strong>
                  <small>{scenario?.risk ?? "Planning window"}</small>
                </div>
                <button
                  className="scenario-save-button"
                  onClick={saveScenarioSnapshot}
                  disabled={!scenario || scenarioLoading}
                >
                  <Save size={15} />
                  Save scenario
                </button>
              </aside>
            </div>
            <ScenarioComparison
              snapshots={savedScenarios}
              onApply={applyScenarioSnapshot}
              onRemove={removeScenarioSnapshot}
              onClear={() => setSavedScenarios([])}
            />
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
          </>
        )}
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
                <h2>Dataset lifecycle</h2>
                <p>Stage, validate, activate, and restore planning datasets with a full audit trail.</p>
              </div>
              <button className="icon-command" onClick={() => setImportOpen(false)} title="Close">
                <X size={18} />
              </button>
            </header>
            <div className="data-modal-grid">
              <aside className="data-profile-card">
                <span className={`data-score-orb ${scoreClass(lifecycleQuality?.quality_score)}`}>
                  {lifecycleQuality?.quality_score ?? "--"}
                </span>
                <div>
                  <strong>
                    {stagedDataset ? "Ready to activate" : lifecycleQuality?.readiness ?? "Dataset profile loading"}
                  </strong>
                  <p>
                    {lifecycleDataset?.source === "upload" ? lifecycleDataset.name : "Demo Retail Operations"}
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Accepted rows</dt>
                    <dd>{lifecycleQuality?.accepted_rows.toLocaleString() ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>Acceptance</dt>
                    <dd>{lifecycleQuality?.acceptance_rate ?? "--"}%</dd>
                  </div>
                  <div>
                    <dt>Products</dt>
                    <dd>{lifecycleQuality?.unique_products ?? "--"}</dd>
                  </div>
                  <div>
                    <dt>History</dt>
                    <dd>{lifecycleQuality?.history_days ?? "--"} days</dd>
                  </div>
                </dl>
                <div className="profile-range">
                  <span>{lifecycleQuality?.date_start ?? "--"}</span>
                  <i />
                  <span>{lifecycleQuality?.date_end ?? "--"}</span>
                </div>
              </aside>

              <div className="data-import-stack">
                <label className="file-drop">
                  <Upload size={24} />
                  <strong>
                    {stagedDataset
                      ? `${stagedDataset.dataset.name} is staged`
                      : selectedFile?.name ?? "Choose a CSV or XLSX file"}
                  </strong>
                  <span>
                    {stagedDataset
                      ? "Validation passed. Review mappings and activate when ready."
                      : "Maximum 10 MB. Required fields are mapped automatically."}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] ?? null);
                      setStagedDataset(null);
                      setImportResult(null);
                    }}
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
                {stagedDataset && (
                  <div className="mapping-panel">
                    <div className="mapping-heading">
                      <span><FileSpreadsheet size={14} /> Detected column mapping</span>
                      <b>{mappedColumns.length} fields mapped</b>
                    </div>
                    <div className="mapping-list">
                      {mappedColumns.map((mapping) => (
                        <div key={`${mapping.source_column}-${mapping.canonical_column}`}>
                          <span>{mapping.source_column}</span>
                          <i>to</i>
                          <strong>{mapping.canonical_column}</strong>
                          <em>{mapping.mapping_type}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <span>
                    <FileSpreadsheet size={15} />
                    {stagedDataset ? "Staged dataset preview" : "Active dataset preview"}
                  </span>
                  <button onClick={downloadCsvTemplate}>
                    <FileDown size={14} />
                    Template
                  </button>
                </div>
                <div className="data-preview-table">
                  <table>
                    <thead>
                      <tr>
                        {lifecycleColumns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lifecyclePreview?.rows.map((row, index) => (
                        <tr key={`${row.product_id ?? "preview"}-${index}`}>
                          {lifecycleColumns.map((column) => (
                            <td key={column}>{formatPreviewValue(row[column])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {lifecycleQuality?.warnings.length ? (
                  <ul className="data-warnings modal-warnings">
                    {lifecycleQuality.warnings.map((warning) => (
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
              <div className="dataset-history-card">
                <div className="history-heading">
                  <span><Archive size={15} /> Dataset history</span>
                  <b>{datasetHistory.length} available</b>
                </div>
                <div className="dataset-history-list">
                  {datasetHistory.map((item) => (
                    <article className={`dataset-history-row status-${item.status}`} key={item.dataset_id}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.quality.accepted_rows.toLocaleString()} rows - {item.quality.quality_score} score - {item.quality.history_days} days
                        </span>
                      </div>
                      <em>{item.status}</em>
                      {item.status === "active" ? (
                        <span className="active-dataset-label">Active</span>
                      ) : (
                        <div className="history-row-actions">
                          {item.status === "ready" && (
                            <button
                              className="history-discard"
                              onClick={() => void discardHistoryDataset(item)}
                              disabled={uploading}
                            >
                              Discard
                            </button>
                          )}
                          <button
                            onClick={() => void activateHistoryDataset(item)}
                            disabled={uploading}
                          >
                            Activate
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
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
                {stagedDataset ? (
                  <>
                    <button className="button-quiet" disabled={uploading} onClick={() => void discardStagedDataset()}>
                      Discard staged
                    </button>
                    <button className="button-solid compact" disabled={uploading} onClick={() => void activateStagedDataset()}>
                      {uploading ? "Activating..." : "Activate dataset"}
                    </button>
                  </>
                ) : (
                  <button className="button-solid compact" disabled={!selectedFile || uploading} onClick={() => void previewDataset()}>
                    {uploading ? "Validating..." : "Validate file"}
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
