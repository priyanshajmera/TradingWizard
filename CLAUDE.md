# 📈 ICT Trading Intelligence System
### Full-Stack AI-Powered Market Analysis Platform

> **Version:** 1.0 — MVP Specification
> **Stack:** Python (FastAPI) · React · WebSockets · yfinance
> **Scope:** Signal Generation · ICT Pattern Detection · Real-Time Dashboard

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Backend Specification](#backend-specification)
4. [ICT Strategy Engine](#ict-strategy-engine)
5. [Signal Engine](#signal-engine)
6. [Frontend Specification](#frontend-specification)
7. [WebSocket Protocol](#websocket-protocol)
8. [Backtesting Engine (Phase 2)](#backtesting-engine)
9. [Data Models & Contracts](#data-models--contracts)
10. [Business Rules & Constraints](#business-rules--constraints)
11. [Security & Performance](#security--performance)
12. [Deployment & DevOps](#deployment--devops)
13. [MVP Checklist](#mvp-checklist)
14. [Roadmap](#roadmap)

---

## 1. Executive Summary

The **ICT Trading Intelligence System** is a full-stack, real-time market analysis platform built around **Inner Circle Trader (ICT)** methodologies. It ingests live and historical OHLC data via the yfinance library, applies a multi-layer ICT strategy engine, and broadcasts actionable buy/sell signals to a React dashboard — all in real time via WebSocket.

### Core Value Proposition

| Capability | Description |
|---|---|
| 🔍 ICT Pattern Detection | Detects FVG, Order Blocks, BOS, MSS, Liquidity Sweeps |
| 🚦 Signal Generation | BUY / SELL signals with confidence score and reasoning |
| 📡 Real-Time Streaming | Sub-second price and signal delivery via Socket.IO |
| 🧪 Backtesting (Phase 2) | Historical strategy validation with performance metrics |
| 📊 Visual Dashboard | Candlestick charts, scanner panels, watchlists |

> ⚠️ **This system is for analysis only. No trade execution in MVP.**

---

## 2. System Architecture

### High-Level Overview

```
┌───────────────────────▼──────────────────────────────────────────┐
│                    Python Backend (FastAPI)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Market Data  │  │   Scanner    │  │   ICT Strategy       │   │
│  │  Service     │→ │   Engine     │→ │   Engine             │   │
│  └──────────────┘  └──────────────┘  └──────────┬───────────┘   │
│                                                  ▼               │
│                                       ┌──────────────────────┐   │
│                                       │   Signal Engine      │   │
│                                       └──────────┬───────────┘   │
│                                                  ▼               │
│                                       ┌──────────────────────┐   │
│                                       │  WebSocket Server    │   │
│                                       └──────────────────────┘   │
└───────────────────────┬──────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                  yfinance Library                                 │
│         Live Polling │ Historical OHLC │ Instrument List         │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role |
|---|---|
| `MarketDataService` | yfinance data polling, tick ingestion, OHLC aggregation |
| `ScannerEngine` | Identifies gainers, losers, volume spikes, breakouts |
| `ICTStrategyEngine` | Runs all ICT pattern detection algorithms |
| `SignalEngine` | Aggregates ICT signals into final BUY/SELL recommendation |
| `WebSocketServer` | Broadcasts all events to connected frontend clients |
| `React Dashboard` | Displays charts, signals, scanner, watchlist in real time |

---

## 3. Backend Specification

### 3.1 Project Structure

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py              # Environment variables
│   │   └── logger.py              # Logger setup
│   │
│   ├── services/
│   │   ├── market_data.py         # yfinance polling, OHLC fetching
│   │   ├── scanner.py             # Gainer/loser/volume/breakout scanner
│   │   ├── ict.py                 # All ICT pattern algorithms
│   │   └── signal.py              # Signal generation and scoring
│   │
│   ├── sockets/
│   │   └── server.py              # WebSocket event setup and broadcast
│   │
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── market.py
│   │   │   └── signal.py
│   │
│   ├── models/
│   │   ├── candle.py
│   │   ├── signal.py
│   │   └── scanner.py
│   │
│   ├── utils/
│   │   ├── candle_utils.py        # OHLC helper functions
│   │   ├── math_utils.py          # Average, ATR, pivot calculations
│   │   └── time_utils.py          # Timezone, market session helpers
│   │
│   └── main.py                    # FastAPI app + WebSocket init
│
├── .env.example
├── requirements.txt
└── pyproject.toml
```

### 3.2 Market Data Service

**File:** `app/services/market_data.py`

#### Responsibilities
- Set up yfinance tickers for target symbols
- Poll yfinance for live updates (or use alternative streams if available)
- Aggregate ticks into OHLC candles (1m, 5m, 15m, 1h, 1D)
- Fetch historical OHLC data on demand
- Manage API rate limits and caching

#### Live Tick Format (Internal)
```python
from pydantic import BaseModel

class Tick(BaseModel):
    symbol: str
    last_price: float
    volume: int
    timestamp: str # ISO 8601
```

#### OHLC Candle Format (Internal & External)
```python
from pydantic import BaseModel
from typing import Literal

class Candle(BaseModel):
    symbol: str
    timeframe: Literal['1m', '5m', '15m', '1h', '1D']
    time: str       # ISO 8601
    open: float
    high: float
    low: float
    close: float
    volume: int
```

#### Key Methods
```python
class MarketDataService:
    def fetch_historical_ohlc(self, symbol: str, from_date: str, to_date: str, interval: str) -> list[Candle]: pass
    def get_latest_candle(self, symbol: str, timeframe: str) -> Candle: pass
    def subscribe_tick(self, symbol: str, callback: callable): pass
    def poll_data(self, symbols: list[str]): pass
```

---

### 3.3 Scanner Engine

**File:** `app/services/scanner.py`

#### Scanner Rules

| Scan Type | Logic |
|---|---|
| **Top Gainers** | `(close - prevClose) / prevClose * 100 > threshold` |
| **Top Losers** | `(close - prevClose) / prevClose * 100 < -threshold` |
| **Volume Spike** | `currentVolume > avgVolume20 * 2.0` |
| **Breakout (Bullish)** | `close > highest(high, 20 days)` |
| **Breakdown (Bearish)** | `close < lowest(low, 20 days)` |
| **Narrow Range Bar** | `(high - low) < avgRange * 0.5` — pre-breakout signal |

#### Scanner Output
```python
from pydantic import BaseModel
from typing import Literal

class ScanResult(BaseModel):
    symbol: str
    scanType: Literal['GAINER', 'LOSER', 'VOLUME_SPIKE', 'BREAKOUT', 'BREAKDOWN']
    value: float        # % change or volume ratio
    timestamp: str
```

---

## 4. ICT Strategy Engine

**File:** `app/services/ict.py`

This is the core intelligence layer. It processes a candle array and returns detected ICT structures.

---

### 4.1 Fair Value Gap (FVG)

**Definition:** An imbalance zone created when price moves too quickly, leaving a gap between the wicks of candle 1 and candle 3.

```
Bullish FVG:  candle[i-2].high < candle[i].low
Bearish FVG:  candle[i-2].low  > candle[i].high
```

**Output:**
```python
from pydantic import BaseModel
from typing import Literal

class FVG(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    top: float
    bottom: float
    formed_at: str      # ISO timestamp of candle[i]
    filled: bool        # true if price has revisited zone
```

**Additional Logic:**
- Track whether FVG has been filled (price returned to the zone)
- Only use **unfilled** FVGs as active signals
- Mark zone as partially filled if price enters but doesn't fully cross

---

### 4.2 Order Block (OB)

**Definition:** The last opposing candle before a significant impulse move. Represents institutional order placement zones.

```
Bullish OB: Last bearish candle before a bullish impulse
Bearish OB: Last bullish candle before a bearish impulse

Impulse = consecutive candles covering > 2x ATR in one direction
```

**Output:**
```python
from pydantic import BaseModel
from typing import Literal

class OrderBlock(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    high: float
    low: float
    formed_at: str
    strength: Literal['STRONG', 'MODERATE', 'WEAK']   # based on impulse size
    mitigated: bool                           # price returned to OB zone
```

---

### 4.3 Break of Structure (BOS)

**Definition:** Confirmation that the current trend is continuing.

```
Bullish BOS: current candle closes above the previous swing high
Bearish BOS: current candle closes below the previous swing low

Swing High: candle[i].high > candle[i-1].high && candle[i].high > candle[i+1].high
Swing Low:  candle[i].low  < candle[i-1].low  && candle[i].low  < candle[i+1].low
```

**Output:**
```python
from pydantic import BaseModel
from typing import Literal

class BOS(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    broken_level: float
    formed_at: str
    confirmed: bool    # close beyond level, not just wick
```

---

### 4.4 Market Structure Shift (MSS)

**Definition:** A trend reversal signal — the first sign that the prevailing trend is breaking down.

```
Bullish MSS: In a downtrend, price breaks above the last swing high (before taking a new low)
Bearish MSS: In an uptrend, price breaks below the last swing low (before making a new high)
```

**Output:**
```python
from pydantic import BaseModel
from typing import Literal

class MSS(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    shift_level: float
    formed_at: str
    prior_trend: Literal['UPTREND', 'DOWNTREND']
```

---

### 4.5 Liquidity Sweep (Premium Feature — Phase 1.5)

**Definition:** Price briefly spikes beyond a key level (equal highs/lows, previous day high/low) to trigger stop-losses, then reverses.

```
Buy-Side Liquidity Sweep:  price wicks above equal highs, then closes back below
Sell-Side Liquidity Sweep: price wicks below equal lows, then closes back above
```

---

### 4.6 ICT Engine Output

```python
from pydantic import BaseModel
from typing import Literal, Optional

class KeyLevels(BaseModel):
    resistance: list[float]
    support: list[float]

class ICTAnalysis(BaseModel):
    symbol: str
    timeframe: str
    timestamp: str
    fvg: list[FVG]
    orderBlocks: list[OrderBlock]
    bos: Optional[BOS]
    mss: Optional[MSS]
    trend: Literal['BULLISH', 'BEARISH', 'RANGING']
    keyLevels: KeyLevels
```

---

## 5. Signal Engine

**File:** `app/services/signal.py`

### 5.1 Scoring Matrix

Each active ICT condition contributes to the confidence score:

| Condition | Weight |
|---|---|
| Bullish / Bearish FVG detected (unfilled) | +20 |
| Price entering FVG zone | +15 |
| Order Block present (unmitigated) | +20 |
| BOS confirmed | +20 |
| MSS confirmed | +15 |
| Trend alignment (signal matches trend) | +10 |
| Volume spike confirmation | +10 |
| Multi-timeframe confluence | +15 |
| **Maximum Score** | **125 → normalized to 100** |

### 5.2 Signal Thresholds

| Score | Signal Strength |
|---|---|
| ≥ 75 | HIGH CONFIDENCE |
| 50–74 | MODERATE |
| 25–49 | LOW — informational only |
| < 25 | NO SIGNAL |

### 5.3 Signal Output Contract

```python
from pydantic import BaseModel
from typing import Literal

class Signal(BaseModel):
    id: str                # UUID
    symbol: str
    signal: Literal['BUY', 'SELL', 'NEUTRAL']
    type: Literal['INTRADAY', 'SWING', 'POSITIONAL']
    confidence: int        # 0–100
    strength: Literal['HIGH', 'MODERATE', 'LOW']
    reasons: list[str]     # ['FVG', 'OrderBlock', 'BOS', 'TrendAlign']
    entry: float             # Suggested entry price
    stopLoss: float          # Below OB / above FVG
    target: float            # Next liquidity pool / FVG fill
    riskReward: float        # Calculated R:R ratio
    timeframe: str
    timestamp: str
    expiry: str            # Signal valid until (e.g., end of session for INTRADAY)
```

### 5.4 Signal Type Classification

| Type | Timeframe Used | Hold Duration |
|---|---|---|
| INTRADAY | 1m, 5m, 15m | Same trading day |
| SWING | 1h, 4h, 1D | 2–10 days |
| POSITIONAL | 1D, 1W | Weeks to months |

---

## 6. Frontend Components Detail

### 6.1 Layout Wrapper (App.tsx)

**Top Navigation Bar:**
- Brand Logo (Wizard ICT)
- Global Tabs: **Dashboard** | **Signals** | **Settings** (placeholder)

**Dashboard View Context:**
- **Left Sidebar:** Symbol Explorer (US / India) with Search Bar
- **Center Focus:** Active ChartPanel
- **Right Sidebar/Bottom:** ScannerPanel

**Signals View Context:**
- Dedicated full-page view covering Signal matrices.
- "Generate Signals" button to manually dispatch bulk analysis across tracked watchlists.

### 6.2 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChartPanel/
│   │   │   ├── ChartPanel.tsx
│   │   │   └── ChartToolbar.tsx
│   │   ├── SignalPanel/
│   │   │   ├── SignalPanel.tsx
│   │   │   ├── SignalCard.tsx
│   │   │   └── SignalHistory.tsx
│   │   ├── ScannerPanel/
│   │   │   ├── ScannerPanel.tsx
│   │   │   └── ScannerRow.tsx
│   │   ├── Watchlist/
│   │   │   ├── Watchlist.tsx
│   │   │   └── WatchlistItem.tsx
│   │   └── shared/
│   │       ├── Badge.tsx
│   │       ├── ConfidenceMeter.tsx
│   │       └── LiveIndicator.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── Backtest.tsx
│   │
│   ├── services/
│   │   ├── socket.service.ts      # Socket.IO client + event handlers
│   │   └── api.service.ts         # REST API calls
│   │
│   ├── hooks/
│   │   ├── useSocket.ts           # Custom hook for socket events
│   │   ├── useSignals.ts
│   │   └── useWatchlist.ts
│   │
│   ├── store/
│   │   ├── signals.store.ts       # Zustand / Redux slice
│   │   ├── scanner.store.ts
│   │   └── market.store.ts
│   │
│   └── App.tsx
```

---

### 6.2 Chart Panel

- **Library:** Lightweight Charts (by TradingView) — `lightweight-charts`
- **Features:**
  - Candlestick chart with volume bars
  - Overlay ICT zones dynamically: FVG (shaded horizontal price bands), Order Blocks (colored bounding boxes)
  - Timeframe switcher component: 1m / 5m / 15m / 1h / 1D (dynamically fetches OHLC sequence on change)
  - Auto-scroll to latest candle on new tick

---

### 6.3 Signal Panel (Signals Tab View)

Displays the most recent signals sorted by confidence (descending) upon manual generation.
It is no longer a live stream wrapper but a dedicated view with a "Generate Signals" action.

**Signal Card shows:**
- Symbol + Exchange (NSE/BSE)
- BUY / SELL badge (color-coded: green/red)
- Confidence meter (0–100%)
- Reasons chips: `FVG` `OrderBlock` `BOS` (Signals now necessitate FVG, OB, and BOS evaluations)
- Entry / SL / Target / R:R
- Signal type badge: `INTRADAY` / `SWING`
- Timestamp + expiry countdown

---

### 6.4 Scanner Panel

Three tabbed views:

| Tab | Content |
|---|---|
| 🔥 Movers | Top 5 gainers and losers |
| 📊 Volume | Stocks with volume spike > 2x avg |
| 🚀 Breakout | Stocks at 20-day high/low |

Each row is clickable — loads the symbol into the Chart Panel.

---

### 6.5 Symbol Explorer (US / India)

- Segmented tabs to view all available United States (US) and India (NSE) symbols separately.
- **Search Bar:** Real-time filtering parameter to quickly query through hundreds of tracked tickers.
- Displays comprehensive lists of tickers.
- Shows: Symbol, LTP, Change %, Volume
- Color-coded: green (positive), red (negative)
- Clicking a symbol dynamically loads its historical OHLC sequence, triggers the timeframe selector context, and instructs the ICT Strategy Engine to calculate and overlay FVG/OB visually onto the Chart Panel.

---

## 7. WebSocket Protocol

### 7.1 Server → Client Events

| Event | Payload | Frequency |
|---|---|---|
| `price_update` | `{ symbol, ltp, change, volume, timestamp }` | Per tick (~1s) |
| `candle_update` | `Candle` object | Per candle close |
| `signal_update` | `Signal` object | On new signal |
| `scanner_update` | `ScanResult[]` | Every 30s |
| `ict_update` | `ICTAnalysis` | Per candle close |
| `connection_status` | `{ status, message }` | On connect/disconnect |

### 7.2 Client → Server Events

| Event | Payload | Purpose |
|---|---|---|
| `subscribe` | `{ symbols: string[] }` | Subscribe to symbols |
| `unsubscribe` | `{ symbols: string[] }` | Remove subscription |
| `request_history` | `{ symbol, timeframe, from, to }` | Fetch historical data |

### 7.3 Socket.IO Rooms Strategy

Each symbol gets its own Socket.IO room (`room:RELIANCE`, `room:INFY`), allowing the frontend to subscribe only to relevant symbols.

---

## 8. Backtesting Engine

**Phase 2 — Post-MVP**

### 8.1 Input

```python
from pydantic import BaseModel
from typing import Literal

class BacktestConfig(BaseModel):
    symbol: str
    from_date: str           # ISO date
    to_date: str
    timeframe: str
    strategies: list[Literal['FVG', 'OB', 'BOS', 'MSS']]
    capitalPerTrade: float
    riskPercent: float    # % of capital to risk per trade
```

### 8.2 Output Metrics

```python
from pydantic import BaseModel

class BacktestResult(BaseModel):
    totalTrades: int
    winRate: float          # %
    profitFactor: float     # Gross profit / Gross loss
    netPnL: float
    maxDrawdown: float      # %
    avgRiskReward: float
    sharpeRatio: float
    trades: list['TradeLog']
```

### 8.3 Trade Log per Entry

```python
from pydantic import BaseModel
from typing import Literal

class TradeLog(BaseModel):
    symbol: str
    entryDate: str
    exitDate: str
    entryPrice: float
    exitPrice: float
    signal: Literal['BUY', 'SELL']
    pnl: float
    outcome: Literal['WIN', 'LOSS', 'BREAKEVEN']
    reasons: list[str]
```

---

## 9. Data Models & Contracts

### REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/market/symbols` | List all available symbols |
| `GET` | `/api/market/ohlc/:symbol` | Fetch historical OHLC |
| `GET` | `/api/signals` | Get recent signals (paginated) |
| `GET` | `/api/signals/:symbol` | Signals for a specific symbol |
| `GET` | `/api/scanner/results` | Latest scanner output |
| `GET` | `/api/ict/:symbol` | ICT analysis for a symbol |
| `POST` | `/api/backtest/run` | Run a backtest |
| `GET` | `/api/backtest/results/:id` | Fetch backtest result |

---

## 10. Business Rules & Constraints

### Signal Integrity Rules

1. **No random signals** — every signal must result from ≥2 confirmed ICT conditions
2. **Trend alignment required** — signals must align with the prevailing market structure
3. **Volume confirmation** — high-confidence signals must have volume above 20-day average
4. **No conflicting signals** — if BUY and SELL conditions exist simultaneously, emit NEUTRAL
5. **Signal expiry** — INTRADAY signals expire at 3:20 PM IST; SWING signals expire after 5 days

### Operational Constraints

- System must support **≥50 simultaneous symbol streams**
- Signal computation must complete within **500ms** of candle close
- WebSocket broadcast latency target: **< 100ms**
- No trade execution — analysis and alerting only
- Historical data lookback: minimum **100 candles** per analysis

---

## 11. Security & Performance

### Authentication
- External API keys (if any used alongside yfinance) stored in environment variables only
- Never expose API keys to frontend
- Use `.env` with `python-dotenv` — never commit secrets

### Rate Limiting
- yfinance library: respect implicit rate limits and implement delays to avoid IP bans
- Implement exponential backoff on failure
- Cache historical data in-memory (or Redis) to avoid redundant API calls

### Performance Optimizations
- Use `Celery` or `RQ` queue for ICT analysis jobs
- Debounce scanner runs (run every 30s, not per tick)
- Frontend: virtualize signal and scanner lists with `react-window`
- Compress WebSocket payloads

---

## 12. Deployment & DevOps

### Environment Variables (`.env.example`)

```
# Server
PORT=3001
NODE_ENV=development

# Frontend
VITE_SOCKET_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api

# Redis (optional, Phase 2)
REDIS_URL=redis://localhost:6379
```

### Docker Compose (Optional)

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    env_file: .env

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

---

## 13. MVP Checklist

### Backend
- [ ] yfinance data polling mechanism established
- [ ] Live tick ingestion for subscribed symbols
- [ ] OHLC candle aggregation (1m, 5m, 15m)
- [ ] FVG detection algorithm implemented and tested
- [ ] Order Block detection implemented
- [ ] BOS detection implemented
- [ ] Signal engine with scoring matrix
- [ ] WebSocket server broadcasting `price_update` and `signal_update`
- [ ] REST endpoints for symbols and signals

### Frontend
- [ ] Socket.IO client connected
- [ ] Candlestick chart rendering live data
- [ ] FVG zones overlaid on chart
- [ ] Signal panel showing BUY/SELL cards with confidence
- [ ] Scanner panel with gainers/losers/volume tabs
- [ ] Watchlist with real-time price updates
- [ ] Timeframe switcher functional

### Quality
- [ ] All ICT signals include human-readable reasoning
- [ ] Confidence score is deterministic (same input = same output)
- [ ] Logging for every signal generated (Loguru/logging)
- [ ] Error handling for yfinance data fetching failures
- [ ] Reconnect logic for WebSocket drops

---

## 14. Roadmap

### Phase 1 — MVP (Weeks 1–3)
- Core backend services + Zerodha integration
- FVG, OB, BOS detection
- Basic signal generation
- React dashboard with chart + signal panel

### Phase 1.5 — Enhancement (Weeks 4–5)
- MSS and Liquidity Sweep detection
- Multi-timeframe confluence analysis
- Scanner panel (gainers, losers, breakouts)
- Signal history and filtering

### Phase 2 — Backtesting (Weeks 6–8)
- Historical strategy runner
- Performance metrics dashboard
- Trade log with visualizations

### Phase 3 — Intelligence Layer (Weeks 9–12)
- Multi-timeframe signal ranking
- AI-based pattern confidence boost
- Telegram / Email alert integration
- Risk management module (position sizing, max drawdown guard)

### Phase 4 — Advanced (Future)
- Auto-trading integration (with paper trading mode first)
- Strategy builder UI (no-code ICT setup)
- Portfolio analytics and P&L tracking

---

*Document generated for ICT Trading Intelligence System v1.0*
*Last updated: 2026 | Stack: Python · FastAPI · React · WebSockets · yfinance*
