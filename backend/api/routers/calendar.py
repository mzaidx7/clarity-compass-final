"""Calendar CRUD endpoints backed by local dev store."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from api.models.pyd_models import CalendarEvent, CalendarEventCreate
from api.core.security import get_current_user
from api.services.local_store import add_calendar_event, list_calendar_events, delete_calendar_event, list_calendar_event_days_month

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/events")
def get_events(date: Optional[str] = Query(None), user_id: str = Depends(get_current_user)):
    events = list_calendar_events(user_id, date)
    return events

@router.post("/events", response_model=CalendarEvent)
def create_event(body: CalendarEventCreate, user_id: str = Depends(get_current_user)):
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="title required")
    evt = add_calendar_event(user_id, {
        "title": body.title.strip(),
        "type": body.type,
        "date": body.date,
        "start": body.start,
        "end": body.end,
        "description": body.description,
    })
    return evt

@router.delete("/events/{event_id}")
def remove_event(event_id: str, user_id: str = Depends(get_current_user)):
    ok = delete_calendar_event(user_id, event_id)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}

@router.get("/events/month")
def get_events_month(year: int, month: int, user_id: str = Depends(get_current_user)):
    """Return markers for days with events in a given month.

    Response shape: { days: [ { date: 'YYYY-MM-DD', count: number } ] }
    """
    if not (1 <= int(month) <= 12):
        raise HTTPException(status_code=422, detail="month must be 1..12")
    try:
        y = int(year)
        m = int(month)
    except Exception:
        raise HTTPException(status_code=422, detail="invalid year/month")
    days = list_calendar_event_days_month(user_id, y, m)
    return { "days": days }
