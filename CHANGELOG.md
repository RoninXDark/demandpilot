# Changelog

## 1.0.0 - Portfolio MVP Release

- Completed the portfolio-ready product surface with Supplier Network and Scenario Comparison
- Added working Supplier Network navigation with supplier reliability, lead-time, MOQ, and SKU lane views
- Added saved scenario comparison cards for demand change, projected revenue, recommended order, and risk state
- Added apply-back controls so saved scenarios can restore product, horizon, price, promotion, and lead-time settings
- Added seeded planning scenarios for the first demo session while keeping user-created scenarios in local storage
- Updated the application and API version to 1.0.0
- Updated documentation to present DemandPilot as a complete MVP with a clear future roadmap

## 0.7.0 - Product Directory and Inventory Hub

- Added working Product Directory and Inventory Hub views to the application navigation
- Added shared SKU, product, ID, and category search across operational views
- Added category and inventory-health filters for catalog and inventory planning tables
- Added inventory stock-position indicators against calculated reorder points
- Added direct SKU drill-down from both catalog views into the existing decision drawer
- Prioritized Inventory Hub rows by stockout risk and coverage duration
- Updated product documentation and portfolio preview assets

## 0.6.0 - Dataset Lifecycle

- Added two-phase dataset handling: stage and validate before activation
- Added detected source-to-canonical column mapping for CSV/XLSX imports
- Added explicit dataset activation and staged-dataset discard actions
- Added persistent dataset history with active, ready, archived, and demo states
- Added restore controls for previous uploads and the reproducible demo dataset
- Preserved legacy active-dataset metadata during the registry migration
- Expanded backend coverage for staging, activation, discard, and lifecycle API contracts

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
