from app.models.campaign import CampaignCreate, CampaignInDB, CTAOption
from app.services.firebase_service import firebase_service
from firebase_admin import firestore
from fastapi import HTTPException, BackgroundTasks
import uuid
import logging

logger = logging.getLogger(__name__)

class CampaignService:
    async def create_campaign(self, user_id: str, campaign_in: CampaignCreate, background_tasks: BackgroundTasks = None):
        """
        Creates a new campaign with ownership enforcement.
        """
        db = firebase_service.db
        
        # 1. Enforce Ownership / Limits
        # Check if user is allowed to create more campaigns (e.g. Plan limits)
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        if not user_doc.exists:
             raise HTTPException(status_code=404, detail="User not found")
             
        # 2. Validate CTA Config
        if campaign_in.cta_option == CTAOption.WHATSAPP:
            # We assume config or default behavior for now
            pass
            
        # 3. Create Document
        campaign_id = str(uuid.uuid4())
        campaign_data = CampaignInDB(
            id=campaign_id,
            owner_id=user_id,
            status="processing",
            **campaign_in.dict()
        )
        
        db.collection("campaigns").document(campaign_id).set(campaign_data.dict())
        
        # Link to User
        user_ref.update({"campaign_ids": firestore.ArrayUnion([campaign_id])})
        
        async def run_generation(cid: str):
            from app.services.landing_page_service import landing_page_service
            try:
                await landing_page_service.generate_landing_page(cid)
                db.collection("campaigns").document(cid).update({
                    "status": "completed",
                    "is_active": True,
                    "error_message": None
                })
            except Exception as e:
                logger.error(f"Background generation failed for campaign {cid}: {e}")
                db.collection("campaigns").document(cid).update({
                    "status": "error",
                    "error_message": str(e)
                })

        if background_tasks:
            background_tasks.add_task(run_generation, campaign_id)
        else:
            import asyncio
            asyncio.create_task(run_generation(campaign_id))

        return campaign_data

    async def list_campaigns(self, user_id: str):
        """
        Lists all campaigns for a given user.
        """
        db = firebase_service.db
        results = []
        for doc in db.collection("campaigns").stream():
            data = doc.to_dict()
            if data.get("owner_id") == user_id:
                results.append(data)
        return results

    async def toggle_campaign(self, user_id: str, campaign_id: str):
        """Toggle campaign active status."""
        db = firebase_service.db
        doc_ref = db.collection("campaigns").document(campaign_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Campaign not found")
        data = doc.to_dict()
        if data.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        new_status = not data.get("is_active", True)
        doc_ref.update({"is_active": new_status})
        data["is_active"] = new_status
        return data

    async def delete_campaign(self, user_id: str, campaign_id: str):
        """Delete a campaign."""
        db = firebase_service.db
        doc_ref = db.collection("campaigns").document(campaign_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Campaign not found")
        data = doc.to_dict()
        if data.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        doc_ref.delete()
        return {"message": "Campaign deleted"}

    async def duplicate_campaign(self, user_id: str, campaign_id: str):
        """Duplicate a campaign."""
        db = firebase_service.db
        doc_ref = db.collection("campaigns").document(campaign_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Campaign not found")
        data = doc.to_dict()
        if data.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        new_id = str(uuid.uuid4())
        new_data = dict(data)
        new_data["id"] = new_id
        new_data["business_name"] = f"{data.get('business_name', 'Campaign')} (Copy)"
        new_data["is_active"] = False
        db.collection("campaigns").document(new_id).set(new_data)
        return new_data

    async def update_campaign(self, user_id: str, campaign_id: str, updates: dict):
        """Update campaign fields."""
        db = firebase_service.db
        doc_ref = db.collection("campaigns").document(campaign_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Campaign not found")
        data = doc.to_dict()
        if data.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        doc_ref.update(updates)
        data.update(updates)
        return data

campaign_service = CampaignService()
