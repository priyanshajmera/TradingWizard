# 📈 Wizard ICT Trading Intelligence System

> **Full-Stack AI-Powered Market Analysis Platform & Signal Engine**
> 
> *Stack: React 18 · TypeScript · Tailwind CSS · Python 3.11 · FastAPI · WebSockets · yfinance*

---

## 📋 Overview

The **Wizard ICT Trading Intelligence System** is a real-time market analysis platform designed around **Inner Circle Trader (ICT)** institutional trading methodologies. It processes live and historical OHLC market data across US Wall Street assets and Indian NSE stocks, detects key institutional market structures, and generates high-probability BUY/SELL signals with risk management targets (Entry, Stop Loss, Take Profit, and Risk:Reward ratios).

---

## ✨ Key Features

- 🔍 **Institutional ICT Pattern Detection**:
  - **Fair Value Gaps (FVG)**: Identifies bullish and bearish market imbalances.
  - **Order Blocks (OB)**: Locates institutional buying and selling liquidity blocks.
  - **Break of Structure (BOS)**: Detects trend continuation breakouts.
  - **Market Structure Shift (MSS)**: Flags early structural trend reversals.

- 📊 **Interactive Terminal Matrix**:
  - Powered by **TradingView Lightweight Charts** with custom drawing toolbars (trendlines, horizontal lines, price rectangles).
  - Dynamic overlay of unfilled FVGs, unmitigated Order Blocks, and Support/Resistance levels.
  - Timeframe switcher (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`, `1W`, `1M`) and technical indicators (EMA 11, EMA 22, SMA 50, SMA 200).

- ⚡ **Live Alignment Signal Matrix**:
  - Evaluates multi-timeframe candle confluence into deterministic conviction scores (0–100%).
  - Provides entry price, tight stop-loss placement, 1:3 target levels, and human-readable reasoning chips.

- 📡 **NSE Full-Market Scanner**:
  - Scans all **2,200+ NSE India stocks** in parallel.
  - Streams real-time progress via Server-Sent Events (SSE) and ranks top conviction BUY candidates.

- 📥 **One-Click Export to Excel**:
  - Instantly export scanner results into an Excel-compatible UTF-8 CSV file containing full price levels, scores, and confluence reasons.

- 🌐 **Decoupled Production Architecture**:
  - Fully separated Frontend and Backend built to deploy independently on platforms like Vercel, Netlify, Render, Railway, or Docker.

---

## 🛠 Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Lightweight Charts, Zustand |
| **Backend** | Python 3.11, FastAPI, Uvicorn, yfinance, Pydantic v2, WebSockets, Loguru |
| **DevOps & Containers** | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **git**

### 1. Clone the Repository
```bash
git clone https://github.com/priyanshajmera/TradingWizard.git
cd TradingWizard
```

### 2. Set Up & Run the Backend
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI backend server
python -m app.main
```
The API server will run at `http://localhost:3001`.

### 3. Set Up & Run the Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Running with Docker

You can run both frontend and backend services containerized together using Docker Compose:

```bash
# Build and launch containers
docker-compose up -d --build

# View container logs
docker-compose logs -f
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

---

## 📁 Repository Structure

```text
Wizard/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── core/            # Config & logger settings
│   │   ├── services/        # ICT engine, scanner, signal & market services
│   │   └── main.py          # FastAPI application & API endpoints
│   ├── Dockerfile           # Backend container build specification
│   ├── requirements.txt     # Python package dependencies
│   └── .env.example         # Backend environment variables
│
├── frontend/                 # React 18 TypeScript Frontend
│   ├── src/
│   │   ├── components/      # ChartPanel, NSEScanner, SignalPanel, SymbolExplorer
│   │   ├── config.ts        # Environment variable resolution & API configuration
│   │   ├── store/           # Zustand market state management
│   │   └── App.tsx          # Main application wrapper & WebSocket client
│   ├── Dockerfile           # Frontend Nginx container build specification
│   ├── nginx.conf           # Production Nginx server configuration
│   └── .env.example         # Frontend environment variables
│
├── docker-compose.yml        # Unified local/staging orchestration
├── DEPLOYMENT.md             # Complete production deployment guide
└── README.md                 # Project documentation
```

---

## 📖 Deployment Guide

For full instructions on deploying the Frontend to **Vercel / Netlify** and Backend to **Render / Railway / Docker**, view the **[DEPLOYMENT.md](file:///c:/Users/ajmer/Desktop/Wizard/DEPLOYMENT.md)** guide.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
