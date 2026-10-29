package com.mifdha99.universalsignal.data.model

enum class DataStatus(val label: String, val description: String) {
    VALID("Valid (Real-time)", "Data pasar diterima utuh dan tersinkronisasi realtime"),
    DELAYED("Tertunda (Delayed 15m)", "Data pasar resmi tertunda sesuai ketentuan lisensi bursa"),
    INCOMPLETE("Tidak Lengkap", "Jumlah candle historis tidak mencukupi untuk kalkulasi indikator yang stabil"),
    FAILED("Gagal Diambil", "Terjadi kegagalan komunikasi dengan provider pasar")
}
