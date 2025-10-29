"""Survey model scoring service.

Loads a trained model/scaler if available, otherwise falls back to a
transparent heuristic based on the 4 input features.
"""
from __future__ import annotations
from typing import Any, Tuple, List
import os
import joblib
import numpy as np

# ---- Artifact paths
MODEL_PATH = "models/survey_model.joblib"
SCALER_PATH = "models/scaler.joblib"   # optional

# ---- Fixed feature order we expect from the API (must match training)
FEATURES: List[str] = [
    "sleep_hours",
    "study_hours",
    "assignments_due",
    "exams_within_7d",
]

_model = None
_scaler = None
_loaded_status = {"model_loaded": False, "scaler_loaded": False, "using": "heuristic"}
_load_attempted = False  # ensure we only log once

def _load_artifacts() -> None:
    """Load model/scaler once and record status with one-time logging."""
    global _model, _scaler, _loaded_status, _load_attempted
    # Load once and log outcome clearly
    if _load_attempted:
        return
    _load_attempted = True

    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _loaded_status["model_loaded"] = True
            _loaded_status["using"] = "trained_model"
            print(f"[ml_service] Loaded model: {MODEL_PATH}")
        except Exception as e:
            print(f"[ml_service] Failed to load model at {MODEL_PATH}: {e}")
    else:
        print(f"[ml_service] Model not found at {MODEL_PATH}; using heuristic fallback.")

    if os.path.exists(SCALER_PATH):
        try:
            _scaler = joblib.load(SCALER_PATH)
            _loaded_status["scaler_loaded"] = True
            print(f"[ml_service] Loaded scaler: {SCALER_PATH}")
        except Exception as e:
            print(f"[ml_service] Failed to load scaler at {SCALER_PATH}: {e}")

def _to_vector(features: dict[str, Any]) -> np.ndarray:
    """Map request dict to a 2D numpy array in the exact feature order."""
    vec = [float(features.get(k, 0.0)) for k in FEATURES]
    return np.array(vec, dtype=float).reshape(1, -1)

def _heuristic_predict(features: dict[str, Any]) -> Tuple[float, str, List[str], bool]:
    """Simple, explainable score as a fallback when no model artifacts exist."""
    sleep = float(features.get("sleep_hours", 7))
    study = float(features.get("study_hours", 4))
    assignments = int(features.get("assignments_due", 0))
    exams = int(features.get("exams_within_7d", 0))

    score = 50.0
    score += max(0, (8 - sleep)) * 4
    score += max(0, (study - 6)) * 2
    score += assignments * 3
    score += exams * 5
    score = max(0.0, min(100.0, score))

    label = "Low" if score < 33 else ("Moderate" if score < 66 else "High")
    drivers: List[str] = []
    if sleep < 7: drivers.append("Low sleep")
    if study > 6: drivers.append("Long study hours")
    if assignments > 2: drivers.append("Many assignments")
    if exams > 0: drivers.append("Upcoming exams")
    return score, label, drivers, False  # False = using heuristic, not trained model

def predict_burnout(features: dict[str, Any]) -> Tuple[float, str, List[str], bool]:
    """
    If artifacts exist, use them; else use the heuristic.
    Expected model outputs either:
      - direct score [0..100], or
      - probability of 'burnout' class we map to [0..100].
    Adapt this to your trained model as needed.
    Returns: (score, label, drivers, using_model)
    """
    _load_artifacts()
    if _model is None:
        return _heuristic_predict(features)

    X = _to_vector(features)
    if _scaler is not None:
        X = _scaler.transform(X)

    # Try common prediction shapes
    try:
        # If model predicts a numeric risk/score directly
        y_pred = _model.predict(X)
        score = float(y_pred[0])
        # If score looks like 0..1, scale to 0..100
        if 0.0 <= score <= 1.0:
            score *= 100.0
    except Exception:
        # Fallback: use predict_proba if available (binary class 1 prob)
        if hasattr(_model, "predict_proba"):
            proba = _model.predict_proba(X)[0]
            # If binary, take positive class prob
            score = float(proba[-1]) * 100.0
        else:
            # Last resort: heuristic
            return _heuristic_predict(features)

    score = max(0.0, min(100.0, score))
    label = "Low" if score < 33 else ("Moderate" if score < 66 else "High")

    # Optional: basic drivers via linear coef or feature_importances_
    drivers: List[str] = []
    try:
        if hasattr(_model, "coef_"):
            coefs = np.ravel(_model.coef_)
            top_idx = np.argsort(-np.abs(coefs))[:3]
            drivers = [f"Influential: {FEATURES[i]}" for i in top_idx]
        elif hasattr(_model, "feature_importances_"):
            imps = np.ravel(_model.feature_importances_)
            top_idx = np.argsort(-imps)[:3]
            drivers = [f"Influential: {FEATURES[i]}" for i in top_idx]
    except Exception:
        pass

    return score, label, drivers, True  # True = using trained model

def model_status() -> dict[str, Any]:
    _load_artifacts()
    return {
        "using": _loaded_status["using"],
        "model_loaded": _loaded_status["model_loaded"],
        "scaler_loaded": _loaded_status["scaler_loaded"],
        "features": FEATURES,
        "model_path": MODEL_PATH if os.path.exists(MODEL_PATH) else None,
        "scaler_path": SCALER_PATH if os.path.exists(SCALER_PATH) else None,
    }
