import google.generativeai as genai
from app.core.key_manager import key_manager
import json
import asyncio
import os
import logging

logger = logging.getLogger(__name__)


def _build_model(api_key: str):
    """Configure the old SDK and return a GenerativeModel for the given key."""
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={
            "temperature": 0.2
        },
    )


class SceneSegmentationService:
    def __init__(self):
        if not key_manager.has_keys:
            logger.warning("No GOOGLE API keys configured. Scene segmentation disabled.")

    def _get_model(self):
        """Get a model configured with the current active API key."""
        key = key_manager.get_key()
        if not key:
            return None, None
        return _build_model(key), key

    async def analyze_audio(self, audio_path: str) -> list:
        """
        Analyze audio file and return scene segments with stock footage recommendations.
        Uses key rotation: if the current key is exhausted, rotates and retries.
        """
        if not key_manager.has_keys:
            logger.error("Scene segmentation unavailable: No API keys")
            return []

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return []

        # Try with key rotation
        max_key_attempts = key_manager.total_keys + 1
        for attempt in range(max_key_attempts):
            model, key = self._get_model()
            if not model:
                logger.error("No available API keys for scene segmentation.")
                return []

            try:
                return await self._do_analyze(model, key, audio_path)
            except Exception as e:
                if key_manager.is_quota_error(e):
                    key_manager.mark_exhausted(key)
                    logger.warning(f"Scene segmentation: key exhausted, rotating... (attempt {attempt+1})")
                    continue
                else:
                    logger.error(f"Scene segmentation error: {e}", exc_info=True)
                    return []

        logger.error("All API keys exhausted for scene segmentation.")
        return []

    async def _do_analyze(self, model, key: str, audio_path: str) -> list:
        """Perform the actual audio analysis with the given model/key."""
        logger.info(f"Uploading audio for scene segmentation: {audio_path}")

        # Upload the audio file to Gemini (blocking – run in thread)
        # Need to reconfigure genai for this specific key before upload
        genai.configure(api_key=key)
        audio_file = await asyncio.to_thread(genai.upload_file, audio_path)
        logger.info(f"File uploaded: {audio_file.name}. State: {audio_file.state.name}")

        # Poll for processing completion
        max_wait = 120
        waited = 0
        while audio_file.state.name == "PROCESSING" and waited < max_wait:
            await asyncio.sleep(3)
            waited += 3
            audio_file = await asyncio.to_thread(genai.get_file, audio_file.name)

        if audio_file.state.name == "FAILED":
            logger.error("Audio processing failed in Gemini")
            return []

        if audio_file.state.name == "PROCESSING":
            logger.error("Audio processing timed out after %ss", max_wait)
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            return []

        logger.info("Audio processed. Generating scene segmentation...")

        prompt = """
            Role: You are a senior video editor and stock-footage researcher.

            Task:
            Listen to the audio and break it into visual scenes for a sales video.

            Hard rules:
            1) Cover the full audio timeline from start to end.
            2) No gaps and no overlaps between scene time ranges.
            3) Scene boundaries must align with natural speech phrase boundaries (breath pauses, completed clauses).
               Do NOT cut in the middle of a phrase or sentence.
            4) Keep scenes cinematic and varied. Avoid repeating the same office/laptop visual.
            5) Prefer realistic visuals that are easy to find on stock sites.
            6) Avoid logos, text overlays, UI mockups, watermarks, famous people, and brand names.
            7) Return ONLY valid JSON array. No markdown, no comments.

            For each scene output:
            - time_range: "MM:SS - MM:SS"
            - Each scene should represent one full spoken phrase or one tightly related phrase group.
            - visual_description: one concise sentence including subject + action + location + mood + shot type
              (for example: close-up, wide, handheld, dolly)
            - stock_query: comma-separated concrete search keywords for Pexels/Pixabay
              (8-14 keywords, visual nouns/verbs, no abstract terms like "success", "growth", "strategy")

            JSON format:
            [
              {
                "time_range": "00:00 - 00:05",
                "visual_description": "Close-up of a stressed founder reviewing numbers on a laptop in a dim office at night, handheld shot.",
                "stock_query": "stressed business owner, laptop, office at night, financial report, close up, handheld camera, moody lighting, startup"
              }
            ]
            """

        response = await asyncio.to_thread(model.generate_content, [prompt, audio_file])

        try:
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            segments = json.loads(text.strip())
            logger.info(f"Generated {len(segments)} scene segments")

            # Cleanup
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            logger.info("Cleaned up audio file from Gemini storage")

            return segments

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            logger.error(f"Raw response: {response.text}")
            await asyncio.to_thread(genai.delete_file, audio_file.name)
            return []


scene_segmentation_service = SceneSegmentationService()
