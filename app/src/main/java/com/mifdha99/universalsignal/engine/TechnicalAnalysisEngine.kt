package com.mifdha99.universalsignal.engine

import com.mifdha99.universalsignal.data.model.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max

object TechnicalAnalysisEngine {

    const val MINIMUM_REQUIRED_CANDLES = 60

    /**
     * Executes multi-indicator confluence quantitative analysis on historical candles.
     */
    fun analyze(
        candles: List<Candle>,
        instrument: AssetInstrument,
        timeframe: Timeframe,
        providerName: String
    ): SignalResult {
        if (candles.size < MINIMUM_REQUIRED_CANDLES) {
            val now = SimpleDateFormat("HH:mm:ss dd-MM-yyyy", Locale.getDefault()).format(Date())
            return SignalResult(
                side = "WAIT",
                price = candles.lastOrNull()?.close ?: 0.0,
                change24h = 0.0,
                volume = 0.0,
                rsi = 50.0,
                ema9 = 0.0,
                ema21 = 0.0,
                ema50 = 0.0,
                macdLine = 0.0,
                signalLine = 0.0,
                macdHist = 0.0,
                atr14 = 0.0,
                reason = "Data historis tidak mencukupi (${candles.size} candle didapat, minimal $MINIMUM_REQUIRED_CANDLES diperlukan untuk kalkulasi indikator yang stabil). Sinyal dinonaktifkan.",
                confidenceScore = 0,
                dataStatus = DataStatus.INCOMPLETE,
                time = now,
                timestamp = System.currentTimeMillis(),
                symbol = instrument.symbol,
                timeframe = timeframe.label,
                provider = providerName
            )
        }

        val closes = candles.map { it.close }
        val highs = candles.map { it.high }
        val lows = candles.map { it.low }

        // Indicator Calculations
        val ema9Series = calculateEmaSeries(closes, 9)
        val ema21Series = calculateEmaSeries(closes, 21)
        val ema50Series = calculateEmaSeries(closes, 50)

        val ema9 = ema9Series.last()
        val ema21 = ema21Series.last()
        val ema50 = ema50Series.last()

        val rsi14 = calculateRsi(closes, 14)

        // MACD (12, 26, 9)
        val ema12Series = calculateEmaSeries(closes, 12)
        val ema26Series = calculateEmaSeries(closes, 26)
        val macdLineSeries = ArrayList<Double>(closes.size)
        for (i in closes.indices) {
            macdLineSeries.add(ema12Series[i] - ema26Series[i])
        }
        val signalLineSeries = calculateEmaSeries(macdLineSeries, 9)

        val macdLine = macdLineSeries.last()
        val signalLine = signalLineSeries.last()
        val macdHist = macdLine - signalLine

        // ATR (14)
        val atr14 = calculateAtr(highs, lows, closes, 14)

        // Price Dynamics
        val currentPrice = closes.last()
        val priorPrice = closes[closes.lastIndex - 1]
        val priceChange = currentPrice - priorPrice
        val momentumUp = priceChange > 0

        // 24-Period / Session Change
        val sessionStartIndex = max(0, closes.size - 24)
        val sessionStartPrice = closes[sessionStartIndex]
        val change24hPercent = if (sessionStartPrice > 0) ((currentPrice - sessionStartPrice) / sessionStartPrice) * 100.0 else 0.0
        val totalVolume = candles.takeLast(24).sumOf { it.volume }

        // Confluence Evaluation
        val (side, confidence, reason) = evaluateConfluence(
            currentPrice = currentPrice,
            ema9 = ema9,
            ema21 = ema21,
            ema50 = ema50,
            rsi = rsi14,
            macdHist = macdHist,
            atr = atr14,
            momentumUp = momentumUp
        )

        val dataStatus = if (instrument.isDelayed) DataStatus.DELAYED else DataStatus.VALID
        val now = SimpleDateFormat("HH:mm:ss dd-MM-yyyy", Locale.getDefault()).format(Date())

        // Calculate Stop Loss & Take Profit levels for valid BUY/SELL signals
        val tradePlan = calculateTradePlan(
            side = side,
            entryPrice = currentPrice,
            atr = atr14,
            candles = candles,
            symbol = instrument.symbol
        )

        return SignalResult(
            side = side,
            price = currentPrice,
            change24h = change24hPercent,
            volume = totalVolume,
            rsi = rsi14,
            ema9 = ema9,
            ema21 = ema21,
            ema50 = ema50,
            macdLine = macdLine,
            signalLine = signalLine,
            macdHist = macdHist,
            atr14 = atr14,
            reason = reason,
            confidenceScore = confidence,
            dataStatus = dataStatus,
            time = now,
            timestamp = System.currentTimeMillis(),
            symbol = instrument.symbol,
            timeframe = timeframe.label,
            provider = providerName,
            tradePlan = tradePlan
        )
    }

