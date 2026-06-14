from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    DashboardSummary,
    ForecastResponse,
    InventoryProduct,
    ScenarioRequest,
    ScenarioResponse,
)
from app.services.analytics import dashboard_summary, inventory_status, simulate_scenario
from app.services.data_service import get_data_service
from app.services.demo_data import generate_demo_dataset
from app.services.forecasting import forecast_product


settings = get_settings()


def load_data():
    return get_data_service(str(settings.data_path)).load()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.data_path.exists():
        generate_demo_dataset(settings.data_path)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Demand forecasting and inventory decision API.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "demandpilot-api"}


@app.get(f"{settings.api_prefix}/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary() -> DashboardSummary:
    return dashboard_summary(load_data())


@app.get(f"{settings.api_prefix}/products", response_model=list[InventoryProduct])
def get_products() -> list[InventoryProduct]:
    return inventory_status(load_data())


@app.get(
    f"{settings.api_prefix}/forecast/{{product_id}}",
    response_model=ForecastResponse,
)
def get_forecast(
    product_id: str,
    horizon: int = Query(default=30, ge=7, le=90),
) -> ForecastResponse:
    try:
        return forecast_product(load_data(), product_id, horizon)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc


@app.post(f"{settings.api_prefix}/scenarios", response_model=ScenarioResponse)
def create_scenario(request: ScenarioRequest) -> ScenarioResponse:
    try:
        return simulate_scenario(load_data(), request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
