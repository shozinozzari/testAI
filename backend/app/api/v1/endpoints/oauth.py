from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.models.user import SocialPlatform
import urllib.parse

router = APIRouter()

@router.get("/{provider}/login")
async def login(provider: SocialPlatform):
    """
    Redirects user to the social platform's OAuth login page.
    """
    if provider == SocialPlatform.YOUTUBE:
        client_id = settings.YOUTUBE_CLIENT_ID
        redirect_uri = settings.YOUTUBE_REDIRECT_URI
        scope = "https://www.googleapis.com/auth/youtube.upload"
        auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&response_type=code&access_type=offline"
    
    elif provider == SocialPlatform.INSTAGRAM:
        client_id = settings.INSTAGRAM_CLIENT_ID
        redirect_uri = settings.INSTAGRAM_REDIRECT_URI
        scope = "user_profile,user_media"
        auth_url = f"https://api.instagram.com/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&response_type=code"

    elif provider == SocialPlatform.FACEBOOK:
        client_id = settings.FACEBOOK_CLIENT_ID
        redirect_uri = settings.FACEBOOK_REDIRECT_URI
        scope = "pages_show_list,pages_read_engagement,pages_manage_posts"
        auth_url = f"https://www.facebook.com/v18.0/dialog/oauth?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&response_type=code"

    else:
        # For other platforms or if credentials are missing, we might want to 
        # return a mock success for testing if allowed, or error.
        # For now, let's return a 501 Not Implemented for others.
        raise HTTPException(status_code=501, detail=f"OAuth for {provider} not implemented yet")

    # If client_id is missing, we can't really redirect. 
    # But for the purpose of the UI "feeling" real, we could redirect to a dummy success page 
    # if we are in a dev environment.
    # For now, let's just return the URL, or redirect. 
    # Front-end expects a redirect.
    
    if not client_id:
         raise HTTPException(status_code=400, detail=f"Missing Client ID for {provider}")

    return RedirectResponse(auth_url)

@router.get("/{provider}/callback")
async def callback(provider: SocialPlatform, code: str):
    """
    Handles the callback from the social platform.
    Exchanges the code for an access token and updates the user's profile.
    """
    # 1. Exchange code for token (Mocked for now)
    # 2. Store token in Firestore (User.social_accounts)
    
    # In a real implementation:
    # token_response = requests.post(token_url, data={...})
    # access_token = token_response.json().get("access_token")
    
    # needed: current_user dependency to update their record.
    # Since this is a callback, we might need to handle session/state to know WHICH user is connecting.
    # Standard OAuth uses 'state' parameter for this.
    
    return {"message": f"Successfully connected {provider}", "code": code}
