class WhisperService:
    def __init__(self):
        # Initialize Whisper model (CPU)
        pass

    async def transcribe(self, audio_path: str) -> dict:
        print(f"Whisper: Transcribing {audio_path}...")
        return {
            "text": "This is a mock transcription.",
            "segments": [
                {"start": 0.0, "end": 2.0, "text": "This is"},
                {"start": 2.0, "end": 4.0, "text": "a mock"},
                {"start": 4.0, "end": 6.0, "text": "transcription."}
            ]
        }

whisper_service = WhisperService()
