package com.mifdha99.universalsignal.data.provider

import com.mifdha99.universalsignal.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLException
import javax.net.ssl.SSLHandshakeException

class BinanceDataProvider(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()
) : MarketDataProvider {

    override val name: String = "Binance Spot Engine"

    // Official Binance endpoints. Some ISPs in Southeast Asia filter api.binance.com,
    // so data-api.binance.vision (Binance's dedicated public data network) provides resilient fallback.
    private val baseUrls = listOf(
        "https://api.binance.com",
        "https://data-api.binance.vision",
        "https://api1.binance.com",
        "https://api2.binance.com",
        "https://api3.binance.com"
    )

    override fun supports(instrument: AssetInstrument, timeframe: Timeframe): Boolean {
        return instrument.category == AssetCategory.CRYPTO
    }

    override suspend fun fetchCandles(
        instrument: AssetInstrument,
        timeframe: Timeframe,
        limit: Int
    ): List<Candle> = withContext(Dispatchers.IO) {
        val interval = timeframe.binanceInterval
        val encodedSymbol = URLEncoder.encode(instrument.symbol, "UTF-8")
        val effectiveLimit = limit.coerceIn(60, 500)

        var lastException: Exception? = null

        for (baseUrl in baseUrls) {
            val url = "$baseUrl/api/v3/klines?symbol=$encodedSymbol&interval=$interval&limit=$effectiveLimit"
            var attempts = 0
            val maxAttempts = 2

            while (attempts < maxAttempts) {
                attempts++
                try {
                    val request = Request.Builder()
                        .url(url)
                        .header("User-Agent", "UniversalSignalAI/2.0")
                        .header("Accept", "application/json")
                        .build()

                    client.newCall(request).execute().use { response ->
                        if (response.code == 429 || response.code == 418) {
                            val retryAfter = response.header("Retry-After")?.toIntOrNull() ?: 30
                            throw MarketDataException.RateLimitException("Binance", retryAfter)
                        }

                        if (!response.isSuccessful) {
                            throw MarketDataException.InvalidResponseException("HTTP ${response.code}: ${response.message}")
                        }

                        val body = response.body?.string()
                            ?: throw MarketDataException.InvalidResponseException("Respons server kosong")

                        val candles = parseCandles(body)
                        if (candles.size < 60) {
                            throw MarketDataException.InsufficientDataException(candles.size, 60)
                        }

                        // Binance's last candle in klines is currently open/forming.
                        // Omit it to ensure calculations only rely on closed, confirmed candles.
                        return@withContext candles.dropLast(1)
                    }
                } catch (e: MarketDataException.RateLimitException) {
                    throw e // Do not retry rate limit
                } catch (e: SSLHandshakeException) {
                    lastException = MarketDataException.SslCertificateException(
                        "Gagal verifikasi sertifikat TLS pada $baseUrl (${e.message}). Periksa pengaturan jam perangkat atau filter jaringan/ISP.",
                        e
                    )
                    break // Try next mirror baseUrl immediately
                } catch (e: SSLException) {
                    lastException = MarketDataException.SslCertificateException(
                        "Koneksi terenkripsi terganggu pada $baseUrl: ${e.message}",
                        e
                    )
                    break // Try next mirror baseUrl immediately
                } catch (e: UnknownHostException) {
                    lastException = MarketDataException.DnsResolutionException(baseUrl, e)
                    break // Domain cannot be resolved, try next mirror
                } catch (e: SocketTimeoutException) {
                    lastException = MarketDataException.TimeoutNetworkException("Batas waktu terlampaui saat memuat data dari $baseUrl")
                    if (attempts < maxAttempts) {
                        delay(500L * attempts)
                    }
                } catch (e: IOException) {
                    lastException = MarketDataException.GenericNetworkException("Koneksi gagal pada $baseUrl: ${e.message}", e)
                    if (attempts < maxAttempts) {
                        delay(500L * attempts)
                    }
                } catch (e: Exception) {
                    lastException = e
                    break
                }
            }
        }

        throw lastException ?: MarketDataException.GenericNetworkException("Gagal mengambil data dari seluruh server Binance mirror.")
    }

    private fun parseCandles(jsonBody: String): List<Candle> {
        val array = JSONArray(jsonBody)
        val list = ArrayList<Candle>(array.length())
        for (i in 0 until array.length()) {
            val item = array.getJSONArray(i)
            list.add(
                Candle(
                    time = item.getLong(0),
                    open = item.getString(1).toDouble(),
                    high = item.getString(2).toDouble(),
                    low = item.getString(3).toDouble(),
                    close = item.getString(4).toDouble(),
                    volume = item.getString(5).toDouble()
                )
            )
        }
        return list
    }
}
