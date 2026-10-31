@echo off
title CME FastAPI Backend Bridge
echo ========================================================
echo Starting Context Management Engine - FastAPI Backend
echo Port: 8000 (Binding to 0.0.0.0 and 127.0.0.1)
echo ========================================================

:: Detect Python executable
if exist "C:\Users\asus\AppData\Local\Programs\Python\Python311\python.exe" (
    set "PY_EXE=C:\Users\asus\AppData\Local\Programs\Python\Python311\python.exe"
) else if exist ".venv\Scripts\python.exe" (
    set "PY_EXE=.venv\Scripts\python.exe"
) else if exist "venv\Scripts\python.exe" (
    set "PY_EXE=venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo Using Python: %PY_EXE%

:loop
echo [%date% %time%] Starting uvicorn server...
"%PY_EXE%" -m uvicorn backend_bridge:app --host 0.0.0.0 --port 8000 --reload
echo.
echo [WARNING] Backend process stopped or crashed with exit code %errorlevel%.
echo Restarting server in 2 seconds... (Press Ctrl+C to stop)
timeout /t 2 /nobreak >nul
goto loop
