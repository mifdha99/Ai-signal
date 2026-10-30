package com.mifdha99.universalsignal.data.model

data class UnifiedConfluenceBreakdown(
    val technicalScore: Int,
    val technicalWeight: Double = 0.40,
    val newsScore: Int,
    val newsWeight: Double = 0.30,
    val fundamentalScore: Int,
    val fundamentalWeight: Double = 0.20,
    val marketConditionScore: Int,
    val marketConditionWeight: Double = 0.10,
    val compositeScore: Int,
    val isConflictDetected: Boolean,
    val conflictReason: String? = null,
    val highImpactNewsActive: Boolean = false,
    val activeHighImpactEvent: String? = null
)

data class UnifiedSignalResult(
    val baseSignal: SignalResult,
    val unifiedConfluence: UnifiedConfluenceBreakdown,
    val finalSide: String, // "BUY", "SELL", "WAIT"
    val finalConfidence: Int,
    val unifiedReason: String,
    val relevantNews: List<NewsItem> = emptyList(),
    val nearbyEconomicEvents: List<EconomicEvent> = emptyList()
)
