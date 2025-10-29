"""Fused prediction route combining DASS-21 survey and optional behavior."""
from fastapi import APIRouter, HTTPException
from api.models.pyd_models import FusedPredictRequest, FusedPredictResponse
from api.services.fused_service import predict_fused

router = APIRouter(prefix="/predict", tags=["predict"])  # share group with predict endpoints

@router.post("/fused", response_model=FusedPredictResponse)
def route_predict_fused(body: FusedPredictRequest):
    """Compute fused risk (survey-only if behavior artifacts are unavailable)."""
    if not body.s_answers or len(body.s_answers) != 7:
        raise HTTPException(status_code=422, detail="s_answers must have exactly 7 integers (DASS-21 stress items)")
    result = predict_fused(body.s_answers, body.behavior)
    return FusedPredictResponse(**result)
