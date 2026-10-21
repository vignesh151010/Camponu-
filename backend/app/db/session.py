import logging
from typing import Generator, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("camponu.db")

# Engine configuration depending on dialect
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

connect_args = {}
engine_kwargs = {
    "echo": settings.DB_ECHO,
}

from sqlalchemy import event
from sqlalchemy.engine import Engine

if is_sqlite:
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine_kwargs["pool_pre_ping"] = settings.DB_POOL_PRE_PING
    engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW

try:
    engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
except Exception as e:
    logger.error(f"Failed to initialize database engine for URL: {settings.DATABASE_URL}. Error: {e}")
    # In case of initialization error, create fallback engine for app to start
    engine = create_engine("sqlite:///./fallback.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Guarantees session cleanup upon completion of request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> Tuple[bool, str]:
    """
    Lightweight health-check query to verify database connectivity.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "Database operational and responsive."
    except Exception as e:
        logger.warning(f"Database health check failed: {str(e)}")
        return False, f"Database unreachable or credentials invalid: {str(e)}"
