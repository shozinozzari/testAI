from fastapi import APIRouter, HTTPException, Depends
from app.services.firebase_service import firebase_service

router = APIRouter()

@router.get("/metrics")
async def get_system_metrics():
    """
    Returns high-level system metrics for the Admin Dashboard.
    """
    # Mock Metrics for V1
    # In prod, query Firestore for counts
    return {
        "users": {
            "total": 120,
            "active": 45,
            "paid": 12
        },
        "jobs": {
            "queued": 5,
            "running": 2,
            "failed_today": 0
        },
        "revenue": {
            "mrr": 3600, # $
            "churn_rate": "2.1%"
        },
        "system_health": "HEALTHY"
    }
