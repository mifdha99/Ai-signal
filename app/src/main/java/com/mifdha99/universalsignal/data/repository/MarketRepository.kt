package com.mifdha99.universalsignal.data.repository

import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.data.provider.BinanceDataProvider
import com.mifdha99.universalsignal.data.provider.MarketDataProvider
import com.mifdha99.universalsignal.data.provider.TwelveDataProvider
import java.util.concurrent.ConcurrentHashMap

class MarketRepository(
    private var twelveDataApiKey: String = ""
) {
    private val binanceProvider = BinanceDataProvider()
    private val twelveDataProvider = TwelveDataProvider(apiKeyProvider = { twelveDataApiKey })

    private val providers: List<MarketDataProvider> = listOf(
        binanceProvider,
        twelveDataProvider
    )

    private data class CacheEntry(val timestamp: Long, val candles: List<Candle>)
    private val cache = ConcurrentHashMap<String, CacheEntry>()
    private val cacheTtlMs = 15_000L // 15 seconds

    fun setTwelveDataApiKey(key: String) {
        this.twelveDataApiKey = key.trim()
        cache.clear()
    }

    fun getTwelveDataApiKey(): String = twelveDataApiKey

    suspend fun getCandles(
        instrument: AssetInstrument,
        timeframe: Timeframe,
        forceRefresh: Boolean = false
    ): Pair<List<Candle>, String> {
        val cacheKey = "${instrument.symbol}_${timeframe.label}"
        val now = System.currentTimeMillis()

        if (!forceRefresh) {
            val cached = cache[cacheKey]
            if (cached != null && (now - cached.timestamp) < cacheTtlMs) {
                val providerName = if (instrument.category == AssetCategory.CRYPTO) binanceProvider.name else twelveDataProvider.name
                return Pair(cached.candles, providerName)
            }
        }

        val provider = providers.firstOrNull { it.supports(instrument, timeframe) }
            ?: throw MarketDataException.UnsupportedTimeframeException(
                instrument.symbol,
                timeframe.label,
                "Provider yang tersedia"
            )

        val candles = provider.fetchCandles(instrument, timeframe)
        cache[cacheKey] = CacheEntry(now, candles)
        return Pair(candles, provider.name)
    }
}
