import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.services.gemini_service import gemini_service

async def test():
    print("Testing Gemini Landing Page Generation...")
    try:
        result = await gemini_service.generate_landing_page_content(
            business_name="Test Business",
            description="We help busy moms lose weight in 6 weeks without gym.",
            objective="Book a free consultation"
        )
        print("SUCCESS! Result:")
        import json
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test())
