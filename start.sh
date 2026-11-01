#!/bin/bash
set -e

echo "======================================================="
echo "🚀 Starting FixItNow Production Unified Backend Services"
echo "======================================================="

PORT=${PORT:-5000}
AI_PORT=${AI_PORT:-8000}

echo "1. Starting Python FastAPI AI Microservice on 127.0.0.1:${AI_PORT}..."
cd /app/ai-service
python3 -m uvicorn app.main:app --host 127.0.0.1 --port ${AI_PORT} --workers 1 &
AI_PID=$!

# Wait for FastAPI to become healthy
echo "Waiting for AI Service to be ready..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:${AI_PORT}/health > /dev/null 2>&1; then
    echo "✅ FastAPI AI Service is online and healthy!"
    break
  fi
  sleep 1
done

echo "2. Starting Node.js Express API Server on 0.0.0.0:${PORT}..."
cd /app/server
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://127.0.0.1:${AI_PORT}}"
exec node --max-old-space-size=160 src/index.js

