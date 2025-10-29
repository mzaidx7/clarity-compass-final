"""Legacy experimental FastAPI app.

Kept for local demos during development. Production app is api.main:app.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os, sys

# Make local modules importable
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if THIS_DIR not in sys.path:
    sys.path.insert(0, THIS_DIR)

from predict_fused import predict_fused          # survey + behavior + fusion
from forecast import forecast_next7               # new forecaster

app = FastAPI(title="Burnout/Stress API", version="1.0.0")

# Allow frontends to call the API (adjust origins later if you want)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # or replace with your web origins later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas (Pydantic v1) ----------
class PredictFusedBody(BaseModel):
    s_answers: List[int]                  # exactly 7 required (validated in route)
    behavior: Optional[Dict[str, float]] = None

class PredictFusedResponse(BaseModel):
    survey: Dict[str, Any]
    behavior: Optional[Dict[str, Any]]
    final_score_0_100: float

class ForecastBody(BaseModel):
    last14: List[float]                   # >= 7 values (we'll use up to the last 14)
    deadlines_next7: Optional[List[int]] = None  # optional, length 7
    alpha: float = 0.5
    deadline_weight: float = 1.5

class ForecastResponse(BaseModel):
    pred: List[float]
    conf: List[float]
    drivers: List[str]

# ---------- Routes ----------
@app.post("/predict_fused", response_model=PredictFusedResponse)
def route_predict_fused(body: PredictFusedBody):
    if len(body.s_answers) != 7:
        raise HTTPException(status_code=422, detail="s_answers must have exactly 7 integers (DASS-21 stress items).")
    result = predict_fused(body.s_answers, body.behavior)
    result["final_score_0_100"] = round(float(result["final_score_0_100"]), 2)
    return result

@app.post("/forecast", response_model=ForecastResponse)
def route_forecast(body: ForecastBody):
    if body.last14 is None or len(body.last14) < 7:
        raise HTTPException(status_code=422, detail="last14 must contain at least 7 values.")
    if body.deadlines_next7 is not None and len(body.deadlines_next7) != 7:
        raise HTTPException(status_code=422, detail="deadlines_next7 must be length 7 when provided.")
    preds, confs, drivers = forecast_next7(
        body.last14,
        body.deadlines_next7,
        body.alpha,
        body.deadline_weight,
    )
    return {"pred": preds, "conf": confs, "drivers": drivers}

@app.get("/")
def root():
    return {"ok": True, "endpoints": ["/predict_fused", "/forecast", "/docs"]}

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "burnout-backend",
        "endpoints": ["/predict_fused", "/forecast", "/docs"],
        "python": "3.12.x"
    }

@app.get("/")
def root():
    return {"ok": True, "message": "Burnout API running", "see": "/docs"}




# Run: uvicorn research.app:app --reload --host 127.0.0.1 --port 8001
