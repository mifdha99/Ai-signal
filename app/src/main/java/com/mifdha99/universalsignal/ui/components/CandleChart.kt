package com.mifdha99.universalsignal.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mifdha99.universalsignal.data.model.Candle
import com.mifdha99.universalsignal.engine.TechnicalAnalysisEngine
import kotlin.math.max
import kotlin.math.min

private val ChartBg = Color(0xFF151D30)
private val BullishGreen = Color(0xFF27D69B)
private val BearishRed = Color(0xFFFF5D70)
private val Ema9Color = Color(0xFF69A7FF)
private val Ema21Color = Color(0xFFF59E0B)
private val Ema50Color = Color(0xFFA855F7)

@Composable
fun CandleChart(
    candles: List<Candle>,
    modifier: Modifier = Modifier
) {
    if (candles.isEmpty()) return

    // Show last 45 candles for clean mobile display
    val displayCandles = candles.takeLast(45)
    val closes = displayCandles.map { it.close }
    val ema9 = TechnicalAnalysisEngine.calculateEmaSeries(closes, 9)
    val ema21 = TechnicalAnalysisEngine.calculateEmaSeries(closes, 21)
    val ema50 = TechnicalAnalysisEngine.calculateEmaSeries(closes, 50)

    val minPrice = displayCandles.minOf { it.low }
    val maxPrice = displayCandles.maxOf { it.high }
    val priceRange = max(0.000001, maxPrice - minPrice) * 1.06 // 6% padding

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(ChartBg, RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Grafik Candlestick & EMA", color = Color(0xFF9CAAC2), fontSize = 11.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LegendDot("EMA 9", Ema9Color)
                LegendDot("EMA 21", Ema21Color)
                LegendDot("EMA 50", Ema50Color)
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
        ) {
            val width = size.width
            val height = size.height
            val count = displayCandles.size
            val slotWidth = width / count
            val candleWidth = max(2f, slotWidth * 0.65f)

            fun getY(price: Double): Float {
                val normalized = (price - (minPrice - (priceRange * 0.03))) / priceRange
                return (height - (normalized * height)).toFloat().coerceIn(0f, height)
            }

            // Draw candles
            displayCandles.forEachIndexed { index, candle ->
                val cx = index * slotWidth + slotWidth / 2f
                val color = if (candle.close >= candle.open) BullishGreen else BearishRed

                val yHigh = getY(candle.high)
                val yLow = getY(candle.low)
                val yOpen = getY(candle.open)
                val yClose = getY(candle.close)

                // Wick
                drawLine(
                    color = color,
                    start = Offset(cx, yHigh),
                    end = Offset(cx, yLow),
                    strokeWidth = 1.2f
                )

                // Body
                val bodyTop = min(yOpen, yClose)
                val bodyHeight = max(2f, kotlin.math.abs(yClose - yOpen))
                drawRect(
                    color = color,
                    topLeft = Offset(cx - candleWidth / 2f, bodyTop),
                    size = Size(candleWidth, bodyHeight)
                )
            }

            // Draw EMAs
            fun drawEmaLine(emaSeries: List<Double>, color: Color, strokeWidth: Float) {
                if (emaSeries.isEmpty()) return
                val path = Path()
                emaSeries.forEachIndexed { index, value ->
                    val cx = index * slotWidth + slotWidth / 2f
                    val cy = getY(value)
                    if (index == 0) path.moveTo(cx, cy) else path.lineTo(cx, cy)
                }
                drawPath(path = path, color = color, style = Stroke(width = strokeWidth))
            }

            drawEmaLine(ema50, Ema50Color, 1.2f)
            drawEmaLine(ema21, Ema21Color, 1.5f)
            drawEmaLine(ema9, Ema9Color, 1.8f)
        }
    }
}

@Composable
private fun LegendDot(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        Box(modifier = Modifier.size(6.dp).background(color, RoundedCornerShape(3.dp)))
        Text(label, color = Color(0xFF9CAAC2), fontSize = 9.sp)
    }
}
