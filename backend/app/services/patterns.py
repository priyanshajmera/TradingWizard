from app.models.candle import Candle
from app.models.ict import ChartPattern
from app.core.logger import logger

class PatternScanner:
    def find_pivots(self, candles: list[Candle], window: int = 5):
        highs = []
        lows = []
        n = len(candles)
        
        for i in range(window, n - window):
            is_high = True
            is_low = True
            
            for j in range(1, window + 1):
                if candles[i].high <= candles[i-j].high or candles[i].high <= candles[i+j].high:
                    is_high = False
                if candles[i].low >= candles[i-j].low or candles[i].low >= candles[i+j].low:
                    is_low = False
                    
            if is_high: 
                highs.append(candles[i])
            if is_low: 
                lows.append(candles[i])
            
        return highs, lows

    def scan(self, candles: list[Candle]) -> list[ChartPattern]:
        patterns = []
        if len(candles) < 30: 
            return patterns
            
        # Optimize scanner footprint parsing the trailing bounds
        recent_candles = candles[-200:]
        highs, lows = self.find_pivots(recent_candles, window=5)
        
        if not highs or not lows:
            return patterns
            
        current_price = recent_candles[-1].close
        
        # 1. Double Top (Bearish) Matrix
        if len(highs) >= 2:
            last_two_highs = highs[-2:]
            h1, h2 = last_two_highs[0], last_two_highs[1]
            diff = abs(h1.high - h2.high) / max(h1.high, h2.high)
            
            if diff < 0.015:
                middle_lows = [l for l in lows if h1.time < l.time < h2.time]
                if middle_lows:
                    neckline = min(middle_lows, key=lambda x: x.low).low
                    status = "CONFIRMED" if current_price < neckline else "FORMING"
                    patterns.append(ChartPattern(
                        name="DOUBLE_TOP",
                        type="BEARISH",
                        status=status,
                        start_time=h1.time,
                        end_time=h2.time,
                        price_level=h1.high
                    ))
                    
        # 2. Double Bottom (Bullish) Matrix
        if len(lows) >= 2:
            last_two_lows = lows[-2:]
            l1, l2 = last_two_lows[0], last_two_lows[1]
            diff = abs(l1.low - l2.low) / max(l1.low, l2.low)
            
            if diff < 0.015:
                middle_highs = [h for h in highs if l1.time < h.time < l2.time]
                if middle_highs:
                    neckline = max(middle_highs, key=lambda x: x.high).high
                    status = "CONFIRMED" if current_price > neckline else "FORMING"
                    patterns.append(ChartPattern(
                        name="DOUBLE_BOTTOM",
                        type="BULLISH",
                        status=status,
                        start_time=l1.time,
                        end_time=l2.time,
                        price_level=l1.low
                    ))

        # 3. Head & Shoulders (Bearish) Matrix
        if len(highs) >= 3:
            ls, head, rs = highs[-3], highs[-2], highs[-1]
            if head.high > ls.high and head.high > rs.high:
                diff = abs(ls.high - rs.high) / max(ls.high, rs.high)
                if diff < 0.03:
                    patterns.append(ChartPattern(
                        name="HEAD_AND_SHOULDERS",
                        type="BEARISH",
                        status="FORMING",
                        start_time=ls.time,
                        end_time=rs.time,
                        price_level=head.high
                    ))

        # 4. Inverse H&S (Bullish) Matrix
        if len(lows) >= 3:
            ls, head, rs = lows[-3], lows[-2], lows[-1]
            if head.low < ls.low and head.low < rs.low:
                diff = abs(ls.low - rs.low) / max(ls.low, rs.low)
                if diff < 0.03:
                    patterns.append(ChartPattern(
                        name="INV_HEAD_AND_SHOULDERS",
                        type="BULLISH",
                        status="FORMING",
                        start_time=ls.time,
                        end_time=rs.time,
                        price_level=head.low
                    ))

        return patterns

pattern_scanner = PatternScanner()
