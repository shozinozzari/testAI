from app.services.firebase_service import firebase_service
from firebase_admin import firestore
import random
import string

class ReferralService:
    def generate_referral_code(self, uid: str) -> str:
        """
        Generates a unique 6-char referral code for a user.
        """
        # Simple random generation
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        # In prod, check for collision
        return code

    async def apply_referral(self, new_user_id: str, referral_code: str):
        """
        Links a new user to a referrer.
        """
        db = firebase_service.db
        if not db:
            return False
            
        # Find referrer by code
        # Requires index on 'referral_code' field
        referrer_query = db.collection("users").where("referral_code", "==", referral_code).limit(1).get()
        
        if not referrer_query:
            return False # Invalid code
            
        referrer_doc = referrer_query[0]
        referrer_id = referrer_doc.id
        
        # Link in 'referrals' subcollection
        referrer_ref = db.collection("users").document(referrer_id)
        referrer_ref.collection("referrals").document(new_user_id).set({
            "user_id": new_user_id,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        
        # Mark new user as referred
        db.collection("users").document(new_user_id).update({
            "referred_by": referrer_id
        })
        
        return True

referral_service = ReferralService()
