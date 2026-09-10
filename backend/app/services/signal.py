import uuid
from app.models.ict import ICTAnalysis
from app.models.signal import Signal
from app.core.logger import logger


class SignalEngine:
    """
    Directional scoring signal engine.
    
    Instead of a single signed score where bull/bear cancel each other,
    we maintain separate bull_score and bear_score. Only ICT structures
    that are NEAR the current price and RECENT contribute to scoring.
    A clear directional dominance is required to emit BUY or SELL.
    """

    # ── Proximity filter ──────────────────────────────────────────────
    @staticmethod
    def _is_near_price(zone_high: float, zone_low: float, price: float, atr: float | None) -> bool:
        """Check if an ICT zone is close enough to current price to be relevant."""
        if price <= 0:
            return False
        threshold = max(atr * 2.5, price * 0.04) if atr and atr > 0 else price * 0.04
        zone_mid = (zone_high + zone_low) / 2
        return abs(zone_mid - price) <= threshold

    # ── Recency weight ────────────────────────────────────────────────
    @staticmethod
    def _recency_weight(candle_index: int, total_candles: int) -> float:
        """
        Structures near the end of the dataset get full weight,
        older structures get progressively less.
        """
        if total_candles <= 0:
            return 1.0
        age = total_candles - candle_index
        if age <= 10:
            return 1.0
        elif age <= 30:
            return 0.7
        elif age <= 60:
            return 0.4
        else:
            return 0.2

    # ── Main scoring method ───────────────────────────────────────────
    def generate_signal(self, analysis: ICTAnalysis) -> Signal | None:
        # Need at least some ICT structures to work with
        if not analysis.fvg and not analysis.orderBlocks and not analysis.bos and not analysis.mss:
            return None

        price = analysis.current_price
        atr = analysis.atr14
        total = analysis.total_candles

        bull_score = 0
        bear_score = 0
        bull_reasons = []
        bear_reasons = []

        # ─── 1. Moving Average / Trend Alignment (max 15 per direction) ───
        if analysis.ema11 and analysis.ema22 and analysis.sma50 and analysis.sma200:
            if analysis.ema11 > analysis.ema22 > analysis.sma50 > analysis.sma200:
                bull_score += 15
                bull_reasons.append("Golden MA Stack")
            elif analysis.ema11 < analysis.ema22 < analysis.sma50 < analysis.sma200:
                bear_score += 15
                bear_reasons.append("Death MA Stack")
            elif analysis.sma50 and analysis.sma200:
                if analysis.sma50 > analysis.sma200:
                    bull_score += 8
                    bull_reasons.append("Bullish Base MAs")
                elif analysis.sma50 < analysis.sma200:
                    bear_score += 8
                    bear_reasons.append("Bearish Base MAs")

        # ─── 2. Break of Structure (max 20 per direction) ─────────────────
        if analysis.bos:
            if analysis.bos.type == "BULLISH" and analysis.bos.confirmed:
                bull_score += 20
                bull_reasons.append("Bullish BOS")
            elif analysis.bos.type == "BEARISH" and analysis.bos.confirmed:
                bear_score += 20
                bear_reasons.append("Bearish BOS")

        # ─── 3. Market Structure Shift (max 15 per direction) ─────────────
        if analysis.mss:
            if analysis.mss.type == "BULLISH":
                bull_score += 15
                bull_reasons.append("Bullish MSS")
            elif analysis.mss.type == "BEARISH":
                bear_score += 15
                bear_reasons.append("Bearish MSS")

        # ─── 4. FVGs — proximity filtered & recency weighted (max 25) ─────
        nearby_bull_fvg = 0
        nearby_bear_fvg = 0
        for fvg in analysis.fvg:
            if fvg.filled:
                continue  # Only unfilled FVGs matter
            if not self._is_near_price(fvg.top, fvg.bottom, price, atr):
                continue  # Too far from current price
            weight = self._recency_weight(fvg.candle_index, total)
            if fvg.type == "BULLISH":
                bull_score += int(min(15, 15 * weight))
                nearby_bull_fvg += 1
            else:
                bear_score += int(min(15, 15 * weight))
                nearby_bear_fvg += 1

        # Cap FVG contribution at 25
        if nearby_bull_fvg > 0:
            bull_reasons.append(f"Bullish FVGs ({nearby_bull_fvg})")
        if nearby_bear_fvg > 0:
            bear_reasons.append(f"Bearish FVGs ({nearby_bear_fvg})")

        # ─── 5. Order Blocks — proximity filtered & recency weighted (max 25) ──
        nearby_bull_ob = 0
        nearby_bear_ob = 0
        for ob in analysis.orderBlocks:
            if ob.mitigated:
                continue  # Only unmitigated OBs matter
            if not self._is_near_price(ob.high, ob.low, price, atr):
                continue  # Too far from current price
            weight = self._recency_weight(ob.candle_index, total)
            if ob.type == "BULLISH":
                bull_score += int(min(20, 20 * weight))
                nearby_bull_ob += 1
            else:
                bear_score += int(min(20, 20 * weight))
                nearby_bear_ob += 1

        if nearby_bull_ob > 0:
            bull_reasons.append(f"Bullish OBs ({nearby_bull_ob})")
        if nearby_bear_ob > 0:
            bear_reasons.append(f"Bearish OBs ({nearby_bear_ob})")


        # ─── 7. Directional Decision ──────────────────────────────────────
        dominance = max(bull_score, bear_score)
        minority = min(bull_score, bear_score)

        signal_type = "NEUTRAL"
        reasons = []

        # Require clear directional dominance:
        #   - Dominant side >= 30 points
        #   - At least 1.8:1 ratio over the minority side
        if dominance >= 30 and (minority == 0 or dominance / max(minority, 1) >= 1.8):
            if bull_score > bear_score:
                signal_type = "BUY"
                reasons = bull_reasons
            else:
                signal_type = "SELL"
                reasons = bear_reasons
        else:
            # Merge both reason lists for transparency in NEUTRAL
            reasons = bull_reasons + bear_reasons
            if not reasons:
                reasons = ["No directional confluence"]

        # ─── 8. Confidence Mapping ────────────────────────────────────────
        # Normalize the dominant score (theoretical max ~95)
        MAX_POSSIBLE = 95
        confidence = min(100, int((dominance / MAX_POSSIBLE) * 100))

        # Penalize if minority score is significant (mixed signals reduce confidence)
        if minority > 0 and dominance > 0:
            conflict_penalty = int((minority / dominance) * 25)
            confidence = max(10, confidence - conflict_penalty)

        # Determine strength
        strength = "LOW"
        if confidence >= 75:
            strength = "HIGH"
        elif confidence >= 50:
            strength = "MODERATE"

        # ─── 9. RSI Gate ──────────────────────────────────────────────────
        if analysis.rsi14:
            if signal_type == "BUY" and analysis.rsi14 > 75:
                reasons.append(f"⚠ Overbought RSI ({int(analysis.rsi14)})")
                signal_type = "NEUTRAL"
            elif signal_type == "SELL" and analysis.rsi14 < 25:
                reasons.append(f"⚠ Oversold RSI ({int(analysis.rsi14)})")
                signal_type = "NEUTRAL"

        # ─── 10. ATR Dynamic Risk Calculation (1:3 R:R) ──────────────────
        entry = price
        stopLoss = 0.0
        target = 0.0
        riskReward = 3.0

        if signal_type != "NEUTRAL" and atr and atr > 0:
            if signal_type == "BUY":
                stopLoss = entry - (atr * 1.0)
                target = entry + (atr * 3.0)
            elif signal_type == "SELL":
                stopLoss = entry + (atr * 1.0)
                target = entry - (atr * 3.0)

        try:
            return Signal(
                id=str(uuid.uuid4()),
                symbol=analysis.symbol,
                signal=signal_type,
                type="INTRADAY",
                confidence=int(confidence),
                strength=strength,
                reasons=reasons,
                entry=entry,
                stopLoss=stopLoss,
                target=target,
                riskReward=riskReward,
                timeframe=analysis.timeframe,
                timestamp=analysis.timestamp,
                expiry="",
                ema11=analysis.ema11,
                ema22=analysis.ema22,
                sma50=analysis.sma50,
                sma200=analysis.sma200,
                bull_score=bull_score,
                bear_score=bear_score,
            )
        except Exception as e:
            logger.error(f"Error generating signal: {e}")
            return None

signal_engine = SignalEngine()
