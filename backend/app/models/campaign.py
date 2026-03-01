from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class SocialPlatform(str, Enum):
    YOUTUBE = "YOUTUBE"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"
    TIKTOK = "TIKTOK"
    LINKEDIN = "LINKEDIN"
    X = "X"
    THREADS = "THREADS"
    TUMBLR = "TUMBLR"

class CTAOption(str, Enum):
    WHATSAPP = "WHATSAPP"
    WEBSITE = "WEBSITE"
    CALL_BOOKING = "CALL_BOOKING"

class CampaignBase(BaseModel):
    business_name: str
    business_logo_url: Optional[str] = None
    calling_number: Optional[str] = None
    business_description: str
    audience_language: str
    connected_socials: List[SocialPlatform] = []
    cta_option: CTAOption
    website_url: Optional[str] = None
    anchor_voice: Optional[str] = "Aoede"
    # For Call Booking
    booking_questions: List[str] = []
    
class CampaignCreate(CampaignBase):
    pass

class SalesAgent(BaseModel):
    name: str
    email: str
    phone: str
    is_active: bool = True
    assigned_leads: int = 0

class WhatsAppConfig(BaseModel):
    numbers: List[str] = [] # List of phone numbers
    agents: List[SalesAgent] = [] 
    round_robin_index: int = 0
    qr_code_enabled: bool = True

class CampaignInDB(CampaignBase):
    id: str
    owner_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    # Phase 9: WhatsApp Round Robin
    whatsapp_config: Optional[WhatsAppConfig] = None
    
    # Phase 4 config container
    # Stores call_booking_config, website_link, etc.
    config: Dict[str, Any] = {} 

    class Config:
        use_enum_values = True

    # TODO: Add validators to ensure config matches cta_option
    # e.g., if cta_option == WHATSAPP, whatsapp_config must be present
