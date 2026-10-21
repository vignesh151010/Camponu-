import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SQLITE_DB_PATH = os.path.join(BACKEND_DIR, "campon_u.db").replace("\\", "/")


class Settings(BaseSettings):
    PROJECT_NAME: str = "CAMPON U — AI-Powered College Operating System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database (Supports SQLite out-of-the-box or MySQL 8.0 via .env)
    DATABASE_URL: str = Field(
        default=f"sqlite:///{SQLITE_DB_PATH}",
        description="SQLAlchemy Database URL. Defaults to local SQLite, or configure MySQL 8 in .env",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_sqlite_url(cls, v: str) -> str:
        if v and v.startswith("sqlite:///") and "./" in v:
            rel_path = v.replace("sqlite:///", "").replace("./", "")
            abs_path = os.path.join(BACKEND_DIR, rel_path).replace("\\", "/")
            return f"sqlite:///{abs_path}"
        return v

    DB_ECHO: bool = False
    DB_POOL_PRE_PING: bool = True
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Session & Security
    SECRET_KEY: str = "campon-u-super-secret-development-key-change-in-production-2026"
    SESSION_COOKIE_NAME: str = "camponu_session"
    SESSION_EXPIRE_MINUTES: int = 1440  # 24 hours
    CSRF_COOKIE_NAME: str = "camponu_csrf"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB

    # AI Configuration (Provider-agnostic)
    AI_PROVIDER: str = "ollama"  # "ollama" or "cloud"
    AI_MODEL: str = "llama3"
    AI_API_BASE_URL: str = "http://127.0.0.1:11434"
    AI_API_KEY: str = ""
    AI_TIMEOUT_SECONDS: int = 30

    # Institution & Academic defaults
    ATTENDANCE_WARNING_THRESHOLD: float = 75.0
    TIMEZONE: str = "UTC"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
