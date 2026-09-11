# 🚀 Decoupled Production Deployment Guide

This guide covers deploying the **ICT Trading Intelligence System** frontend and backend as separate, independent services in production environments.

---

## 🏗 System Architecture Overview

```text
 ┌───────────────────────────┐         REST / SSE         ┌───────────────────────────┐
 │                           ├───────────────────────────►│                           │
 │     React Frontend        │                            │   Python FastAPI Backend  │
 │ (Vercel / Netlify / Nginx)│◄───────────────────────────┤ (Render / Railway / Docker│
 │                           │         WebSockets         │                           │
 └───────────────────────────┘                            └───────────────────────────┘
```

---

## 🌐 1. Backend Deployment

### Option A: Render.com / Railway / Fly.io

1. **Create Web Service**:
   - Point your hosting provider to the repository's `/backend` directory.
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m app.main` or `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables**:
   Set the following variables in the provider dashboard:
   | Variable | Example Value | Description |
   |---|---|---|
   | `PORT` | `10000` (assigned automatically by Render) | Server port |
   | `HOST` | `0.0.0.0` | Bind host |
   | `ENVIRONMENT` | `production` | Production mode (disables live reload) |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Allowed CORS origins (comma separated or `*`) |

### Option B: Docker Container Deployment (AWS EC2 / DigitalOcean / VPS)

1. Build and run using the backend Dockerfile:
   ```bash
   cd backend
   docker build -t ict-backend .
   docker run -d -p 3001:3001 \
     -e PORT=3001 \
     -e HOST=0.0.0.0 \
     -e ENVIRONMENT=production \
     -e CORS_ORIGINS="https://your-frontend.vercel.app" \
     --name ict-backend-container ict-backend
   ```

---

## 🎨 2. Frontend Deployment

### Option A: Vercel / Netlify / Cloudflare Pages

1. **Connect Repository**:
   - Set **Root Directory** to `frontend`.
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

2. **Environment Variables**:
   Set the environment variables during build time in your provider project settings:
   | Variable | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com` | Your live backend HTTP API base URL |
   | `VITE_WS_URL` | `wss://your-backend.onrender.com` | Your live backend WebSocket URL (`wss://` for HTTPS) |

> ⚠️ **Important**: In Vite applications, environment variables starting with `VITE_` are baked into the static build files. Always re-deploy the frontend after modifying environment variables.

### Option B: Nginx Docker Container

1. Build and run using the frontend Dockerfile:
   ```bash
   cd frontend
   docker build \
     --build-arg VITE_API_URL=https://your-backend.onrender.com \
     --build-arg VITE_WS_URL=wss://your-backend.onrender.com \
     -t ict-frontend .
   docker run -d -p 80:80 --name ict-frontend-container ict-frontend
   ```

---

## 🐳 3. Unified Local & Staging Deployment (Docker Compose)

To spin up both frontend and backend on a local server or single VM:

```bash
# Build and start services in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Frontend will be available at `http://localhost:5173` and Backend at `http://localhost:3001`.

---

## 🔒 4. Production Checklist

- [x] Backend CORS restrictions configured using `CORS_ORIGINS`.
- [x] Environment variables decoupled with fallback support.
- [x] Secure WebSockets (`wss://`) configured when frontend is served over HTTPS.
- [x] Production Docker builds tested and optimized.
