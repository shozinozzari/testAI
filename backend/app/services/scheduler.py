import asyncio
# from app.services.firebase_service import firebase_service
# from app.core.queue import queue_service

class SchedulerService:
    def __init__(self):
        self.running = False

    async def start(self):
        self.running = True
        print("Scheduler started...")
        while self.running:
            # NOTE: This loop handles RECURRING tasks (e.g., daily keywords).
            # Immediate tasks (e.g., New Campaign, Payment Success) are triggered
            # directly via the API endpoints (/hooks/stripe, /campaigns), bypassing this loop.
            # 2. Check for Daily Reel Jobs
            # In a real app, we'd query users who are "due" for a reel (last_reel_at < 24h ago)
            # For this MVP, we iterate active users and queue a job if they have keywords
            
            # Simulated active user check
            active_campaigns = ["campaign_123"] 
            
            from app.models.job import JobType # Moved here to be available for daily reel jobs
            
            for campaign_id in active_campaigns:
                 # Check if job already exists for today (Idempotency)
                 # Enqueue Job
                 await queue_service.enqueue_job(
                     JobType.GENERATE_VIRAL_SCRIPT, 
                     {"keyword": "AI Marketing", "campaign_id": campaign_id},
                     campaign_id
                 )
                 print(f"Scheduled Daily Reel for {campaign_id}")
            
            await self.check_recurring_jobs()
            
            print("Scheduler: Cycle complete. Sleeping...")
            await asyncio.sleep(3600) # Check every hour

    async def check_recurring_jobs(self):
        # 1. Query Firestore for active campaigns with recurring keywords enabled
        # campaigns = await firebase_service.get_active_campaigns()
        campaigns = [{"id": "mock_camp_1", "keywords": ["ai video"]}] # Mock

        from app.services.budget_service import budget_service
        from app.services.pipeline_orchestrator import orchestrator
        from app.models.job import JobType

        print("Scheduler: Checking recurring jobs...")
        
        for campaign in campaigns:
            # 2. Check Budget before even trying
            if await budget_service.check_budget(campaign["id"], "RECURRING"):
                # 3. Trigger Orchestrator
                # In reality, this would fetch an unused keyword and trigger GENERATE_VIRAL_SCRIPT
                job_payload = {
                    "type": JobType.GENERATE_VIRAL_SCRIPT.value,
                    "payload": {"keyword": "ai video"},
                    "campaign_id": campaign["id"]
                }
                # await orchestrator.process_job(job_payload) # This usually runs in worker, scheduler just enqueues
                print(f"Scheduler: Enqueueing recurring job for {campaign['id']}")
            else:
                 print(f"Scheduler: Skipping {campaign['id']} (Budget Exceeded)")

scheduler_service = SchedulerService()

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(scheduler_service.start())
    except KeyboardInterrupt:
        print("Scheduler stopped.")
