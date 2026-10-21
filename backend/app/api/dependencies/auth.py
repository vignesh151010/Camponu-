import time
from collections import defaultdict
from typing import List, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

security_bearer = HTTPBearer(auto_error=False)

# Simple sliding-window rate limiter for sensitive endpoints (e.g. login)
# ip -> list of timestamps
_rate_limit_store = defaultdict(list)


def reset_rate_limits():
    """Resets the in-memory rate limiting tracker (useful for test isolation)."""
    _rate_limit_store.clear()


def check_rate_limit(
    request: Request,
    limit: int = 12,
    window_seconds: int = 300,
    enforce_in_tests: bool = False,
):
    """
    Blocks more than `limit` attempts within `window_seconds` per client IP.
    Bypassed during automated testing unless enforce_in_tests is True.
    """
    if settings.ENVIRONMENT == "testing" and not enforce_in_tests:
        return

    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    timestamps = _rate_limit_store[client_ip]

    # Filter out entries older than window
    _rate_limit_store[client_ip] = [ts for ts in timestamps if now - ts < window_seconds]

    if len(_rate_limit_store[client_ip]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again after 5 minutes.",
        )

    _rate_limit_store[client_ip].append(now)



def get_session_token(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Optional[str]:
    """
    Extracts session token. Authorization Bearer header takes precedence over cookie.
    """
    # 1. Direct Authorization header check
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()

    if bearer and bearer.credentials:
        return bearer.credentials

    # 2. Cookie check (Browser session)
    cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token

    return None


def get_current_user(
    token: Optional[str] = Depends(get_session_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Validates session token and returns current authenticated User.
    Raises 401 if token is missing or expired.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to proceed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = AuthService.validate_session(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory enforcing role-based authorization server-side.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker
