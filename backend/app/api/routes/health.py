from fastapi import APIRouter
from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse

router = APIRouter(tags=["System Health"])


@router.get("/health", response_model=HealthResponse, summary="System Health & Database Probe")
def get_health() -> HealthResponse:
    """
    Returns the operational status of the CAMPON U API server and checks
    database connectivity.
    """
    db_ok, db_msg = check_db_connection()
    status = "healthy" if db_ok else "degraded"

    return HealthResponse(
        status=status,
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database="connected" if db_ok else "disconnected",
        database_message=db_msg,
    )
