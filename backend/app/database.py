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
    try:
        with engine.begin() as conn:
            # 1. surplus_items.reserved_quantity
            try:
                conn.execute(text("SELECT reserved_quantity FROM surplus_items LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE surplus_items ADD COLUMN reserved_quantity INTEGER DEFAULT 0"))
                except Exception as e:
                    logger.debug(f"Migration note (surplus_items.reserved_quantity): {e}")

            # 2. agent_tasks.initiator_type
            try:
                conn.execute(text("SELECT initiator_type FROM agent_tasks LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN initiator_type VARCHAR DEFAULT 'AI'"))
                except Exception as e:
                    logger.debug(f"Migration note (agent_tasks.initiator_type): {e}")

            # 3. agent_tasks.initiator_school_id
            try:
                conn.execute(text("SELECT initiator_school_id FROM agent_tasks LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN initiator_school_id VARCHAR"))
                except Exception as e:
                    logger.debug(f"Migration note (agent_tasks.initiator_school_id): {e}")

            # 4. agent_tasks.target_school_id
            try:
                conn.execute(text("SELECT target_school_id FROM agent_tasks LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN target_school_id VARCHAR"))
                except Exception as e:
                    logger.debug(f"Migration note (agent_tasks.target_school_id): {e}")
    except Exception as exc:
        logger.warning(f"Schema migration skipped or completed: {exc}")

# Run migrations automatically
run_migrations()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
