# Changelog

## 0.5.0 - Data Control and Forecast Readiness

- Added active dataset preview API for normalized planning rows
- Added quality score, acceptance rate, history coverage, and forecast-readiness metadata
- Added Data Control dashboard panel with active sample rows and data-quality warnings
- Rebuilt the import modal into a Dataset Readiness Center
- Added downloadable CSV template for sales-history imports
- Added weighted moving-average forecast candidate
- Added forecast model leaderboard with MAE and WAPE
- Cleared stale draft/action workflow state after dataset switches
- Expanded backend API coverage for dataset preview

## 0.4.0 - Decision Workflow

- Added working Action Queue filters for all, critical, reorder, and excess-stock recommendations
- Added action lifecycle states: Open, Draft created, Reviewed, and Dismissed
- Persisted the demo workflow state locally between browser sessions
- Added SKU Detail Drawer with stock, days of cover, reorder point, forecast accuracy, rationale, and scenario insight
- Added SKU deep links using the `?sku=` query parameter
- Added Draft PO Center for generated purchase-order drafts
- Added individual Draft PO CSV export and Draft PO register export
- Refreshed portfolio screenshots and product documentation
- Kept the current workflow scoped to decision staging, not ERP replacement

## 0.3.0 - Inventory Control Tower

- Added a product landing page with a generated visual system
- Rebuilt the dashboard around a prioritized operational Action Queue
- Added critical reorder, planned replenishment, and excess-stock recommendations
- Added recommendation confidence, rationale, due dates, and business impact
- Added Draft Purchase Order creation and CSV export
- Integrated Scenario Lab controls directly into the demand forecast
- Added scenario forecast curves and concise AI decision insights
- Added collapsible desktop navigation and compact mobile navigation
- Updated portfolio screenshots, product documentation, and API contracts
- Expanded backend coverage to 13 tests

## 0.2.0 - Data Import and Quality

- Added CSV and XLSX upload support
- Added automatic mapping for common sales-column aliases
- Added validation, normalization, duplicate removal, and rejected-row reporting
- Added active-dataset persistence and demo reset
- Added dashboard dataset controls and data-quality summaries
- Added Docker persistence for runtime uploads
- Expanded backend coverage to 11 tests

## 0.1.0 - Forecasting MVP

- Added FastAPI analytics API and React operations dashboard
- Added seasonal-naive and trend/weekday model evaluation
- Added inventory risk, reorder recommendations, and scenario simulation
- Added deterministic demo data, Docker, CI, and responsive previews
