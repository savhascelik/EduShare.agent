import os

os.environ["STRANDS_TELEMETRY_ENABLED"] = "false"
os.environ["OTEL_PYTHON_DISABLED"] = "true"

from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "EduShare Agent API"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://edushare_user:edushare_password@127.0.0.1:5432/edushare_db"
    )
    
    # AWS Bedrock
    AWS_REGION: str = os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION", "us-east-1"))
    # Default to AWS Nova Pro (supports vision & reasoning with fast response)
    BEDROCK_MODEL_ID: str = os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")
    
    # JWT Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "edushare-super-secret-jwt-key-2026-hackathon-token")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