    private data class ConfluenceResult(val side: String, val confidence: Int, val reason: String)

    private fun evaluateConfluence(
        currentPrice: Double,
        ema9: Double,
        ema21: Double,
        ema50: Double,
        rsi: Double,
        macdHist: Double,
        atr: Double,
        momentumUp: Boolean
    ): ConfluenceResult {
        val formattedRsi = String.format(Locale.US, "%.1f", rsi)
        var bullishScore = 0
        var bearishScore = 0

        // 1. Trend Structure (EMA 9 vs 21 vs 50)
        if (ema9 > ema21 && ema21 > ema50) {
            bullishScore += 3 // Strong uptrend
        } else if (ema9 < ema21 && ema21 < ema50) {
            bearishScore += 3 // Strong downtrend
        } else if (ema9 > ema21) {
            bullishScore += 1
        } else if (ema9 < ema21) {
            bearishScore += 1
        }

        // 2. Price Position relative to Short EMA
        if (currentPrice > ema9) bullishScore += 1 else bearishScore += 1

        // 3. RSI Momentum
        if (rsi in 52.0..68.0) {
            bullishScore += 2 // Healthy bullish continuation
        } else if (rsi in 32.0..48.0) {
            bearishScore += 2 // Healthy bearish continuation
        } else if (rsi > 70.0) {
            // Overbought caution: reduce aggressive buying
            bearishScore += 1
        } else if (rsi < 30.0) {
            // Oversold caution: reduce aggressive selling
            bullishScore += 1
        }

        // 4. MACD Histogram
        if (macdHist > 0) bullishScore += 2 else bearishScore += 2

        // 5. Short-term candle momentum
        if (momentumUp) bullishScore += 1 else bearishScore += 1

        val totalPoints = 9
        val maxPoints = max(bullishScore, bearishScore)

        // Strict Confluence Gate:
        // Clear signal requires >= 7 points (approx >= 77% alignment across indicators).
        // If below 7, the indicators are conflicting or market is ranging -> output WAIT.
        return when {
            bullishScore >= 7 && rsi <= 72.0 -> {
                val confidence = ((bullishScore.toDouble() / totalPoints) * 100).toInt().coerceIn(65, 88)
                ConfluenceResult(
                    side = "BUY",
                    confidence = confidence,
                    reason = "Konfluensi Bullish: Struktur EMA bertingkat naik (EMA9 > EMA21 > EMA50), momentum RSI ($formattedRsi) sehat, dan histogram MACD positif."
                )
            }
            bearishScore >= 7 && rsi >= 28.0 -> {
                val confidence = ((bearishScore.toDouble() / totalPoints) * 100).toInt().coerceIn(65, 88)
                ConfluenceResult(
                    side = "SELL",
                    confidence = confidence,
                    reason = "Konfluensi Bearish: Struktur EMA bertingkat turun (EMA9 < EMA21 < EMA50), momentum RSI ($formattedRsi) melemah, dan histogram MACD negatif."
                )
            }
            else -> {
                val reasonText = when {
                    rsi > 72.0 -> "Kondisi pasar Overbought jenuh beli (RSI $formattedRsi). Menunggu pullback atau pembentukan base baru."
                    rsi < 28.0 -> "Kondisi pasar Oversold jenuh jual (RSI $formattedRsi). Menunggu konfirmasi pantulan harga sebelum entri."
                    abs(bullishScore - bearishScore) <= 2 -> "Indikator saling bertentangan (Tren dan Momentum tidak searah). Pasar dalam kondisi konsolidasi (Chop/Ranging)."
                    else -> "Konfluensi belum mencapai ambang batas minimum keamanan entri (Skor: $maxPoints / $totalPoints). Disarankan menunggu konfirmasi candle berikutnya."
                }
                ConfluenceResult(
                    side = "WAIT",
                    confidence = ((maxPoints.toDouble() / totalPoints) * 50).toInt().coerceIn(20, 50),
                    reason = reasonText
                )
            }
        }
    }

