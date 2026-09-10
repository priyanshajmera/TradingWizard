from app.models.candle import Candle
from app.models.ict import FVG, OrderBlock, BOS, MSS, ICTAnalysis, KeyLevels

from app.core.logger import logger

class ICTEngine:
    def detect_fvg(self, candles: list[Candle]) -> list[FVG]:
        fvgs = []
        if len(candles) < 3: return fvgs
        
        for i in range(2, len(candles)):
            c1, c2, c3 = candles[i-2], candles[i-1], candles[i]
            
            # Bullish FVG
            if c1.high < c3.low:
                fvgs.append(FVG(
                    type="BULLISH",
                    top=c3.low,
                    bottom=c1.high,
                    formed_at=c2.time,
                    filled=False,
                    candle_index=i
                ))
            # Bearish FVG
            elif c1.low > c3.high:
                fvgs.append(FVG(
                    type="BEARISH",
                    top=c1.low,
                    bottom=c3.high,
                    formed_at=c2.time,
                    filled=False,
                    candle_index=i
                ))
        
        # Post-detection fill check: mark FVGs as filled if subsequent candles
        # have entered the gap zone
        for fvg in fvgs:
            for j in range(fvg.candle_index + 1, len(candles)):
                c = candles[j]
                if fvg.type == "BULLISH":
                    # Bullish FVG is filled if price drops into the gap (low <= top of gap)
                    if c.low <= fvg.bottom:
                        fvg.filled = True
                        break
                else:
                    # Bearish FVG is filled if price rises into the gap (high >= bottom of gap)
                    if c.high >= fvg.top:
                        fvg.filled = True
                        break
        
        return fvgs

    def detect_ob(self, candles: list[Candle]) -> list[OrderBlock]:
        obs = []
        if len(candles) < 3: return obs
        
        for i in range(1, len(candles) - 1):
            c1 = candles[i]
            c2 = candles[i+1]
            
            body1 = abs(c1.close - c1.open)
            body2 = abs(c2.close - c2.open)
            
            # Require the breakout candle to be larger than the OB base candle
            if body2 > body1 * 1.2:
                # Bullish OB (Down candle before strong up move)
                if c1.close < c1.open and c2.close > c2.open and c2.close > c1.high:
                    obs.append(OrderBlock(
                        type="BULLISH",
                        high=c1.high,
                        low=c1.low,
                        strength="STRONG",
                        formed_at=c1.time,
                        mitigated=False,
                        candle_index=i
                    ))
                # Bearish OB (Up candle before strong down move)
                elif c1.close > c1.open and c2.close < c2.open and c2.close < c1.low:
                    obs.append(OrderBlock(
                        type="BEARISH",
                        high=c1.high,
                        low=c1.low,
                        strength="STRONG",
                        formed_at=c1.time,
                        mitigated=False,
                        candle_index=i
                    ))
        
        # Post-detection mitigation check: mark OBs as mitigated if subsequent 
        # candles have returned into the OB zone
        for ob in obs:
            for j in range(ob.candle_index + 2, len(candles)):
                c = candles[j]
                if ob.type == "BULLISH":
                    # Bullish OB is mitigated if price drops back into the zone
                    if c.low <= ob.high and c.low >= ob.low:
                        ob.mitigated = True
                        break
                else:
                    # Bearish OB is mitigated if price rises back into the zone
                    if c.high >= ob.low and c.high <= ob.high:
                        ob.mitigated = True
                        break
        
        return obs

    def detect_bos(self, candles: list[Candle]) -> BOS | None:
        if len(candles) < 15: return None
        
        recent = candles[-15:-1]
        highest_candle = max(recent, key=lambda c: c.high)
        lowest_candle = min(recent, key=lambda c: c.low)
        
        current = candles[-1]
        
        if current.close > highest_candle.high:
            return BOS(type="BULLISH", broken_level=highest_candle.high, formed_at=current.time, confirmed=True)
        elif current.close < lowest_candle.low:
            return BOS(type="BEARISH", broken_level=lowest_candle.low, formed_at=current.time, confirmed=True)
        
        return None

    def _find_swing_points(self, candles: list[Candle], window: int = 5):
        """Find swing highs and swing lows for MSS detection."""
        swing_highs = []  # (index, price)
        swing_lows = []   # (index, price)
        
        for i in range(window, len(candles) - window):
            is_high = True
            is_low = True
            for j in range(1, window + 1):
                if candles[i].high <= candles[i-j].high or candles[i].high <= candles[i+j].high:
                    is_high = False
                if candles[i].low >= candles[i-j].low or candles[i].low >= candles[i+j].low:
                    is_low = False
            if is_high:
                swing_highs.append((i, candles[i].high))
            if is_low:
                swing_lows.append((i, candles[i].low))
        
        return swing_highs, swing_lows

    def detect_mss(self, candles: list[Candle]) -> MSS | None:
        """Detect Market Structure Shift — the first break against the prevailing trend."""
        if len(candles) < 30: return None
        
        # Use the last 50 candles for structure analysis
        recent = candles[-50:] if len(candles) >= 50 else candles
        swing_highs, swing_lows = self._find_swing_points(recent, window=3)
        
        if len(swing_highs) < 2 or len(swing_lows) < 2:
            return None
        
        current = recent[-1]
        
        # Detect downtrend: series of lower highs and lower lows
        last_two_highs = swing_highs[-2:]
        last_two_lows = swing_lows[-2:]
        
        is_downtrend = (last_two_highs[1][1] < last_two_highs[0][1] and 
                        last_two_lows[1][1] < last_two_lows[0][1])
        is_uptrend = (last_two_highs[1][1] > last_two_highs[0][1] and 
                      last_two_lows[1][1] > last_two_lows[0][1])
        
        if is_downtrend:
            # Bullish MSS: price breaks above the last swing high in a downtrend
            last_swing_high = swing_highs[-1][1]
            if current.close > last_swing_high:
                return MSS(
                    type="BULLISH",
                    shift_level=last_swing_high,
                    formed_at=current.time,
                    prior_trend="DOWNTREND"
                )
        
        if is_uptrend:
            # Bearish MSS: price breaks below the last swing low in an uptrend
            last_swing_low = swing_lows[-1][1]
            if current.close < last_swing_low:
                return MSS(
                    type="BEARISH",
                    shift_level=last_swing_low,
                    formed_at=current.time,
                    prior_trend="UPTREND"
                )
        
        return None

    def find_key_levels(self, candles: list[Candle], current_price: float) -> KeyLevels:
        if len(candles) < 20: 
            return KeyLevels(resistance=[], support=[])
            
        recent = candles[-200:]
        highs, lows = [], []
        window = 5
        
        # Extrapolate unfiltered historical peak arrays 
        for i in range(window, len(recent) - window):
            is_high, is_low = True, True
            for j in range(1, window + 1):
                if recent[i].high <= recent[i-j].high or recent[i].high <= recent[i+j].high: 
                    is_high = False
                if recent[i].low >= recent[i-j].low or recent[i].low >= recent[i+j].low: 
                    is_low = False
            if is_high: highs.append(recent[i].high)
            if is_low: lows.append(recent[i].low)
            
        # Mathematical grouping proximity algorithm locating multiple rejected touches
        def cluster_pivots(pivots: list[float], threshold=0.005) -> list[float]:
            clusters = []
            for p in sorted(pivots):
                if not clusters:
                    clusters.append([p])
                else:
                    ref = sum(clusters[-1]) / len(clusters[-1])
                    if abs(p - ref) / ref <= threshold:
                        clusters[-1].append(p)
                    else:
                        clusters.append([p])
            return [sum(c) / len(c) for c in clusters if len(c) > 1]
            
        res_clusters = cluster_pivots(highs)
        sup_clusters = cluster_pivots(lows)
        
        # Truncate lists to the 2 boundaries strictly bounding price action protecting visibility limits
        res_above = sorted([r for r in res_clusters if r > current_price])[:2]
        sup_below = sorted([s for s in sup_clusters if s < current_price], reverse=True)[:2]
        
        return KeyLevels(resistance=res_above, support=sup_below)

    def analyze(self, symbol: str, timeframe: str, candles: list[Candle]) -> ICTAnalysis | None:
        if len(candles) < 30:
            return None
            
        try:
            fvgs = self.detect_fvg(candles)
            obs = self.detect_ob(candles)
            bos = self.detect_bos(candles)
            mss = self.detect_mss(candles)
            

            trend = "RANGING"
            last_c = candles[-1]
            if last_c.ema11 and last_c.ema22 and last_c.sma50 and last_c.sma200:
                if last_c.close > last_c.ema11 > last_c.ema22 > last_c.sma50 > last_c.sma200:
                    trend = "BULLISH"
                elif last_c.close < last_c.ema11 < last_c.ema22 < last_c.sma50 < last_c.sma200:
                    trend = "BEARISH"
            
            return ICTAnalysis(
                symbol=symbol,
                timeframe=timeframe,
                timestamp=candles[-1].time,
                fvg=fvgs,
                orderBlocks=obs,
                bos=bos,
                mss=mss,
                trend=trend,
                keyLevels=self.find_key_levels(candles, last_c.close),
                ema11=last_c.ema11,
                ema22=last_c.ema22,
                sma50=last_c.sma50,
                sma200=last_c.sma200,
                current_price=last_c.close,
                rsi14=last_c.rsi14,
                atr14=last_c.atr14,
                total_candles=len(candles),
            )
        except Exception as e:
            logger.error(f"ICT Engine error for {symbol}: {e}")
            return None

ict_engine = ICTEngine()
