"""Authentication routes: health check and dev-mode token minting."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

from api.models.pyd_models import HealthResponse
from api.core.security import make_dev_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/health", response_model=HealthResponse)
def health():
    """Basic service health endpoint."""
    return HealthResponse(status="ok", version="0.1.0")

class DevLoginRequest(BaseModel):
    """Dev-only login request containing a user identifier."""
    user_id: str

class DevLoginResponse(BaseModel):
    """Dev-only login response containing a signed HS256 token."""
    token: str
    note: str

@router.post("/dev-login", response_model=DevLoginResponse)
def dev_login(req: DevLoginRequest):
    """Mint a short-lived dev token (only when AUTH_MODE=dev)."""
    if os.getenv("AUTH_MODE", "dev").lower() != "dev":
        raise HTTPException(status_code=403, detail="dev-login disabled (AUTH_MODE != dev)")
    token = make_dev_token(req.user_id)
    return DevLoginResponse(token=token, note="Use as Bearer token in Authorization header")
