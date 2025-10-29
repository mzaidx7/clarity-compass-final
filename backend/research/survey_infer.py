import joblib
import numpy as np
from pathlib import Path

# Resolve model path relative to repo root
ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "survey_dass21.joblib"
model = joblib.load(MODEL_PATH)

# ---- Configs ----
MIN_ITEM, MAX_ITEM = 0, 3
MAX_STRESS_RAW = 7 * MAX_ITEM

def normalize_to_100(stress_score_raw: float) -> float:
    if MAX_STRESS_RAW == 0:
        return 0.0
    return float(np.clip((stress_score_raw / MAX_STRESS_RAW) * 100.0, 0, 100))

def predict_survey(stress_items):
    """
    stress_items: list/tuple of 7 ints [S1..S7]
    Returns dict with predicted_score, risk_0_100, and feature importances.
    """
    x = np.array(stress_items, dtype=float).reshape(1, -1)
    pred = float(model.predict(x)[0])
    risk = normalize_to_100(pred)

    # Feature importances (same order as training: S1..S7)
    importances = getattr(model, "feature_importances_", None)
    if importances is not None:
        drivers = sorted(
            [{"feature": f"S{i+1}", "weight": float(w)} for i, w in enumerate(importances)],
            key=lambda d: d["weight"],
            reverse=True
        )[:3]
    else:
        drivers = []

    return {
        "predicted_stress_score": round(pred, 2),
        "survey_risk_0_100": round(risk, 2),
        "top_drivers": drivers
    }

if __name__ == "__main__":
    # Example inputs (replace with real answers later):
    # 7 integer answers for S1..S7
    sample_answers = [1, 2, 1, 3, 2, 1, 0]
    result = predict_survey(sample_answers)
    print("\nSurvey inference result:")
    print(result)

# Run: python research/survey_infer.py
