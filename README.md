# DemandPilot

AI-powered inventory decision platform for e-commerce and operations teams.

DemandPilot turns sales history into a prioritized queue of replenishment and inventory actions. It combines transparent demand forecasting, scenario simulation, stock-risk detection, data-quality controls, and exportable Draft Purchase Orders in one operational workspace.

![DemandPilot landing page](docs/assets/landing-preview.png)

## Business Problem

Retail teams often plan inventory in spreadsheets after stockouts or excess inventory have already appeared. DemandPilot provides an earlier, measurable view of future demand:

- Start every planning session with a risk-ranked Action Queue
- Forecast demand by product over 7, 30, or 90 days
- Compare baseline forecasting strategies through holdout validation
- Detect products at risk of stockout or overstock
- Calculate safety stock, reorder points, and suggested order quantities
- Simulate price, promotion, and supplier lead-time changes directly on the forecast
- Convert replenishment recommendations into downloadable Draft PO files
- Review, dismiss, and track recommendation status through a lightweight workflow
- Open SKU-level decision context with inventory, forecast, and AI rationale
- Search a dedicated Product Directory by SKU, product, category, and inventory health
- Monitor stock position, days of cover, and replenishment needs in the Inventory Hub
- Expose every calculation through a documented REST API

## Current Product

## Inventory Control Tower

![DemandPilot Inventory Control Tower](docs/assets/dashboard-preview.png)

The repository currently contains:

- A product landing page and returning-user Control Tower route
- A prioritized recommendation engine for critical reorders, planned replenishment, and excess-stock actions
- Action rationale, confidence, due date, quantity, and expected business impact
- Action lifecycle states: Open, Draft created, Reviewed, and Dismissed
- A SKU detail drawer with stock, cover, reorder point, forecast accuracy, and action rationale
- Product Directory with live SKU search, category and health filters, and decision-context drill-down
- Inventory Hub that prioritizes stock positions by coverage risk and visualizes stock against reorder points
- A simplified Draft Purchase Order Center with CSV export
- A deterministic retail dataset generator
- Daily sales aggregation and KPI calculations
- Seasonal-naive, trend/weekday, and weighted moving-average forecasting candidates
- Automatic model selection using holdout MAE
- Forecast model leaderboard with MAE and WAPE for planner trust
- Forecast confidence ranges and WAPE reporting
- Inventory risk and replenishment recommendations
- An integrated Scenario Lab with a live alternative forecast curve and AI insight
- CSV/XLSX import with automatic column alias mapping
- Data Readiness Center with quality score, acceptance rate, active sample rows, and schema guidance
- Data-quality reporting for rejected rows, duplicates, missing values, defaults, and forecast readiness
- Two-phase CSV/XLSX flow: stage and validate first, then activate explicitly
- Dataset history with active, ready, archived, and demo states
- Persistent active-dataset selection with one-click demo reset and dataset restore
- Responsive React dashboard backed by live API data
- Backend tests, frontend production build, Docker, and CI

## Dataset Lifecycle

![DemandPilot Dataset Lifecycle](docs/assets/dataset-lifecycle-preview.png)

The v0.6 Data Control layer turns uploads into a deliberate planning lifecycle:

1. Stage CSV/XLSX sales history without changing the active planning dataset.
2. Inspect column mappings, normalized preview rows, quality score, warnings, and forecast readiness.
3. Explicitly activate the validated dataset only after review.
4. Restore an earlier upload or the reproducible demo dataset from Dataset History.
5. Compare forecast model candidates through MAE and WAPE before using the selected model.

Runtime uploads stay in the ignored `data/uploads/` directory and are not committed to the portfolio repository.

## Product Directory and Inventory Hub

![DemandPilot Product Directory](docs/assets/product-directory-preview.png)

The v0.7 catalog layer turns the navigation into practical planner views instead of placeholder destinations:

1. Use the shared command search to find a SKU, product name, product ID, or category.
2. Filter the Product Directory by category and inventory health to compare core planning signals in one table.
3. Open any SKU directly into its decision drawer, without losing the current catalog context.
4. Use the Inventory Hub to prioritize stockout risk, compare on-hand stock to reorder points, and see suggested replenishment units.

Both views are composed from the live `/products` API contract, so they update when a validated dataset becomes active.

## Decision Workflow

![DemandPilot SKU decision drawer](docs/assets/sku-drawer-preview.png)

The v0.4 workflow is built around a planner's daily loop:

1. Filter the Action Queue by all actions, critical risks, reorders, or excess stock.
2. Open a SKU decision drawer to inspect the business rationale behind the recommendation.
3. Create a Draft PO for reorder actions or mark non-order actions as reviewed.
4. Track generated Draft POs in the Draft PO Center and export individual CSV files or the full register.

This keeps the current release honest: DemandPilot recommends and stages decisions, while full ERP approval, supplier dispatch, receiving, and audit persistence remain future integration steps.

## Architecture

```text
React + TypeScript product experience
            |
         FastAPI
            |
Recommendation / Forecasting / Inventory services
            |
CSV/XLSX import -> validation -> normalized active dataset
```

PostgreSQL and Redis services are included in the local stack so account-level persistence and background forecast jobs can be added without restructuring the product.

## Tech Stack

**Backend:** Python, FastAPI, pandas, NumPy, Pydantic, openpyxl
**Frontend:** React, TypeScript, Vite, Recharts, Lucide
**Infrastructure:** Docker Compose, PostgreSQL, Redis, GitHub Actions
**Testing:** pytest, FastAPI TestClient, TypeScript compiler

## Run Locally

### Docker

```bash
docker compose up --build
```

Open:

- Dashboard: `http://localhost:8080`
- API documentation: `http://localhost:8000/docs`

### Development

Backend:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e "backend[dev]"
uvicorn app.main:app --app-dir backend --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The demo CSV is generated automatically on first backend startup. It can also be rebuilt explicitly:

```bash
python scripts/generate_demo_data.py
```

Custom datasets can be imported from the dashboard. See [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md) for required fields, aliases, defaults, and validation rules.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Portfolio KPIs and product revenue |
| `GET` | `/api/v1/datasets` | Dataset history and lifecycle state |
| `GET` | `/api/v1/datasets/active` | Active dataset and quality report |
| `GET` | `/api/v1/datasets/active/preview` | Normalized active dataset preview rows |
| `POST` | `/api/v1/datasets/preview` | Stage and validate CSV/XLSX data without activation |
| `POST` | `/api/v1/datasets/{dataset_id}/activate` | Make a staged or archived dataset active |
| `DELETE` | `/api/v1/datasets/{dataset_id}` | Discard a non-active staged dataset |
| `POST` | `/api/v1/datasets/import` | Validate and activate CSV/XLSX data |
| `POST` | `/api/v1/datasets/reset` | Return to the reproducible demo dataset |
| `GET` | `/api/v1/products` | Product inventory and risk table |
| `GET` | `/api/v1/actions` | Prioritized inventory recommendation queue |
| `POST` | `/api/v1/actions/{action_id}/draft` | Create an exportable Draft Purchase Order |
| `GET` | `/api/v1/forecast/{product_id}` | Historical demand and selected forecast |
| `POST` | `/api/v1/scenarios` | Scenario metrics, AI insight, and forecast curve |
| `GET` | `/health` | Service health |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full product plan.
Release history is documented in [CHANGELOG.md](CHANGELOG.md).

## Repository Name and Description

**Name:** `demandpilot`
**GitHub description:** `AI-powered inventory decision platform with Product Directory, Inventory Hub, dataset lifecycle, forecasting, and Draft PO workflow.`
