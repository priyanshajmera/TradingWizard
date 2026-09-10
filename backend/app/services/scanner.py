import yfinance as yf
import pandas as pd
import numpy as np
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Any

from app.models.candle import Candle
from app.models.signal import Signal
from app.services.ict import ict_engine
from app.services.signal import signal_engine
from app.core.config import settings
from app.core.logger import logger


class BulkScanner:
    """
    Scans all NSE India stocks in batches using yf.download() for speed,
    runs ICT + Signal analysis on each, and returns the top N strongest
    BUY candidates ranked by bull_score then confidence.
    """

    BATCH_SIZE = 50
    MIN_CANDLES = 200        # Need enough data for SMA200
    MIN_PRICE = 10.0         # Filter penny stocks
    MIN_AVG_VOLUME = 30000   # Filter illiquid stocks
    INTER_BATCH_DELAY = 1.0  # Seconds between batches to avoid rate limiting

    def __init__(self):
        self.is_running = False
        self.last_results: list[dict] = []
        self.last_scan_time: str = ""

    def _compute_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute EMA11, EMA22, SMA50, SMA200, RSI14, ATR14 on a single-ticker DataFrame."""
        if df.empty or len(df) < 30:
            return df

        df = df.copy()

        # EMA / SMA
        df['EMA11'] = df['Close'].ewm(span=11, adjust=False).mean()
        df['EMA22'] = df['Close'].ewm(span=22, adjust=False).mean()
        df['SMA50'] = df['Close'].rolling(window=50).mean()
        df['SMA200'] = df['Close'].rolling(window=200).mean()

        # RSI 14
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI14'] = 100 - (100 / (1 + rs))

        # ATR 14
        high_low = df['High'] - df['Low']
        high_close = (df['High'] - df['Close'].shift()).abs()
        low_close = (df['Low'] - df['Close'].shift()).abs()
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        df['ATR14'] = true_range.rolling(window=14).mean()

        df = df.replace({np.nan: None})
        return df

    def _df_to_candles(self, df: pd.DataFrame, symbol: str) -> list[Candle]:
        """Convert a pandas DataFrame to a list of Candle objects."""
        candles = []
        for index, row in df.iterrows():
            try:
                vol = row.get('Volume', 0)
                if vol is None or (isinstance(vol, float) and np.isnan(vol)):
                    vol = 0

                candle = Candle(
                    symbol=symbol,
                    timeframe="1D",
                    time=str(index),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(vol),
                    ema11=None if pd.isna(row.get('EMA11')) else float(row['EMA11']),
                    ema22=None if pd.isna(row.get('EMA22')) else float(row['EMA22']),
                    sma50=None if pd.isna(row.get('SMA50')) else float(row['SMA50']),
                    sma200=None if pd.isna(row.get('SMA200')) else float(row['SMA200']),
                    rsi14=None if pd.isna(row.get('RSI14')) else float(row['RSI14']),
                    atr14=None if pd.isna(row.get('ATR14')) else float(row['ATR14']),
                )
                candles.append(candle)
            except Exception:
                continue
        return candles

    def _analyze_single(self, symbol: str, candles: list[Candle]) -> Signal | None:
        """Run ICT + Signal analysis on a single ticker's candle data."""
        try:
            if len(candles) < self.MIN_CANDLES:
                return None

            last = candles[-1]

            # Price filter
            if last.close < self.MIN_PRICE:
                return None

            # Volume filter — average last 20 days
            recent_vols = [c.volume for c in candles[-20:] if c.volume > 0]
            if recent_vols and (sum(recent_vols) / len(recent_vols)) < self.MIN_AVG_VOLUME:
                return None

            # RSI momentum filter — only keep stocks with RSI above 45
            if last.rsi14 is not None and last.rsi14 < 45:
                return None

            analysis = ict_engine.analyze(symbol, "1D", candles)
            if not analysis:
                return None

            sig = signal_engine.generate_signal(analysis)
            return sig
        except Exception as e:
            logger.debug(f"Scanner: error analyzing {symbol}: {e}")
            return None

    def scan_nse(self, progress_callback: Callable[[dict], Any] | None = None, top_n: int = 0) -> list[dict]:
        """
        Scan all NSE India stocks and return the top N strongest BUY signals.
        
        Args:
            progress_callback: Called with progress dicts during scan
            top_n: Number of top results to return (0 = all)
            
        Returns:
            List of Signal dicts sorted by bull_score DESC, confidence DESC
        """
        if self.is_running:
            return []

        self.is_running = True
        start_time = time.time()
        all_symbols = settings.INDIA_SYMBOLS[:]
        total = len(all_symbols)
        buy_signals: list[Signal] = []
        scanned = 0
        errors = 0

        logger.info(f"NSE Bulk Scanner: Starting scan of {total} symbols")

        # Split into batches
        batches = [all_symbols[i:i + self.BATCH_SIZE] for i in range(0, total, self.BATCH_SIZE)]
        total_batches = len(batches)

        try:
            for batch_idx, batch in enumerate(batches):
                batch_start = time.time()

                try:
                    # Download all tickers in this batch at once
                    tickers_str = " ".join(batch)
                    raw = yf.download(
                        tickers_str,
                        period="2y",
                        interval="1d",
                        group_by="ticker",
                        progress=False,
                        threads=True,
                        auto_adjust=True,
                    )
                except Exception as e:
                    logger.error(f"Scanner: batch {batch_idx+1} download failed: {e}")
                    scanned += len(batch)
                    errors += len(batch)
                    continue

                # Process each ticker in the batch
                batch_signals: list[Signal] = []

                def _process_ticker(sym: str) -> Signal | None:
                    try:
                        # Extract single ticker data from grouped DataFrame
                        if len(batch) == 1:
                            ticker_df = raw.copy()
                        else:
                            if sym not in raw.columns.get_level_values(0):
                                return None
                            ticker_df = raw[sym].copy()

                        # Drop NaN rows (holidays, missing data)
                        ticker_df = ticker_df.dropna(subset=['Close'])
                        if ticker_df.empty or len(ticker_df) < self.MIN_CANDLES:
                            return None

                        # Compute indicators
                        ticker_df = self._compute_indicators(ticker_df)
                        candles = self._df_to_candles(ticker_df, sym)

                        if len(candles) < self.MIN_CANDLES:
                            return None

                        return self._analyze_single(sym, candles)
                    except Exception as e:
                        logger.debug(f"Scanner: error processing {sym}: {e}")
                        return None

                # Run analysis concurrently within the batch
                with ThreadPoolExecutor(max_workers=8) as pool:
                    futures = {pool.submit(_process_ticker, sym): sym for sym in batch}
                    for future in as_completed(futures):
                        sym = futures[future]
                        try:
                            sig = future.result()
                            if sig and sig.signal == "BUY":
                                batch_signals.append(sig)
                        except Exception as e:
                            errors += 1
                            logger.debug(f"Scanner: future error for {sym}: {e}")

                buy_signals.extend(batch_signals)
                scanned += len(batch)

                # Sort current results to show best so far
                buy_signals.sort(key=lambda s: (s.bull_score, s.confidence), reverse=True)

                batch_duration = time.time() - batch_start

                # Send progress update
                if progress_callback:
                    # Include the current top candidate from this batch
                    top_from_batch = None
                    if batch_signals:
                        best = max(batch_signals, key=lambda s: (s.bull_score, s.confidence))
                        top_from_batch = best.model_dump()

                    progress_callback({
                        "type": "progress",
                        "scanned": scanned,
                        "total": total,
                        "batch": batch_idx + 1,
                        "total_batches": total_batches,
                        "buys_found": len(buy_signals),
                        "errors": errors,
                        "batch_duration": round(batch_duration, 1),
                        "new_candidate": top_from_batch,
                    })

                # Rate limit delay between batches
                if batch_idx < total_batches - 1:
                    time.sleep(self.INTER_BATCH_DELAY)

        except Exception as e:
            logger.error(f"Scanner: critical error: {e}")
        finally:
            self.is_running = False

        # Final sort and take top N
        buy_signals.sort(key=lambda s: (s.bull_score, s.confidence), reverse=True)
        top_results = [s.model_dump() for s in (buy_signals[:top_n] if top_n > 0 else buy_signals)]

        duration = round(time.time() - start_time, 1)
        self.last_results = top_results
        self.last_scan_time = time.strftime("%Y-%m-%dT%H:%M:%S")

        logger.info(
            f"NSE Bulk Scanner: Complete. Scanned {scanned}/{total}, "
            f"found {len(buy_signals)} BUY signals, top {len(top_results)} returned. "
            f"Duration: {duration}s, Errors: {errors}"
        )

        # Send completion event
        if progress_callback:
            progress_callback({
                "type": "complete",
                "top10": top_results,
                "total_scanned": scanned,
                "total_buys": len(buy_signals),
                "duration_seconds": duration,
                "errors": errors,
            })

        return top_results


bulk_scanner = BulkScanner()
