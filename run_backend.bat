@echo off
echo ========================================================
echo Starting Context Management Engine - FastAPI Backend
echo Host: http://127.0.0.1:8000
echo ========================================================
if exist "C:\Users\asus\AppData\Local\Programs\Python\Python311\python.exe" (
    "C:\Users\asus\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn backend_bridge:app --host 127.0.0.1 --port 8000 --reload
) else (
    python -m uvicorn backend_bridge:app --host 127.0.0.1 --port 8000 --reload
)
pause

