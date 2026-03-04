import os
import wave
import uuid
import logging
import asyncio
from google import genai
from app.core.key_manager import key_manager

logger = logging.getLogger(__name__)

# Directory to store generated audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


class AudioService:
    def __init__(self):
        if not key_manager.has_keys:
            logger.warning("No GOOGLE API keys configured. TTS generation disabled.")

    def _get_client(self):
        """Get a genai.Client configured with the current active API key."""
        key = key_manager.get_key()
        if not key:
            return None, None
        return genai.Client(api_key=key), key

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

    async def _generate_chunk(self, client, chunk: str, voice_name: str) -> bytes:
        """Generate audio for a single chunk. Returns raw audio bytes."""
        response = await asyncio.to_thread(
            client.models.generate_content,
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
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if part.inline_data:
                return part.inline_data.data
        return b""

    async def generate_audio(self, text: str, voice_name: str = "Aoede", campaign_id: str = "") -> str:
        """
        Converts text to speech using Gemini TTS API with key rotation.
        Returns the relative URL path to the generated audio file.
        """
        if not key_manager.has_keys:
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

            chunks = self._split_text_into_chunks(text)
            all_audio_data = b""

            for i, chunk in enumerate(chunks):
                logger.info(f"  Processing chunk {i + 1}/{len(chunks)} ({len(chunk)} chars)...")

                # Try with key rotation on 429 errors
                max_key_attempts = key_manager.total_keys + 1  # try each key once
                for attempt in range(max_key_attempts):
                    client, key = self._get_client()
                    if not client:
                        logger.error("  No available API keys for TTS.")
                        # Wait for cooldown and try once more
                        await asyncio.sleep(65)
                        client, key = self._get_client()
                        if not client:
                            raise Exception("All API keys exhausted for TTS")

                    try:
                        audio_bytes = await self._generate_chunk(client, chunk, voice_name)
                        if audio_bytes:
                            all_audio_data += audio_bytes
                        else:
                            logger.warning(f"  Chunk {i + 1}: Response was empty.")
                        break  # Success
                    except Exception as chunk_err:
                        if key_manager.is_quota_error(chunk_err):
                            key_manager.mark_exhausted(key)
                            logger.warning(f"  Chunk {i+1}: Key exhausted, rotating... (attempt {attempt+1})")
                            continue  # Try next key
                        else:
                            raise  # Non-quota error, bubble up
                else:
                    raise Exception(f"All keys exhausted while processing chunk {i+1}")

            if not all_audio_data:
                logger.error("No audio data generated from any chunk.")
                return ""

            # Save as WAV
            with wave.open(output_path, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(24000)
                wav_file.writeframes(all_audio_data)

            logger.info(f"✅ TTS audio saved: {output_path} ({len(all_audio_data)} bytes)")
            return f"/static/audio/{output_filename}"

        except Exception as e:
            logger.error(f"❌ TTS generation failed: {e}")
            return ""


audio_service = AudioService()
