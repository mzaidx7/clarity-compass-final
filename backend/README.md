# Burnout Tracker (Backend + Models)

- Python 3.12
- FastAPI app at `api/main.py` (single entrypoint)
- Endpoints:
  - `/auth/*`, `/survey/save`, `/predict`, `/predict/status`
  - `/forecast` (7-day forecast of fused/burnout score)
  - `/predict/fused` (DASS-21 + optional behavior → fused risk)
- Models: `models/survey_model.joblib` (+ optional `models/scaler.joblib`)

## Run locally
```bash
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

Notes:
- The `research/` folder contains research/training utilities (DASS-21 survey, behavior model, legacy app). The production API runs from `api/main.py`.
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
