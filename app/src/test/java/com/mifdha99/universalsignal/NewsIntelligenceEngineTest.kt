package com.mifdha99.universalsignal

import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.engine.NewsIntelligenceEngine
import org.junit.Assert.*
import org.junit.Test

class NewsIntelligenceEngineTest {

    @Test
    fun testSentimentClassification() {
        val (scoreBull, ratingBull, _) = NewsIntelligenceEngine.analyzeNewsSentiment(
            title = "Bitcoin Surges Above Milestone as Institutional ETF Inflows Break Records",
            summary = "Massive institutional buying and adoption accelerates market expansion."
        )
        assertTrue("Bullish score must be > 0", scoreBull > 0)
        assertEquals(SentimentRating.STRONGLY_BULLISH, ratingBull)

        val (scoreBear, ratingBear, _) = NewsIntelligenceEngine.analyzeNewsSentiment(
            title = "Market Crash: Inflation Surges Prompting Emergency Rate Hike Fears and Massive Outflows",
            summary = "Heavy liquidation and selloff hits risk assets amidst recession warnings."
        )
        assertTrue("Bearish score must be < 0", scoreBear < 0)
        assertEquals(SentimentRating.STRONGLY_BEARISH, ratingBear)
    }

    @Test
    fun testImpactAssessment() {
        val (_, _, impactHigh) = NewsIntelligenceEngine.analyzeNewsSentiment(
            title = "FOMC Federal Reserve Rate Decision and CPI Inflation Data Release",
            summary = "Upcoming interest rate statement will dictate central bank monetary policy."
        )
        assertEquals(ImpactLevel.HIGH, impactHigh)

        val (_, _, impactCrit) = NewsIntelligenceEngine.analyzeNewsSentiment(
            title = "Emergency Rate Cut Announced Amidst Bank Run and Debt Default Risk",
            summary = "Federal Reserve calls emergency session."
        )
        assertEquals(ImpactLevel.CRITICAL, impactCrit)
    }

    @Test
    fun testHighImpactWindowForcesWait() {
        val baseSignal = SignalResult(
            side = "BUY",
            price = 95000.0,
            rsi = 58.0,
            ema9 = 94500.0,
            ema21 = 94000.0,
            ema50 = 93000.0,
            macdLine = 50.0,
            signalLine = 30.0,
            macdHist = 20.0,
            atr14 = 850.0,
            reason = "Bullish technical confluence",
            confidenceScore = 85,
            dataStatus = DataStatus.LIVE,
            time = "12:00:00",
            timestamp = System.currentTimeMillis(),
            symbol = "BTCUSDT",
            timeframe = "5m",
            provider = "Binance"
        )

        // Event in 10 minutes (within active window)
        val upcomingEvent = EconomicEvent(
            id = "cpi_test",
            event = "US CPI YoY",
            currency = "USD",
            country = "United States",
            impact = ImpactLevel.HIGH,
            scheduledTime = System.currentTimeMillis() + (10 * 60 * 1000),
            previous = "2.8%",
            forecast = "2.6%",
            affectedSymbols = listOf("BTCUSDT", "EUR/USD")
        )

        val result = NewsIntelligenceEngine.computeUnifiedDecision(
            baseSignal = baseSignal,
            newsList = emptyList(),
            economicEvents = listOf(upcomingEvent),
            fundamentalProfile = null
        )

        assertEquals("High impact event window MUST trigger WAIT", "WAIT", result.finalSide)
        assertTrue("Conflict/Risk flag must be set", result.unifiedConfluence.isConflictDetected)
        assertTrue("High impact active must be true", result.unifiedConfluence.highImpactNewsActive)
    }

    @Test
    fun testMacroTechnicalConflictForcesWait() {
        val baseSignal = SignalResult(
            side = "BUY",
            price = 1.0850,
            rsi = 60.0,
            ema9 = 1.0840,
            ema21 = 1.0820,
            ema50 = 1.0800,
            macdLine = 0.0010,
            signalLine = 0.0005,
            macdHist = 0.0005,
            atr14 = 0.0025,
            reason = "Bullish technical structure",
            confidenceScore = 80,
            dataStatus = DataStatus.LIVE,
            time = "14:00:00",
            timestamp = System.currentTimeMillis(),
            symbol = "EUR/USD",
            timeframe = "15m",
            provider = "Twelve Data"
        )

        val bearishNews = NewsItem(
            id = "news_1",
            title = "ECB Slashes Rates While US Dollar Surges on Hawkish Fed Reassessment",
            summary = "Eurozone economy plunges into deep slump as dollar dominates.",
            source = "Reuters",
            sourceWeight = 1.0,
            publishedAt = System.currentTimeMillis() - 1800000,
            category = AssetCategory.FOREX,
            impact = ImpactLevel.HIGH,
            sentimentScore = -85,
            sentimentRating = SentimentRating.STRONGLY_BEARISH,
            affectedInstruments = listOf("EUR/USD")
        )

        val result = NewsIntelligenceEngine.computeUnifiedDecision(
            baseSignal = baseSignal,
            newsList = listOf(bearishNews),
            economicEvents = emptyList(),
            fundamentalProfile = null
        )

        assertEquals("Technical BUY with strongly bearish news MUST trigger WAIT due to conflict", "WAIT", result.finalSide)
        assertTrue("Conflict flag must be true", result.unifiedConfluence.isConflictDetected)
    }

    @Test
    fun testHarmoniousConfluenceBoostsConfidence() {
        val baseSignal = SignalResult(
            side = "BUY",
            price = 98000.0,
            rsi = 62.0,
            ema9 = 97500.0,
            ema21 = 97000.0,
            ema50 = 96000.0,
            macdLine = 80.0,
            signalLine = 40.0,
            macdHist = 40.0,
            atr14 = 1100.0,
            reason = "Technical bullish trend",
            confidenceScore = 80,
            dataStatus = DataStatus.LIVE,
            time = "16:00:00",
            timestamp = System.currentTimeMillis(),
            symbol = "BTCUSDT",
            timeframe = "1h",
            provider = "Binance"
        )

        val bullishNews = NewsItem(
            id = "btc_news",
            title = "Bitcoin ETF Inflows Surge to Record High as Institutional Accumulation Accelerates",
            summary = "Massive capital allocation boosts digital asset liquidity.",
            source = "Bloomberg",
            sourceWeight = 1.0,
            publishedAt = System.currentTimeMillis() - 3600000,
            category = AssetCategory.CRYPTO,
            impact = ImpactLevel.HIGH,
            sentimentScore = 75,
            sentimentRating = SentimentRating.STRONGLY_BULLISH,
            affectedInstruments = listOf("BTCUSDT")
        )

        val result = NewsIntelligenceEngine.computeUnifiedDecision(
            baseSignal = baseSignal,
            newsList = listOf(bullishNews),
            economicEvents = emptyList(),
            fundamentalProfile = FundamentalProfile(
                symbol = "BTCUSDT",
                category = AssetCategory.CRYPTO,
                sentimentScore = 60,
                macroRegime = "Post-Halving Expansion",
                keyDrivers = listOf("ETF Inflows"),
                riskFactors = listOf("Macro volatility"),
                upcomingCatalysts = listOf("Custody approvals")
            )
        )

        assertEquals("Harmonious confluence must emit BUY", "BUY", result.finalSide)
        assertTrue("Confidence must be boosted above base 80%", result.finalConfidence > 80)
        assertFalse("Conflict flag must be false", result.unifiedConfluence.isConflictDetected)
    }
}
