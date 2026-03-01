from fastapi import APIRouter, HTTPException
from app.services.landing_page_service import landing_page_service

router = APIRouter()

@router.get("/{campaign_id}")
async def get_landing_page(campaign_id: str):
    """
    Returns the generated landing page data for a campaign.
    """
    try:
        return await landing_page_service.generate_landing_page(campaign_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Landing page not found")
