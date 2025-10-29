"""Forecast route for projecting next-7 day risk."""
from fastapi import APIRouter, HTTPException
from api.models.pyd_models import ForecastRequest, ForecastResponse
from api.services.forecast_service import forecast_next7

router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.post("", response_model=ForecastResponse)
def forecast(body: ForecastRequest):
    """Return next-7 predictions, confidence and short driver strings."""
    if body.last14 is None or len(body.last14) < 7:
        raise HTTPException(status_code=422, detail="last14 must contain at least 7 values")
    if body.deadlines_next7 is not None and len(body.deadlines_next7) != 7:
        raise HTTPException(status_code=422, detail="deadlines_next7 must be length 7 when provided")

    preds, confs, drivers = forecast_next7(
        body.last14,
        body.deadlines_next7,
        body.alpha,
        body.deadline_weight,
    )
    return ForecastResponse(pred=preds, conf=confs, drivers=drivers)
