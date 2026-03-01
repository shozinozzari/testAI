from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    OWNER = "OWNER"
    SALES_AGENT = "SALES_AGENT"
    ADMIN = "ADMIN"

    SUPER_ADMIN = "SUPER_ADMIN"
    AFFILIATE = "AFFILIATE"
    MANAGER = "MANAGER"

class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"
    TRIAL = "TRIAL"

class SocialPlatform(str, Enum):
    YOUTUBE = "YOUTUBE"
    INSTAGRAM = "INSTAGRAM"
    FACEBOOK = "FACEBOOK"
    TIKTOK = "TIKTOK"
    LINKEDIN = "LINKEDIN"
    TWITTER = "TWITTER"
    THREADS = "THREADS"
    TUMBLR = "TUMBLR"

class SocialAccount(BaseModel):
    platform: SocialPlatform
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    platform_user_id: Optional[str] = None
    platform_username: Optional[str] = None
    scopes: List[str] = []
    connected_at: datetime = Field(default_factory=datetime.utcnow)

class UserBase(BaseModel):
    email: Optional[str] = None
    display_name: Optional[str] = None
    role: UserRole = UserRole.OWNER
    photo_url: Optional[str] = None
    phone_number: Optional[str] = None
    social_accounts: List[SocialAccount] = []

class UserCreateRequest(UserBase):
    email: Optional[str] = None
    password: str # Only used for initial auth creation, not stored in Firestore

class UserInDB(UserBase):
    uid: str
    subscription_status: SubscriptionStatus = SubscriptionStatus.TRIAL
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    campaign_ids: List[str] = []
    
    # Phase 2: Profiling Data
    company_category: Optional[str] = None
    team_size: Optional[str] = None
    acquisition_source: Optional[str] = None
    business_description: Optional[str] = None
    
    # Phase 3: Payment
    stripe_customer_id: Optional[str] = None

    class Config:
        use_enum_values = True
