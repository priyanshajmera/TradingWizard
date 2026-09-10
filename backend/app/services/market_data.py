import yfinance as yf
import math
import pandas as pd
import numpy as np
from app.models.candle import Candle
from app.core.logger import logger

class MarketDataService:
    def fetch_historical_ohlc(self, symbol: str, interval: str = "5m", period: str = "5d") -> list[Candle]:
        try:
            logger.info(f"Fetching historical data for {symbol} (interval: {interval}, period: {period})")
            ticker = yf.Ticker(symbol)
            yf_interval = interval.lower()
            resample_4h = False
            if interval == '1M':
                yf_interval = '1mo'
            elif yf_interval == '1w':
                yf_interval = '1wk'
            elif yf_interval == '4h':
                yf_interval = '1h'
                resample_4h = True
                
            df = ticker.history(period=period, interval=yf_interval)
            
            # Resample 1h data to 4h candles if requested
            if resample_4h and not df.empty:
                df = df.resample('4h').agg({
                    'Open': 'first',
                    'High': 'max',
                    'Low': 'min',
                    'Close': 'last',
                    'Volume': 'sum',
                }).dropna(subset=['Open'])
            
            # yfinance often returns NaN data rows for holidays or suspended stocks
            df.dropna(inplace=True)
            
            # Compute core technical        # EMA/SMA Calculations
            df['EMA11'] = df['Close'].ewm(span=11, adjust=False).mean()
            df['EMA22'] = df['Close'].ewm(span=22, adjust=False).mean()
            df['SMA50'] = df['Close'].rolling(window=50).mean()
            df['SMA200'] = df['Close'].rolling(window=200).mean()

            # RSI Calculation (14 periods) tracking momentum
            delta = df['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['RSI14'] = 100 - (100 / (1 + rs))

            # ATR Calculation (14 periods) tracking real-time volatility bounds
            high_low = df['High'] - df['Low']
            high_close = (df['High'] - df['Close'].shift()).abs()
            low_close = (df['Low'] - df['Close'].shift()).abs()
            ranges = pd.concat([high_low, high_close, low_close], axis=1)
            true_range = ranges.max(axis=1)
            df['ATR14'] = true_range.rolling(window=14).mean()

            # Clean NaN outputs masking initialization bars
            df = df.replace({np.nan: None})
            
            if df.empty:
                logger.warning(f"No data returned for {symbol}")
                return []
                
            candles = []
            for index, row in df.iterrows():
                # Avoid timezone issues with different formats, force cast to ISO string
                candle = Candle(
                    symbol=symbol,
                    timeframe=interval,
                    time=str(index),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume']),
                    ema11=None if pd.isna(row.get('EMA11')) else float(row['EMA11']),
                    ema22=None if pd.isna(row.get('EMA22')) else float(row['EMA22']),
                    sma50=None if pd.isna(row.get('SMA50')) else float(row['SMA50']),
                    sma200=None if pd.isna(row.get('SMA200')) else float(row['SMA200']),
                    rsi14=None if pd.isna(row.get('RSI14')) else float(row['RSI14']),
                    atr14=None if pd.isna(row.get('ATR14')) else float(row['ATR14'])
                )
                candles.append(candle)
                
            return candles
            
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return []

    def get_latest_candle(self, symbol: str, timeframe: str = "5m") -> Candle | None:
        candles = self.fetch_historical_ohlc(symbol, interval=timeframe, period="1d")
        if candles:
            return candles[-1]
        return None

market_data_service = MarketDataService()
