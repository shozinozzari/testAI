from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.firebase_service import firebase_service
from app.models.user import UserRole

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = firebase_service.verify_token(token)
    
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decoded_token

def get_current_active_user(current_user: dict = Depends(get_current_user)):
    # TODO: Check if user is active in Firestore
    return current_user

def role_checker(required_roles: list[UserRole]):
    def _role_checker(current_user: dict = Depends(get_current_active_user)):
        user_role = current_user.get("role", UserRole.OWNER) # Default to OWNER for now
        if user_role not in required_roles:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )
        return current_user
    return _role_checker
