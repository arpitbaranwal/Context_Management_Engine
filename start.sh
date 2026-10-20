#!/usr/bin/env bash
# ==============================================================================
# Context Management Engine — Dual Service Launcher (macOS / Linux)
# Launches both FastAPI Backend (port 8000) and Vite React Frontend (port 5173)
# ==============================================================================

set -e

echo "========================================================"
echo "  Context Management Engine — Hybrid RAG Workspace"
echo "========================================================"
echo ""

# Find Python executable
if [ -d ".venv" ] && [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
    echo "[*] Using virtual environment at .venv"
elif [ -d "venv" ] && [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
    echo "[*] Using virtual environment at venv"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "[-] Error: Python is not installed or not in PATH."
    exit 1
fi

# Check for npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[-] Error: npm is not installed or not in PATH."
    exit 1
fi

echo "[1/2] Starting FastAPI backend on http://127.0.0.1:8000..."
$PYTHON_CMD -m uvicorn backend_bridge:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "[2/2] Starting React Frontend on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "[*] Shutting down services..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "[*] Done. Goodbye!"
}

trap cleanup INT TERM EXIT

echo ""
echo "========================================================"
echo "Services running in background:"
echo " - Frontend:       http://localhost:5173/"
echo " - Backend Bridge: http://localhost:8000/api/health"
echo " - Swagger Docs:   http://localhost:8000/docs"
echo "========================================================"
echo "Press Ctrl+C to stop both services."
echo ""

# Keep alive until user interrupts
wait

