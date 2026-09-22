@echo off
title Peblo TV Mini Starter
echo ========================================================
echo          Starting Peblo TV Mini (All Services)
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"

echo [0/3] Clearing any lingering processes on ports 8000, 3000, 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001.*LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [1/3] Starting FastAPI Backend on Port 8000...
start "Peblo TV - Backend API" cmd /k "cd /d %ROOT_DIR%backend && python -m uvicorn app.main:app --reload --port 8000"

echo [2/3] Starting CMS Studio UI on Port 3001...
start "Peblo TV - CMS Studio" cmd /k "cd /d %ROOT_DIR%cms-ui && npm run dev"

echo [3/3] Starting Viewer OTT UI on Port 3000...
start "Peblo TV - Viewer UI" cmd /k "cd /d %ROOT_DIR%viewer-ui && npm run dev"

echo.
echo ========================================================
echo All 3 services are starting!
echo.
echo 1. Viewer UI : http://localhost:3000
echo 2. CMS Studio: http://localhost:3001
echo 3. API Docs  : http://localhost:8000/docs
echo ========================================================
echo.
