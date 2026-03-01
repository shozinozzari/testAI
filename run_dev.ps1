# Startup Script for AI Video Funnel (Windows)

Write-Host "Starting Backend (FastAPI)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd backend; uvicorn main:app --reload --port 8000"

Write-Host "Starting Frontend (Next.js)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "cd frontend; npm run dev"

Write-Host "Backgound processes started."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Press Enter to exit this launcher (processes will remain running in new windows)..."
Read-Host