    fun calculateEmaSeries(values: List<Double>, period: Int): List<Double> {
        if (values.isEmpty() || period <= 0) return emptyList()
        val k = 2.0 / (period + 1.0)
        val result = ArrayList<Double>(values.size)
        var current = values.first()
        result.add(current)
        for (i in 1 until values.size) {
            current = (values[i] * k) + (current * (1.0 - k))
            result.add(current)
        }
        return result
    }

    fun calculateRsi(values: List<Double>, period: Int = 14): Double {
        if (values.size <= period) return 50.0
        var gains = 0.0
        var losses = 0.0
        for (i in 1..period) {
            val diff = values[i] - values[i - 1]
            if (diff > 0) gains += diff else losses -= diff
        }
        var avgGain = gains / period
        var avgLoss = losses / period

        for (i in (period + 1) until values.size) {
            val diff = values[i] - values[i - 1]
            val gain = if (diff > 0) diff else 0.0
            val loss = if (diff < 0) -diff else 0.0
            avgGain = (avgGain * (period - 1) + gain) / period
            avgLoss = (avgLoss * (period - 1) + loss) / period
        }

        if (avgLoss == 0.0) return 100.0
        val rs = avgGain / avgLoss
        return 100.0 - (100.0 / (1.0 + rs))
    }

    fun calculateAtr(highs: List<Double>, lows: List<Double>, closes: List<Double>, period: Int = 14): Double {
        if (closes.size <= period || highs.size != closes.size || lows.size != closes.size) return 0.0

        val trueRanges = ArrayList<Double>(closes.size)
        // First true range
        trueRanges.add(highs[0] - lows[0])
        for (i in 1 until closes.size) {
            val high = highs[i]
            val low = lows[i]
            val priorClose = closes[i - 1]
            val tr = max(high - low, max(abs(high - priorClose), abs(low - priorClose)))
            trueRanges.add(tr)
        }

        // Wilder's smoothing for ATR
        var atr = trueRanges.take(period).average()
        for (i in period until trueRanges.size) {
            atr = (atr * (period - 1) + trueRanges[i]) / period
        }
        return atr
    }

    /**
     * Determines proper decimal precision based on price scale and asset characteristics.
     */
    fun getDecimalPrecision(price: Double, symbol: String): Int {
        if (symbol.contains("JPY", ignoreCase = true)) return 3
        if (symbol.contains("/", ignoreCase = true)) {
            return if (price >= 100.0) 3 else 5
        }
        return when {
            price >= 1000.0 -> 2
            price >= 100.0 -> 2
            price >= 1.0 -> 4
            else -> 6
        }
    }

