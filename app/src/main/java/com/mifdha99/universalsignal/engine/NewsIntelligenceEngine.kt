package com.mifdha99.universalsignal.engine

import com.mifdha99.universalsignal.data.model.*
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

object NewsIntelligenceEngine {

    val SOURCE_CREDIBILITY: Map<String, Double> = mapOf(
        "Bloomberg" to 1.0,
        "Reuters" to 1.0,
        "Financial Times" to 0.95,
        "Wall Street Journal" to 0.95,
        "CNBC" to 0.85,
        "CoinDesk" to 0.85,
        "Cointelegraph" to 0.80,
        "The Block" to 0.85,
        "Decrypt" to 0.80,
        "ForexLive" to 0.85,
        "DailyFX" to 0.85,
        "Yahoo Finance" to 0.80,
        "Federal Reserve" to 1.0,
        "ECB" to 1.0,
        "Bank of Japan" to 1.0
    )

    private val BULLISH_KEYWORDS = listOf(
        "surge", "jump", "rally", "breakout", "soar", "gain", "outperform",
        "bullish", "rate cut", "easing", "dovish", "stimulus", "inflow", "etf approved",
        "record high", "adoption", "all-time high", "expansion", "beat expectations",
        "strong earnings", "upgrade", "profit rises", "inflation cools", "disinflation",
        "reserve accumulation", "rate pause", "institutional buying"
    )

    private val BEARISH_KEYWORDS = listOf(
        "plunge", "crash", "tumble", "slump", "drop", "fall", "selloff",
        "bearish", "rate hike", "hawkish", "tightening", "liquidation", "outflow",
        "lawsuit", "crackdown", "recession", "miss expectations", "downgrade",
        "inflation surges", "war", "escalation", "conflict", "tariff", "sanctions",
        "bank failure", "default", "sec charges", "regulatory investigation", "curb"
    )

    private val CRITICAL_KEYWORDS = listOf(
        "emergency rate", "war declared", "invasion", "sec rejects", "bank run",
        "default imminent", "all-out war", "debt default", "black swan"
    )

    private val HIGH_IMPACT_KEYWORDS = listOf(
        "fomc", "federal reserve", "cpi", "inflation", "non-farm payrolls", "nfp",
        "interest rate", "rate decision", "ecb", "bank of japan", "opec",
        "geopolitical", "sec", "etf", "halving", "gdp", "tariff", "treasury yield"
    )

    fun analyzeNewsSentiment(
        title: String,
        summary: String = "",
        symbol: String = "",
        category: AssetCategory = AssetCategory.CRYPTO
    ): Triple<Int, SentimentRating, ImpactLevel> {
        val text = "$title $summary".lowercase()

        var bullPoints = 0
        var bearPoints = 0

        BULLISH_KEYWORDS.forEach { kw ->
            if (text.contains(kw)) bullPoints += 15
        }

        BEARISH_KEYWORDS.forEach { kw ->
            if (text.contains(kw)) bearPoints += 15
        }

        // Contextual nuances for FX & Gold
        if (symbol.contains("USD") || symbol == "XAU/USD") {
            if (text.contains("strong dollar") || text.contains("dollar surges") || text.contains("yields climb")) {
                if (symbol != "USD/JPY" && symbol != "USD/CHF" && symbol != "USD/CAD") {
                    bearPoints += 25
                } else {
                    bullPoints += 25
                }
            }
            if (text.contains("weak dollar") || text.contains("dollar drops") || text.contains("rate cut")) {
                if (symbol != "USD/JPY" && symbol != "USD/CHF" && symbol != "USD/CAD") {
                    bullPoints += 25
                } else {
                    bearPoints += 25
                }
            }
        }

        var impact = ImpactLevel.LOW
        if (CRITICAL_KEYWORDS.any { text.contains(it) }) {
            impact = ImpactLevel.CRITICAL
        } else if (HIGH_IMPACT_KEYWORDS.any { text.contains(it) }) {
            impact = ImpactLevel.HIGH
        } else if (bullPoints + bearPoints > 20) {
            impact = ImpactLevel.MEDIUM
        }

        val net = bullPoints - bearPoints
        val rawScore = max(-100, min(100, net * 2))

        val rating = when {
            rawScore >= 80 -> SentimentRating.STRONGLY_BULLISH
            rawScore >= 40 -> SentimentRating.BULLISH
            rawScore <= -80 -> SentimentRating.STRONGLY_BEARISH
            rawScore <= -40 -> SentimentRating.BEARISH
            else -> SentimentRating.NEUTRAL
        }

        return Triple(rawScore, rating, impact)
    }

