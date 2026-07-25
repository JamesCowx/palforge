@echo off
cd /d "%~dp0"
echo.
echo  ============================================
echo   PalForge v1.0.0
echo  ============================================
echo.

if not exist .env (
    echo [SETUP] Creating .env from template...
    copy .env.example .env >nul
)

echo [SETUP] Installing dependencies...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [START] Launching server on http://localhost:8080
echo         Press Ctrl+C to stop
echo.
python run.py
pause
