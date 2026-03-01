from datetime import datetime
# from app.models.user import User, SubscriptionStatus
# from app.services.firebase_service import firebase_service

class SubscriptionService:
    def __init__(self):
        pass

    async def handle_stripe_checkout_completed(self, session: dict):
        customer_email = session.get("customer_email")
        if not customer_email:
            return
            
        # TODO: Lookup user by email in Firestore
        # user = firebase_service.get_user_by_email(customer_email)
        
        # TODO: Update user subscription status to ACTIVE
        print(f"Activating subscription for {customer_email}")
        
    async def handle_subscription_updated(self, subscription: dict):
        status = subscription.get("status")
        # Map Stripe status to our internal status
        # active -> ACTIVE
        # past_due -> PAST_DUE
        # canceled -> CANCELED
        print(f"Subscription updated: {status}")

subscription_service = SubscriptionService()
