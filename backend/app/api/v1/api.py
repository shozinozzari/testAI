from fastapi import APIRouter
from app.api.v1.endpoints import webhooks
from app.api.v1.endpoints import users
from app.api.v1.endpoints import payment
from app.api.v1.endpoints import whatsapp
from app.api.v1.endpoints import campaigns
from app.api.v1.endpoints import landing_pages
from app.api.v1.endpoints import admin
from app.api.v1.endpoints import oauth
from app.api.v1.endpoints import leads

api_router = APIRouter()
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(payment.router, prefix="/payment", tags=["payment"])
api_router.include_router(whatsapp.router, prefix="/wa", tags=["whatsapp"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(landing_pages.router, prefix="/landing", tags=["landing_pages"])
api_router.include_router(oauth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
