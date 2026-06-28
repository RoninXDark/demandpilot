# Architecture

## Product Boundaries

DemandPilot is organized as a modular monorepository:

- `frontend/` owns the landing page, Inventory Control Tower, and API client
- `backend/app/main.py` owns HTTP contracts
- `backend/app/services/` owns data preparation, forecasting, and inventory rules
- `data/` contains the reproducible public demo dataset
- `data/uploads/` stores ignored runtime datasets and active-dataset metadata
- `scripts/` contains developer and data utilities

The analytics layer is deliberately independent from HTTP. Forecasting, inventory, scenario, and recommendation functions accept data frames and return typed domain responses, which keeps them testable and prepares them for background workers.

## Decision Layer

The Action Queue translates inventory calculations into operational recommendations. Each action includes a priority, rationale, timing, confidence, quantity when relevant, and expected impact. Reorder recommendations can create a typed Draft Purchase Order response; the frontend exports that response as a portable CSV for an ERP or accounting workflow.

The v0.4 decision workflow adds local UI lifecycle states for recommendations: Open, Draft created, Reviewed, and Dismissed. This keeps the portfolio demo interactive without pretending to be a full ERP. Approval states, supplier dispatch, receiving, and durable action audit persistence remain future integration boundaries.

SKU detail drawers are frontend composition over existing API contracts: product inventory, active recommendation, forecast validation, and scenario insight. The drawer can be deep-linked with `?sku=<product_id>` for portfolio walkthroughs.

The v0.7 Product Directory and Inventory Hub reuse the typed `/products` inventory contract rather than introducing duplicate catalog state. Both views share planner search and category/health filters, and each SKU drills into the same decision drawer. This keeps the product's catalog and operational risk views consistent after a dataset activation.

The v1.0 portfolio layer adds two workflow surfaces on top of the same product, action, forecast, and scenario contracts. Scenario Comparison stores planner-selected scenario snapshots in browser storage for the demo and lets users apply the saved assumptions back to the live Scenario Lab controls. Supplier Network composes supplier readiness from SKU-level inventory state, open actions, reliability profiles, lead-time expectations, and minimum order quantities. These are frontend workflow views today; durable supplier master data and scenario audit trails belong in the next persistence boundary.

## Forecasting Baseline

The current baseline evaluates three transparent candidates:

1. Seven-day seasonal naive forecast
2. Linear trend adjusted by weekday factors
3. Weighted moving average blended with weekly seasonality

The final model is selected using mean absolute error on a held-out tail window. WAPE is reported as a business-readable accuracy measure. The API returns the model leaderboard so the frontend can show why a forecast was selected. This baseline creates a defensible benchmark before advanced models are introduced.

## Data Ingestion Boundary

The dataset registry accepts CSV/XLSX input, maps common column aliases, validates core sales fields, applies documented defaults, and writes a canonical CSV representation. Analytics services always resolve the current dataset through the registry, so switching data sources does not change forecasting code.

The v0.5 Data Control layer adds a normalized active-dataset preview and readiness metadata: quality score, acceptance rate, date coverage, and warnings. This gives planners a clear check before trusting forecast and replenishment output.

The v0.6 lifecycle adds a small local dataset catalog. New uploads are staged as canonical CSV files, profiled, and exposed with source-to-canonical column mappings before activation. Activation updates the active dataset pointer while retaining prior datasets as history entries; non-active staged datasets can be discarded. The legacy active-dataset metadata is still read during migration so existing local uploads remain usable.

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
