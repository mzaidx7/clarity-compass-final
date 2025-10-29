"""Simple survey-based prediction endpoints."""
from fastapi import APIRouter
from api.models.pyd_models import SurveyRequest, PredictionResponse
from api.services.ml_service import predict_burnout, model_status

router = APIRouter(prefix="/predict", tags=["predict"])

@router.get("/status")
def status():
    """Report whether a trained model/scaler was loaded or using heuristics."""
    return model_status()

@router.post("", response_model=PredictionResponse)
def predict(req: SurveyRequest):
    """Return burnout score, risk label and optional drivers for 4 features."""
    score, label, drivers, using_model = predict_burnout(req.model_dump())
    return PredictionResponse(burnout_score=score, risk_label=label, top_drivers=drivers, using_model=using_model)
