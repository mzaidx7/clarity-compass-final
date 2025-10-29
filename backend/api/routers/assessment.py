"""
Burnout Assessment Router

Provides endpoints for the comprehensive 15-question burnout assessment.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from pydantic import BaseModel, Field

from api.core.security import get_current_user
from api.services.burnout_service import get_burnout_service
from api.services.firebase_client import save_survey
from api.services.local_store import append_survey_history
from api.core.config import settings

router = APIRouter(prefix="/assessment", tags=["assessment"])

# ============================================================================
# Request/Response Models
# ============================================================================

class SurveyQuestion(BaseModel):
    """Survey question structure."""
    id: str
    question: str
    scale: str
    weight: float


class AssessmentRequest(BaseModel):
    """Request body for burnout assessment."""
    responses: Dict[str, float] = Field(
        ...,
        description="Dict of {feature_id: value} where value is 1-5 or 0-1",
        example={
            "anxiety": 3,
            "depression": 2,
            "sleep_quality": 4,
            "self_esteem": 2,
            "academic_performance": 3,
            "study_load": 4,
            "future_career_concerns": 3,
            "social_support": 2,
            "peer_pressure": 3,
            "mental_health_history": 0,
            "physical_health": 3,
            "time_management": 4,
            "stress_coping": 3,
            "social_isolation": 2,
            "energy_level": 3
        }
    )


class RiskFactor(BaseModel):
    """Individual risk factor."""
    factor: str
    value: float
    importance: float
    risk_contribution: float


class AssessmentResponse(BaseModel):
    """Response body for burnout assessment."""
    burnout_score: float
    risk_level: str
    top_risk_factors: List[RiskFactor]
    using_model: bool
    model_confidence: float


class ModelInfo(BaseModel):
    """Model metadata and performance info."""
    model_type: str
    features: int
    r2_score: float
    rmse: float
    cv_score: float
    train_samples: int
    test_samples: int


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/questions", response_model=List[SurveyQuestion])
async def get_survey_questions():
    """
    Get the 15 survey questions for burnout assessment.
    
    Returns a list of questions with their IDs, text, scales, and importance weights.
    """
    service = get_burnout_service()
    return service.get_survey_questions()


@router.post("/predict", response_model=AssessmentResponse)
async def predict_burnout(
    request: AssessmentRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Predict burnout score from survey responses.
    
    Takes 15 survey responses and returns:
    - Burnout score (0-100)
    - Risk level (low/moderate/high/severe)
    - Top 3 risk factors
    """
    service = get_burnout_service()
    
    try:
        result = service.predict(request.responses)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.post("/submit")
async def submit_assessment(
    request: AssessmentRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Submit assessment and save to history.
    
    Predicts burnout and saves the result to Firestore/local store.
    """
    service = get_burnout_service()
    
    try:
        # Get prediction
        result = service.predict(request.responses)
        
        # Prepare data to save to history
        from datetime import datetime, timezone
        data_to_save = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'type': 'burnout_assessment',
            'responses': request.responses,
            'result': {
                'burnout_score': result['burnout_score'],
                'risk_level': result['risk_level'],
                'top_risk_factors': result['top_risk_factors'],
                'using_model': result['using_model']
            }
        }
        
        # Save to local history store
        append_survey_history(user_id, data_to_save)
        
        # Also save to Firestore if configured
        try:
            save_survey(user_id, {'latest_assessment': data_to_save})
        except Exception:
            pass  # Firestore is optional
        
        return {
            'success': True,
            'result': result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Submit error: {str(e)}")


@router.get("/model-info", response_model=ModelInfo)
async def get_model_info():
    """
    Get information about the burnout prediction model.
    
    Returns model type, performance metrics, and training details.
    """
    service = get_burnout_service()
    return service.get_model_info()

