import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
from concurrent.futures import ThreadPoolExecutor

from app.core.config import settings
from app.core.logger import logger
from app.services.market_data import market_data_service
from app.services.ict import ict_engine
from app.services.signal import signal_engine
from app.services.scanner import bulk_scanner

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.subscriptions: set[str] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")

manager = ConnectionManager()

@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} API Running"}

@app.get("/api/market/symbols")
def get_symbols():
    # Priority Overrides
    us_priority = ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "BZ=F", "^GSPC", "^DJI", "^IXIC"]
    in_priority = ["^NSEI", "^NSEBANK", "^CNXIT", "^CNXFMCG", "^CNXAUTO", "^CNXMETAL", "^CNXPHARMA", "^BSESN", "RELIANCE.NS", "HDFCBANK.NS", "TCS.NS"]
    
    us_final = us_priority + [s for s in settings.US_SYMBOLS if s not in us_priority]
    in_final = in_priority + [s for s in settings.INDIA_SYMBOLS if s not in in_priority]
    
    return {
        "US": us_final,
        "INDIA": in_final
    }

def get_max_period(interval: str) -> str:
    interval_lower = interval.lower()
    if interval_lower == '1m': return '7d'
    if interval_lower in ['2m', '5m', '15m', '30m']: return '60d'
    if interval_lower in ['1h', '4h']: return '730d'
    return '10y'

@app.get("/api/market/analyze/{symbol}")
def analyze_symbol(symbol: str, interval: str = "1D"):
    period = get_max_period(interval)
    candles = market_data_service.fetch_historical_ohlc(symbol, interval=interval, period=period)
    if not candles:
        return {"symbol": symbol, "data": [], "analysis": None}
        
    # Prevent massive payloads from crashing the UI or creating CORS timeouts
    candles = candles[-1500:]
    
    analysis = ict_engine.analyze(symbol, interval, candles)
    return {
        "symbol": symbol,
        "data": [c.model_dump() for c in candles],
        "analysis": analysis.model_dump() if analysis else None
    }

@app.get("/api/market/ohlc/{symbol}")
def get_historical_data(symbol: str, interval: str = "1D"):
    interval_lower = interval.lower()
    period = get_max_period(interval_lower)
    candles = market_data_service.fetch_historical_ohlc(symbol, interval=interval_lower, period=period)
    return {"symbol": symbol, "data": [c.model_dump() for c in candles[-1500:]]}

def fetch_and_analyze(symbol: str):
    signals = []
    try:
        # Evaluate standard 1D timeframe for baseline signals
        candles_1d = market_data_service.fetch_historical_ohlc(symbol, interval="1D", period="10y")
        if candles_1d:
            analysis_1d = ict_engine.analyze(symbol, "1D", candles_1d)
            if analysis_1d:
                sig_1d = signal_engine.generate_signal(analysis_1d)
                if sig_1d: signals.append(sig_1d)
                
        # Evaluate standard 1W timeframe for macro baseline signals
        candles_1w = market_data_service.fetch_historical_ohlc(symbol, interval="1W", period="10y")
        if candles_1w:
            analysis_1w = ict_engine.analyze(symbol, "1W", candles_1w)
            if analysis_1w:
                sig_1w = signal_engine.generate_signal(analysis_1w)
                if sig_1w: signals.append(sig_1w)
                
        return signals
    except Exception as e:
        logger.error(f"Error analyzing {symbol} in thread: {e}")
        return signals

@app.get("/api/signals/generate/{symbol}")
async def generate_signals(symbol: str):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = await loop.run_in_executor(pool, fetch_and_analyze, symbol)
    active_signals = [r.model_dump() for r in results] if results else []
    return {"signals": active_signals}

@app.get("/api/signals/debug/{symbol}")
async def debug_signal(symbol: str, interval: str = "1D"):
    """Debug endpoint: returns raw ICT analysis + signal scoring breakdown."""
    period = get_max_period(interval)
    loop = asyncio.get_event_loop()
    
    def _debug():
        candles = market_data_service.fetch_historical_ohlc(symbol, interval=interval, period=period)
        if not candles:
            return {"error": "No candle data"}
        analysis = ict_engine.analyze(symbol, interval, candles)
        if not analysis:
            return {"error": "Analysis returned None", "candle_count": len(candles)}
        sig = signal_engine.generate_signal(analysis)
        return {
            "candle_count": len(candles),
            "current_price": analysis.current_price,
            "trend": analysis.trend,
            "total_fvg": len(analysis.fvg),
            "unfilled_fvg": len([f for f in analysis.fvg if not f.filled]),
            "total_ob": len(analysis.orderBlocks),
            "unmitigated_ob": len([o for o in analysis.orderBlocks if not o.mitigated]),
            "bos": analysis.bos.model_dump() if analysis.bos else None,
            "mss": analysis.mss.model_dump() if analysis.mss else None,
            "ema11": analysis.ema11,
            "ema22": analysis.ema22,
            "sma50": analysis.sma50,
            "sma200": analysis.sma200,
            "rsi14": analysis.rsi14,
            "atr14": analysis.atr14,
            "signal": sig.model_dump() if sig else None,
        }
    
    with ThreadPoolExecutor(max_workers=1) as pool:
        result = await loop.run_in_executor(pool, _debug)
    return result

@app.get("/api/scan/nse")
async def scan_nse_stocks(top_n: int = 0):
    """SSE endpoint that streams NSE bulk scan progress and returns top N BUY signals."""
    if bulk_scanner.is_running:
        return StreamingResponse(
            iter([f"data: {json.dumps({'type': 'error', 'message': 'Scan already in progress'})}\n\n"]),
            media_type="text/event-stream",
        )

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _progress_callback(data: dict):
        """Called from the scanner thread — puts events into the async queue."""
        loop.call_soon_threadsafe(queue.put_nowait, data)

    def _run_scan():
        return bulk_scanner.scan_nse(progress_callback=_progress_callback, top_n=top_n)

    async def _event_generator():
        # Start the scan in a background thread
        scan_task = loop.run_in_executor(None, _run_scan)

        while True:
            try:
                # Wait for next progress event (with timeout to detect completion)
                event = await asyncio.wait_for(queue.get(), timeout=2.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") == "complete":
                    break
            except asyncio.TimeoutError:
                # Check if scan is still running
                if not bulk_scanner.is_running:
                    # Drain any remaining events
                    while not queue.empty():
                        event = queue.get_nowait()
                        yield f"data: {json.dumps(event)}\n\n"
                    break
                # Send keepalive
                yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"

        # Ensure the scan task completes
        await scan_task

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@app.get("/api/scan/status")
def scan_status():
    """Check if a scan is currently running and get last results."""
    return {
        "is_running": bulk_scanner.is_running,
        "last_scan_time": bulk_scanner.last_scan_time,
        "last_results_count": len(bulk_scanner.last_results),
    }

@app.get("/api/scan/results")
def scan_results():
    """Get the cached results from the last scan."""
    return {
        "results": bulk_scanner.last_results,
        "scan_time": bulk_scanner.last_scan_time,
    }

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received WS message: {data}")
            try:
                payload = json.loads(data)
                if payload.get("action") == "subscribe":
                    sym = payload.get("symbol")
                    if sym: manager.subscriptions.add(sym)
                elif payload.get("action") == "unsubscribe":
                    sym = payload.get("symbol")
                    if sym in manager.subscriptions: manager.subscriptions.remove(sym)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application - Manual Rest Mode Active")

if __name__ == "__main__":
    is_dev = settings.ENVIRONMENT.lower() == "development"
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=is_dev)
