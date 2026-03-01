class PolicyService:
    def __init__(self):
        # In-memory cache for kill switches (would be Redis in prod)
        self.kill_switches = {
            "GLOBAL_PAUSE": False,
            "PAUSE_PUBLISHING": False
        }
        self.prohibited_terms = ["guaranteed income", "cure cancer", "investment returns"]

    async def check_kill_switch(self, switch_type: str = "GLOBAL"):
        # Check Firestore for /config/kill_switches -> {GLOBAL: boolean}
        # Default to False (Not Killed)
        return False

    async def check_subscription(self, user_id: str) -> bool:
        """
        Blocks automation if subscription is invalid.
        """
        from app.services.firebase_service import firebase_service
        db = firebase_service.db
        if not db:
            return True # Fail open for dev check
            
        doc = db.collection("users").document(user_id).get()
        if not doc.exists:
            return False
            
        data = doc.to_dict()
        status = data.get("subscription_status", "TRIAL")
        # Allow ACTIVE or TRIAL (if we allow trial automation)
        # For Strict Paid: return status == "ACTIVE"
        return status == "ACTIVE"

    async def check_throttling(self, user_id: str):
        """
        Silent Throttling:
        Returns True if user should be throttled (delayed), False otherwise.
        """
        # Logic: Check user's concurrent job count or daily usage
        # For now, simplistic stub
        import random
        if random.random() < 0.05: # 5% chance of random throttling for demo
            print(f"Silent Throttling active for {user_id}")
            return True
        return False

    async def validate_script(self, text: str) -> bool:
        lower_text = text.lower()
        for term in self.prohibited_terms:
            if term in lower_text:
                print(f"Policy Violation (Script): Found prohibited term '{term}'")
                return False
        return True

    async def validate_metadata(self, title: str, description: str) -> bool:
        combined = (title + " " + description).lower()
        for term in self.prohibited_terms:
            if term in combined:
                print(f"Policy Violation (Metadata): Found prohibited term '{term}'")
                return False
        return True

policy_service = PolicyService()
