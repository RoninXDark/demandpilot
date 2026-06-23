from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    ActionRecommendation,
    DashboardSummary,
    DatasetHistoryItem,
    DatasetImportPreview,
    DatasetInfo,
    DatasetPreview,
    ForecastResponse,
    InventoryProduct,
    PurchaseOrderDraft,
    ScenarioRequest,
    ScenarioResponse,
)
from app.services.analytics import (
    action_queue,
    dashboard_summary,
    inventory_status,
    simulate_scenario,
)
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
    version="0.6.0",
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


@app.get(
    f"{settings.api_prefix}/datasets",
    response_model=list[DatasetHistoryItem],
)
def get_datasets() -> list[DatasetHistoryItem]:
    return dataset_registry.list_datasets()


@app.get(
    f"{settings.api_prefix}/datasets/active/preview",
    response_model=DatasetPreview,
)
def get_active_dataset_preview(
    limit: int = Query(default=8, ge=1, le=25),
) -> DatasetPreview:
    return dataset_registry.active_preview(limit)


@app.post(
    f"{settings.api_prefix}/datasets/preview",
    response_model=DatasetImportPreview,
)
async def preview_dataset(file: UploadFile = File(...)) -> DatasetImportPreview:
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit.")
    try:
        return dataset_registry.stage_file(file.filename or "dataset.csv", content)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    f"{settings.api_prefix}/datasets/{{dataset_id}}/activate",
    response_model=DatasetInfo,
)
def activate_dataset(dataset_id: str) -> DatasetInfo:
    try:
        return dataset_registry.activate_dataset(dataset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Dataset not found") from exc


@app.delete(f"{settings.api_prefix}/datasets/{{dataset_id}}", status_code=204)
def discard_dataset(dataset_id: str) -> None:
    try:
        dataset_registry.discard_dataset(dataset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Dataset not found") from exc
    except DatasetValidationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


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
    f"{settings.api_prefix}/actions",
    response_model=list[ActionRecommendation],
)
def get_actions() -> list[ActionRecommendation]:
    return action_queue(load_data())


@app.post(
    f"{settings.api_prefix}/actions/{{action_id}}/draft",
    response_model=PurchaseOrderDraft,
)
def create_purchase_order_draft(action_id: str) -> PurchaseOrderDraft:
    recommendation = next(
        (item for item in action_queue(load_data()) if item.action_id == action_id),
        None,
    )
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if (
        recommendation.action_type != "reorder"
        or recommendation.recommended_quantity is None
    ):
        raise HTTPException(
            status_code=400,
            detail="Only reorder recommendations can create purchase order drafts.",
        )

    draft_id = f"PO-{uuid4().hex[:8].upper()}"
    return PurchaseOrderDraft(
        draft_id=draft_id,
        action_id=recommendation.action_id,
        product_id=recommendation.product_id,
        product_name=recommendation.product_name,
        quantity=recommendation.recommended_quantity,
        due_date=recommendation.due_date,
        created_at=datetime.now(timezone.utc),
        export_filename=f"{draft_id.lower()}-{recommendation.product_id}.csv",
    )


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
