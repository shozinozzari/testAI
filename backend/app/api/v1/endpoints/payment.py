from fastapi import APIRouter, HTTPException, Depends
from app.services.payment_service import payment_service
from pydantic import BaseModel

router = APIRouter()

class CheckoutRequest(BaseModel):
    uid: str
    email: str
    country: str  # "IN" or "ROW"

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    try:
        # In real implementation, verify UID matches auth token
        session_data = await payment_service.create_checkout_session(
            request.uid, request.email, request.country
        )
        return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
