@echo off
title Context Management Engine Launcher
echo ========================================================
echo   Context Management Engine - Hybrid RAG Workspace
echo ========================================================
echo.

:: Detect virtual environment Python or system Python
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=.venv\Scripts\python.exe"
    echo [*] Detected virtual environment at .venv
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_CMD=venv\Scripts\python.exe"
    echo [*] Detected virtual environment at venv
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=python"
    ) else (
        set "PYTHON_CMD=py"
    )
)

echo [1/2] Launching FastAPI backend (port 8000)...
start "CME Backend Bridge" cmd /k "%PYTHON_CMD% -m uvicorn backend_bridge:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Frontend (port 5173)...
start "CME Frontend UI" cmd /k "npm run dev"

echo.
echo ========================================================
echo Both services are starting in separate windows:
echo - Frontend:       http://localhost:5173/
echo - Backend Bridge: http://localhost:8000/api/health
echo - API Swagger:    http://localhost:8000/docs
echo ========================================================
echo You can now open http://localhost:5173 in your browser.
pause
