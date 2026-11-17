# Backend image (FastAPI + Tesseract). NOT TESTED: Docker was not available while this project was assembled.
# Build from the project root:  docker build -t taxease-backend .
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY data data
WORKDIR /app/backend
# Settings (SUPABASE_URL, FRONTEND_ORIGIN, HF_TOKEN...) come from the host's environment variables, not from a file.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
