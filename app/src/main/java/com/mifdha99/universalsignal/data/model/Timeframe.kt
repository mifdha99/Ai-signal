package com.mifdha99.universalsignal.data.model

enum class Timeframe(
    val label: String,
    val binanceInterval: String,
    val twelveDataInterval: String?,
    val durationMinutes: Long
) {
    M1("1m", "1m", "1min", 1),
    M3("3m", "3m", null, 3), // Twelve Data free does not support 3m natively
    M5("5m", "5m", "5min", 5),
    M15("15m", "15m", "15min", 15),
    M30("30m", "30m", "30min", 30),
    H1("1h", "1h", "1h", 60),
    H2("2h", "2h", "2h", 120),
    H4("4h", "4h", "4h", 240),
    D1("1d", "1d", "1day", 1440);

    companion object {
        fun fromLabel(label: String): Timeframe? = entries.firstOrNull { it.label == label }
    }
}
