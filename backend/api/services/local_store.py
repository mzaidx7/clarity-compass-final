"""Simple local JSON store for dev mode persistence.

Data layout (file: data/local_store.json):
{
  "survey_history": { "<user_id>": [ {timestamp, input, result}, ... ] },
  "calendar": { "<user_id>": [ {id, title, type, date, start, end, description}, ... ] }
}

This is NOT suitable for production; it's a convenience for local development.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
import json, os, threading, time

STORE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'local_store.json')
_lock = threading.Lock()

def _ensure_file() -> None:
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
    if not os.path.exists(STORE_PATH):
        with open(STORE_PATH, 'w', encoding='utf-8') as f:
            json.dump({"survey_history": {}, "calendar": {}}, f)

def _read() -> Dict[str, Any]:
    _ensure_file()
    with open(STORE_PATH, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {"survey_history": {}, "calendar": {}}

def _write(data: Dict[str, Any]) -> None:
    tmp = STORE_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    os.replace(tmp, STORE_PATH)

# ---- Survey history ----
def append_survey_history(user_id: str, item: Dict[str, Any]) -> None:
    with _lock:
        data = _read()
        hist = data.setdefault('survey_history', {}).setdefault(user_id, [])
        hist.append(item)
        # keep last 200 entries
        if len(hist) > 200:
            hist[:] = hist[-200:]
        _write(data)

def get_survey_history(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    with _lock:
        data = _read()
        hist = data.get('survey_history', {}).get(user_id, [])
        return list(hist[-limit:])

# ---- Calendar events ----
def add_calendar_event(user_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    if 'id' not in event:
        event['id'] = str(int(time.time() * 1000))
    with _lock:
        data = _read()
        events = data.setdefault('calendar', {}).setdefault(user_id, [])
        events.append(event)
        _write(data)
    return event

def list_calendar_events(user_id: str, date: Optional[str] = None) -> List[Dict[str, Any]]:
    with _lock:
        data = _read()
        events = data.get('calendar', {}).get(user_id, [])
    if date:
        return [e for e in events if e.get('date') == date]
    return list(events)

def list_calendar_event_days_month(user_id: str, year: int, month: int) -> List[Dict[str, Any]]:
    """Return a list of {date, count} for all days in the given year-month that have events.

    month is 1-12
    """
    with _lock:
        data = _read()
        events = data.get('calendar', {}).get(user_id, [])
    ym = f"{year:04d}-{month:02d}-"
    counts: Dict[str, int] = {}
    for e in events:
        d = str(e.get('date') or '')
        if d.startswith(ym):
            counts[d] = counts.get(d, 0) + 1
    return [{"date": k, "count": v} for k, v in sorted(counts.items())]

def delete_calendar_event(user_id: str, event_id: str) -> bool:
    with _lock:
        data = _read()
        events = data.get('calendar', {}).get(user_id, [])
        new_events = [e for e in events if str(e.get('id')) != str(event_id)]
        if len(new_events) == len(events):
            return False
        data['calendar'][user_id] = new_events
        _write(data)
        return True
