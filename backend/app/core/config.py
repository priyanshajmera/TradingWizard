import os
import json
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ICT Trading Intelligence System"
    # Baseline fallback arrays
    US_SYMBOLS: list[str] = ["AAPL", "MSFT", "TSLA", "NVDA", "SPY"]
    INDIA_SYMBOLS: list[str] = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Attempt to load thousands of dynamically retrieved tickers from internal DB
        db_path = os.path.join(os.path.dirname(__file__), 'symbols.json')
        if os.path.exists(db_path):
            with open(db_path, 'r') as f:
                data = json.load(f)
                self.US_SYMBOLS = data.get("US", self.US_SYMBOLS)
                self.INDIA_SYMBOLS = data.get("INDIA", self.INDIA_SYMBOLS)

    class Config:
        env_file = ".env"

settings = Settings()
