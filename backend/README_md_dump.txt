# Burnout Tracker (Backend + Models)

- Python 3.12
- FastAPI app at `src/app.py`
- Endpoints: `/predict_fused`, `/forecast`, `/health`, `/docs`
- Models: `models/survey_dass21.joblib`, `models/behavior_*.joblib`

## Run locally
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.app:app --reload --host 127.0.0.1 --port 8000

