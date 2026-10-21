import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings

logger = logging.getLogger("camponu.error")


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches unhandled exceptions, logs them securely without sensitive credentials,
    and returns a clean, sanitized error response to the client.
    """
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}\n"
        f"{traceback.format_exc()}"
    )

    error_detail = "An internal server error occurred. Please contact the administrator."
    if settings.DEBUG:
        error_detail = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": error_detail,
                "path": request.url.path,
            },
        },
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Standardizes HTTP exceptions (401, 403, 404, etc.) into unified JSON response schema.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "path": request.url.path,
            },
        },
        headers=getattr(exc, "headers", None),
    )
