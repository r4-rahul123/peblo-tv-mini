@echo off
title Peblo TV Mini Starter
echo ========================================================
echo          Starting Peblo TV Mini (All Services)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting FastAPI Backend on Port 8000...
start "Peblo TV - Backend API" cmd /k "cd backend && uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting CMS Studio UI on Port 3001...
start "Peblo TV - CMS Studio" cmd /k "cd cms-ui && npm run dev -- --port 3001"

echo [3/3] Starting Viewer OTT UI on Port 3000...
start "Peblo TV - Viewer UI" cmd /k "cd viewer-ui && npm run dev -- --port 3000"

echo.
echo ========================================================
echo All 3 services are starting!
echo.
echo 1. Viewer UI : http://localhost:3000
echo 2. CMS Studio: http://localhost:3001
echo 3. API Docs  : http://localhost:8000/docs
echo ========================================================
echo.
pause
