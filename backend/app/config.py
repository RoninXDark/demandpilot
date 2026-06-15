from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "DemandPilot API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    data_path: Path = REPOSITORY_ROOT / "data" / "sample_sales.csv"
    uploads_path: Path = REPOSITORY_ROOT / "data" / "uploads"
    max_upload_bytes: int = 10 * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_prefix="DEMANDPILOT_",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
