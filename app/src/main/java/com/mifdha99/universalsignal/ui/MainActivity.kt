package com.mifdha99.universalsignal.ui

import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.data.repository.MarketRepository
import com.mifdha99.universalsignal.engine.TechnicalAnalysisEngine
import com.mifdha99.universalsignal.ui.components.CandleChart
import com.mifdha99.universalsignal.ui.components.SignalCard
import com.mifdha99.universalsignal.ui.components.TechnicalIndicatorCard
import com.mifdha99.universalsignal.ui.components.TradePlanCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val Bg = Color(0xFF0B1020)
private val Panel = Color(0xFF151D30)
private val Muted = Color(0xFF9CAAC2)
private val Blue = Color(0xFF69A7FF)

open class MainActivity : ComponentActivity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var repository: MarketRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        prefs = getSharedPreferences("universal_signal_prefs", Context.MODE_PRIVATE)
        val savedKey = prefs.getString("twelve_data_api_key", "") ?: ""
        repository = MarketRepository(twelveDataApiKey = savedKey)

        setContent {
            MaterialTheme {
                MainScreen(
                    repository = repository,
                    prefs = prefs,
                    onSaveApiKey = { key ->
                        prefs.edit().putString("twelve_data_api_key", key).apply()
                        repository.setTwelveDataApiKey(key)
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    repository: MarketRepository,
    prefs: SharedPreferences,
    onSaveApiKey: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val lifecycleOwner = LocalLifecycleOwner.current

    var selectedCategory by remember { mutableStateOf(AssetCategory.CRYPTO) }
    var selectedInstrument by remember { mutableStateOf(DefaultInstruments.allInstruments.first()) }
    var selectedTimeframe by remember { mutableStateOf(Timeframe.M5) }

    var searchQuery by remember { mutableStateOf("") }
    var favorites by remember {
        mutableStateOf(prefs.getStringSet("favorite_symbols", emptySet()) ?: emptySet())
    }

    var loading by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<SignalResult?>(null) }
    var candlesList by remember { mutableStateOf<List<Candle>>(emptyList()) }
    var error by remember { mutableStateOf("") }
    var warningMessage by remember { mutableStateOf("") }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var apiKeyInput by remember { mutableStateOf(repository.getTwelveDataApiKey()) }

    // Auto-Refresh state (15s default: ON)
    var autoRefreshEnabled by remember { mutableStateOf(true) }
    var secondsRemaining by remember { mutableStateOf(15) }
    var backoffSecondsRemaining by remember { mutableStateOf(0) }
    var isAppInForeground by remember { mutableStateOf(true) }
    var lastResponseTime by remember { mutableStateOf("") }

    // Lifecycle observer to pause auto-refresh in background and resume in foreground
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> isAppInForeground = true
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> isAppInForeground = false
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val filteredInstruments = remember(selectedCategory, searchQuery, favorites) {
        val list = DefaultInstruments.getByCategory(selectedCategory)
        if (searchQuery.isBlank()) list
        else list.filter {
            it.symbol.contains(searchQuery, ignoreCase = true) || it.name.contains(searchQuery, ignoreCase = true)
        }
    }

    fun executeAnalysis(forceRefresh: Boolean = false, isAuto: Boolean = false) {
        // Prevent concurrent requests
        if (loading) return
        loading = true
        if (!isAuto) {
            error = ""
            warningMessage = ""
        }

        scope.launch {
            try {
                val (candles, providerName) = repository.getCandles(
                    selectedInstrument,
                    selectedTimeframe,
                    forceRefresh = forceRefresh
                )
                candlesList = candles
                result = TechnicalAnalysisEngine.analyze(
                    candles,
                    selectedInstrument,
                    selectedTimeframe,
                    providerName
                )
                lastResponseTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                error = ""
                warningMessage = ""
                backoffSecondsRemaining = 0
                secondsRemaining = 15
            } catch (e: Exception) {
                val isRateLimit = e is MarketDataException.RateLimitException ||
                        e.message?.contains("rate limit", ignoreCase = true) == true ||
                        e.message?.contains("429", ignoreCase = true) == true

                if (isRateLimit) {
                    backoffSecondsRemaining = 30
                }

                val errMsg = e.message ?: "Gagal mengambil data dari provider."

                // If previous result exists, retain it and display a clear warning banner
                if (result != null) {
                    warningMessage = if (isRateLimit) {
                        "Rate limit terlampaui. Auto-refresh dijeda 30 detik. Menampilkan analisis terakhir ($lastResponseTime)."
                    } else {
                        "Pembaruan otomatis gagal: $errMsg. Menampilkan analisis terakhir ($lastResponseTime)."
                    }
                } else {
                    candlesList = emptyList()
                    result = null
                    error = errMsg
                }
                secondsRemaining = 15
            } finally {
                loading = false
            }
        }
    }

    // Auto-analyze when asset or timeframe changes
    LaunchedEffect(selectedInstrument, selectedTimeframe) {
        secondsRemaining = 15
        backoffSecondsRemaining = 0
        executeAnalysis(forceRefresh = true, isAuto = false)
    }

    // Auto-refresh countdown & execution loop (15s interval)
    LaunchedEffect(autoRefreshEnabled, isAppInForeground, selectedInstrument, selectedTimeframe) {
        if (!autoRefreshEnabled || !isAppInForeground) return@LaunchedEffect

        secondsRemaining = 15
        while (isActive) {
            delay(1000L)
            if (backoffSecondsRemaining > 0) {
                backoffSecondsRemaining--
            } else {
                secondsRemaining--
                if (secondsRemaining <= 0) {
                    if (!loading) {
                        executeAnalysis(forceRefresh = true, isAuto = true)
                    }
                    secondsRemaining = 15
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Bg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // App Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "UNIVERSAL SIGNAL AI",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "SINYAL TEKNIKAL • AUTO-REFRESH 15S",
                    color = Muted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            IconButton(onClick = { showSettingsDialog = true }) {
                Icon(Icons.Default.Settings, contentDescription = "Pengaturan", tint = Blue)
            }
        }

        Spacer(Modifier.height(14.dp))

        // Auto-Refresh Status & Control Bar
        Card(
            colors = CardDefaults.cardColors(containerColor = Panel),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    if (!isAppInForeground) Color(0xFFF59E0B)
                                    else if (autoRefreshEnabled) Color(0xFF27D69B)
                                    else Color(0xFF9CAAC2),
                                    RoundedCornerShape(4.dp)
                                )
                        )
                        Text(
                            text = if (!isAppInForeground) "AUTO-REFRESH DIJEDA (BACKGROUND)"
                            else if (backoffSecondsRemaining > 0) "RATE LIMIT BACKOFF (${backoffSecondsRemaining}s)"
                            else if (autoRefreshEnabled) "AUTO-REFRESH AKTIF (15s)"
                            else "AUTO-REFRESH NONAKTIF",
                            color = if (autoRefreshEnabled && isAppInForeground) Color.White else Muted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    if (lastResponseTime.isNotBlank()) {
                        Text(
                            text = "Pembaruan terakhir: $lastResponseTime",
                            color = Muted,
                            fontSize = 10.sp
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (autoRefreshEnabled && isAppInForeground && backoffSecondsRemaining == 0) {
                        Box(
                            modifier = Modifier
                                .background(Blue.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "${secondsRemaining}s",
                                color = Blue,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    Switch(
                        checked = autoRefreshEnabled,
                        onCheckedChange = {
                            autoRefreshEnabled = it
                            if (it) {
                                secondsRemaining = 15
                                backoffSecondsRemaining = 0
                            }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color(0xFF07101F),
                            checkedTrackColor = Color(0xFF27D69B),
                            uncheckedThumbColor = Color(0xFF9CAAC2),
                            uncheckedTrackColor = Color(0xFF1E293B)
                        )
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Retained Data Warning (When auto-refresh fails but last analysis is kept)
        if (warningMessage.isNotBlank()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF332612)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = warningMessage,
                        color = Color(0xFFFDE68A),
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Category Tabs
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            AssetCategory.entries.forEach { category ->
                val isSelected = category == selectedCategory
                Box(
                    modifier = Modifier
                        .background(
                            if (isSelected) Blue else Panel,
                            RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            selectedCategory = category
                            val firstInCat = DefaultInstruments.getByCategory(category).firstOrNull()
                            if (firstInCat != null) selectedInstrument = firstInCat
                        }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = category.displayName,
                        color = if (isSelected) Color(0xFF07101F) else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Asset Selection Card
        Card(
            colors = CardDefaults.cardColors(containerColor = Panel),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(14.dp)) {
                // Search Field
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari simbol atau nama aset...", color = Muted, fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Muted) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Blue,
                        unfocusedBorderColor = Color(0xFF26334F)
                    )
                )

                Spacer(Modifier.height(10.dp))

                // Asset Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    filteredInstruments.forEach { item ->
                        val isSelected = item.symbol == selectedInstrument.symbol
                        val isFav = favorites.contains(item.symbol)

                        Row(
                            modifier = Modifier
                                .background(
                                    if (isSelected) Blue.copy(alpha = 0.2f) else Color(0xFF0C1322),
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { selectedInstrument = item }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = item.symbol,
                                color = if (isSelected) Blue else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Icon(
                                imageVector = if (isFav) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "Favorit",
                                tint = if (isFav) Color(0xFFFF5D70) else Muted,
                                modifier = Modifier
                                    .size(14.dp)
                                    .clickable {
                                        val newFavs = favorites.toMutableSet()
                                        if (isFav) newFavs.remove(item.symbol) else newFavs.add(item.symbol)
                                        favorites = newFavs
                                        prefs.edit().putStringSet("favorite_symbols", newFavs).apply()
                                    }
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))

                // Timeframe Chips
                Text("TIMEFRAME", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Timeframe.entries.forEach { tf ->
                        val isSelected = tf == selectedTimeframe
                        val isSupported = selectedCategory == AssetCategory.CRYPTO || tf.twelveDataInterval != null

                        Box(
                            modifier = Modifier
                                .background(
                                    if (isSelected) Blue else Color(0xFF0C1322),
                                    RoundedCornerShape(8.dp)
                                )
                                .clickable(enabled = isSupported) { selectedTimeframe = tf }
                                .padding(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = tf.label,
                                color = if (!isSupported) Color(0xFF4A5568) else if (isSelected) Color(0xFF07101F) else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))

                // Manual Action Button (ANALISIS SEKARANG)
                Button(
                    onClick = { executeAnalysis(forceRefresh = true, isAuto = false) },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Blue),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (loading) {
                        CircularProgressIndicator(color = Color(0xFF07101F), modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("MENGAMBIL DATA...", color = Color(0xFF07101F), fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF07101F))
                        Spacer(Modifier.width(6.dp))
                        Text("ANALISIS SEKARANG", color = Color(0xFF07101F), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(Modifier.height(14.dp))

        // Fatal Error Banner
        if (error.isNotBlank()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF3A1B2A)),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text("KESALAHAN KONEKSI ATAU DATA", color = Color(0xFFFF5D70), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(error, color = Color.White, fontSize = 12.sp, lineHeight = 16.sp)
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { executeAnalysis(forceRefresh = true, isAuto = false) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF5D70)),
                        modifier = Modifier.align(Alignment.End),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Coba Ulang", fontSize = 11.sp)
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
        }

        // Result Views
        result?.let { res ->
            SignalCard(result = res)
            Spacer(Modifier.height(14.dp))

            TradePlanCard(result = res)
            Spacer(Modifier.height(14.dp))

            if (candlesList.isNotEmpty()) {
                CandleChart(
                    candles = candlesList,
                    signal = res,
                    timeframe = selectedTimeframe,
                    instrument = selectedInstrument
                )
                Spacer(Modifier.height(14.dp))
            }

            TechnicalIndicatorCard(result = res)
            Spacer(Modifier.height(14.dp))
        }

        // Disclaimer
        Card(
            colors = CardDefaults.cardColors(containerColor = Panel),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(12.dp)) {
                Text("PENTING & KETERBUKAAN RISIKO", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Universal Signal AI menggunakan model konfluensi aturan teknikal objektif (EMA, RSI, MACD, ATR) yang diperbarui setiap 15 detik. Sinyal BUY/SELL/WAIT bukan jaminan keuntungan dan bukan prediksi tanpa risiko. Gunakan stop-loss dan manajemen risiko yang terukur.",
                    color = Muted,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }
        }
    }

    // Settings Dialog for API Keys
    if (showSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = { Text("Pengaturan API Provider", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Column(Modifier.fillMaxWidth()) {
                    Text(
                        "Kripto (Binance) menggunakan API publik tanpa memerlukan API key.",
                        color = Muted,
                        fontSize = 12.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Untuk data Forex, Saham AS, Komoditas, dan Indeks, masukkan API key Twelve Data Anda (Daftar gratis di twelvedata.com):",
                        color = Color.White,
                        fontSize = 12.sp
                    )
                    Spacer(Modifier.height(6.dp))
                    OutlinedTextField(
                        value = apiKeyInput,
                        onValueChange = { apiKeyInput = it },
                        placeholder = { Text("Twelve Data API Key", color = Muted) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Catatan: API key disimpan secara privat pada penyimpanan lokal perangkat Anda dan tidak dibagikan ke pihak ketiga.",
                        color = Muted,
                        fontSize = 10.sp
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        onSaveApiKey(apiKeyInput)
                        showSettingsDialog = false
                        executeAnalysis(forceRefresh = true, isAuto = false)
                    }
                ) {
                    Text("Simpan", color = Blue, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettingsDialog = false }) {
                    Text("Batal", color = Muted)
                }
            },
            containerColor = Panel
        )
    }
}
