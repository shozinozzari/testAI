from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime

class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class JobType(str, Enum):
    GENERATE_VSL_SCRIPT = "GENERATE_VSL_SCRIPT"
    GENERATE_VIRAL_SCRIPT = "GENERATE_VIRAL_SCRIPT"
    GENERATE_AUDIO = "GENERATE_AUDIO"
    TRANSCRIBE_AUDIO = "TRANSCRIBE_AUDIO"
    ASSEMBLE_VIDEO = "ASSEMBLE_VIDEO"
    EXTRACT_KEYWORDS = "EXTRACT_KEYWORDS"
    PUBLISH_YOUTUBE = "PUBLISH_YOUTUBE"

class JobBase(BaseModel):
    type: JobType
    campaign_id: str
    payload: Dict[str, Any]

class JobInDB(JobBase):
    id: str
    status: JobStatus = JobStatus.QUEUED
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    worker_id: Optional[str] = None

    class Config:
        use_enum_values = True
