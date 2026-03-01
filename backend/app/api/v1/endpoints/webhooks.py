from fastapi import APIRouter, Request, Header, HTTPException, status
from app.services.payment_service import payment_service

router = APIRouter()

@router.post("/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    try:
        payload = await request.body()
        # Stripe library expects raw body for signature verification
        await payment_service.handle_webhook(payload, "stripe", stripe_signature)
        return {"status": "received"}
    except Exception as e:
        print(f"Webhook Error: {e}")
        return {"status": "error"}

@router.post("/razorpay")
async def razorpay_webhook(request: Request):
    try:
        # Razorpay usage often depends on how client sends it, 
        # but std webhook sends JSON. Signature is in header 'X-Razorpay-Signature'
        sig = request.headers.get('X-Razorpay-Signature')
        payload = await request.json()
        await payment_service.handle_webhook(payload, "razorpay", sig)
        return {"status": "received"}
    except Exception as e:
        print(f"Webhook Error: {e}")
        return {"status": "error"}
