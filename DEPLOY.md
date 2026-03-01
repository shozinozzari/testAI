# Deployment Guide

## 1. Install Firebase CLI (Frontend)
The system did not find the `firebase` command. Open a **new** terminal (PowerShell or Cmd) and run:

```bash
npm install -g firebase-tools
```

After installation, close and reopen the terminal to refresh your PATH.

## 2. Deploy Frontend
Once `firebase` is installed, follow these steps in your terminal inside the `frontend` folder:

1.  **Login**:
    ```bash
    firebase login
    ```
    (Follow the browser prompt to sign in with Google).

2.  **Initialize**:
    ```bash
    firebase init hosting
    ```
    - **Detected project**: Select `fozatooo`
    - **Web Framework**: It should detect **Next.js**. Say **Yes** to using web frameworks.
    - **Region**: Select a region close to you (e.g., `us-central1`).

3.  **Deploy**:
    ```bash
    firebase deploy
    ```

## 3. IMPORTANT: Backend Connection
Your frontend at `https://fozatooo.web.app` will **NOT** work yet because it is trying to talk to `localhost:8000`.

To fix this, you must:
1.  **Deploy the Backend** (e.g., to Google Cloud Run, Render, or a VPS).
2.  Update `frontend/.env.local` with the **Real Backend URL**:
    ```bash
    NEXT_PUBLIC_API_URL=https://your-backend-url.com
    ```
3.  Re-deploy the frontend (`firebase deploy`).

For now, `fozatooo.web.app` will load the UI, but API calls (Signup, Login) will likely fail until the backend is live on the public internet.
