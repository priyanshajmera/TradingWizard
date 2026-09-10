from pydantic import BaseModel
from typing import Optional
from typing import Literal

class Tick(BaseModel):
    symbol: str
    last_price: float
    volume: int
    timestamp: str # ISO 8601

class Candle(BaseModel):
    symbol: str
    timeframe: Literal['1m', '2m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M']
    time: str       # ISO 8601
    open: float
    high: float
    low: float
    close: float
    volume: int
    ema11: Optional[float] = None
    ema22: Optional[float] = None
    sma50: Optional[float] = None
    sma200: Optional[float] = None
    rsi14: Optional[float] = None
    atr14: Optional[float] = None
