package com.mifdha99.universalsignal.data.model

sealed class MarketDataException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class SslCertificateException(message: String, cause: Throwable? = null) :
        MarketDataException("Validasi sertifikat SSL/TLS gagal: $message. Kemungkinan ISP/jaringan memblokir domain atau sertifikat tidak cocok.", cause)

    class DnsResolutionException(host: String, cause: Throwable? = null) :
        MarketDataException("Gagal menemukan domain server ($host). Periksa koneksi internet atau coba jaringan lain.", cause)

    class TimeoutNetworkException(message: String = "Server tidak merespons tepat waktu") :
        MarketDataException("Koneksi timeout: $message. Server pasar mungkin sedang sibuk.")

    class RateLimitException(provider: String, resetSeconds: Int? = null) :
        MarketDataException("Batas permintaan ($provider Rate Limit) terlampaui. Harap tunggu ${resetSeconds ?: 30} detik sebelum mencoba lagi.")

    class ApiKeyRequiredException(provider: String) :
        MarketDataException("Instrumen ini memerlukan API key $provider yang valid. Masukkan API key di menu Pengaturan.")

    class InvalidResponseException(details: String) :
        MarketDataException("Respons pasar tidak valid atau kosong: $details")

    class UnsupportedTimeframeException(symbol: String, interval: String, provider: String) :
        MarketDataException("Timeframe $interval tidak didukung oleh $provider untuk simbol $symbol.")

    class InsufficientDataException(count: Int, required: Int = 60) :
        MarketDataException("Data historis tidak cukup ($count candle didapat, minimal $required candle diperlukan).")

    class GenericNetworkException(message: String, cause: Throwable? = null) :
        MarketDataException(message, cause)
}
