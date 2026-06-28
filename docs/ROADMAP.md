# Product Roadmap

## Portfolio MVP - v1.0

- [x] Landing page, Control Tower, and decision-first dashboard
- [x] Demand forecasting with model validation
- [x] Scenario Lab with saved scenario comparison
- [x] Action Queue, SKU drawer, Draft PO workflow, and CSV export
- [x] Data Control with staged dataset lifecycle
- [x] Product Directory and Inventory Hub
- [x] Supplier Network with readiness, lead-time, MOQ, and SKU lane views
- [x] Backend tests, frontend production build, Docker configuration, and CI

## Sprint 1 - Working Product Foundation

- [x] FastAPI service and OpenAPI documentation
- [x] Deterministic retail demo dataset
- [x] Forecast validation and model selection
- [x] Inventory risk and reorder recommendations
- [x] Scenario simulation
- [x] React operations dashboard
- [x] Tests, Docker, and CI

## Sprint 2 - Data Platform

- [x] CSV/XLSX upload with alias mapping and validation
- [x] Data-quality reports and canonical normalization
- [x] Persistent active dataset and demo reset
- [x] Dashboard dataset controls and quality summary
- [x] Data quality score and forecast-readiness status
- [x] Normalized active dataset preview
- [x] CSV template download
- [ ] PostgreSQL schema and Alembic migrations

## Sprint 3 - Inventory Control Tower

- [x] Product landing page and returning-user demo route
- [x] Prioritized Action Queue
- [x] Critical and planned replenishment recommendations
- [x] Excess-stock markdown recommendations
- [x] Integrated scenario forecast curve and AI insight
- [x] Draft Purchase Order generation and CSV export
- [x] Collapsible desktop and compact mobile navigation
- [x] Product Directory with SKU search, category filters, and health filters
- [x] Inventory Hub with stock positions, reorder-point comparison, and risk prioritization
- [x] Supplier Network with partner readiness and replenishment lanes

## Sprint 4 - Decision Workflow

- [x] Working Action Queue filters
- [x] Action lifecycle states
- [x] Locally persisted demo workflow state
- [x] SKU Detail Drawer
- [x] SKU deep links with `?sku=`
- [x] Draft PO Center
- [x] Draft PO register export
- [ ] Persistent action audit trail
- [ ] Approval and dispatch states

## Sprint 5 - Data Control and Forecast Readiness

- [x] Data Readiness Center in the dashboard
- [x] Active dataset sample table
- [x] Forecast model leaderboard
- [x] Weighted moving-average candidate
- [x] Dataset-switch cleanup for local workflow state
- [x] Upload preview before activation
- [x] Explicit activation and staged-dataset discard
- [x] Dataset history and restore controls
- [ ] Dataset version labels and user annotations

## Sprint 6 - Forecasting Lab

- [ ] Organization, location, and product management
- [ ] Background import and forecast jobs with Redis
- [ ] Saved forecast runs and dataset versioning
- [ ] Rolling-origin backtesting
- [ ] SARIMA, LightGBM, and intermittent-demand models
- [ ] Hierarchical forecasts across product and location
- [ ] Holidays, promotions, prices, and external regressors
- [ ] MLflow experiment tracking and model registry

## Sprint 7 - Inventory Optimization

- [ ] Service-level policies
- [ ] Supplier calendars and minimum order quantities
- [ ] Economic order quantity and carrying cost
- [ ] Multi-location stock transfers
- [ ] Purchase-order approvals, supplier dispatch, and in-transit tracking

## Sprint 8 - SaaS and Intelligence

- [ ] Authentication, teams, and role-based access
- [ ] Scheduled reports and email/Telegram alerts
- [ ] AI analyst grounded in calculated metrics
- [x] Scenario comparison
- [ ] Decision audit trail
- [ ] Cloud deployment, monitoring, and public demo
