# AI Video Funnel SaaS - Setup Guide

## Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Firebase Project Credentials

## 1. Backend Setup
1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv venv`
3. Activate: `.\venv\Scripts\Activate`
4. Install dependencies: `pip install -r requirements.txt` (Create this first if missing)
5. Create `.env` with:
   ```
   FIREBASE_CREDENTIALS_PATH=firebase_credentials.json
   STRIPE_SECRET_KEY=sk_test_...
   ```
6. Place your `firebase_credentials.json` in `backend/`.

## 2. Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Create `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   ```

## 3. Running Locally
Run the helper script:
```powershell
.\run_dev.ps1
```
Or manually:
- Backend: `cd backend; uvicorn main:app --reload`
- Frontend: `cd frontend; npm run dev`

Visit `http://localhost:3000` to start.
