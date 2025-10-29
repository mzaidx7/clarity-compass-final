"""Survey routes for saving user responses to local storage."""
from fastapi import APIRouter, Depends
from api.models.pyd_models import (
    SurveyRequest,
    SurveySavedResponse,
    SurveySaveFullRequest,
    SurveyHistoryResponse,
)
from api.services.local_store import append_survey_history, get_survey_history
from api.core.security import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/survey", tags=["survey"])

@router.post("/save", response_model=SurveySavedResponse)
def save_survey_response(
    req: SurveyRequest,
    user_id: str = Depends(get_current_user)
):
    """Save a survey payload to local storage."""
    ts = datetime.now(timezone.utc).isoformat()
    item = {
        "timestamp": ts,
        "input": req.model_dump(),
        "result": None,
        "fused": None,
    }
    append_survey_history(user_id, item)
    return SurveySavedResponse()

@router.post("/save_full", response_model=SurveySavedResponse)
def save_survey_full(
    body: SurveySaveFullRequest,
    user_id: str = Depends(get_current_user)
):
    """Save survey input and optional result in the local dev store."""
    ts = (body.timestamp or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat()
    item = {
        "timestamp": ts,
        "input": body.input.model_dump(),
        "result": body.result.model_dump() if body.result else None,
        "fused": body.fused.model_dump() if body.fused else None,
    }
    append_survey_history(user_id, item)
    return SurveySavedResponse()

@router.get("/history", response_model=SurveyHistoryResponse)
def survey_history(
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """Return recent saved survey results from local dev store."""
    items = get_survey_history(user_id, limit=limit)
    return SurveyHistoryResponse(items=items) 
