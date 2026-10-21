from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall system health status: 'healthy' or 'degraded'")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Active environment (development, staging, production)")
    database: str = Field(..., description="Database connectivity status: 'connected' or 'disconnected'")
    database_message: str = Field(..., description="Detailed status message from database ping")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of the health check")
