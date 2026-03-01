from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class LeadStatus(str, Enum):
    NEW = "NEW"
    TEXTED = "TEXTED"
    CALLED = "CALLED"
    DISQUALIFIED = "DISQUALIFIED"
    QUALIFIED = "QUALIFIED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


class LeadSource(str, Enum):
    YOUTUBE = "YOUTUBE"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"
    TIKTOK = "TIKTOK"
    WHATSAPP = "WHATSAPP"
    WEBSITE = "WEBSITE"
    MANUAL = "MANUAL"
    OTHER = "OTHER"


class LeadGender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: LeadSource = LeadSource.MANUAL
    campaign_id: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    gender: Optional[str] = None
    notes: str = ""
    follow_up: Optional[str] = None
    objections: str = ""
    pain_points: str = ""
    vibe: Optional[str] = None
    dreams_goals: str = ""
    call_summary: str = ""
    tags: List[str] = []


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[LeadSource] = None
    status: Optional[LeadStatus] = None
    campaign_id: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    gender: Optional[str] = None
    notes: Optional[str] = None
    follow_up: Optional[str] = None
    objections: Optional[str] = None
    pain_points: Optional[str] = None
    vibe: Optional[str] = None
    dreams_goals: Optional[str] = None
    call_summary: Optional[str] = None
    tags: Optional[List[str]] = None


class LeadInDB(BaseModel):
    id: str
    owner_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: LeadSource = LeadSource.MANUAL
    status: LeadStatus = LeadStatus.NEW
    campaign_id: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    gender: Optional[str] = None
    notes: str = ""
    follow_up: Optional[str] = None
    objections: str = ""
    pain_points: str = ""
    vibe: Optional[str] = None
    dreams_goals: str = ""
    call_summary: str = ""
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
