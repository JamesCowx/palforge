#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ============================================"
echo "    PalForge v1.0.0"
echo "  ============================================"
echo ""

if [ ! -f .env ]; then
    echo "[SETUP] Creating .env from template..."
    cp .env.example .env
fi

echo "[SETUP] Installing dependencies..."
pip install -r requirements.txt -q

echo ""
echo "[START] Launching server on http://localhost:8080"
echo "        Press Ctrl+C to stop"
echo ""

python run.py
