import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.routes import (
    health,
    auth,
    student,
    staff,
    admin,
    announcements,
    notifications,
    reports,
    ai,
)
from app.db.base import Base
from app.db.session import engine
import app.models
from app.middleware.error_handler import global_exception_handler, http_exception_handler

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("camponu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Database schema auto-creation note: {e}")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    # Shutdown actions
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend REST API engine for CAMPON U — AI-Powered College Operating System",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Exception Handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# Top-level API v1 Router
api_router = APIRouter(prefix=settings.API_V1_STR)
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(student.router)
api_router.include_router(staff.router)
api_router.include_router(admin.router)
api_router.include_router(announcements.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(ai.router)

# Mount Routers
app.include_router(api_router)
app.include_router(health.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
