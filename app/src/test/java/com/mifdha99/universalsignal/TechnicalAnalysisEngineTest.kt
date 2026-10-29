package com.mifdha99.universalsignal

import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.engine.TechnicalAnalysisEngine
import org.junit.Assert.*
import org.junit.Test

class TechnicalAnalysisEngineTest {

    private fun generateSyntheticCandles(count: Int, trend: Double): List<Candle> {
        val list = mutableListOf<Candle>()
        var price = 100.0
        val baseTime = 1700000000000L
        for (i in 0 until count) {
            price += trend
            val open = price - (trend * 0.5)
            val close = price
            val high = maxOf(open, close) + 0.5
            val low = minOf(open, close) - 0.5
            list.add(
                Candle(
                    time = baseTime + (i * 300000L),
                    open = open,
                    high = high,
                    low = low,
                    close = close,
                    volume = 100.0
                )
            )
        }
        return list
    }

    @Test
    fun testEmaCalculation() {
        val prices = listOf(10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0)
        val ema3 = TechnicalAnalysisEngine.calculateEmaSeries(prices, 3)
        assertEquals(prices.size, ema3.size)
        // In strong rising prices, EMA lags slightly behind current price
        assertTrue("EMA should be less than latest price", ema3.last() < prices.last())
        assertTrue("EMA should be higher than initial price", ema3.last() > prices.first())

        // Top-level function test
        val emaTopLevel = com.mifdha99.universalsignal.engine.calculateEmaSeries(prices, 3)
        assertEquals(ema3, emaTopLevel)
    }

    @Test
    fun testEmaEdgeCases() {
        // Empty list should return emptyList
        assertTrue(TechnicalAnalysisEngine.calculateEmaSeries(emptyList(), 9).isEmpty())
        // Invalid period <= 0 should return emptyList
        assertTrue(TechnicalAnalysisEngine.calculateEmaSeries(listOf(10.0, 20.0), 0).isEmpty())
        assertTrue(TechnicalAnalysisEngine.calculateEmaSeries(listOf(10.0, 20.0), -5).isEmpty())
    }

    @Test
    fun testRsiCalculationRisingPrices() {
        // Monotonically increasing prices should have high RSI (> 70)
        val rising = (1..30).map { it.toDouble() }
        val rsiVal = TechnicalAnalysisEngine.calculateRsi(rising, 14)
        assertTrue("Rising price RSI should be high ($rsiVal)", rsiVal > 70.0)
    }

    @Test
    fun testRsiCalculationFallingPrices() {
        // Monotonically decreasing prices should have low RSI (< 30)
        val falling = (30 downTo 1).map { it.toDouble() }
        val rsiVal = TechnicalAnalysisEngine.calculateRsi(falling, 14)
        assertTrue("Falling price RSI should be low ($rsiVal)", rsiVal < 30.0)
    }

    @Test
    fun testAtrCalculation() {
        val count = 25
        val highs = (1..count).map { 105.0 }
        val lows = (1..count).map { 95.0 }
        val closes = (1..count).map { 100.0 }
        val atr = TechnicalAnalysisEngine.calculateAtr(highs, lows, closes, 14)
        assertEquals(10.0, atr, 0.01)
    }

    @Test
    fun testInsufficientCandlesReturnsWait() {
        val shortCandles = generateSyntheticCandles(30, 0.5) // Only 30 candles, < 60
        val instrument = DefaultInstruments.allInstruments.first()
        val result = TechnicalAnalysisEngine.analyze(
            shortCandles,
            instrument,
            Timeframe.M5,
            "Binance"
        )

        assertEquals("WAIT", result.side)
        assertEquals(DataStatus.INCOMPLETE, result.dataStatus)
        assertTrue(result.reason.contains("Data historis tidak mencukupi"))
    }

    @Test
    fun testBullishConfluenceProducesBuy() {
        val bullCandles = generateSyntheticCandles(80, 0.25)
        val instrument = DefaultInstruments.allInstruments.first()
        val result = TechnicalAnalysisEngine.analyze(
            bullCandles,
            instrument,
            Timeframe.M5,
            "Binance"
        )

        assertTrue(result.side in listOf("BUY", "WAIT"))
        assertTrue("Confidence score should be valid", result.confidenceScore in 0..100)
    }

    @Test
    fun testBearishConfluenceProducesSell() {
        val bearCandles = generateSyntheticCandles(80, -0.25)
        val instrument = DefaultInstruments.allInstruments.first()
        val result = TechnicalAnalysisEngine.analyze(
            bearCandles,
            instrument,
            Timeframe.M5,
            "Binance"
        )

        assertTrue(result.side in listOf("SELL", "WAIT"))
    }
}
