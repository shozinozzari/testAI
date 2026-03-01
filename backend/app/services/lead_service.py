from app.models.lead import LeadCreate, LeadUpdate, LeadInDB, LeadStatus
from app.services.firebase_service import firebase_service
from fastapi import HTTPException
from datetime import datetime
import uuid


class LeadService:
    async def create_lead(self, owner_id: str, lead_in: LeadCreate) -> dict:
        db = firebase_service.db
        lead_id = str(uuid.uuid4())
        now = datetime.utcnow()

        lead_data = LeadInDB(
            id=lead_id,
            owner_id=owner_id,
            name=lead_in.name,
            email=lead_in.email,
            phone=lead_in.phone,
            source=lead_in.source,
            status=LeadStatus.NEW,
            campaign_id=lead_in.campaign_id,
            assigned_agent_id=lead_in.assigned_agent_id,
            notes=lead_in.notes,
            gender=lead_in.gender,
            follow_up=lead_in.follow_up,
            objections=lead_in.objections,
            pain_points=lead_in.pain_points,
            vibe=lead_in.vibe,
            dreams_goals=lead_in.dreams_goals,
            call_summary=lead_in.call_summary,
            tags=lead_in.tags,
            created_at=now,
            updated_at=now,
        )

        db.collection("leads").document(lead_id).set(lead_data.dict())
        return lead_data.dict()

    async def list_leads(
        self,
        owner_id: str,
        status: str = None,
        campaign_id: str = None,
        assigned_agent_id: str = None,
    ) -> list:
        db = firebase_service.db
        results = []
        for doc in db.collection("leads").stream():
            data = doc.to_dict()
            if data.get("owner_id") != owner_id:
                continue
            if status and data.get("status") != status:
                continue
            if campaign_id and data.get("campaign_id") != campaign_id:
                continue
            if assigned_agent_id and data.get("assigned_agent_id") != assigned_agent_id:
                continue
            results.append(data)

        # Sort by created_at descending (newest first)
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results

    async def get_lead(self, owner_id: str, lead_id: str) -> dict:
        db = firebase_service.db
        doc = db.collection("leads").document(lead_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Lead not found")
        data = doc.to_dict()
        if data.get("owner_id") != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return data

    async def update_lead(self, owner_id: str, lead_id: str, updates: LeadUpdate) -> dict:
        db = firebase_service.db
        doc_ref = db.collection("leads").document(lead_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Lead not found")
        data = doc.to_dict()
        if data.get("owner_id") != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.update(update_dict)
        data.update(update_dict)
        return data

    async def delete_lead(self, owner_id: str, lead_id: str) -> dict:
        db = firebase_service.db
        doc_ref = db.collection("leads").document(lead_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Lead not found")
        data = doc.to_dict()
        if data.get("owner_id") != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        doc_ref.delete()
        return {"message": "Lead deleted"}


lead_service = LeadService()
