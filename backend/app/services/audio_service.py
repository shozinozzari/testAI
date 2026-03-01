import os
import wave
import uuid
import logging
import asyncio
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Directory to store generated audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


class AudioService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("GOOGLE_API_KEY missing. TTS generation disabled.")

    def _split_text_into_chunks(self, text: str, max_chars: int = 4000) -> list[str]:
        """
        Split long text into smaller chunks at sentence boundaries.
        Gemini TTS has input length limits, so we chunk long VSL scripts.
        """
        sentences = text.replace('\r\n', '\n').replace('\r', '\n').split('.')
        chunks = []
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            candidate = f"{current_chunk}. {sentence}" if current_chunk else sentence
            if len(candidate) > max_chars and current_chunk:
                chunks.append(current_chunk.strip() + ".")
                current_chunk = sentence
            else:
                current_chunk = candidate

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks if chunks else [text]

    async def generate_audio(self, text: str, voice_name: str = "Aoede", campaign_id: str = "") -> str:
        """
        Converts text to speech using Gemini TTS API.
        Uses the same proven approach from test.py:
          - Model: gemini-2.5-flash-preview-tts
          - Output: WAV (mono, 16-bit, 24kHz)
        
        Returns the relative URL path to the generated audio file.
        """
        if not self.client:
            logger.error("TTS generation attempted without API key.")
            return ""

        if not text or not text.strip():
            logger.warning("Empty text provided for TTS generation.")
            return ""

        file_id = campaign_id if campaign_id else str(uuid.uuid4())
        output_filename = f"vsl_{file_id}.wav"
        output_path = os.path.join(AUDIO_DIR, output_filename)

        try:
            logger.info(f"🎙️ Generating TTS audio with voice: {voice_name} for campaign: {file_id}")

            # Split text into chunks for long VSL scripts
            chunks = self._split_text_into_chunks(text)
            all_audio_data = b""

            for i, chunk in enumerate(chunks):
                logger.info(f"  Processing chunk {i + 1}/{len(chunks)} ({len(chunk)} chars)...")

                # Run the synchronous Gemini API call in a thread pool
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model="gemini-2.5-flash-preview-tts",
                    contents=chunk,
                    config={
                        "response_modalities": ["AUDIO"],
                        "speech_config": {
                            "voice_config": {
                                "prebuilt_voice_config": {
                                    "voice_name": voice_name
                                }
                            }
                        }
                    }
                )

                # Extract audio data (same logic as test.py)
                if response.candidates and response.candidates[0].content.parts:
                    part = response.candidates[0].content.parts[0]
                    if part.inline_data:
                        all_audio_data += part.inline_data.data
                    else:
                        logger.warning(f"  Chunk {i + 1}: Response received but audio data was empty.")
                else:
                    logger.warning(f"  Chunk {i + 1}: No candidates returned.")

            if not all_audio_data:
                logger.error("No audio data generated from any chunk.")
                return ""

            # Save as WAV (same format as test.py)
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)       # Mono
                wav_file.setsampwidth(2)       # 2 bytes (16-bit)
                wav_file.setframerate(24000)   # 24kHz Sample Rate
                wav_file.writeframes(all_audio_data)

            logger.info(f"✅ TTS audio saved: {output_path} ({len(all_audio_data)} bytes)")

            # Return the URL path (served by FastAPI static files)
            return f"/static/audio/{output_filename}"

        except Exception as e:
            logger.error(f"❌ TTS generation failed: {e}")
            return ""


audio_service = AudioService()
