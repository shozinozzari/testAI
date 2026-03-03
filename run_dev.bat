@echo off
REM Startup Script for AI Video Funnel (Windows)

echo Starting Backend (FastAPI)...
start "Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"

echo Checking Frontend dependencies...
if not exist "frontend\node_modules\" (
    echo Installing Frontend dependencies...
    start "Frontend Install" /wait cmd /c "cd frontend && npm install"
)

echo Starting Frontend (Next.js)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Background processes started.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo Press any key to exit this launcher (processes will remain running in new windows)...
pause >nul
