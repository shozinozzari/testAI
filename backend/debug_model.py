from app.models.user import UserCreateRequest
import sys

try:
    print("Attempting to create UserCreateRequest without email...")
    user = UserCreateRequest(
        display_name="Test User",
        role="SALES_AGENT",
        password="password123",
        phone_number="+1234567890"
    )
    print("SUCCESS: Model accepted missing email.")
    print(user.dict())
except Exception as e:
    print(f"FAILURE: {e}")
    sys.exit(1)
