from typing import Any, Dict, Optional
from app.models.job import JobType, JobStatus
# import redis # Uncomment when Redis is added to requirements
import uuid
from datetime import datetime

class JobQueue:
    def __init__(self):
        # self.redis = redis.Redis(...) 
        # For now, we'll just print to console or mock
        pass

    async def enqueue_job(self, type: JobType, payload: Dict[str, Any], campaign_id: str) -> str:
        # 1. Check Kill Switch
        from app.services.policy_service import policy_service
        if await policy_service.check_kill_switch("GLOBAL_PAUSE"):
            raise Exception("System paused by admin")

        # 2. Check Budget
        from app.services.budget_service import budget_service
        if not await budget_service.check_budget(campaign_id, type.value):
             raise Exception("Daily budget exceeded")

        # 3. Create Job in Persistence Store
        from app.models.job import JobInDB, JobStatus
        from app.core.job_store import job_store
        
        job_id = str(uuid.uuid4())
        job_data = JobInDB(
            id=job_id,
            type=type,
            payload=payload,
            campaign_id=campaign_id,
            status=JobStatus.QUEUED,
            created_at=datetime.utcnow(),
            retry_count=0
        )
        
        await job_store.create_job(job_data)
        
        # 4. Push to Redis (Mock)
        # self.redis.lpush("jobs", job_id)
        print(f"QUEUE: Pushed Job {job_id} to Redis")
        
        return job_id

queue_service = JobQueue()
