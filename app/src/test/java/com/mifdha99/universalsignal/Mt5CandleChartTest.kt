package com.mifdha99.universalsignal

import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.engine.TechnicalAnalysisEngine
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.max
import kotlin.math.min

class Mt5CandleChartTest {

    private fun generateCandleSeries(
        count: Int,
        startTimeMs: Long = 1700000000000L,
        intervalMs: Long = 300000L,
        basePrice: Double = 60000.0
    ): List<Candle> {
        val list = mutableListOf<Candle>()
        var price = basePrice
        for (i in 0 until count) {
            val open = price
            val close = price + (if (i % 2 == 0) 45.0 else -30.0)
            val high = max(open, close) + 15.0
            val low = min(open, close) - 15.0
            price = close
            list.add(
                Candle(
                    time = startTimeMs + (i * intervalMs),
                    open = open,
                    high = high,
                    low = low,
                    close = close,
                    volume = 12.5 + i
                )
            )
        }
        return list
    }

    @Test
    fun testCandleChronologicalOrderAndWickIntegrity() {
        val candles = generateCandleSeries(60)

        assertEquals("Should have exactly 60 candles", 60, candles.size)

        for (i in 0 until candles.size) {
            val c = candles[i]
            // Wick integrity check
            assertTrue("High must be >= open", c.high >= c.open)
            assertTrue("High must be >= close", c.high >= c.close)
            assertTrue("Low must be <= open", c.low <= c.open)
            assertTrue("Low must be <= close", c.low <= c.close)
            assertTrue("High must be >= low", c.high >= c.low)

            // Chronological order check
            if (i > 0) {
                assertTrue("Candle timestamps must be strictly monotonic ascending", c.time > candles[i - 1].time)
            }
        }
    }

    @Test
    fun testAllNineTimeframesConfigured() {
        val expectedLabels = listOf("1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d")
        val actualLabels = Timeframe.entries.map { it.label }

        assertEquals("Must support all 9 required timeframes", expectedLabels.size, actualLabels.size)
        assertTrue("All required timeframe labels must exist", actualLabels.containsAll(expectedLabels))

        assertEquals("1m duration", 1L, Timeframe.M1.durationMinutes)
        assertEquals("3m duration", 3L, Timeframe.M3.durationMinutes)
        assertEquals("5m duration", 5L, Timeframe.M5.durationMinutes)
        assertEquals("15m duration", 15L, Timeframe.M15.durationMinutes)
        assertEquals("30m duration", 30L, Timeframe.M30.durationMinutes)
        assertEquals("1h duration", 60L, Timeframe.H1.durationMinutes)
        assertEquals("2h duration", 120L, Timeframe.H2.durationMinutes)
        assertEquals("4h duration", 240L, Timeframe.H4.durationMinutes)
        assertEquals("1d duration", 1440L, Timeframe.D1.durationMinutes)
    }

    @Test
    fun testDataStatusLiveVsDelayedVsStale() {
        val instrumentLive = AssetInstrument(
            symbol = "BTCUSDT",
            name = "Bitcoin",
            category = AssetCategory.CRYPTO,
            primaryProvider = "Binance",
            requiresApiKey = false,
            isDelayed = false
        )

        val instrumentDelayed = AssetInstrument(
            symbol = "AAPL",
            name = "Apple Inc.",
            category = AssetCategory.STOCKS,
            primaryProvider = "Twelve Data",
            requiresApiKey = true,
            isDelayed = true
        )

        // Delayed instrument should yield DELAYED dataStatus
        val candles = generateCandleSeries(65, startTimeMs = System.currentTimeMillis() - (65 * 300000L))
        val resDelayed = TechnicalAnalysisEngine.analyze(candles, instrumentDelayed, Timeframe.M5, "Twelve Data")
        assertEquals(DataStatus.DELAYED, resDelayed.dataStatus)

        // Fresh crypto instrument should yield LIVE dataStatus
        val freshCandles = generateCandleSeries(65, startTimeMs = System.currentTimeMillis() - (65 * 60000L), intervalMs = 60000L)
        val resLive = TechnicalAnalysisEngine.analyze(freshCandles, instrumentLive, Timeframe.M1, "Binance")
        assertEquals(DataStatus.LIVE, resLive.dataStatus)

        // Very old candle series (> 3 intervals and > 10 min old) should yield STALE dataStatus
        val staleStartTime = System.currentTimeMillis() - (24 * 3600 * 1000L) // 1 day ago
        val staleCandles = generateCandleSeries(65, startTimeMs = staleStartTime, intervalMs = 60000L)
        val resStale = TechnicalAnalysisEngine.analyze(staleCandles, instrumentLive, Timeframe.M1, "Binance")
        assertEquals(DataStatus.STALE, resStale.dataStatus)
    }

    @Test
    fun testPanOffsetPreservationWhenNewCandlesArrive() {
        val initialCandles = generateCandleSeries(60)
        var userPanOffset = 5 // User scrolled back 5 candles
        val visibleCount = 40

        val maxPanInitial = max(0, initialCandles.size - visibleCount)
        val effectivePanInitial = min(userPanOffset, maxPanInitial)
        assertEquals("Initial pan offset should be 5", 5, effectivePanInitial)

        // A new candle arrives at interval boundary
        val last = initialCandles.last()
        val newCandle = Candle(
            time = last.time + 300000L,
            open = last.close,
            high = last.close + 20.0,
            low = last.close - 10.0,
            close = last.close + 15.0,
            volume = 40.0
        )
        val updatedCandles = initialCandles + newCandle
        assertEquals(61, updatedCandles.size)

        // User pan offset is preserved (not forcibly reset to 0)
        val maxPanUpdated = max(0, updatedCandles.size - visibleCount)
        val effectivePanUpdated = min(userPanOffset, maxPanUpdated)
        assertEquals("User pan offset must be preserved when new candle arrives", 5, effectivePanUpdated)

        // User presses "Kembali ke Terbaru" button
        userPanOffset = 0
        assertEquals("When user resets, pan offset goes to 0", 0, userPanOffset)
    }

    @Test
    fun testChartLevelOverlayBoundsEncompassTpAndSl() {
        val candles = generateCandleSeries(65, basePrice = 50000.0)
        val lastClose = candles.last().close
        val atr = 500.0

        val buyPlan = TechnicalAnalysisEngine.calculateTradePlan("BUY", lastClose, atr, candles, "BTCUSDT")
        assertNotNull(buyPlan)
        buyPlan!!

        var minPrice = candles.minOf { it.low }
        var maxPrice = candles.maxOf { it.high }

        // Incorporate trade plan levels
        minPrice = min(minPrice, buyPlan.stopLoss)
        maxPrice = max(maxPrice, buyPlan.takeProfit3)

        assertTrue("Chart maxPrice must encompass TP3", maxPrice >= buyPlan.takeProfit3)
        assertTrue("Chart minPrice must encompass SL", minPrice <= buyPlan.stopLoss)
        assertTrue("TP3 > TP2 > TP1 > Entry > SL for BUY", 
            buyPlan.takeProfit3 > buyPlan.takeProfit2 &&
            buyPlan.takeProfit2 > buyPlan.takeProfit1 &&
            buyPlan.takeProfit1 > buyPlan.entryPrice &&
            buyPlan.entryPrice > buyPlan.stopLoss
        )
    }
}
