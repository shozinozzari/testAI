import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.core.config import settings
import os

class FirebaseService:
    def __init__(self):
        if not firebase_admin._apps:
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
            else:
                print(f"Warning: Firebase credentials not found at {cred_path}. Using Mock DB.")
                self.db = MockFirestoreClient()
                # Seed Mock User
                self.db.collection("users").document("mock-uid").set({
                    "uid": "mock-uid",
                    "email": "mock@example.com",
                    "display_name": "Mock User",
                    "role": "OWNER", 
                    "campaign_ids": []
                })
        else:
             self.db = firestore.client()

    def verify_token(self, token: str):
        if not firebase_admin._apps:
            return {"uid": "mock-uid", "email": "mock@example.com", "role": "OWNER"}
            
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            print(f"Error verifying token: {e}")
            return None

class MockDocumentSnapshot:
    def __init__(self, doc_id, exists=False, data=None):
        self.id = doc_id
        self.exists = exists
        self._data = data or {}
    
    def to_dict(self):
        return self._data

class MockDocumentReference:
    def __init__(self, collection, doc_id):
        self._collection = collection
        self._doc_id = doc_id

    @property
    def path(self):
        return f"{self._collection.name}/{self._doc_id}"

    def set(self, data, merge=False):
        print(f"[MOCK DB] SET {self.path}: {data}")
        self._collection._docs[self._doc_id] = dict(data)
        
    def update(self, data):
        print(f"[MOCK DB] UPDATE {self.path}: {data}")
        if self._doc_id in self._collection._docs:
            self._collection._docs[self._doc_id].update(data)
        else:
            self._collection._docs[self._doc_id] = dict(data)
        
    def get(self):
        print(f"[MOCK DB] GET {self.path}")
        if self._doc_id in self._collection._docs:
            return MockDocumentSnapshot(self._doc_id, exists=True, data=dict(self._collection._docs[self._doc_id]))
        return MockDocumentSnapshot(self._doc_id, exists=False)

    def delete(self):
        print(f"[MOCK DB] DELETE {self.path}")
        self._collection._docs.pop(self._doc_id, None)

class MockCollectionReference:
    def __init__(self, name):
        self.name = name
        self._docs = {}  # doc_id -> data dict
    
    def document(self, doc_id):
        return MockDocumentReference(self, doc_id)
        
    def stream(self):
        """Yield all documents in the collection."""
        print(f"[MOCK DB] STREAM {self.name}: {len(self._docs)} docs")
        for doc_id, data in self._docs.items():
            yield MockDocumentSnapshot(doc_id, exists=True, data=dict(data))
    
    def where(self, *args):
        print(f"[MOCK DB] QUERY {self.name} {args}")
        return []

class MockFirestoreClient:
    def __init__(self):
        self._collections = {}

    def collection(self, name):
        if name not in self._collections:
            self._collections[name] = MockCollectionReference(name)
        return self._collections[name]

firebase_service = FirebaseService()
