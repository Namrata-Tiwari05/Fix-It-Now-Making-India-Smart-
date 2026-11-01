# Multi-runtime production container for FixItNow (Node.js Express + Python FastAPI AI)
FROM python:3.11-slim

# Install system dependencies (curl, libgl1 for opencv, nodejs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Python dependencies with CPU-only PyTorch to minimize image size and RAM footprint
COPY ai-service/requirements.txt ./ai-service/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r ./ai-service/requirements.txt

# 2. Install Node.js dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# 3. Copy application code and AI model checkpoint
COPY ai-service/ ./ai-service/
COPY ai-artifacts/ ./ai-artifacts/
COPY server/ ./server/
COPY start.sh ./start.sh

RUN chmod +x ./start.sh

# Environment settings
ENV NODE_ENV=production
ENV PORT=5000
ENV AI_PORT=8000
ENV AI_SERVICE_URL=http://127.0.0.1:8000

EXPOSE 5000

ENTRYPOINT ["/bin/bash", "./start.sh"]

