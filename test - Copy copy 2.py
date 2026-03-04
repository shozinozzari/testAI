import os
import wave
from dotenv import load_dotenv
from google import genai

# --- CONFIGURATION & ENV LOADING ---
ENV_PATH = r"C:\Users\Shozin\Desktop\AUTO LEADS PROJECT\AI_Video_Funnel\backend\.env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

settings = Settings()

# --- AUDIO GENERATOR CLASS ---
class AudioGenerator:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.client_configured = False
        
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.client_configured = True
        else:
            print("⚠️ ERROR: Google API Key not found. Please check your .env path.")

    def generate_audio(self, text_content, voice_name="Aoede"):
        if not self.client_configured:
            print("❌ Cannot generate audio: API Client is not configured.")
            return

        output_filename = f"output_{voice_name}.wav"

        try:
            print(f"\n🎙️ Generating audio with fixed voice profile: {voice_name}...")

            response = self.client.models.generate_content(
                model="gemini-2.5-flash-preview-tts", 
                contents=text_content,
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

            # Check for audio data
            if response.candidates and response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]
                
                if part.inline_data:
                    audio_raw_data = part.inline_data.data
                    
                    # SAVE AS WAV
                    with wave.open(output_filename, "wb") as wav_file:
                        wav_file.setnchannels(1)      # Mono
                        wav_file.setsampwidth(2)      # 2 bytes (16-bit)
                        wav_file.setframerate(24000)  # 24kHz Sample Rate
                        wav_file.writeframes(audio_raw_data)
                        
                    print(f"✅ Success! Saved as '{output_filename}'")
                else:
                    print("⚠️ Response received, but audio data was empty.")
            else:
                print("❌ No candidates returned. (Try shortening the text if this persists)")

        except Exception as e:
            print(f"\n❌ ERROR: {e}")

# --- EXECUTION BLOCK ---
if __name__ == "__main__":
    generator = AudioGenerator()

    text_to_speak = """
    Mongolian folk metal band formed in 2016 in Ulaanbaatar. Incorporating traditional Mongolian instrumentation, including the morin khuur, the tovshuur, and throat singing, the band call
    """

    # Simply pass the voice name. Try "Kore", "Aoede", "Puck", "Fenrir", "Charon" or others
    generator.generate_audio(
        text_content=text_to_speak, 
        voice_name="Aoede" 
    )