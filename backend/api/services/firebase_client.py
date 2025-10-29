"""Thin Firebase/Firestore client wrapper used by the survey router.

Initialization is safe to call repeatedly; if credentials are missing,
we log and act as a no-op so local development continues to work.
"""
from __future__ import annotations
from typing import Any

import os
from api.core.config import settings

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception:
    firebase_admin = None
    credentials = None
    firestore = None

_app_inited = False

def init_firebase() -> None:
    """Initialize Firebase Admin SDK if credentials are provided."""
    global _app_inited
    if _app_inited or firebase_admin is None:
        return
    cred_path = settings.firebase_cred_path
    if not cred_path or not os.path.exists(cred_path):
        print("[firebase] Skipping init (no serviceAccountKey.json).")
        return
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id or None})
    _app_inited = True
    print("[firebase] Initialized.")

def get_db():
    """Return a Firestore client or None if not initialized/available."""
    init_firebase()
    if firestore is None or not _app_inited:
        return None
    return firestore.client()

def save_survey(user_id: str, payload: dict[str, Any]) -> None:
    """Persist the survey payload keyed by user id (merge semantics)."""
    db = get_db()
    if db is None:
        print("[firebase] save_survey skipped (no DB).")
        return
    db.collection("surveys").document(user_id).set(payload, merge=True)
