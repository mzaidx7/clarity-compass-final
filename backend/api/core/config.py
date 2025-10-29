"""Application configuration loaded from environment variables (.env).

Use pydantic BaseModel for type hints/defaults and a dotenv file for local dev.
"""
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    """Strongly-typed application settings.

    Values come from process environment or the .env file in development.
    """
    app_env: str = os.getenv("APP_ENV", "dev")
    jwt_secret: str = os.getenv("JWT_SECRET", "dev_secret")
    firebase_db_url: str | None = os.getenv("FIREBASE_DB_URL")
    firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")
    firebase_cred_path: str | None = os.getenv("FIREBASE_CRED_PATH")

settings = Settings()
