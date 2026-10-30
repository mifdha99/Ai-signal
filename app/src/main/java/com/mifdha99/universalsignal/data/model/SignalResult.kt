package com.mifdha99.universalsignal.data.model

data class SignalResult(
    val side: String, // "BUY", "SELL", or "WAIT"
    val price: Double,
    val change24h: Double = 0.0,
    val volume: Double = 0.0,
    val rsi: Double,
    val ema9: Double,
    val ema21: Double,
    val ema50: Double,
    val macdLine: Double,
    val signalLine: Double,
    val macdHist: Double,
    val atr14: Double,
    val reason: String,
    val confidenceScore: Int, // 0 - 100%
    val dataStatus: DataStatus,
    val time: String,
    val timestamp: Long,
    val symbol: String,
    val timeframe: String,
    val provider: String,
    val tradePlan: TradePlan? = null
)
