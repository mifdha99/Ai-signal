package com.mifdha99.universalsignal.data.model

enum class DataStatus(val label: String, val badge: String, val description: String) {
    LIVE("LIVE", "LIVE", "Data pasar diterima realtime dan tersinkronisasi"),
    VALID("LIVE", "LIVE", "Data pasar diterima realtime dan tersinkronisasi"),
    DELAYED("DELAYED", "DELAYED", "Data pasar resmi tertunda sesuai ketentuan lisensi bursa"),
    STALE("STALE", "STALE", "Data kedaluwarsa atau koneksi tidak menerima pembaruan"),
    INCOMPLETE("INCOMPLETE", "INCOMPLETE", "Jumlah candle historis tidak mencukupi untuk kalkulasi indikator"),
    FAILED("FAILED", "FAILED", "Terjadi kegagalan komunikasi dengan provider pasar")
}
