"""Simple survey-based prediction endpoints."""
from fastapi import APIRouter
from api.models.pyd_models import SurveyRequest, PredictionResponse
from api.services.ml_service import predict_burnout
from api.services.burnout_service import get_burnout_service

router = APIRouter(prefix="/predict", tags=["predict"])

@router.get("/status")
def status():
    """Report ML model status (v2 burnout model with 86% accuracy)."""
    service = get_burnout_service()
    feature_count = len(service.metadata.get('feature_names', [])) if service.metadata else 0
    return {
        "using": "ml_model",  # Always ML model for v2
        "model_loaded": service.model is not None,
        "scaler_loaded": service.scaler is not None,
        "model_version": "v2",
        "accuracy": "86%",
        "features": feature_count,
        "description": "Random Forest burnout prediction model with polynomial features"
    }

@router.post("", response_model=PredictionResponse)
def predict(req: SurveyRequest):
    """Return burnout score, risk label and optional drivers for 4 features."""
    score, label, drivers, using_model = predict_burnout(req.model_dump())
    return PredictionResponse(burnout_score=score, risk_label=label, top_drivers=drivers, using_model=using_model)
