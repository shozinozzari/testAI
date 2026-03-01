from app.models.job import JobType
from app.services.ai_service import ai_service
from app.services.audio_service import audio_service
from app.services.video_service import video_service
# from app.core.queue import queue_service

class PipelineOrchestrator:
    async def process_job(self, job: dict):
        from app.core.job_store import job_store
        from app.models.job import JobStatus
        
        job_id = job.get("id")
        job_type = job.get("type")
        payload = job.get("payload", {})
        
        try:
            # 1. Update State to RUNNING
            await job_store.update_status(job_id, JobStatus.RUNNING)
            
            result = None
            next_job = None
            
            if job_type == JobType.GENERATE_VSL_SCRIPT.value:
                # Use AI Service
                script = await ai_service.generate_vsl_script(
                    payload.get("business_desc"), 
                    payload.get("keywords", []),
                    payload.get("language", "en")
                )
                
                # STAGE 1 POLICY CHECK
                from app.services.policy_service import policy_service
                if not await policy_service.validate_script(script):
                    raise Exception("Policy Violation: Script contained prohibited content.")
                
                result = {"script": script}
                # Prepare next job (Generate Audio)
                next_job = (JobType.GENERATE_AUDIO, {"script": script})
            
            elif job_type == JobType.GENERATE_AUDIO.value:
                audio_path = await audio_service.generate_audio(payload.get("script"))
                transcript = await audio_service.transcribe_with_timestamps(audio_path)
                
                result = {"audio_path": audio_path, "transcript": transcript}
                # Prepare next job (Assemble Video)
                next_job = (
                    JobType.ASSEMBLE_VIDEO, 
                    {
                        "script": payload.get("script"),
                        "audio_path": audio_path,
                        "transcript": transcript
                    }
                )

            elif job_type == JobType.GENERATE_VIRAL_SCRIPT.value:
                # Use Reel Service (Phase 10)
                from app.services.reel_service import reel_service
                
                # 1. Generate Script
                script_data = await reel_service.generate_reel_script(
                    payload.get("keyword"), 
                    "Business Description Placeholder"
                )
                
                result = {"script_data": script_data}
                
                # 2. Chain -> Assemble Reel (Video)
                next_job = (
                    JobType.ASSEMBLE_VIDEO, 
                    {
                        "script": script_data["script"],
                        "audio_path": "mock_audio_path", # Audio generation would be here too
                        "is_reel": True,
                        "overlays": {"qr_code": "https://qr.code/mock"}
                    }
                )
                
            elif job_type == JobType.ASSEMBLE_VIDEO.value:
                # Granular steps could be broken down further here if needed
                if payload.get("is_reel"):
                     from app.services.reel_service import reel_service
                     video_url = await reel_service.assemble_reel(
                         {"script": payload.get("script")},
                         payload.get("audio_path"),
                         payload.get("overlays", {}).get("qr_code")
                     )
                else:
                    video_url = await video_service.assemble_vsl(
                        payload.get("script"), 
                        payload.get("audio_path"), 
                        payload.get("transcript")
                    )
                result = {"video_url": video_url}

            elif job_type == JobType.EXTRACT_KEYWORDS.value:
                from app.services.keyword_service import keyword_service
                count = await keyword_service.process_and_store(
                    job.get("campaign_id"), 
                    payload.get("base_keyword")
                )
                result = {"keywords_extracted": count}

            # 2. Update State to COMPLETED
            await job_store.update_status(job_id, JobStatus.COMPLETED, result=result)
            
            # 3. Explicit Job Chaining (Orchestrator Decision)
            # The worker is "stupid" and doesn't know what comes next. 
            # The Orchestrator explicitly defines the next step in the pipeline.
            if next_job:
                next_type, next_payload = next_job
                print(f"Orchestrator: Chaining next job -> {next_type}")
                from app.core.queue import queue_service
                await queue_service.enqueue_job(next_type, next_payload, job.get("campaign_id"))
                
        except Exception as e:
            print(f"Job Failed: {e}")
            await job_store.update_status(job_id, JobStatus.FAILED, error=str(e))
            # Potential: Enqueue to Dead Letter Queue here

orchestrator = PipelineOrchestrator()
