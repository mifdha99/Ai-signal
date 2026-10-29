package com.mifdha99.universalsignal

import com.mifdha99.universalsignal.data.model.Candle
import org.junit.Assert.*
import org.junit.Test

class DataParsingTest {

    @Test
    fun testParseBinanceKlineRow() {
        val jsonString = """
            [
              [
                1700000000000,
                "90000.50",
                "90500.00",
                "89800.00",
                "90200.00",
                "15.420"
              ]
            ]
        """.trimIndent()

        val candle = parseKlineRow(jsonString)

        assertEquals(1700000000000L, candle.time)
        assertEquals(90000.50, candle.open, 0.001)
        assertEquals(90500.00, candle.high, 0.001)
        assertEquals(89800.00, candle.low, 0.001)
        assertEquals(90200.00, candle.close, 0.001)
        assertEquals(15.420, candle.volume, 0.001)
        assertTrue("Candle with close >= open must be bullish", candle.isBullish)
    }

    private fun parseKlineRow(json: String): Candle {
        return try {
            val array = org.json.JSONArray(json)
            val row = array.getJSONArray(0)
            Candle(
                time = row.getLong(0),
                open = row.getString(1).toDouble(),
                high = row.getString(2).toDouble(),
                low = row.getString(3).toDouble(),
                close = row.getString(4).toDouble(),
                volume = row.getString(5).toDouble()
            )
        } catch (e: RuntimeException) {
            // Safe fallback for unmocked Android SDK environments
            val cleaned = json.replace("[", "").replace("]", "").replace("\"", "").trim()
            val tokens = cleaned.split(",").map { it.trim() }
            Candle(
                time = tokens[0].toLong(),
                open = tokens[1].toDouble(),
                high = tokens[2].toDouble(),
                low = tokens[3].toDouble(),
                close = tokens[4].toDouble(),
                volume = tokens[5].toDouble()
            )
        }
    }

    @Test
    fun testDropLastFormingCandle() {
        val candles = (1..65).map {
            Candle(it.toLong(), 100.0, 105.0, 95.0, 102.0, 10.0)
        }
        val finalCandles = candles.dropLast(1)
        assertEquals(64, finalCandles.size)
    }
}
