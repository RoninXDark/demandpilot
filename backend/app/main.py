from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    DashboardSummary,
    DatasetInfo,
    ForecastResponse,
    InventoryProduct,
    ScenarioRequest,
    ScenarioResponse,
)
from app.services.analytics import dashboard_summary, inventory_status, simulate_scenario
from app.services.data_service import get_data_service
from app.services.dataset_registry import DatasetRegistry, DatasetValidationError
from app.services.demo_data import generate_demo_dataset
from app.services.forecasting import forecast_product


settings = get_settings()
dataset_registry = DatasetRegistry(settings.data_path, settings.uploads_path)


def load_data():
    return get_data_service(str(dataset_registry.active_path())).load()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.data_path.exists():
        generate_demo_dataset(settings.data_path)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
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


@app.get(f"{settings.api_prefix}/datasets/active", response_model=DatasetInfo)
def get_active_dataset() -> DatasetInfo:
    return dataset_registry.active_info()


@app.post(f"{settings.api_prefix}/datasets/import", response_model=DatasetInfo)
async def import_dataset(file: UploadFile = File(...)) -> DatasetInfo:
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")
    try:
        return dataset_registry.import_file(file.filename or "dataset.csv", content)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(f"{settings.api_prefix}/datasets/reset", response_model=DatasetInfo)
def reset_dataset() -> DatasetInfo:
    return dataset_registry.reset()


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
