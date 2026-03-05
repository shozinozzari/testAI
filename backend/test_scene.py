import asyncio
from app.services.scene_segmentation_service import scene_segmentation_service
from app.services.audio_service import audio_service
import os

async def main():
    print("Generating audio...")
    audio_path = await audio_service.generate_audio("Hello, this is a test. We are testing scene segmentation right now.", "Aoede")
    print(f"Audio generated at: {audio_path}")
    
    if audio_path:
        full_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            audio_path.lstrip("/")
        )
        print("Running scene segmentation for:", full_path)
        segments = await scene_segmentation_service.analyze_audio(full_path)
        print("Segments:", segments)
    
asyncio.run(main())
