package com.mifdha99.universalsignal.data.model

data class AssetInstrument(
    val symbol: String,
    val name: String,
    val category: AssetCategory,
    val primaryProvider: String = "Binance",
    val requiresApiKey: Boolean = false,
    val isDelayed: Boolean = false,
    val description: String = ""
)

object DefaultInstruments {
    val allInstruments: List<AssetInstrument> = listOf(
        // CRYPTO (Binance Public API - Realtime, no key required)
        AssetInstrument("BTCUSDT", "Bitcoin", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("ETHUSDT", "Ethereum", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("BNBUSDT", "BNB", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("SOLUSDT", "Solana", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("XRPUSDT", "XRP", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("DOGEUSDT", "Dogecoin", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("ADAUSDT", "Cardano", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("TRXUSDT", "TRON", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("LINKUSDT", "Chainlink", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("AVAXUSDT", "Avalanche", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("DOTUSDT", "Polkadot", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("LTCUSDT", "Litecoin", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("BCHUSDT", "Bitcoin Cash", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("SUIUSDT", "Sui", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),
        AssetInstrument("TONUSDT", "Toncoin", AssetCategory.CRYPTO, "Binance", false, false, "Spot Market"),

        // FOREX (Twelve Data / Free Public Endpoint)
        AssetInstrument("EUR/USD", "Euro / US Dollar", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("GBP/USD", "British Pound / US Dollar", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("USD/JPY", "US Dollar / Japanese Yen", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("USD/CHF", "US Dollar / Swiss Franc", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("AUD/USD", "Australian Dollar / US Dollar", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("USD/CAD", "US Dollar / Canadian Dollar", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("NZD/USD", "New Zealand Dollar / US Dollar", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("EUR/JPY", "Euro / Japanese Yen", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),
        AssetInstrument("GBP/JPY", "British Pound / Japanese Yen", AssetCategory.FOREX, "TwelveData", true, true, "Forex Spot"),

        // SAHAM (Stocks - US Market)
        AssetInstrument("AAPL", "Apple Inc.", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("MSFT", "Microsoft Corporation", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("NVDA", "NVIDIA Corporation", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("GOOGL", "Alphabet Inc.", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("AMZN", "Amazon.com Inc.", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("META", "Meta Platforms Inc.", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("TSLA", "Tesla Inc.", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),
        AssetInstrument("AMD", "Advanced Micro Devices", AssetCategory.STOCKS, "TwelveData", true, true, "NASDAQ (Delayed 15m)"),

        // KOMODITAS (Commodities)
        AssetInstrument("XAU/USD", "Gold Spot (Emas)", AssetCategory.COMMODITIES, "TwelveData", true, true, "Logam Mulia"),
        AssetInstrument("XAG/USD", "Silver Spot (Perak)", AssetCategory.COMMODITIES, "TwelveData", true, true, "Logam Mulia"),
        AssetInstrument("BRENT", "Brent Crude Oil", AssetCategory.COMMODITIES, "TwelveData", true, true, "Komoditas Energi"),
        AssetInstrument("WTI", "WTI Crude Oil", AssetCategory.COMMODITIES, "TwelveData", true, true, "Komoditas Energi"),

        // INDEKS PASAR (Indices)
        AssetInstrument("SPX", "S&P 500 Index", AssetCategory.INDICES, "TwelveData", true, true, "Indeks Pasar AS"),
        AssetInstrument("DJI", "Dow Jones Industrial", AssetCategory.INDICES, "TwelveData", true, true, "Indeks Pasar AS"),
        AssetInstrument("IXIC", "Nasdaq Composite", AssetCategory.INDICES, "TwelveData", true, true, "Indeks Pasar AS")
    )

    fun getByCategory(category: AssetCategory): List<AssetInstrument> {
        return allInstruments.filter { it.category == category }
    }
}
