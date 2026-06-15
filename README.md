# DemandPilot

AI-ready demand forecasting and inventory optimization platform for retail and operations teams.

DemandPilot turns raw sales history into forecasts, stock-risk signals, replenishment recommendations, and scenario simulations. The current release includes a FastAPI analytics service, React operations dashboard, and a validated CSV/XLSX import workflow.

## Business Problem

Retail teams often plan inventory in spreadsheets after stockouts or excess inventory have already appeared. DemandPilot provides an earlier, measurable view of future demand:

- Forecast demand by product over 7, 30, or 90 days
- Compare baseline forecasting strategies through holdout validation
- Detect products at risk of stockout or overstock
- Calculate safety stock, reorder points, and suggested order quantities
- Simulate price, promotion, and supplier lead-time changes
- Expose every calculation through a documented REST API

## Current Product

![DemandPilot dashboard](docs/assets/dashboard-preview.png)

The repository currently contains:

- A deterministic retail dataset generator
- Daily sales aggregation and KPI calculations
- Seasonal-naive and trend/weekday forecasting candidates
- Automatic model selection using holdout MAE
- Forecast confidence ranges and WAPE reporting
- Inventory risk and replenishment recommendations
- Scenario simulation for pricing, promotions, and lead times
- CSV/XLSX import with automatic column alias mapping
- Data-quality reporting for rejected rows, duplicates, missing values, and defaults
- Persistent active-dataset selection with one-click demo reset
- Responsive React dashboard backed by live API data
- Backend tests, frontend production build, Docker, and CI

## Architecture

```text
React + TypeScript dashboard
            |
         FastAPI
            |
Analytics / Forecasting / Inventory services
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
| `GET` | `/api/v1/datasets/active` | Active dataset and quality report |
| `POST` | `/api/v1/datasets/import` | Validate and activate CSV/XLSX data |
| `POST` | `/api/v1/datasets/reset` | Return to the reproducible demo dataset |
| `GET` | `/api/v1/products` | Product inventory and risk table |
| `GET` | `/api/v1/forecast/{product_id}` | Historical demand and selected forecast |
| `POST` | `/api/v1/scenarios` | Price, promotion, and lead-time simulation |
| `GET` | `/health` | Service health |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full product plan.
Release history is documented in [CHANGELOG.md](CHANGELOG.md).

## Repository Name and Description

**Name:** `demandpilot`
**GitHub description:** `AI-powered demand forecasting and inventory optimization platform with model evaluation, scenario planning, and replenishment recommendations.`
