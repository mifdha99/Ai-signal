package com.mifdha99.universalsignal.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mifdha99.universalsignal.data.model.DataStatus
import com.mifdha99.universalsignal.data.model.SignalResult
import java.util.Locale

private val PanelBg = Color(0xFF151D30)
private val TextMuted = Color(0xFF9CAAC2)
private val ColorGreen = Color(0xFF27D69B)
private val ColorRed = Color(0xFFFF5D70)
private val ColorAmber = Color(0xFFF59E0B)

@Composable
fun SignalCard(result: SignalResult) {
    val (sideColor, bgColor) = when (result.side) {
        "BUY" -> Pair(ColorGreen, Color(0xFF103B35))
        "SELL" -> Pair(ColorRed, Color(0xFF421F2B))
        else -> Pair(ColorAmber, Color(0xFF2D2615)) // WAIT
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(22.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("HASIL ANALISIS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                StatusBadge(status = result.dataStatus)
            }

            Spacer(Modifier.height(8.dp))
            Text(
                text = result.side,
                color = sideColor,
                fontSize = 44.sp,
                fontWeight = FontWeight.Black
            )

            Text(
                text = "${result.symbol} • ${result.timeframe}",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(Modifier.height(10.dp))
            Text(
                text = "Harga Terakhir: ${formatPrice(result.price)}",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold
            )

            if (result.confidenceScore > 0) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Tingkat Keyakinan Konfluensi: ", color = TextMuted, fontSize = 12.sp)
                    Text(
                        "${result.confidenceScore}%",
                        color = sideColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(6.dp))
            Text(
                text = "Sumber: ${result.provider} • ${result.time}",
                color = TextMuted,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
fun TechnicalIndicatorCard(result: SignalResult) {
    Card(
        colors = CardDefaults.cardColors(containerColor = PanelBg),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text("RINGKASAN INDIKATOR TEKNIKAL", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Spacer(Modifier.height(10.dp))

            MetricRow("RSI (14)", "%.2f".format(Locale.US, result.rsi))
            MetricRow("EMA (9)", formatPrice(result.ema9))
            MetricRow("EMA (21)", formatPrice(result.ema21))
            MetricRow("EMA (50)", formatPrice(result.ema50))
            MetricRow("MACD Histogram", "%.6f".format(Locale.US, result.macdHist))
            MetricRow("ATR (14 - Volatilitas)", formatPrice(result.atr14))

            if (result.change24h != 0.0) {
                val isPositive = result.change24h >= 0
                MetricRow(
                    label = "Perubahan Sesi",
                    value = "${if (isPositive) "+" else ""}${"%.2f".format(Locale.US, result.change24h)}%",
                    color = if (isPositive) ColorGreen else ColorRed
                )
            }

            Spacer(Modifier.height(10.dp))
            Box(
                Modifier.fillMaxWidth()
                    .background(Color(0xFF0C1322), RoundedCornerShape(10.dp))
                    .padding(12.dp)
            ) {
                Column {
                    Text("Alasan Logika Sinyal:", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text(result.reason, color = TextMuted, fontSize = 12.sp, lineHeight = 17.sp)
                }
            }
        }
    }
}

@Composable
fun StatusBadge(status: DataStatus) {
    val (color, text) = when (status) {
        DataStatus.LIVE -> Pair(ColorGreen, "REALTIME")
        DataStatus.VALID -> Pair(ColorGreen, "REALTIME")
        DataStatus.DELAYED -> Pair(ColorAmber, "DELAYED 15M")
        DataStatus.STALE -> Pair(ColorRed, "STALE")
        DataStatus.INCOMPLETE -> Pair(ColorAmber, "DATA KURANG")
        DataStatus.FAILED -> Pair(ColorRed, "GAGAL")
    }

    Box(
        modifier = Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
            .padding(horizontal = 7.dp, vertical = 2.dp)
    ) {
        Text(text, color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun MetricRow(label: String, value: String, color: Color = Color.White) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = TextMuted, fontSize = 13.sp)
        Text(value, color = color, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

private fun formatPrice(price: Double): String {
    return if (price >= 100.0) {
        "%.2f".format(Locale.US, price)
    } else if (price >= 1.0) {
        "%.4f".format(Locale.US, price)
    } else {
        "%.6f".format(Locale.US, price)
    }
}
