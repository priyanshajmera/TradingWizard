from pydantic import BaseModel
from typing import Literal, Optional

class FVG(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    top: float
    bottom: float
    formed_at: str      # ISO timestamp
    filled: bool        
    candle_index: int = 0  # Position in the candle array for recency weighting

class OrderBlock(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    high: float
    low: float
    formed_at: str
    strength: Literal['STRONG', 'MODERATE', 'WEAK']
    mitigated: bool                           
    candle_index: int = 0  # Position in the candle array for recency weighting

class BOS(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    broken_level: float
    formed_at: str
    confirmed: bool    

class MSS(BaseModel):
    type: Literal['BULLISH', 'BEARISH']
    shift_level: float
    formed_at: str
    prior_trend: Literal['UPTREND', 'DOWNTREND']


class KeyLevels(BaseModel):
    resistance: list[float]
    support: list[float]

class ICTAnalysis(BaseModel):
    symbol: str
    timeframe: str
    timestamp: str
    fvg: list[FVG]
    orderBlocks: list[OrderBlock]
    bos: Optional[BOS] = None
    mss: Optional[MSS] = None
    trend: Literal['BULLISH', 'BEARISH', 'RANGING']
    keyLevels: KeyLevels
    ema11: float | None = None
    ema22: float | None = None
    sma50: float | None = None
    sma200: float | None = None
    current_price: float = 0.0
    rsi14: float | None = None
    atr14: float | None = None
    total_candles: int = 0  # For recency weighting in signal engine
