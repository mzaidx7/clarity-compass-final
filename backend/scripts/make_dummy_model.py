import os, joblib
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

os.makedirs("models", exist_ok=True)

# Make up some toy data (not accurate — just to test wiring)
# Features: sleep, study, assignments, exams
X = np.array([
    [8, 4, 0, 0],
    [7, 5, 1, 0],
    [6, 8, 3, 1],
    [5,10, 4, 2],
    [9, 3, 0, 0],
    [7, 7, 2, 1],
], dtype=float)

# Fake "score" roughly like our heuristic
y = np.array([20, 35, 75, 90, 10, 60], dtype=float)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = LinearRegression()
model.fit(X_scaled, y)

joblib.dump(model, "models/survey_model.joblib")
joblib.dump(scaler, "models/scaler.joblib")
print("Saved dummy model + scaler to models/")

# Run: python scripts/make_dummy_model.py
