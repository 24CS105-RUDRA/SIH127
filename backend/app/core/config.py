from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://anpr_user:anpr_pass@localhost:5432/anpr_db"
    REDIS_URL: str = "redis://localhost:6379"
    ML_SERVICE_URL: str = "http://localhost:8001"

    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 200

    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    FUZZY_MATCH_THRESHOLD: int = 1
    PLATE_NORMALIZATION_REGEX: str = r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$'

    BLACKLIST_FUZZY_THRESHOLD: int = 1
    CONGESTION_ZSCORE_THRESHOLD: float = 2.0
    ANOMALY_SPEED_THRESHOLD_KMPH: float = 120.0

    WS_HEARTBEAT_INTERVAL: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()