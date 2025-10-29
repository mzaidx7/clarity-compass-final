"""
Data management endpoints (clear data, reset, etc.)
"""
from fastapi import APIRouter, Depends
from api.core.security import get_current_user
from api.services.local_store import clear_all_data
from pydantic import BaseModel

router = APIRouter(prefix="/data", tags=["data"])


class ClearDataResponse(BaseModel):
    success: bool
    message: str
    items_cleared: int


@router.delete("/clear-all")
async def clear_all_user_data(current_user: dict = Depends(get_current_user)) -> ClearDataResponse:
    """
    Clear all stored data for the current user (assessments, calendar, history).
    This is a destructive operation and cannot be undone.
    """
    user_id = current_user.get("sub") or current_user.get("uid") or "local_dev"
    
    try:
        items_cleared = clear_all_data(user_id)
        return ClearDataResponse(
            success=True,
            message=f"Successfully cleared all data for user {user_id}",
            items_cleared=items_cleared
        )
    except Exception as e:
        return ClearDataResponse(
            success=False,
            message=f"Failed to clear data: {str(e)}",
            items_cleared=0
        )

