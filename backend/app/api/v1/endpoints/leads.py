from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from app.models.lead import LeadCreate, LeadUpdate
from app.services.lead_service import lead_service
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/")
async def list_leads(
    status: Optional[str] = Query(None),
    campaign_id: Optional[str] = Query(None),
    assigned_agent_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List all leads for the current user, with optional filters."""
    return await lead_service.list_leads(
        current_user["uid"],
        status=status,
        campaign_id=campaign_id,
        assigned_agent_id=assigned_agent_id,
    )


@router.post("/")
async def create_lead(lead_in: LeadCreate, current_user: dict = Depends(get_current_user)):
    """Create a new lead."""
    return await lead_service.create_lead(current_user["uid"], lead_in)


@router.get("/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single lead by ID."""
    return await lead_service.get_lead(current_user["uid"], lead_id)


@router.patch("/{lead_id}")
async def update_lead(lead_id: str, updates: LeadUpdate, current_user: dict = Depends(get_current_user)):
    """Update lead fields (status, notes, assignment, etc.)."""
    return await lead_service.update_lead(current_user["uid"], lead_id, updates)


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a lead."""
    return await lead_service.delete_lead(current_user["uid"], lead_id)
