from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.core.config import settings

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase ID token and return user.
    """
    token = credentials.credentials
    
    # Check if Firebase is initialized
    import firebase_admin
    if not firebase_admin._apps:
         print("Warning: Firebase App not initialized. Using Mock Token Verification.")
         # Return a mock user object
         return {"uid": "mock-uid", "email": "mock@example.com", "role": "OWNER"}

    try:
        # Verify the ID token while checking if the token is revoked by passing check_revoked=True.
        decoded_token = auth.verify_id_token(token, check_revoked=True)
        return decoded_token
    except auth.RevokedIdTokenError:
        # Token revoked, inform the user to re-authenticate or signOut().
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
