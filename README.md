# DemandPilot

AI-ready demand forecasting and inventory optimization platform for retail and operations teams.

DemandPilot turns raw sales history into forecasts, stock-risk signals, replenishment recommendations, and scenario simulations. The first release is a working vertical slice with a FastAPI analytics service and a React operations dashboard.

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
CSV demo source -> PostgreSQL persistence in Sprint 2
```

PostgreSQL and Redis services are included in the local stack so the persistence and background-job layers can be added without restructuring the product.

## Tech Stack

**Backend:** Python, FastAPI, pandas, NumPy, Pydantic
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

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | Portfolio KPIs and product revenue |
| `GET` | `/api/v1/products` | Product inventory and risk table |
| `GET` | `/api/v1/forecast/{product_id}` | Historical demand and selected forecast |
| `POST` | `/api/v1/scenarios` | Price, promotion, and lead-time simulation |
| `GET` | `/health` | Service health |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full product plan.

## Repository Name and Description

**Name:** `demandpilot`
**GitHub description:** `AI-powered demand forecasting and inventory optimization platform with model evaluation, scenario planning, and replenishment recommendations.`
