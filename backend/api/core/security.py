"""Authentication helpers.

Supports two modes:
- dev: HS256 JWT signed with JWT_SECRET for local testing.
- firebase: verifies Firebase ID tokens via firebase_admin.
"""
from __future__ import annotations
from typing import Optional
import time, os
import jwt  # PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from api.core.config import settings

# Optional Firebase import (we won't crash if not installed/initialized)
try:
    from firebase_admin import auth as fb_auth  # type: ignore
except Exception:
    fb_auth = None

security = HTTPBearer()

AUTH_MODE = os.getenv("AUTH_MODE", "dev").lower()

def _decode_dev_jwt(token: str) -> str:
    """Decode a dev-mode JWT and return the user id (sub)."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub:
            raise ValueError("No sub in token")
        return str(sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def _verify_firebase_token(token: str) -> str:
    """Verify a Firebase ID token and return the user uid.

    Requires firebase_admin to be initialized (see startup hook in api/main.py).
    """
    if fb_auth is None:
        raise HTTPException(status_code=500, detail="Firebase not available on server")
    try:
        decoded = fb_auth.verify_id_token(token)
        uid = decoded.get("uid")
        if not uid:
            raise ValueError("No uid in Firebase token")
        return str(uid)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase ID token")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Dependency that extracts the authenticated user id depending on AUTH_MODE."""
    token = creds.credentials
    if AUTH_MODE == "firebase":
        return _verify_firebase_token(token)
    # default dev mode:
    return _decode_dev_jwt(token)

def make_dev_token(user_id: str, ttl_seconds: int = 3600) -> str:
    """Create a short-lived dev token for local testing."""
    now = int(time.time())
    payload = {"sub": user_id, "iat": now, "exp": now + ttl_seconds}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
