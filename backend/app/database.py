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

def run_migrations():
    """Ensures newly added columns and tables are safely migrated on both SQLite and PostgreSQL."""
    from sqlalchemy import text
    migrations = [
        ("surplus_items", "allocated_quantity", "INTEGER DEFAULT 0"),
        ("surplus_items", "reserved_quantity", "INTEGER DEFAULT 0"),
        ("transfers", "protocol_code", "VARCHAR(64)"),
        ("agent_tasks", "initiator_type", "VARCHAR DEFAULT 'AI'"),
        ("agent_tasks", "initiator_school_id", "VARCHAR"),
        ("agent_tasks", "target_school_id", "VARCHAR"),
    ]
    for table, col, col_type in migrations:
        try:
            with engine.begin() as conn:
                try:
                    conn.execute(text(f"SELECT {col} FROM {table} LIMIT 1"))
                except Exception:
                    pass
        except Exception:
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                    logger.info(f"Successfully added column {table}.{col}")
            except Exception as e:
                logger.debug(f"Migration note ({table}.{col}): {e}")

# Run migrations automatically
run_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
