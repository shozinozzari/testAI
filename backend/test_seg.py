import asyncio
from app.services.scene_segmentation_service import scene_segmentation_service
import os

async def main():
    wav_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "audio", "vsl_daf94399-56ed-461a-94cf-319d7c7d396b.wav")
    print(f"Testing scene segmentation for: {wav_path}")
    
    try:
        segments = await scene_segmentation_service.analyze_audio(wav_path)
        print("Segments:", segments)
    except Exception as e:
        print(f"Top-level error: {e}")

asyncio.run(main())
