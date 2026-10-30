package com.mifdha99.universalsignal

import com.mifdha99.universalsignal.data.model.Candle
import com.mifdha99.universalsignal.engine.TechnicalAnalysisEngine
import org.junit.Assert.*
import org.junit.Test

class TradePlanTest {

    private fun createCandles(count: Int, basePrice: Double, step: Double): List<Candle> {
        val list = mutableListOf<Candle>()
        var price = basePrice
        val baseTime = 1700000000000L
        for (i in 0 until count) {
            price += step
            val high = price + 1.0
            val low = price - 1.0
            list.add(
                Candle(
                    time = baseTime + (i * 60000L),
                    open = price - 0.2,
                    high = high,
                    low = low,
                    close = price,
                    volume = 50.0
                )
            )
        }
        return list
    }

    @Test
    fun testBuyStopLossAndTakeProfitLevels() {
        val candles = createCandles(15, 100.0, 0.5)
        val entry = 107.5
        val atr = 1.8
        val plan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = entry,
            atr = atr,
            candles = candles,
            symbol = "BTCUSDT"
        )

        assertNotNull("Trade plan must not be null for valid BUY signal", plan)
        plan!!

        // 1. SL BUY always below entry
        assertTrue("SL BUY must be below entry (SL: ${plan.stopLoss}, Entry: $entry)", plan.stopLoss < entry)

        // 2. All TP BUY always above entry
        assertTrue("TP1 BUY must be above entry", plan.takeProfit1 > entry)
        assertTrue("TP2 BUY must be above entry", plan.takeProfit2 > entry)
        assertTrue("TP3 BUY must be above entry", plan.takeProfit3 > entry)

        // 3. TP1 closer than TP2, and TP2 closer than TP3
        assertTrue("TP1 must be strictly less than TP2 for BUY", plan.takeProfit1 < plan.takeProfit2)
        assertTrue("TP2 must be strictly less than TP3 for BUY", plan.takeProfit2 < plan.takeProfit3)

        // 4. Exact Risk/Reward ratios
        val risk = entry - plan.stopLoss
        val reward1 = plan.takeProfit1 - entry
        val reward2 = plan.takeProfit2 - entry
        val reward3 = plan.takeProfit3 - entry