    /**
     * Calculates deterministic Stop Loss (SL) and Take Profit (TP1, TP2, TP3) levels
     * based on market volatility (ATR) and recent price structure (swing low/high).
     *
     * Rules:
     * - BUY: Entry = current price, SL < Entry, Entry < TP1 < TP2 < TP3.
     * - SELL: Entry = current price, SL > Entry, Entry > TP1 > TP2 > TP3.
     * - Risk/Reward ratios: 1:1 (TP1), 1:2 (TP2), 1:3 (TP3).
     * - Returns null if side is WAIT or inputs are invalid.
     */
    fun calculateTradePlan(
        side: String,
        entryPrice: Double,
        atr: Double,
        candles: List<Candle>,
        symbol: String
    ): TradePlan? {
        if (side != "BUY" && side != "SELL") return null
        if (entryPrice <= 0.0 || entryPrice.isNaN() || entryPrice.isInfinite()) return null

        val precision = getDecimalPrecision(entryPrice, symbol)

        // Effective ATR: ensure positive and non-zero
        val effectiveAtr = if (atr > 0.0 && !atr.isNaN() && !atr.isInfinite()) {
            atr
        } else {
            entryPrice * 0.01 // 1% fallback volatility
        }

        // Lookback window for market structure (last 10 candles)
        val lookback = candles.takeLast(10)

        val riskDistance = if (side == "BUY") {
            val swingLow = if (lookback.isNotEmpty()) lookback.minOf { it.low } else (entryPrice - 1.5 * effectiveAtr)
            val structuralRisk = if (swingLow < entryPrice) {
                (entryPrice - swingLow) + (0.5 * effectiveAtr)
            } else {
                1.5 * effectiveAtr
            }
            // Bound risk distance between 1.0 * ATR and 3.5 * ATR, with minimum 0.1% of entry price
            structuralRisk.coerceIn(1.0 * effectiveAtr, 3.5 * effectiveAtr).coerceAtLeast(entryPrice * 0.001)
        } else {
            val swingHigh = if (lookback.isNotEmpty()) lookback.maxOf { it.high } else (entryPrice + 1.5 * effectiveAtr)
            val structuralRisk = if (swingHigh > entryPrice) {
                (swingHigh - entryPrice) + (0.5 * effectiveAtr)
            } else {
                1.5 * effectiveAtr
            }
            structuralRisk.coerceIn(1.0 * effectiveAtr, 3.5 * effectiveAtr).coerceAtLeast(entryPrice * 0.001)
        }

        val sl = if (side == "BUY") entryPrice - riskDistance else entryPrice + riskDistance
        val tp1 = if (side == "BUY") entryPrice + (1.0 * riskDistance) else entryPrice - (1.0 * riskDistance)
        val tp2 = if (side == "BUY") entryPrice + (2.0 * riskDistance) else entryPrice - (2.0 * riskDistance)
        val tp3 = if (side == "BUY") entryPrice + (3.0 * riskDistance) else entryPrice - (3.0 * riskDistance)

        fun formatPrice(value: Double): String = String.format(Locale.US, "%.${precision}f", value)

        return TradePlan(
            entryPrice = entryPrice,
            stopLoss = sl,
            takeProfit1 = tp1,
            takeProfit2 = tp2,
            takeProfit3 = tp3,
            riskRewardRatio = "1:1 / 1:2 / 1:3",
            riskDistance = riskDistance,
            precision = precision,
            formattedEntry = formatPrice(entryPrice),
            formattedSl = formatPrice(sl),
            formattedTp1 = formatPrice(tp1),
            formattedTp2 = formatPrice(tp2),
            formattedTp3 = formatPrice(tp3)
        )
    }
}

/**
 * Top-level convenience functions to ensure backwards and cross-component compatibility.
 */
fun calculateEmaSeries(values: List<Double>, period: Int): List<Double> =
    TechnicalAnalysisEngine.calculateEmaSeries(values, period)

fun emaSeries(values: List<Double>, period: Int): List<Double> =
    TechnicalAnalysisEngine.calculateEmaSeries(values, period)

fun calculateTradePlan(
    side: String,
    entryPrice: Double,
    atr: Double,
    candles: List<Candle>,
    symbol: String
): TradePlan? = TechnicalAnalysisEngine.calculateTradePlan(side, entryPrice, atr, candles, symbol)
