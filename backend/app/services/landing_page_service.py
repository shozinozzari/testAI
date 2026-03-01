from app.services.firebase_service import firebase_service
import asyncio
import logging

logger = logging.getLogger(__name__)

class LandingPageService:
    async def generate_landing_page(self, campaign_id: str):
        doc_ref = firebase_service.db.collection("campaigns").document(campaign_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise Exception("Campaign not found")

        campaign = doc.to_dict()

        # Return cached content ONLY if valid (not placeholder)
        content = campaign.get("landing_page_content", {})
        is_invalid = (
            content.get("headline") == "Placeholder headline" or 
            not content.get("headline") or
            not isinstance(content.get("trust_signals"), list) or
            not isinstance(content.get("friction_points"), list) or
            not isinstance(content.get("who_is_this_for"), list)
        )

        if content and not is_invalid:
            return {
                "campaign_id": campaign_id,
                **content,
                "vsl_url": campaign.get("vsl_url", ""),
                "vsl_audio_url": campaign.get("vsl_audio_url", ""),
                "cta_link": f"/api/v1/wa/redirect/{campaign_id}",
            }

        return await self.generate_and_save_content(campaign_id, campaign, doc_ref)

    async def generate_and_save_content(self, campaign_id: str, campaign: dict, doc_ref):
        from app.services.gemini_service import gemini_service

        promotion_offer = campaign.get("business_description", "").strip()
        language = campaign.get("audience_language", "English")
        anchor_voice = campaign.get("anchor_voice", "Aoede")

        def _sanitize_list(val):
            if isinstance(val, list):
                return val
            if isinstance(val, str) and val.strip():
                return [val.strip()]
            return []

        # Retry logic: Keep trying until we get valid content (up to ~60s)
        ai_content = {}
        MAX_RETRIES = 30
        attempt = 0

        # 1) Generate VSL first so landing copy can align with it.
        try:
            logger.info("Starting VSL script generation for campaign: %s", campaign_id)
            vsl_script = await gemini_service.generate_vsl_script(promotion_offer, language=language)
        except Exception as e:
            logger.error(f"VSL generation failed: {e}")
            vsl_script = ""

        if not vsl_script or not vsl_script.strip():
            raise Exception("VSL generation failed; cannot continue to landing page generation.")

        while attempt < MAX_RETRIES:
            try:
                ai_content = await gemini_service.generate_landing_page_content(
                    promotion_offer=promotion_offer,
                    language=language,
                    vsl_script=vsl_script,
                )
                
                # Check for valid headline AND ensure list fields aren't just strings (double check)
                headline = ai_content.get("headline")
                if headline and headline != "Placeholder headline":
                    # Extra check: Trust signals should be list-ish or sanitize-able
                    # The sanitize function handles string->list, so we mainly care about headline existence.
                    break
                
                logger.info(f"Attempt {attempt+1}: AI generation in progress... Waiting...")
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Attempt {attempt+1} error: {e}")
                await asyncio.sleep(2)
            
            attempt += 1

        final_content = {
            "headline": ai_content.get("headline", ""),
            "subheadline": ai_content.get("subheadline", ""),
            "target_audience": ai_content.get("target_audience", ""),
            "primary_outcome": ai_content.get("primary_outcome", ""),


            "trust_signals": _sanitize_list(ai_content.get("trust_signals")),
            "credibility_metrics": _sanitize_list(ai_content.get("credibility_metrics")),

            "video_label": ai_content.get("video_label", ""),
            "video_bullets": _sanitize_list(ai_content.get("video_bullets")),

            # CTA must never be empty
            "cta_text": ai_content.get("cta_text") or "Book a free consultation",
            "cta_supporting_text": ai_content.get("cta_supporting_text", ""),
            "urgency_text": ai_content.get("urgency_text", ""),
            "friction_points": _sanitize_list(ai_content.get("friction_points")),

            "primary_color": ai_content.get("primary_color", "#3B82F6"),
            "secondary_color": ai_content.get("secondary_color", "#2563EB"),
            "background_style": ai_content.get("background_style", "dark"),
            "theme": "dark",

            "who_is_this_for": _sanitize_list(ai_content.get("who_is_this_for")),
            "who_is_this_not_for": _sanitize_list(ai_content.get("who_is_this_not_for")),
            "testimonials": ai_content.get("testimonials", []),
            "final_call_to_action_header": ai_content.get("final_call_to_action_header", "Ready to get started?"),
            "final_call_to_action_subtext": ai_content.get("final_call_to_action_subtext", "Book your strategy call now."),
        }

        # Generate TTS audio from the VSL script using the campaign's anchor voice
        vsl_audio_url = ""
        scene_segments = []
        vsl_url = ""
        if vsl_script and vsl_script.strip():
            try:
                from app.services.audio_service import audio_service
                logger.info(f"Starting TTS generation with voice: {anchor_voice}")
                vsl_audio_url = await audio_service.generate_audio(
                    text=vsl_script,
                    voice_name=anchor_voice,
                    campaign_id=campaign_id
                )
                logger.info(f"TTS audio URL: {vsl_audio_url}")
                
                # Generate scene segmentation from the audio
                if vsl_audio_url:
                    try:
                        from app.services.scene_segmentation_service import scene_segmentation_service
                        import os
                        # Get the absolute path of the audio file
                        audio_path = os.path.join(
                            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                            vsl_audio_url.lstrip("/")
                        )
                        logger.info(f"Starting scene segmentation for: {audio_path}")
                        scene_segments = await scene_segmentation_service.analyze_audio(audio_path)
                        logger.info(f"Generated {len(scene_segments)} scene segments")
                    except Exception as e:
                        logger.error(f"Scene segmentation failed: {e}")
                        scene_segments = []
            except Exception as e:
                logger.error(f"TTS audio generation failed: {e}")
                vsl_audio_url = ""

        if vsl_script and not vsl_audio_url:
            raise Exception("VSL audio generation failed; cannot continue to video assembly.")

        if vsl_audio_url and not scene_segments:
            raise Exception("Scene segmentation failed; cannot continue to video assembly.")

        # Download stock footage for each generated scene before returning.
        if scene_segments:
            try:
                from app.services.stock_footage_service import stock_footage_service

                logger.info("Starting stock footage download for %s scenes", len(scene_segments))
                scene_segments = await stock_footage_service.download_clips_for_visual_plan(
                    visual_plan=scene_segments,
                    campaign_id=campaign_id,
                )
                downloaded_count = sum(1 for scene in scene_segments if scene.get("clip_url"))
                logger.info("Stock footage download complete: %s/%s clips", downloaded_count, len(scene_segments))
            except Exception as e:
                logger.error(f"Stock footage download failed: {e}")
                raise Exception("Stock footage download failed; cannot continue to video assembly.")

        # Assemble final VSL video from scenes + VSL audio.
        if vsl_audio_url and scene_segments:
            try:
                from app.services.video_service import video_service

                logger.info("Starting VSL video assembly for campaign: %s", campaign_id)
                vsl_url = await video_service.assemble_vsl(
                    audio_url=vsl_audio_url,
                    campaign_id=campaign_id,
                    scene_segments=scene_segments,
                )
                # Scene source clips are removed after assembly; avoid storing dead clip links.
                scene_segments = [{**scene, "clip_url": ""} for scene in scene_segments]
                logger.info("VSL video assembled successfully: %s", vsl_url)
            except Exception as e:
                logger.error(f"VSL video assembly failed: {e}")
                raise Exception("VSL video assembly failed; campaign creation aborted.")

        doc_ref.update({
            "landing_page_content": final_content,
            "vsl_script": vsl_script,
            "vsl_audio_url": vsl_audio_url,
            "scene_segments": scene_segments,
            "vsl_url": vsl_url,
        })

        return {
            "campaign_id": campaign_id,
            **final_content,
            "vsl_script": vsl_script,
            "vsl_audio_url": vsl_audio_url,
            "scene_segments": scene_segments,
            "vsl_url": vsl_url,
            "cta_link": f"/api/v1/wa/redirect/{campaign_id}",
        }

landing_page_service = LandingPageService()

