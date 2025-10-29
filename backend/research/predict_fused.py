# src/predict_fused.py
import os, sys, json

# Make sure sibling modules are importable
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if THIS_DIR not in sys.path:
    sys.path.insert(0, THIS_DIR)

from survey_infer import predict_survey
from behavior_infer import predict_behavior
from fuse_scores import fuse_scores

def predict_fused(s1_to_s7, behavior_features=None, survey_weight=0.6, behavior_weight=0.4):
    """
    s1_to_s7: list of 7 ints, DASS-21 stress items (0–3 or 1–4; we normalize inside survey_infer)
    behavior_features: dict of sensing features (any subset; missing ones are median-filled)
      Example keys (check models/behavior_meta.json for your full set):
        - "activity__activity_inference__mean"
        - "phonelock__end__count"
        - "dark__end__sum"
        - "phonecharge__start__count"
        - "conversation__..."; "bluetooth__..."
    Returns:
      { "survey": {...}, "behavior": {... or None}, "final_score_0_100": float }
    """
    survey = predict_survey(s1_to_s7)  # -> dict with survey_risk_0_100, predicted_stress_score, top_drivers

    behavior = None
    behavior_risk = None
    if behavior_features is not None:
        behavior = predict_behavior(**behavior_features)
        behavior_risk = behavior["behavior_risk_0_100"]

    final = fuse_scores(
        survey_risk=survey["survey_risk_0_100"],
        behavior_risk=behavior_risk,
        survey_weight=survey_weight,
        behavior_weight=behavior_weight,
    )

    return {
        "survey": survey,
        "behavior": behavior,  # may be None if not provided
        "final_score_0_100": final
    }

if __name__ == "__main__":
    # Example local run
    s_answers = [1, 2, 1, 3, 2, 1, 0]
    behavior_features = {
        "activity__activity_inference__mean": 3.0,
        "phonelock__end__count": 200,
        "dark__end__sum": 1e7
    }
    res = predict_fused(s_answers, behavior_features)
    print("\nFused prediction:")
    print(json.dumps(res, indent=2))

# Run: python research/predict_fused.py
