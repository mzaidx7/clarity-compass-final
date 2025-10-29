def fuse_scores(survey_risk, behavior_risk=None, survey_weight=0.6, behavior_weight=0.4):
    """
    Returns final risk 0–100.
    If behavior_risk is None, fallback to survey-only cleanly.
    """
    if behavior_risk is None:
        return round(float(survey_risk), 2)
    final = survey_weight * float(survey_risk) + behavior_weight * float(behavior_risk)
    # clip to [0,100]
    return round(max(0.0, min(100.0, final)), 2)

if __name__ == "__main__":
    print("survey-only:", fuse_scores(72.5))
    print("with behavior:", fuse_scores(72.5, behavior_risk=50.0))
