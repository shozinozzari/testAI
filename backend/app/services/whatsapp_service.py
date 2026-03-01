from datetime import datetime
from typing import Optional
from app.services.firebase_service import firebase_service
from app.models.campaign import CampaignInDB, WhatsAppConfig

class WhatsAppService:
    async def get_next_number(self, campaign_id: str) -> Optional[str]:
        """
        Round Robin Logic:
        1. Fetch campaign
        2. Get list of active numbers
        3. Select number at index
        4. Increment index (atomic preferably)
        5. Return number
        """
        db = firebase_service.db
        if not db:
            return None
        
        doc_ref = db.collection("campaigns").document(campaign_id)
        # Transaction required for atomic update
        # For MVP, we use simple get/update
        
        doc = doc_ref.get()
        if not doc.exists:
            return None
            
        data = doc.to_dict()
        # Mock deserialization
        config = data.get("whatsapp_config", {})
        numbers = config.get("numbers", [])
        
        if not numbers:
            return None
            
        index = config.get("round_robin_index", 0)
        
        # Select number
        selected_number = numbers[index % len(numbers)]
        
        # Increment Index
        new_index = (index + 1) % len(numbers)
        
        # Update DB (should be atomic in prod)
        doc_ref.update({"whatsapp_config.round_robin_index": new_index})
        
        return selected_number

    def generate_qr_code_url(self, campaign_id: str):
        # In a real app, this points to OUR backend redirection endpoint
        base_url = "https://api.example.com" # Replace with actual domain
        return f"{base_url}/api/v1/wa/redirect/{campaign_id}"

whatsapp_service = WhatsAppService()
