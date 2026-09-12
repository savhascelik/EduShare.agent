import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger(__name__)

# Try PostgreSQL first; fallback to SQLite if PostgreSQL daemon is offline
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 3}
    )
    # Test connection
    with engine.connect() as conn:
        logger.info("Connected to PostgreSQL successfully.")
except Exception as e:
    logger.warning(f"PostgreSQL not reachable ({e}). Falling back to local SQLite database.")
    sqlite_url = "sqlite:///./edushare.db"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
