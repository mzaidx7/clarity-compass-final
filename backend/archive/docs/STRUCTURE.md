Project Structure

- api/
  - core/ — app config and auth helpers
  - models/ — Pydantic request/response schemas
  - routers/ — FastAPI routes grouped by feature
    - auth.py — dev login/health
    - survey.py — save survey responses (optional Firestore)
    - predict.py — 4-feature survey prediction
    - forecast.py — 7-day forecast
    - fused.py — DASS-21 + optional behavior fused risk
  - services/ — stateless logic and integrations
    - ml_service.py — 4-feature model + heuristic fallback
    - forecast_service.py — forecast logic
    - fused_service.py — survey + behavior fusion
    - firebase_client.py — optional Firestore writes
  - main.py — single production FastAPI app entrypoint

- models/
  - survey_model.joblib, scaler.joblib — 4-feature model artifacts (optional)
  - survey_dass21.joblib — DASS-21 survey model (optional)
  - behavior_studentlife.joblib, behavior_meta.json — behavior model + meta (optional)

- scripts/
  - make_dummy_model.py — quick dummy model generator for wiring tests

- research/ (research & training utilities)
  - app.py — legacy experimental app (not used in production)
  - forecast.py — original forecast logic (now ported to api/services)
  - survey_infer.py, behavior_infer.py, fuse_scores.py, predict_fused.py — R&D
  - train_*.py, inspect_*.py, print_tree.py — data/model exploration

- data/ — datasets for training/analysis (not required at runtime)

- README.md — how to run the production API
- .env — runtime env vars (dev defaults provided)
- requirements.txt — Python dependencies

Notes:
- Frontend should call only the production app at `api/main.py`.
- If `AUTH_MODE=firebase`, backend verifies Firebase ID tokens and can write to Firestore (when service account is provided).
