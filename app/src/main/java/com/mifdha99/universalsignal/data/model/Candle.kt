package com.mifdha99.universalsignal.data.model

/**
 * Standard OHLCV market candle representation.
 */
data class Candle(
    val time: Long,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Double
) {
    val isBullish: Boolean get() = close >= open
}
