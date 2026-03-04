"""Quick quota check — run this to see if your free-tier quota has reset."""
import sys
sys.stdout.reconfigure(line_buffering=True)

from google import genai

client = genai.Client(api_key="AIzaSyAdkgG6sRMuHCTpwVpssPP3ovWoofbr8gA")

print("Testing gemini-2.5-flash text generation...")
try:
    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello in one word.",
    )
    print(f"  ✅ Text OK: {resp.text.strip()}")
except Exception as e:
    print(f"  ❌ Text FAILED: {e}")

print("\nTesting gemini-2.5-flash-preview-tts...")
try:
    resp = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents="Hello",
        config={
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {"voice_name": "Aoede"}
                }
            }
        }
    )
    if resp.candidates and resp.candidates[0].content.parts[0].inline_data:
        print(f"  ✅ TTS OK: {len(resp.candidates[0].content.parts[0].inline_data.data)} bytes")
    else:
        print("  ❌ TTS returned empty")
except Exception as e:
    print(f"  ❌ TTS FAILED: {e}")

print("\nDone. If both show ✅, your quota has reset and you can publish.")
