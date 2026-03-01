from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserInDB, UserCreateRequest, UserRole
from app.services.firebase_service import firebase_service
import firebase_admin
from firebase_admin import auth
from typing import List, Optional
from pydantic import BaseModel
import uuid

router = APIRouter()

# --- Existing Profile Update Model & Endpoint ---
class ProfileUpdate(BaseModel):
    uid: str
    category: str
    team_size: str
    acquisition_source: str
    business_description: str

@router.post("/me/profile")
async def update_profile(profile: ProfileUpdate):
    """Update user profile data (Phase 2)."""
    try:
        update_data = {
            "company_category": profile.category,
            "team_size": profile.team_size,
            "acquisition_source": profile.acquisition_source,
            "business_description": profile.business_description,
            "is_active": True
        }
        
        db = firebase_service.db
        user_ref = db.collection("users").document(profile.uid)
        
        doc = user_ref.get()
        if not doc.exists:
            user_ref.set(update_data, merge=True)
        else:
            user_ref.update(update_data)
            
        return {"status": "success", "message": "Profile updated"}
        
    except Exception as e:
        print(f"Profile Update Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- New User Management Endpoints ---

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None

@router.get("/", response_model=List[UserInDB])
async def list_users():
    """List all users from Firestore."""
    try:
        print("DEBUG: list_users called")
        users_ref = firebase_service.db.collection("users")
        docs = users_ref.stream()
        users = []
        for doc in docs:
            try:
                data = doc.to_dict()
                if "uid" not in data:
                    data["uid"] = doc.id
                users.append(UserInDB(**data))
            except Exception as e:
                print(f"Warning: Skipping invalid user doc {doc.id}: {e}")
                continue
                
        print(f"DEBUG: Returning {len(users)} users")
        return users
    except Exception as e:
        print(f"List Users Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _clean_phone(phone: Optional[str]) -> Optional[str]:
    """Helper to clean and format phone numbers."""
    if not phone:
        return None
    clean = "".join(c for c in phone if c.isdigit() or c == '+')
    if not clean.startswith("+"):
        clean = f"+{clean}"
    return clean


def _create_mock_user(user_in: UserCreateRequest, phone: Optional[str]) -> UserInDB:
    """Create a mock user when Firebase Auth is not available."""
    mock_uid = str(uuid.uuid4())
    user_data = user_in.dict(exclude={"password"})
    user_data["uid"] = mock_uid
    if phone:
        user_data["phone_number"] = phone
    if not user_data.get("email"):
        user_data["email"] = f"mock_{mock_uid}@example.com"
    
    firebase_service.db.collection("users").document(mock_uid).set(user_data)
    return UserInDB(**user_data)


@router.post("/", response_model=UserInDB)
async def create_user(user_in: UserCreateRequest):
    """Create a new user in Firebase Auth and Firestore."""
    print(f"DEBUG: create_user called with payload: {user_in}")
    try:
        phone = _clean_phone(user_in.phone_number)

        # Check if Firebase is initialized
        if not firebase_admin._apps:
            print("Warning: Firebase App not initialized. Creating mock user.")
            return _create_mock_user(user_in, phone)

        # 1. Create in Firebase Auth
        try:
            auth_args = {
                "password": user_in.password,
                "display_name": user_in.display_name,
            }
            if user_in.email:
                auth_args["email"] = user_in.email
            if phone:
                auth_args["phone_number"] = phone
                
            auth_user = auth.create_user(**auth_args)
            
        except auth.EmailAlreadyExistsError:
            raise HTTPException(status_code=400, detail="Email already exists")
        except auth.PhoneNumberAlreadyExistsError:
            raise HTTPException(status_code=400, detail="Phone number already exists")
        except ValueError as e:
            error_msg = str(e).lower()
            print(f"DEBUG: Caught ValueError in create_user: {e}")
            if "app" in error_msg and "exist" in error_msg:
                print("Falling back to Mock User.")
                return _create_mock_user(user_in, phone)
            else:
                raise HTTPException(status_code=400, detail=f"Invalid format: {e}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Auth Error: {str(e)}")
        
        # 2. Create in Firestore
        user_data = user_in.dict(exclude={"password"})
        user_data["uid"] = auth_user.uid
        if phone:
            user_data["phone_number"] = phone
        
        firebase_service.db.collection("users").document(auth_user.uid).set(user_data)
        
        # 3. Set Custom Claims for Role
        auth.set_custom_user_claims(auth_user.uid, {"role": user_in.role})
        
        return UserInDB(**user_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create User Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{uid}", response_model=UserInDB)
async def update_user(uid: str, user_in: UserUpdate):
    """Update user details in Firestore and Auth."""
    try:
        phone = _clean_phone(user_in.phone_number)

        # 1. Update Auth
        update_args = {}
        if user_in.password:
            update_args["password"] = user_in.password
        if user_in.email:
            update_args["email"] = user_in.email
        if user_in.display_name:
            update_args["display_name"] = user_in.display_name
        if phone:
            update_args["phone_number"] = phone
            
        if update_args:
            if firebase_admin._apps:
                try:
                    auth.update_user(uid, **update_args)
                except Exception as e:
                    print(f"Auth Update Error: {e}")
                    raise HTTPException(status_code=400, detail=f"Auth Update Error: {str(e)}")
            else:
                print(f"Warning: Mocking update for user {uid}")

        # 2. Update Role Claims
        if user_in.role:
            if firebase_admin._apps:
                auth.set_custom_user_claims(uid, {"role": user_in.role})
            else:
                print(f"Warning: Mocking claims update for user {uid}")

        # 3. Update Firestore
        update_data = user_in.dict(exclude_unset=True, exclude={"password"})
        if phone:
            update_data["phone_number"] = phone
        
        if update_data:
            user_ref = firebase_service.db.collection("users").document(uid)
            user_ref.update(update_data)
            
        # Return updated document
        doc = firebase_service.db.collection("users").document(uid).get()
        data = doc.to_dict()
        if "uid" not in data:
            data["uid"] = uid
        return UserInDB(**data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Update User Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{uid}")
async def delete_user(uid: str):
    """Delete user from Firebase Auth and Firestore."""
    try:
        if firebase_admin._apps:
            auth.delete_user(uid)
        else:
            print(f"Warning: Mocking delete for user {uid}")
        
        firebase_service.db.collection("users").document(uid).delete()
        return {"status": "success", "message": "User deleted"}
    except Exception as e:
        print(f"Delete User Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