        assertEquals(risk, reward1, 0.0001)
        assertEquals(risk * 2.0, reward2, 0.0001)
        assertEquals(risk * 3.0, reward3, 0.0001)
        assertEquals("1:1 / 1:2 / 1:3", plan.riskRewardRatio)
    }

    @Test
    fun testSellStopLossAndTakeProfitLevels() {
        val candles = createCandles(15, 100.0, -0.5)
        val entry = 92.5
        val atr = 1.5
        val plan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "SELL",
            entryPrice = entry,
            atr = atr,
            candles = candles,
            symbol = "BTCUSDT"
        )

        assertNotNull("Trade plan must not be null for valid SELL signal", plan)
        plan!!

        // 1. SL SELL always above entry
        assertTrue("SL SELL must be above entry (SL: ${plan.stopLoss}, Entry: $entry)", plan.stopLoss > entry)

        // 2. All TP SELL always below entry
        assertTrue("TP1 SELL must be below entry", plan.takeProfit1 < entry)
        assertTrue("TP2 SELL must be below entry", plan.takeProfit2 < entry)
        assertTrue("TP3 SELL must be below entry", plan.takeProfit3 < entry)

        // 3. TP1 closer than TP2, and TP2 closer than TP3
        assertTrue("TP1 must be strictly greater than TP2 for SELL", plan.takeProfit1 > plan.takeProfit2)
        assertTrue("TP2 must be strictly greater than TP3 for SELL", plan.takeProfit2 > plan.takeProfit3)

        // 4. Exact Risk/Reward ratios
        val risk = plan.stopLoss - entry
        val reward1 = entry - plan.takeProfit1
        val reward2 = entry - plan.takeProfit2
        val reward3 = entry - plan.takeProfit3

        assertEquals(risk, reward1, 0.0001)
        assertEquals(risk * 2.0, reward2, 0.0001)
        assertEquals(risk * 3.0, reward3, 0.0001)
    }

    @Test
    fun testNoNanOrInfinity() {
        val candles = createCandles(15, 1.1000, 0.0002)
        val plan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 1.1030,
            atr = 0.0015,
            candles = candles,
            symbol = "EUR/USD"
        )

        assertNotNull(plan)
        plan!!

        assertFalse(plan.entryPrice.isNaN())
        assertFalse(plan.entryPrice.isInfinite())
        assertFalse(plan.stopLoss.isNaN())
        assertFalse(plan.stopLoss.isInfinite())
        assertFalse(plan.takeProfit1.isNaN())
        assertFalse(plan.takeProfit1.isInfinite())
        assertFalse(plan.takeProfit2.isNaN())
        assertFalse(plan.takeProfit2.isInfinite())
        assertFalse(plan.takeProfit3.isNaN())
        assertFalse(plan.takeProfit3.isInfinite())
        assertFalse(plan.riskDistance.isNaN())
        assertFalse(plan.riskDistance.isInfinite())
    }

    @Test
    fun testPrecisionFormattingForexAndCrypto() {
        val candles = createCandles(15, 1.08500, 0.0001)
        val forexPlan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 1.08650,
            atr = 0.00120,
            candles = candles,
            symbol = "EUR/USD"
        )
        assertNotNull(forexPlan)
        assertEquals(5, forexPlan!!.precision)
        assertEquals(5, forexPlan.formattedEntry.substringAfter('.').length)
        assertEquals(5, forexPlan.formattedSl.substringAfter('.').length)
        assertEquals(5, forexPlan.formattedTp1.substringAfter('.').length)

        val jpyPlan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "SELL",
            entryPrice = 152.450,
            atr = 0.650,
            candles = candles,
            symbol = "USD/JPY"
        )
        assertNotNull(jpyPlan)
        assertEquals(3, jpyPlan!!.precision)
        assertEquals(3, jpyPlan.formattedEntry.substringAfter('.').length)

        val btcPlan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 89500.50,
            atr = 450.0,
            candles = candles,
            symbol = "BTCUSDT"
        )
        assertNotNull(btcPlan)
        assertEquals(2, btcPlan!!.precision)
        assertEquals(2, btcPlan.formattedEntry.substringAfter('.').length)

        val dogePlan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 0.142531,
            atr = 0.003500,
            candles = candles,
            symbol = "DOGEUSDT"
        )
        assertNotNull(dogePlan)
        assertEquals(6, dogePlan!!.precision)
        assertEquals(6, dogePlan.formattedEntry.substringAfter('.').length)
    }

    @Test
    fun testDeterministicCalculation() {
        val candles = createCandles(20, 2500.0, 5.0)
        val plan1 = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 2600.0,
            atr = 25.0,
            candles = candles,
            symbol = "ETHUSDT"
        )
        val plan2 = TechnicalAnalysisEngine.calculateTradePlan(
            side = "BUY",
            entryPrice = 2600.0,
            atr = 25.0,
            candles = candles,
            symbol = "ETHUSDT"
        )

        assertNotNull(plan1)
        assertNotNull(plan2)
        assertEquals(plan1!!.stopLoss, plan2!!.stopLoss, 0.0)
        assertEquals(plan1.takeProfit1, plan2.takeProfit1, 0.0)
        assertEquals(plan1.takeProfit2, plan2.takeProfit2, 0.0)
        assertEquals(plan1.takeProfit3, plan2.takeProfit3, 0.0)
        assertEquals(plan1.formattedSl, plan2.formattedSl)
    }

    @Test
    fun testInvalidDataReturnsNull() {
        val candles = createCandles(10, 100.0, 1.0)

        // 1. WAIT side must not generate trade levels
        val waitPlan = TechnicalAnalysisEngine.calculateTradePlan("WAIT", 100.0, 1.5, candles, "BTCUSDT")
        assertNull("WAIT signal must return null trade plan", waitPlan)

        // 2. Zero or negative entry price
        val zeroPlan = TechnicalAnalysisEngine.calculateTradePlan("BUY", 0.0, 1.5, candles, "BTCUSDT")
        assertNull(zeroPlan)

        val negPlan = TechnicalAnalysisEngine.calculateTradePlan("BUY", -50.0, 1.5, candles, "BTCUSDT")
        assertNull(negPlan)

        // 3. NaN or Infinite entry price
        val nanPlan = TechnicalAnalysisEngine.calculateTradePlan("BUY", Double.NaN, 1.5, candles, "BTCUSDT")
        assertNull(nanPlan)

        val infPlan = TechnicalAnalysisEngine.calculateTradePlan("BUY", Double.POSITIVE_INFINITY, 1.5, candles, "BTCUSDT")
        assertNull(infPlan)
    }

    @Test
    fun testCopyAllStringFormat() {
        val candles = createCandles(10, 1.1100, 0.0005)
        val plan = TechnicalAnalysisEngine.calculateTradePlan(
            side = "SELL",
            entryPrice = 1.11364,
            atr = 0.00076,
            candles = candles,
            symbol = "EUR/USD"
        )
        assertNotNull(plan)
        plan!!

        val copyText = buildString {
            appendLine("EURUSD")
            appendLine("SELL")
            appendLine("Entry: ${plan.formattedEntry}")
            appendLine("SL: ${plan.formattedSl}")
            appendLine("TP1: ${plan.formattedTp1}")
            appendLine("TP2: ${plan.formattedTp2}")
            appendLine("TP3: ${plan.formattedTp3}")
            append("Risk/Reward: ${plan.riskRewardRatio}")
        }

        assertTrue(copyText.contains("EURUSD"))
        assertTrue(copyText.contains("SELL"))
        assertTrue(copyText.contains("Entry: ${plan.formattedEntry}"))
        assertTrue(copyText.contains("SL: ${plan.formattedSl}"))
        assertTrue(copyText.contains("TP1: ${plan.formattedTp1}"))
        assertTrue(copyText.contains("TP2: ${plan.formattedTp2}"))
        assertTrue(copyText.contains("TP3: ${plan.formattedTp3}"))
        assertTrue(copyText.contains("Risk/Reward: 1:1 / 1:2 / 1:3"))
    }
}
