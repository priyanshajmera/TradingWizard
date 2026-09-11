# Production Dockerfile for Python FastAPI Backend
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ app/
COPY scripts/ scripts/ 2>/dev/null || true

# Default environment variables
ENV PORT=3001
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production
ENV PYTHONPATH=/app

EXPOSE 3001

# Command to run uvicorn server in production mode
CMD ["python", "-m", "app.main"]
