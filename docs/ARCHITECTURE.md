# Architecture

## Product Boundaries

DemandPilot is organized as a modular monorepository:

- `frontend/` owns the operations dashboard and API client
- `backend/app/main.py` owns HTTP contracts
- `backend/app/services/` owns data preparation, forecasting, and inventory rules
- `data/` contains the reproducible public demo dataset
- `data/uploads/` stores ignored runtime datasets and active-dataset metadata
- `scripts/` contains developer and data utilities

The analytics layer is deliberately independent from HTTP. Forecasting and inventory functions accept data frames and return typed domain responses, which keeps them testable and prepares them for background workers.

## Forecasting Baseline

The MVP evaluates two transparent candidates:

1. Seven-day seasonal naive forecast
2. Linear trend adjusted by weekday factors

The final model is selected using mean absolute error on a held-out tail window. WAPE is reported as a business-readable accuracy measure. This baseline creates a defensible benchmark before advanced models are introduced.

## Data Ingestion Boundary

The dataset registry accepts CSV/XLSX input, maps common column aliases, validates core sales fields, applies documented defaults, and writes a canonical CSV representation. Analytics services always resolve the current dataset through the registry, so switching data sources does not change forecasting code.

Runtime upload files are excluded from Git. Docker uses a dedicated uploads volume to preserve them across container restarts.

## Next Persistence Boundary

The next data-platform stage will add:

- PostgreSQL organization, product, location, sales, and forecast tables
- Alembic migrations
- Object storage for uploaded source files
- Redis-backed background ingestion and forecast jobs
- Dataset versioning and forecast-run metadata

## Security Direction

Future authenticated deployments will use organization-scoped access, short-lived sessions, audited data imports, file validation, rate limiting, and secrets supplied only through environment configuration.
