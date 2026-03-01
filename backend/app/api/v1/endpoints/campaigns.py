from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.campaign import CampaignCreate, CampaignInDB
from app.services.campaign_service import campaign_service
from app.services.firebase_service import firebase_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/")
async def list_campaigns(current_user: dict = Depends(get_current_user)):
    """
    List all campaigns for the current user.
    """
    user_id = current_user['uid']
    try:
        return await campaign_service.list_campaigns(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=CampaignInDB)
async def create_campaign(campaign_in: CampaignCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new campaign.
    """
    user_id = current_user['uid']
    
    try:
        return await campaign_service.create_campaign(user_id, campaign_in)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle campaign active/paused status."""
    return await campaign_service.toggle_campaign(current_user['uid'], campaign_id)

@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a campaign."""
    return await campaign_service.delete_campaign(current_user['uid'], campaign_id)

@router.post("/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Duplicate a campaign."""
    return await campaign_service.duplicate_campaign(current_user['uid'], campaign_id)

@router.patch("/{campaign_id}")
async def update_campaign(campaign_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update campaign fields."""
    return await campaign_service.update_campaign(current_user['uid'], campaign_id, updates)

@router.post("/{campaign_id}/generate-audio")
async def generate_campaign_audio(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Generate or regenerate TTS audio for a campaign's VSL script."""
    user_id = current_user['uid']
    db = firebase_service.db
    doc_ref = db.collection("campaigns").document(campaign_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = doc.to_dict()
    if data.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    vsl_script = data.get("vsl_script", "")
    if not vsl_script or not vsl_script.strip():
        raise HTTPException(status_code=400, detail="No VSL script found. Generate content first.")
    
    anchor_voice = data.get("anchor_voice", "Aoede")
    
    from app.services.audio_service import audio_service
    audio_url = await audio_service.generate_audio(
        text=vsl_script,
        voice_name=anchor_voice,
        campaign_id=campaign_id
    )
    
    if not audio_url:
        raise HTTPException(status_code=500, detail="Audio generation failed")
    
    # Generate scene segments from the new audio
    scene_segments = []
    try:
        from app.services.scene_segmentation_service import scene_segmentation_service
        import os
        audio_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            audio_url.lstrip("/")
        )
        scene_segments = await scene_segmentation_service.analyze_audio(audio_path)
    except Exception as e:
        print(f"Scene segmentation failed: {e}")
    
    doc_ref.update({
        "vsl_audio_url": audio_url,
        "scene_segments": scene_segments
    })
    
    return {
        "vsl_audio_url": audio_url,
        "scene_segments": scene_segments,
        "message": "Audio generated successfully"
    }

@router.post("/{campaign_id}/generate-scenes")
async def generate_scene_segments(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Generate or regenerate scene segments for a campaign's VSL audio."""
    user_id = current_user['uid']
    db = firebase_service.db
    doc_ref = db.collection("campaigns").document(campaign_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    data = doc.to_dict()
    if data.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    audio_url = data.get("vsl_audio_url", "")
    if not audio_url:
        raise HTTPException(status_code=400, detail="No audio found. Generate audio first.")
    
    from app.services.scene_segmentation_service import scene_segmentation_service
    import os
    audio_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        audio_url.lstrip("/")
    )
    
    scene_segments = await scene_segmentation_service.analyze_audio(audio_path)
    
    if not scene_segments:
        raise HTTPException(status_code=500, detail="Scene segmentation failed")
    
    doc_ref.update({"scene_segments": scene_segments})
    
    return {
        "scene_segments": scene_segments,
        "message": "Scene segments generated successfully"
    }
