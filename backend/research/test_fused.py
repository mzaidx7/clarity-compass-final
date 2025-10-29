# src/test_fused.py
from predict_fused import predict_fused

# 7 DASS stress items (example)
s_answers = [1, 2, 1, 3, 2, 1, 0]

# A few behavior features (any subset works; others are median-filled)
behavior_features = {
    "activity__activity_inference__mean": 3.0,
    "phonelock__end__count": 200,
    "dark__end__sum": 1e7,
}

res = predict_fused(s_answers, behavior_features)
print("\n/predict_fused (local test) result:\n", res)

# Run: python research/test_fused.py