    fun calculateTimeDecay(publishedAt: Long): Double {
        val ageHours = max(0.0, (System.currentTimeMillis() - publishedAt) / (1000.0 * 60.0 * 60.0))
        val halfLifeHours = 6.0
        return exp(-ln(2.0) * (ageHours / halfLifeHours))
    }

    fun computeUnifiedDecision(
        baseSignal: SignalResult,
        newsList: List<NewsItem>,
        economicEvents: List<EconomicEvent>,
        fundamentalProfile: FundamentalProfile?
    ): UnifiedSignalResult {
        val currentSymbol = baseSignal.symbol
        val now = System.currentTimeMillis()

        // 1. Technical Score
        val technicalScore = when (baseSignal.side) {
            "BUY" -> min(100, max(50, baseSignal.confidenceScore))
            "SELL" -> -min(100, max(50, baseSignal.confidenceScore))
            else -> 0
        }

        // 2. Filter news relevant to symbol
        val relevantNews = newsList.filter { item ->
            val direct = item.affectedInstruments.any { inst ->
                inst.equals(currentSymbol, ignoreCase = true) || currentSymbol.contains(inst, ignoreCase = true)
            }
            val macro = item.category == AssetCategory.FOREX && (currentSymbol.contains("/") || currentSymbol == "XAU/USD")
            val crypto = item.category == AssetCategory.CRYPTO && currentSymbol.endsWith("USDT")
            direct || macro || crypto
        }.take(8)

        var newsWeightedSum = 0.0
        var newsWeightTotal = 0.0

        relevantNews.forEach { news ->
            val decay = calculateTimeDecay(news.publishedAt)
            val cred = news.sourceWeight
            val impactMult = when (news.impact) {
                ImpactLevel.CRITICAL -> 2.0
                ImpactLevel.HIGH -> 1.5
                ImpactLevel.MEDIUM -> 1.0
                ImpactLevel.LOW -> 0.6
            }
            val w = decay * cred * impactMult
            newsWeightedSum += news.sentimentScore * w
            newsWeightTotal += w
        }

        val newsScore = if (newsWeightTotal > 0) (newsWeightedSum / newsWeightTotal).roundToInt() else 0
        val fundamentalScore = fundamentalProfile?.sentimentScore ?: 0

        // 3. Check for High-Impact Event Window
        var highImpactActive = false
        var activeEventName: String? = null

        val nearbyEvents = economicEvents.filter { event ->
            val diffMinutes = (event.scheduledTime - now) / (1000.0 * 60.0)
            val isRelevant = event.affectedSymbols.isEmpty() ||
                event.affectedSymbols.any { s -> currentSymbol.contains(s) || s == currentSymbol }

            val inWindow = diffMinutes >= -30.0 && diffMinutes <= 45.0
            if (inWindow && (event.impact == ImpactLevel.HIGH || event.impact == ImpactLevel.CRITICAL) && isRelevant) {
                highImpactActive = true
                activeEventName = "${event.currency} ${event.event} (${if (diffMinutes > 0) "dalam ${diffMinutes.roundToInt()}m" else "baru saja dirilis"})"
            }
            kotlin.math.abs(diffMinutes) <= 24.0 * 60.0
        }

        val marketConditionScore = if (highImpactActive) -80 else 20

        val wTech = 0.40
        val wNews = 0.30
        val wFund = 0.20
        val wCond = 0.10

        val compositeScore = (technicalScore * wTech +
            newsScore * wNews +
            fundamentalScore * wFund +
            marketConditionScore * wCond).roundToInt()

        var isConflict = false
        var conflictReason: String? = null

        if (highImpactActive) {
            isConflict = true
            conflictReason = "Jendela rilis data ekonomi berdampak tinggi aktif: $activeEventName. Pasar rentan terhadap lonjakan spread, slippage, dan fakeout. Wajib WAIT."
        } else if (baseSignal.side == "BUY" && (newsScore <= -35 || fundamentalScore <= -40)) {
            isConflict = true
            conflictReason = "Konflik Makro & Teknikal: Indikator teknikal BUY namun sentimen berita/fundamental tertekan (Berita: $newsScore, Makro: $fundamentalScore). Risiko whipsaw tinggi."
        } else if (baseSignal.side == "SELL" && (newsScore >= 35 || fundamentalScore >= 40)) {
            isConflict = true
            conflictReason = "Konflik Makro & Teknikal: Indikator teknikal SELL namun dorongan berita/fundamental positif (Berita: +$newsScore, Makro: +$fundamentalScore). Risiko short squeeze tinggi."
        }

        val finalSide: String
        val finalConfidence: Int
        val unifiedReason: String

        if (isConflict) {
            finalSide = "WAIT"
            finalConfidence = max(15, 50 - kotlin.math.abs(compositeScore) / 4)
            unifiedReason = conflictReason ?: "Konflik antar-pilar memicu penangguhan sinyal entri."
        } else if (baseSignal.side == "BUY" && compositeScore >= 30) {
            finalSide = "BUY"
            val bonus = (if (newsScore > 30) 6 else 0) + (if (fundamentalScore > 20) 5 else 0)
            finalConfidence = min(96, max(68, baseSignal.confidenceScore + bonus))
            unifiedReason = "Konfluensi Terpadu Bullish (Skor Komposit: +$compositeScore): Struktur teknikal terkonfirmasi dengan sentimen berita positif (+${newsScore}) dan fundamental pendukung."
        } else if (baseSignal.side == "SELL" && compositeScore <= -30) {
            finalSide = "SELL"
            val bonus = (if (newsScore < -30) 6 else 0) + (if (fundamentalScore < -20) 5 else 0)
            finalConfidence = min(96, max(68, baseSignal.confidenceScore + bonus))
            unifiedReason = "Konfluensi Terpadu Bearish (Skor Komposit: $compositeScore): Struktur teknikal terkonfirmasi dengan sentimen berita negatif ($newsScore) dan resistensi fundamental."
        } else {
            finalSide = "WAIT"
            finalConfidence = min(45, max(20, kotlin.math.abs(compositeScore)))
            unifiedReason = baseSignal.reason
        }

        val breakdown = UnifiedConfluenceBreakdown(
            technicalScore = technicalScore,
            technicalWeight = wTech,
            newsScore = newsScore,
            newsWeight = wNews,
            fundamentalScore = fundamentalScore,
            fundamentalWeight = wFund,
            marketConditionScore = marketConditionScore,
            marketConditionWeight = wCond,
            compositeScore = compositeScore,
            isConflictDetected = isConflict,
            conflictReason = conflictReason,
            highImpactNewsActive = highImpactActive,
            activeHighImpactEvent = activeEventName
        )

        return UnifiedSignalResult(
            baseSignal = baseSignal,
            unifiedConfluence = breakdown,
            finalSide = finalSide,
            finalConfidence = finalConfidence,
            unifiedReason = unifiedReason,
            relevantNews = relevantNews,
            nearbyEconomicEvents = nearbyEvents
        )
    }
}
