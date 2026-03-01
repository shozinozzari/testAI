from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from app.services.whatsapp_service import whatsapp_service

router = APIRouter()

@router.get("/redirect/{campaign_id}")
async def redirect_to_whatsapp(campaign_id: str):
    """
    Redirects the user to the next WhatsApp number in the pool.
    """
    number = await whatsapp_service.get_next_number(campaign_id)
    
    if not number:
        raise HTTPException(status_code=404, detail="No active WhatsApp numbers found for this campaign.")
    
    # Sanitize number
    clean_number = number.replace("+", "").replace(" ", "").strip()
    
    whatsapp_url = f"https://wa.me/{clean_number}"
    return RedirectResponse(url=whatsapp_url)
