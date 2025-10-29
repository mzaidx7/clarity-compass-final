"""Pydantic request/response models shared by the API routers."""
from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime

class SurveyRequest(BaseModel):
    """Input features for enhanced quick risk prediction (7 fields)."""
    sleep_hours: float = Field(ge=0, le=24, description="Hours of sleep per night")
    study_hours: float = Field(ge=0, le=24, description="Hours of study per day")
    assignments_due: int = Field(ge=0, description="Number of assignments due soon")
    exams_within_7d: int = Field(ge=0, description="Number of exams in next 7 days")
    # New fields with defaults for backward compatibility with old survey data
    stress_level: int = Field(default=3, ge=1, le=5, description="Overall stress level (1=low, 5=high)")
    social_support: int = Field(default=3, ge=1, le=5, description="Social support quality (1=poor, 5=excellent)")
    physical_activity: float = Field(default=3.0, ge=0, le=20, description="Hours of exercise per week")

class SurveySavedResponse(BaseModel):
    """Acknowledgement response for storing a survey payload."""
    status: str = "ok"
    message: str = "Saved"

class SurveyHistoryItem(BaseModel):
    """A saved survey record including inputs and optional result."""
    timestamp: str
    type: str | None = None  # "burnout_assessment" or None for legacy
    input: SurveyRequest | None = None  # For quick risk (legacy)
    responses: dict | None = None  # For burnout assessment
    result: dict | None = None  # Can be PredictionResponse or AssessmentResponse
    fused: FusedPredictResponse | None = None
    
    class Config:
        # Allow extra fields for flexibility
        extra = "allow"

class SurveyHistoryResponse(BaseModel):
    items: list[SurveyHistoryItem]

class SurveySaveFullRequest(BaseModel):
    input: SurveyRequest
    result: PredictionResponse | None = None
    timestamp: datetime | None = None
    fused: FusedPredictResponse | None = None

class PredictionResponse(BaseModel):
    """Model prediction with burnout score, label and optional drivers."""
    burnout_score: float
    risk_label: str
    top_drivers: list[str] = []
    using_model: bool = True  # Flag to indicate if real model or heuristic was used

class HealthResponse(BaseModel):
    """Simple health check payload."""
    status: str
    version: str

class ForecastRequest(BaseModel):
    """7-day forecast request based on recent fused scores and optional deadlines."""
    last14: list[float]
    deadlines_next7: list[int] | None = None
    alpha: float = 0.5
    deadline_weight: float = 1.5

class ForecastResponse(BaseModel):
    """7-day forecast result with confidence band and short driver strings."""
    pred: list[float]
    conf: list[float]
    drivers: list[str]

class FusedPredictRequest(BaseModel):
    """DASS-21 answers plus optional behavior features for fused risk."""
    s_answers: list[int]
    behavior: dict[str, float] | None = None

class FusedPredictResponse(BaseModel):
    """Fused prediction containing survey details, optional behavior and final score."""
    survey: dict
    behavior: dict | None
    final_score_0_100: float

# Calendar models (dev/server storage)
class CalendarEvent(BaseModel):
    id: str
    title: str
    type: str
    date: str  # YYYY-MM-DD
    start: str | None = None  # HH:mm
    end: str | None = None
    description: str | None = None
    priority: str = "medium"  # "low", "medium", "high"

class CalendarEventCreate(BaseModel):
    title: str
    type: str
    date: str
    start: str | None = None
    end: str | None = None
    description: str | None = None
    priority: str = "medium"  # "low", "medium", "high"
