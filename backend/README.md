# Burnout Tracker (Backend + Models)

- Python 3.12
- FastAPI app at `api/main.py` (single entrypoint)
- Endpoints:
  - `/auth/*`, `/survey/save`, `/predict`, `/predict/status`
  - `/forecast` (7-day forecast of fused/burnout score)
  - `/predict/fused` (Optional fused risk prediction - legacy feature)
- Models: `models/burnout_model_v2.joblib` (Random Forest Regressor) + `models/burnout_scaler_v2.joblib` + `models/burnout_meta_v2.json`

## Run locally
```bash
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

## Training data (Kaggle pipeline)

- `training_data/kaggle_raw/stress_monitoring/StressLevelDataset.csv`
- `training_data/kaggle_raw/mental_stress_coping/Student_Mental_Stress_and_Coping_Mechanisms.csv`
- StudentLife dataset (used for feature inspiration, not directly merged)

The scripts in `archive/research_scripts/research/` merge and preprocess the two Kaggle datasets during model training (`improve_model_accuracy.py`). The final model uses 19 core features with polynomial interactions (~190 transformed features).

Notes:
- The `research/` folder contains research/training utilities (legacy features, behavior model). The production API runs from `api/main.py`.
- If you plan to expose fused prediction in the API, we can add a `/predict/fused` route after aligning model paths.

## Frontend usage

- Auth
  - Dev: `AUTH_MODE=dev` and use `/auth/dev-login` to get a Bearer token.
  - Firebase: `AUTH_MODE=firebase`; frontend sends `Authorization: Bearer <ID_TOKEN>`.
- Predict (simple survey)
  - POST `/predict` with `{ "sleep_hours": 7.5, "study_hours": 5, "assignments_due": 2, "exams_within_7d": 1 }`.
- Predict (fused)
  - POST `/predict/fused` with `{ "s_answers": [1,2,1,3,2,1,0], "behavior": { ... } }` (behavior optional).
- Forecast
  - POST `/forecast` with `{ "last14": [..scores..], "deadlines_next7": [..ints..] }`.
