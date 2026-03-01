import google.generativeai as genai
from app.core.config import settings
import json
import time
import os
import logging

logger = logging.getLogger(__name__)


class SceneSegmentationService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={
                    "temperature": 0.2
                },
            )
        else:
            logger.warning("GOOGLE_API_KEY missing. Scene segmentation disabled.")
            self.model = None

    async def analyze_audio(self, audio_path: str) -> list:
        """
        Analyze audio file and return scene segments with stock footage recommendations.
        """
        if not self.model:
            logger.error("Scene segmentation unavailable: No API key")
            return []

        if not os.path.exists(audio_path):
            logger.error(f"Audio file not found: {audio_path}")
            return []

        try:
            logger.info(f"Uploading audio for scene segmentation: {audio_path}")
            
            # Upload the audio file to Gemini
            audio_file = genai.upload_file(path=audio_path)
            logger.info(f"File uploaded: {audio_file.name}. State: {audio_file.state.name}")
            
            # Poll for processing completion
            max_wait = 60  # Max 60 seconds
            waited = 0
            while audio_file.state.name == "PROCESSING" and waited < max_wait:
                time.sleep(2)
                waited += 2
                audio_file = genai.get_file(audio_file.name)
                
            if audio_file.state.name == "FAILED":
                logger.error("Audio processing failed in Gemini")
                return []

            if audio_file.state.name == "PROCESSING":
                logger.error("Audio processing timed out")
                genai.delete_file(audio_file.name)
                return []

            logger.info("Audio processed. Generating scene segmentation...")

            # Prompt for scene segmentation and stock footage recommendation
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
            
            response = self.model.generate_content([prompt, audio_file])
            
            # Process the response
            try:
                text = response.text.strip()
                # Clean up potential markdown formatting
                if "```json" in text:
                    text = text.split("```json")[1].split("```")[0]
                elif "```" in text:
                    text = text.split("```")[1].split("```")[0]
                
                segments = json.loads(text.strip())
                logger.info(f"Generated {len(segments)} scene segments")
                
                # Cleanup: Delete the file from Gemini
                genai.delete_file(audio_file.name)
                logger.info("Cleaned up audio file from Gemini storage")
                
                return segments
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON response: {e}")
                logger.error(f"Raw response: {response.text}")
                genai.delete_file(audio_file.name)
                return []

        except Exception as e:
            logger.error(f"Scene segmentation error: {e}")
            return []


scene_segmentation_service = SceneSegmentationService()
