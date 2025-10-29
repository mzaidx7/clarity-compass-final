from typing import List, Optional, Tuple
import numpy as np

def _ewma(series: List[float], alpha: float) -> float:
    v = None
    for x in series:
        v = x if v is None else alpha * x + (1 - alpha) * v
    return float(v if v is not None else 50.0)

def _clamp_0_100(x: float) -> float:
    return float(np.clip(x, 0.0, 100.0))

def forecast_next7(
    last14: List[float],
    deadlines7: Optional[List[int]] = None,
    alpha: float = 0.5,
    deadline_weight: float = 1.5,
) -> Tuple[List[float], List[float], List[str]]:
    """
    Baseline: EWMA of last values
    Momentum: last-7 vs previous-7
    Deadlines: additive per-day boost
    Confidence: from recent std
    """
    s = [float(x) for x in last14[-14:]]
    if len(s) < 7:
        s = (s + [s[-1]] * (7 - len(s))) if s else [50.0] * 7

    alpha = 0.5 if not (0.01 <= float(alpha) <= 0.99) else float(alpha)
    deadline_weight = max(0.0, float(deadline_weight))

    base = _ewma(s, alpha)
    first7 = s[:7] if len(s) >= 14 else s[:max(1, len(s) // 2)]
    last7 = s[-7:]
    trend = (float(np.mean(last7)) - float(np.mean(first7))) if first7 else 0.0

    recent_std = float(np.std(last7)) if len(last7) >= 2 else 10.0
    band = max(5.0, min(20.0, recent_std * 1.5))

    preds, confs = [], []
    for d in range(7):
        trend_part = trend * ((d + 1) / 7.0)
        deadline_part = 0.0
        if deadlines7 is not None and len(deadlines7) == 7:
            deadline_part = deadline_weight * float(deadlines7[d])
        pred = _clamp_0_100(base + trend_part + deadline_part)
        preds.append(round(pred, 2))
        confs.append(round(band, 2))

    drivers = []
    if trend > 0.5:
        drivers.append("Recent trend up")
    elif trend < -0.5:
        drivers.append("Recent trend down")
    if deadlines7 and any(d > 0 for d in deadlines7):
        drivers.append("Deadlines impact")
    if not drivers:
        drivers.append("Stable baseline")

    return preds, confs, drivers

# Run: python research/test_forecast.py
