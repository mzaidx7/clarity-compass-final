"""Fused scoring service.

Combines DASS-21 survey risk with optional behavior anomaly risk and
returns a single fused score. All artifacts are optional with safe fallbacks.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import json
import os
import joblib
import numpy as np

# ---- Artifact paths (relative to project root)
DASS_MODEL_PATH = "models/survey_dass21.joblib"
BEHAVIOR_MODEL_PATH = "models/behavior_studentlife.joblib"
BEHAVIOR_META_PATH = "models/behavior_meta.json"

# ---- Survey config
MIN_ITEM, MAX_ITEM = 0, 3  # DASS-21 stress items assumed 0..3
MAX_STRESS_RAW = 7 * MAX_ITEM

_survey_model = None
_behavior_pipe = None
_behavior_meta: Dict[str, Any] | None = None
_logged_once = False


def _log_once(msg: str) -> None:
    global _logged_once
    print(msg)


def _load_survey_model() -> None:
    """Load DASS-21 survey model once if present."""
    global _survey_model
    if _survey_model is not None:
        return
    if os.path.exists(DASS_MODEL_PATH):
        try:
            _survey_model = joblib.load(DASS_MODEL_PATH)
            _log_once(f"[fused] Loaded DASS-21 survey model: {DASS_MODEL_PATH}")
        except Exception as e:
            _log_once(f"[fused] Failed to load DASS-21 model ({DASS_MODEL_PATH}): {e}")
    else:
        _log_once(f"[fused] DASS-21 model not found at {DASS_MODEL_PATH}; using fallback.")


def _load_behavior_artifacts() -> None:
    """Load behavior pipeline and meta json once if present."""
    global _behavior_pipe, _behavior_meta
    if _behavior_pipe is not None and _behavior_meta is not None:
        return
    if os.path.exists(BEHAVIOR_MODEL_PATH):
        try:
            _behavior_pipe = joblib.load(BEHAVIOR_MODEL_PATH)
            _log_once(f"[fused] Loaded behavior pipeline: {BEHAVIOR_MODEL_PATH}")
        except Exception as e:
            _log_once(f"[fused] Failed to load behavior pipeline ({BEHAVIOR_MODEL_PATH}): {e}")
    else:
        _log_once(f"[fused] Behavior pipeline not found at {BEHAVIOR_MODEL_PATH}; skipping behavior.")

    if os.path.exists(BEHAVIOR_META_PATH):
        try:
            with open(BEHAVIOR_META_PATH, "r", encoding="utf-8") as f:
                _behavior_meta = json.load(f)
            _log_once(f"[fused] Loaded behavior meta: {BEHAVIOR_META_PATH}")
        except Exception as e:
            _log_once(f"[fused] Failed to load behavior meta ({BEHAVIOR_META_PATH}): {e}")
    else:
        _log_once(f"[fused] Behavior meta not found at {BEHAVIOR_META_PATH}; skipping behavior.")


def _normalize_to_100(stress_score_raw: float) -> float:
    """Normalize a raw DASS stress score to [0, 100]."""
    if MAX_STRESS_RAW <= 0:
        return 0.0
    return float(np.clip((stress_score_raw / MAX_STRESS_RAW) * 100.0, 0.0, 100.0))


def survey_predict_dass21(s_items: List[int]) -> Dict[str, Any]:
    """
    Predict normalized risk from 7 DASS-21 stress items.
    If model is available, use it; else use a simple normalized sum fallback.
    Returns {predicted_stress_score, survey_risk_0_100, top_drivers}
    """
    _load_survey_model()
    x = np.array([float(v) for v in s_items], dtype=float).reshape(1, -1)

    if _survey_model is None:
        raw = float(np.sum(x))  # crude fallback: sum the items
        risk = _normalize_to_100(raw)
        return {
            "predicted_stress_score": round(raw, 2),
            "survey_risk_0_100": round(risk, 2),
            "top_drivers": []
        }

    try:
        pred = float(_survey_model.predict(x)[0])
    except Exception:
        pred = float(np.sum(x))
    risk = _normalize_to_100(pred)

    drivers: List[Dict[str, Any]] = []
    imps = getattr(_survey_model, "feature_importances_", None)
    if imps is not None:
        arr = np.ravel(imps)
        top_idx = np.argsort(-arr)[:3]
        drivers = [{"feature": f"S{i+1}", "weight": float(arr[i])} for i in top_idx]

    return {
        "predicted_stress_score": round(pred, 2),
        "survey_risk_0_100": round(risk, 2),
        "top_drivers": drivers,
    }


def behavior_predict(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return behavior anomaly risk dict, or None if artifacts unavailable."""
    _load_behavior_artifacts()
    if _behavior_pipe is None or _behavior_meta is None:
        return None

    FEATURES: List[str] = list(_behavior_meta.get("features", []))
    MEDIANS: Dict[str, float] = dict(_behavior_meta.get("feature_medians", {}))
    P5 = float(_behavior_meta.get("norm_p5", 0.0))
    P95 = float(_behavior_meta.get("norm_p95", 1.0))

    row: List[float] = []
    used: Dict[str, str] = {}
    for name in FEATURES:
        if name in features and features[name] is not None:
            val = float(features[name])
            used[name] = "provided"
        else:
            val = float(MEDIANS.get(name, 0.0))
            used[name] = "median"
        row.append(val)

    X = np.array(row, dtype=float).reshape(1, -1)
    try:
        scaler = _behavior_pipe.named_steps["scaler"]
        iso = _behavior_pipe.named_steps["iso"]
        raw = -iso.score_samples(scaler.transform(X))[0]
    except Exception:
        return None

    if P95 <= P5 + 1e-9:
        risk = 50.0
    else:
        risk = float(np.clip((raw - P5) / (P95 - P5) * 100.0, 0.0, 100.0))

    return {
        "predicted_raw": round(float(raw), 4),
        "behavior_risk_0_100": round(float(risk), 2),
        "features_used": used,
    }


def fuse_scores(survey_risk: float, behavior_risk: Optional[float]) -> float:
    """Weighted average of survey and behavior risks; survey-only if behavior missing."""
    if behavior_risk is None:
        return round(float(survey_risk), 2)
    survey_weight = 0.6
    behavior_weight = 0.4
    final = survey_weight * float(survey_risk) + behavior_weight * float(behavior_risk)
    return round(max(0.0, min(100.0, final)), 2)


def predict_fused(s_answers: List[int], behavior_features: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Top-level fused prediction used by the /predict/fused route."""
    survey = survey_predict_dass21(s_answers)
    behavior = behavior_predict(behavior_features or {}) if behavior_features is not None else None
    behavior_risk = behavior.get("behavior_risk_0_100") if behavior else None
    final = fuse_scores(survey["survey_risk_0_100"], behavior_risk)
    return {
        "survey": survey,
        "behavior": behavior,
        "final_score_0_100": final,
    }
