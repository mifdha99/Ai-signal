package com.mifdha99.universalsignal.data.provider

import com.mifdha99.universalsignal.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLHandshakeException

class TwelveDataProvider(
    private var apiKeyProvider: () -> String? = { null },
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()
) : MarketDataProvider {

    override val name: String = "Twelve Data Multi-Asset Engine"

    override fun supports(instrument: AssetInstrument, timeframe: Timeframe): Boolean {
        // Twelve Data free tier does not support 3m natively
        if (timeframe.twelveDataInterval == null) return false
        return instrument.category in listOf(
            AssetCategory.FOREX,
            AssetCategory.STOCKS,
            AssetCategory.COMMODITIES,
            AssetCategory.INDICES
        )
    }

    override suspend fun fetchCandles(
        instrument: AssetInstrument,
        timeframe: Timeframe,
        limit: Int
    ): List<Candle> = withContext(Dispatchers.IO) {
        val interval = timeframe.twelveDataInterval
            ?: throw MarketDataException.UnsupportedTimeframeException(instrument.symbol, timeframe.label, name)

        val key = apiKeyProvider()
        if (key.isNullOrBlank()) {
            throw MarketDataException.ApiKeyRequiredException(
                "Twelve Data (Forex, Saham, Komoditas, & Indeks memerlukan API key Twelve Data gratis dari twelvedata.com)."
            )
        }

        val encodedSymbol = URLEncoder.encode(instrument.symbol, "UTF-8")
        val effectiveLimit = limit.coerceIn(60, 200)
        val url = "https://api.twelvedata.com/time_series?symbol=$encodedSymbol&interval=$interval&outputsize=$effectiveLimit&apikey=$key"

        try {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "UniversalSignalAI/2.0")
                .header("Accept", "application/json")
                .build()

            client.newCall(request).execute().use { response ->
                val body = response.body?.string()
                    ?: throw MarketDataException.InvalidResponseException("Respons Twelve Data kosong")

                val json = JSONObject(body)

                if (json.has("status") && json.getString("status") == "error") {
                    val message = json.optString("message", "Terjadi kesalahan pada Twelve Data")
                    val code = json.optInt("code", 0)
                    if (code == 429 || message.contains("limit", ignoreCase = true) || message.contains("minute", ignoreCase = true)) {
                        throw MarketDataException.RateLimitException("Twelve Data (Batas paket gratis: 8 request/menit)")
                    }
                    if (code == 401 || message.contains("api key", ignoreCase = true)) {
                        throw MarketDataException.ApiKeyRequiredException("API key Twelve Data tidak valid atau sudah kadaluarsa")
                    }
                    throw MarketDataException.InvalidResponseException("Twelve Data error: $message")
                }

                if (!json.has("values")) {
                    throw MarketDataException.InvalidResponseException("Data 'values' tidak ditemukan dalam respons Twelve Data")
                }

                val values = json.getJSONArray("values")
                if (values.length() < 60) {
                    throw MarketDataException.InsufficientDataException(values.length(), 60)
                }

                val list = ArrayList<Candle>(values.length())
                val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val dateOnlyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }

                for (i in 0 until values.length()) {
                    val row = values.getJSONObject(i)
                    val dtStr = row.getString("datetime")
                    val timestamp = try {
                        dateFormat.parse(dtStr)?.time ?: (dateOnlyFormat.parse(dtStr)?.time ?: System.currentTimeMillis())
                    } catch (e: Exception) {
                        System.currentTimeMillis()
                    }

                    list.add(
                        Candle(
                            time = timestamp,
                            open = row.getString("open").toDouble(),
                            high = row.getString("high").toDouble(),
                            low = row.getString("low").toDouble(),
                            close = row.getString("close").toDouble(),
                            volume = row.optString("volume", "0.0").toDoubleOrNull() ?: 0.0
                        )
                    )
                }

                // Twelve Data provides newest first; reverse so oldest is first (chronological order)
                list.reverse()

                // Omit the current running candle to analyze only closed periods
                return@withContext list.dropLast(1)
            }
        } catch (e: SSLHandshakeException) {
            throw MarketDataException.SslCertificateException("Validasi TLS gagal menghubungi Twelve Data: ${e.message}", e)
        } catch (e: UnknownHostException) {
            throw MarketDataException.DnsResolutionException("api.twelvedata.com", e)
        } catch (e: SocketTimeoutException) {
            throw MarketDataException.TimeoutNetworkException("Batas waktu koneksi ke Twelve Data terlampaui")
        } catch (e: MarketDataException) {
            throw e
        } catch (e: Exception) {
            throw MarketDataException.GenericNetworkException("Kesalahan saat memproses data Twelve Data: ${e.message}", e)
        }
    }
}
