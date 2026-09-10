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
    entry: float             
    stopLoss: float          
    target: float            
    riskReward: float        
    timeframe: str
    timestamp: str
    expiry: str            
    ema11: float | None = None
    ema22: float | None = None
    sma50: float | None = None
    sma200: float | None = None
    # Debug / transparency fields
    bull_score: int = 0
    bear_score: int = 0
