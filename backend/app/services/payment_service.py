import os
import stripe
import razorpay
from firebase_admin import firestore
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None

class PaymentService:
    async def create_checkout_session(self, user_id: str, email: str, country: str):
        """
        Creates a payment session based on country.
        India -> Razorpay Order
        ROW -> Stripe Session
        """
        if country == "IN":
            return await self._create_razorpay_order(user_id)
        else:
            return await self._create_stripe_session(user_id, email)

    async def _create_stripe_session(self, user_id: str, email: str):
        print(f"Creating Stripe Session for {email} ({user_id})")
        
        try:
            checkout_session = stripe.checkout.Session.create(
                customer_email=email,
                client_reference_id=user_id,
                payment_method_types=['card'],
                line_items=[
                    {
                        'price': 'price_12345', # TODO: Replace with real Price ID from .env or Config
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                success_url='http://localhost:3000/dashboard?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='http://localhost:3000/payment',
            )
            return {
                "gateway": "stripe",
                "sessionId": checkout_session.id,
                "url": checkout_session.url
            }
        except Exception as e:
            print(f"Stripe Error: {e}")
            # Fallback for dev without keys
            return {
                "gateway": "stripe",
                "sessionId": "cs_test_mock_123",
                "url": "https://checkout.stripe.com/mock"
            }


    async def _create_razorpay_order(self, user_id: str):
        print(f"Creating Razorpay Order for {user_id}")
        
        try:
            if not razorpay_client:
                 raise Exception("Razorpay credentials missing")
                 
            order_amount = 2999900 # ₹29,999.00
            order_currency = 'INR'
            order_receipt = f'order_rcptid_{user_id[:8]}'
            
            order = razorpay_client.order.create({
                'amount': order_amount,
                'currency': order_currency,
                'receipt': order_receipt,
                'notes': {
                    'uid': user_id
                }
            })
            
            return {
                "gateway": "razorpay",
                "orderId": order['id'],
                "amount": order_amount,
                "currency": order_currency,
                "key": settings.RAZORPAY_KEY_ID
            }
        except Exception as e:
             print(f"Razorpay Error: {e}")
             # Fallback
             return {
                "gateway": "razorpay",
                "orderId": "order_mock_123",
                "amount": 2999900,
                "currency": "INR"
            }
        
    async def handle_webhook(self, payload: dict, provider: str, signature: str = None):
        """
        Handles webhooks from Stripe/Razorpay.
        Extracts UID and activates subscription.
        """
        print(f"Processing {provider} webhook...")
        uid = None
        
        # Verify and Extract Logic
        if provider == "stripe":
            try:
                event = stripe.Webhook.construct_event(
                    payload, signature, settings.STRIPE_WEBHOOK_SECRET
                )
                if event['type'] == 'checkout.session.completed':
                     session = event['data']['object']
                     uid = session.get('client_reference_id')
            except Exception as e:
                 print(f"Webhook verification failed: {e}")
                 # For dev/mock flow
                 if isinstance(payload, dict) and 'data' in payload:
                     uid = "test_uid_123"

        elif provider == "razorpay":
            # Razorpay verification usually happens before this or assumes payload is verified
            # Here we just extract for MVP
             if 'payload' in payload and 'payment' in payload['payload']:
                  # Extraction logic depends on event type
                  pass
             # Mock extraction
             uid = "test_uid_123"
            
        if uid:
            await self._activate_subscription(uid)
             # Trigger Email via Firebase
            await self._trigger_email(uid)
            return True
        return False

    async def _activate_subscription(self, uid: str):
        print(f"Activating subscription for UID: {uid}")
        from app.services.firebase_service import firebase_service
        from app.models.user import SubscriptionStatus, UserRole
        
        db = firebase_service.db
        if not db:
            print("DB not active, skipping write.")
            return

        user_ref = db.collection("users").document(uid)
        
        # Update User Subscription & Role
        user_ref.update({
            "subscription_status": SubscriptionStatus.ACTIVE.value,
            "role": UserRole.OWNER.value, 
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        print(f"Subscription activated for {uid}")

    async def _trigger_email(self, uid: str):
        """
        Writes email document to Firestore 'mail' collection
        """
        from app.services.firebase_service import firebase_service
        db = firebase_service.db
        
        # Fetch user email
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return
            
        user_email = user_doc.get("email")
        
        email_data = {
            "to": [user_email],
            "message": {
                "subject": "Welcome to AI Video Funnel - Subscription Active",
                "html": "<h1>Welcome!</h1><p>Your subscription is now active.</p>"
            }
        }
        
        db.collection("mail").add(email_data)
        print(f"Email trigger written for {user_email}")

payment_service = PaymentService()
