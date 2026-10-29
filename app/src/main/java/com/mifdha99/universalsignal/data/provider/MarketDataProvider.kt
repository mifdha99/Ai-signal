package com.mifdha99.universalsignal.data.provider

import com.mifdha99.universalsignal.data.model.AssetInstrument
import com.mifdha99.universalsignal.data.model.Candle
import com.mifdha99.universalsignal.data.model.Timeframe

interface MarketDataProvider {
    val name: String
    suspend fun fetchCandles(instrument: AssetInstrument, timeframe: Timeframe, limit: Int = 200): List<Candle>
    fun supports(instrument: AssetInstrument, timeframe: Timeframe): Boolean
}
