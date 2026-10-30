package com.mifdha99.universalsignal.data.model

enum class ImpactLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

enum class SentimentRating {
    STRONGLY_BULLISH,
    BULLISH,
    NEUTRAL,
    BEARISH,
    STRONGLY_BEARISH
}

data class NewsItem(
    val id: String,
    val title: String,
    val summary: String,
    val source: String,
    val sourceWeight: Double = 1.0,
    val publishedAt: Long,
    val receivedAt: Long = System.currentTimeMillis(),
    val category: AssetCategory,
    val impact: ImpactLevel,
    val sentimentScore: Int, // -100 to +100
    val sentimentRating: SentimentRating,
    val affectedInstruments: List<String>,
    val relevance: Double = 1.0,
    val isStale: Boolean = false,
    val url: String? = null
)
