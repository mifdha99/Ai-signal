package com.mifdha99.universalsignal.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mifdha99.universalsignal.data.model.*
import com.mifdha99.universalsignal.engine.calculateEmaSeries
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

private val Mt5Bg = Color(0xFF090E1A)
private val PanelBg = Color(0xFF0B101D)
private val GridLineColor = Color(0xFF141E33)
private val BullishGreen = Color(0xFF22C55E)
private val BearishRed = Color(0xFFEF4444)
private val Ema9Color = Color(0xFF60A5FA)
private val Ema21Color = Color(0xFFF59E0B)
private val Ema50Color = Color(0xFFC084FC)

private val EntryColor = Color(0xFFF59E0B)
private val SlColor = Color(0xFFEF4444)
private val Tp1Color = Color(0xFF10B981)
private val Tp2Color = Color(0xFF14B8A6)
private val Tp3Color = Color(0xFF06B6D4)
private val TextMuted = Color(0xFF94A3B8)

@Composable
fun CandleChart(
    candles: List<Candle>,
    signal: SignalResult? = null,
    timeframe: Timeframe? = null,
    instrument: AssetInstrument? = null,
    modifier: Modifier = Modifier
) {
    if (candles.isEmpty()) return

    // Interactive Zoom and Pan state
    var visibleCount by remember { mutableIntStateOf(45) } // Range: 20 to 100
    var panOffset by remember { mutableIntStateOf(0) } // 0 = pinned to latest candle
    var showLevels by remember { mutableStateOf(true) }
    var showEma by remember { mutableStateOf(true) }
    var showInfoPanel by remember { mutableStateOf(true) }

    val totalCandles = candles.size
    val maxPan = max(0, totalCandles - visibleCount)
    val effectivePan = min(panOffset, maxPan)

    // Slice visible candles preserving user's pan offset
    val endIndex = totalCandles - effectivePan
    val startIndex = max(0, endIndex - visibleCount)
    val visibleCandles = candles.subList(startIndex, endIndex)

    // Calculate EMA series for visible candles
    val allCloses = candles.map { it.close }
    val allEma9 = remember(candles) { calculateEmaSeries(allCloses, 9) }
    val allEma21 = remember(candles) { calculateEmaSeries(allCloses, 21) }
    val allEma50 = remember(candles) { calculateEmaSeries(allCloses, 50) }

    val visibleEma9 = if (allEma9.size >= endIndex) allEma9.subList(startIndex, endIndex) else emptyList()
    val visibleEma21 = if (allEma21.size >= endIndex) allEma21.subList(startIndex, endIndex) else emptyList()
    val visibleEma50 = if (allEma50.size >= endIndex) allEma50.subList(startIndex, endIndex) else emptyList()

    val latestCandle = candles.last()
    val runningPrice = latestCandle.close

    // Determine min/max price for the visible window
    val tradePlan = signal?.tradePlan
    var minPrice = visibleCandles.minOf { it.low }
    var maxPrice = visibleCandles.maxOf { it.high }

    if (showLevels && tradePlan != null && signal.side != "WAIT") {
        if (tradePlan.stopLoss > 0) minPrice = min(minPrice, tradePlan.stopLoss)
        if (tradePlan.takeProfit3 > 0) maxPrice = max(maxPrice, tradePlan.takeProfit3)
        if (tradePlan.entryPrice > 0) {
            minPrice = min(minPrice, tradePlan.entryPrice)
            maxPrice = max(maxPrice, tradePlan.entryPrice)
        }
    }

    val pricePadding = max(0.00001, (maxPrice - minPrice) * 0.08)
    val displayMinPrice = minPrice - pricePadding
    val displayMaxPrice = maxPrice + pricePadding
    val priceRange = max(0.000001, displayMaxPrice - displayMinPrice)

    val precision = tradePlan?.precision ?: if (runningPrice > 500) 2 else if (runningPrice > 1) 4 else 6
    val priceFormatter: (Double) -> String = { p ->
        String.format(Locale.US, "%.${precision}f", p)
    }

    val timeFormatter: (Long) -> String = { ts ->
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(ts))
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(PanelBg, RoundedCornerShape(16.dp))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        // TOP HEADER BAR: Symbol, MT5 Badge, Data Status & Toggles
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFF1E3A8A).copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                        .border(1.dp, Color(0xFF3B82F6).copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text("MT5 LIVE", color = Color(0xFF60A5FA), fontSize = 10.sp, fontWeight = FontWeight.Black)
                }

                Text(
                    text = "${signal?.symbol ?: instrument?.symbol ?: "ASET"} • ${timeframe?.label ?: signal?.timeframe ?: "5m"}",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )

                // Data Status Badge (LIVE / DELAYED / STALE)
                val statusText = signal?.dataStatus?.badge ?: "LIVE"
                val (statusBg, statusColor) = when (statusText) {
                    "DELAYED" -> Pair(Color(0xFF78350F), Color(0xFFFBBF24))
                    "STALE" -> Pair(Color(0xFF881337), Color(0xFFFB7185))
                    else -> Pair(Color(0xFF064E3B), Color(0xFF34D399))
                }
                Box(
                    modifier = Modifier
                        .background(statusBg, RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(statusText, color = statusColor, fontSize = 9.sp, fontWeight = FontWeight.Black)
                }
            }

            // Interactive Controls: SL/TP Toggle, EMA Toggle, Zoom In/Out
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                // SL/TP Toggle
                FilledIconToggleButton(
                    checked = showLevels,
                    onCheckedChange = { showLevels = it },
                    modifier = Modifier.size(30.dp),
                    colors = IconButtonDefaults.filledIconToggleButtonColors(
                        checkedContainerColor = Color(0xFFF59E0B).copy(alpha = 0.25f),
                        checkedContentColor = Color(0xFFF59E0B),
                        containerColor = Color(0xFF1E293B),
                        contentColor = TextMuted
                    )
                ) {
                    Text("SL", fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }

                // EMA Toggle
                FilledIconToggleButton(
                    checked = showEma,
                    onCheckedChange = { showEma = it },
                    modifier = Modifier.size(30.dp),
                    colors = IconButtonDefaults.filledIconToggleButtonColors(
                        checkedContainerColor = Color(0xFF3B82F6).copy(alpha = 0.25f),
                        checkedContentColor = Color(0xFF60A5FA),
                        containerColor = Color(0xFF1E293B),
                        contentColor = TextMuted
                    )
                ) {
                    Text("EMA", fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }

                // Zoom Out
                IconButton(
                    onClick = { visibleCount = min(100, visibleCount + 8) },
                    modifier = Modifier.size(30.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Zoom Out", tint = TextMuted, modifier = Modifier.size(16.dp))
                }

                // Zoom In
                IconButton(
                    onClick = { visibleCount = max(20, visibleCount - 8) },
                    modifier = Modifier.size(30.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Zoom In", tint = TextMuted, modifier = Modifier.size(16.dp))
                }
            }
        }

        // COMPACT SIGNAL INFO PANEL (MT5 HUD)
        if (showInfoPanel && signal != null) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                Column(Modifier.padding(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Sinyal Direction
                        val sideColor = when (signal.side) {
                            "BUY" -> BullishGreen
                            "SELL" -> BearishRed
                            else -> TextMuted
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "SINYAL: ${signal.side} (${signal.confidenceScore}%)",
                                color = sideColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        // Running Price
                        Text(
                            text = "HARGA: ${priceFormatter(runningPrice)}",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    if (tradePlan != null && signal.side != "WAIT") {
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("EN: ${tradePlan.formattedEntry}", color = EntryColor, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Text("SL: ${tradePlan.formattedSl}", color = SlColor, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Text("TP1: ${tradePlan.formattedTp1}", color = Tp1Color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Text("TP2: ${tradePlan.formattedTp2}", color = Tp2Color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            Text("RR: ${tradePlan.riskRewardRatio}", color = Tp3Color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Waktu Sinyal: ${signal.time.split(" ").firstOrNull() ?: signal.time}", color = TextMuted, fontSize = 9.sp)
                        Text("Data Terakhir: ${timeFormatter(latestCandle.time)}", color = TextMuted, fontSize = 9.sp)
                    }
                }
            }
        }

        // CANVAS MT5 CANDLESTICK VIEWPORT WITH GESTURE PAN & ZOOM
        Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(totalCandles, maxPan) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val sensitivity = 1.2f
                            val pxPerCandle = size.width / visibleCount
                            val candlesDragged = (dragAmount.x / pxPerCandle * sensitivity).toInt()
                            panOffset = max(0, min(maxPan, panOffset + candlesDragged))
                        }
                    }
            ) {
                val canvasWidth = size.width
                val canvasHeight = size.height
                val rightScaleWidth = 65.dp.toPx()
                val chartAreaWidth = canvasWidth - rightScaleWidth
                val timeAxisHeight = 22.dp.toPx()
                val chartAreaHeight = canvasHeight - timeAxisHeight

                fun getY(price: Double): Float {
                    val normalized = (price - displayMinPrice) / priceRange
                    return (chartAreaHeight - (normalized * chartAreaHeight)).toFloat().coerceIn(0f, chartAreaHeight)
                }

                // 1. Draw MT5 Grid Lines & Right Price Scale
                drawRect(color = Mt5Bg, size = Size(chartAreaWidth, chartAreaHeight))
                drawRect(
                    color = PanelBg,
                    topLeft = Offset(chartAreaWidth, 0f),
                    size = Size(rightScaleWidth, canvasHeight)
                )
                drawLine(
                    color = GridLineColor,
                    start = Offset(chartAreaWidth, 0f),
                    end = Offset(chartAreaWidth, canvasHeight),
                    strokeWidth = 1.dp.toPx()
                )

                val gridLevels = listOf(0.15, 0.35, 0.55, 0.75, 0.95)
                val paint = android.graphics.Paint().apply {
                    color = android.graphics.Color.parseColor("#64748B")
                    textSize = 9.sp.toPx()
                    typeface = android.graphics.Typeface.MONOSPACE
                    isAntiAlias = true
                }

                gridLevels.forEach { ratio ->
                    val y = (chartAreaHeight * ratio).toFloat()
                    val priceVal = displayMaxPrice - ratio * priceRange

                    drawLine(
                        color = GridLineColor,
                        start = Offset(0f, y),
                        end = Offset(chartAreaWidth, y),
                        strokeWidth = 0.8.dp.toPx()
                    )

                    drawContext.canvas.nativeCanvas.drawText(
                        priceFormatter(priceVal),
                        chartAreaWidth + 4.dp.toPx(),
                        y + 3.dp.toPx(),
                        paint
                    )
                }

                // 2. Draw Candlesticks with Accurate Wicks
                val count = visibleCandles.size
                if (count > 0) {
                    val slotWidth = chartAreaWidth / count
                    val candleWidth = max(2f, slotWidth * 0.7f)

                    visibleCandles.forEachIndexed { index, c ->
                        val cx = index * slotWidth + slotWidth / 2f
                        val isUp = c.close >= c.open
                        val color = if (isUp) BullishGreen else BearishRed

                        val yHigh = getY(c.high)
                        val yLow = getY(c.low)
                        val yOpen = getY(c.open)
                        val yClose = getY(c.close)

                        // Wick (sumbu candle)
                        drawLine(
                            color = color,
                            start = Offset(cx, yHigh),
                            end = Offset(cx, yLow),
                            strokeWidth = 1.2.dp.toPx()
                        )

                        // Body
                        val bodyTop = min(yOpen, yClose)
                        val bodyHeight = max(2f, abs(yClose - yOpen))
                        drawRect(
                            color = color,
                            topLeft = Offset(cx - candleWidth / 2f, bodyTop),
                            size = Size(candleWidth, bodyHeight)
                        )
                    }

                    // 3. Draw EMA Overlays
                    if (showEma) {
                        fun drawEma(series: List<Double>, color: Color, width: Float) {
                            if (series.isEmpty()) return
                            val path = Path()
                            series.forEachIndexed { i, v ->
                                val cx = i * slotWidth + slotWidth / 2f
                                val cy = getY(v)
                                if (i == 0) path.moveTo(cx, cy) else path.lineTo(cx, cy)
                            }
                            drawPath(path, color, style = Stroke(width = width))
                        }

                        drawEma(visibleEma50, Ema50Color, 1.2.dp.toPx())
                        drawEma(visibleEma21, Ema21Color, 1.5.dp.toPx())
                        drawEma(visibleEma9, Ema9Color, 1.8.dp.toPx())
                    }

                    // 4. Signal Marker on Signal Candle (BUY / SELL badge)
                    if (signal != null && signal.side != "WAIT") {
                        val isBuy = signal.side == "BUY"
                        val markerColor = if (isBuy) BullishGreen else BearishRed
                        val targetIdx = count - 1 - effectivePan
                        if (targetIdx in 0 until count) {
                            val sigCandle = visibleCandles[targetIdx]
                            val sx = targetIdx * slotWidth + slotWidth / 2f
                            val sy = if (isBuy) getY(sigCandle.low) + 14.dp.toPx() else getY(sigCandle.high) - 14.dp.toPx()

                            drawCircle(color = markerColor, radius = 5.dp.toPx(), center = Offset(sx, sy))
                            val sigPaint = android.graphics.Paint().apply {
                                color = android.graphics.Color.WHITE
                                textSize = 8.sp.toPx()
                                isFakeBoldText = true
                                textAlign = android.graphics.Paint.Align.CENTER
                                typeface = android.graphics.Typeface.MONOSPACE
                            }
                            drawContext.canvas.nativeCanvas.drawText(
                                if (isBuy) "BUY" else "SELL",
                                sx,
                                if (isBuy) sy + 12.dp.toPx() else sy - 8.dp.toPx(),
                                sigPaint
                            )
                        }
                    }

                    // 5. Draw Trade Plan Horizontal Levels (ENTRY, SL, TP1, TP2, TP3)
                    if (showLevels && tradePlan != null && signal != null && signal.side != "WAIT") {
                        fun drawLevel(price: Double, color: Color, label: String) {
                            if (price <= 0) return
                            val y = getY(price)
                            drawLine(
                                color = color,
                                start = Offset(0f, y),
                                end = Offset(chartAreaWidth, y),
                                strokeWidth = 1.2.dp.toPx()
                            )
                            // Right badge
                            drawRect(
                                color = color,
                                topLeft = Offset(chartAreaWidth, y - 7.dp.toPx()),
                                size = Size(rightScaleWidth, 14.dp.toPx())
                            )
                            val badgePaint = android.graphics.Paint().apply {
                                this.color = android.graphics.Color.parseColor("#090E1A")
                                textSize = 8.sp.toPx()
                                isFakeBoldText = true
                                typeface = android.graphics.Typeface.MONOSPACE
                            }
                            drawContext.canvas.nativeCanvas.drawText(
                                "$label ${priceFormatter(price)}",
                                chartAreaWidth + 3.dp.toPx(),
                                y + 3.dp.toPx(),
                                badgePaint
                            )
                        }

                        drawLevel(tradePlan.entryPrice, EntryColor, "EN")
                        drawLevel(tradePlan.stopLoss, SlColor, "SL")
                        drawLevel(tradePlan.takeProfit1, Tp1Color, "TP1")
                        drawLevel(tradePlan.takeProfit2, Tp2Color, "TP2")
                        drawLevel(tradePlan.takeProfit3, Tp3Color, "TP3")
                    }

                    // 6. Running Price Line with Highlight Badge
                    val currentY = getY(runningPrice)
                    val isUp = latestCandle.close >= latestCandle.open
                    val beaconColor = if (isUp) BullishGreen else BearishRed
                    drawLine(
                        color = beaconColor,
                        start = Offset(0f, currentY),
                        end = Offset(chartAreaWidth, currentY),
                        strokeWidth = 1.dp.toPx()
                    )
                    drawRect(
                        color = beaconColor,
                        topLeft = Offset(chartAreaWidth, currentY - 8.dp.toPx()),
                        size = Size(rightScaleWidth, 16.dp.toPx())
                    )
                    val runningPaint = android.graphics.Paint().apply {
                        this.color = android.graphics.Color.parseColor("#090E1A")
                        textSize = 9.sp.toPx()
                        isFakeBoldText = true
                        typeface = android.graphics.Typeface.MONOSPACE
                    }
                    drawContext.canvas.nativeCanvas.drawText(
                        priceFormatter(runningPrice),
                        chartAreaWidth + 3.dp.toPx(),
                        currentY + 3.5.dp.toPx(),
                        runningPaint
                    )

                    // 7. Time Scale Axis at Bottom
                    val timeY = canvasHeight - 4.dp.toPx()
                    val timePaint = android.graphics.Paint().apply {
                        this.color = android.graphics.Color.parseColor("#64748B")
                        textSize = 8.5.sp.toPx()
                        textAlign = android.graphics.Paint.Align.CENTER
                        typeface = android.graphics.Typeface.MONOSPACE
                    }
                    val step = max(5, count / 5)
                    visibleCandles.forEachIndexed { i, c ->
                        if (i % step == 0 || i == count - 1) {
                            val cx = i * slotWidth + slotWidth / 2f
                            drawContext.canvas.nativeCanvas.drawText(
                                timeFormatter(c.time),
                                cx,
                                timeY,
                                timePaint
                            )
                        }
                    }
                }
            }

            // Floating "Kembali ke Terbaru" button when panned back
            if (effectivePan > 0) {
                Button(
                    onClick = { panOffset = 0 },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                    shape = RoundedCornerShape(20.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 26.dp, end = 70.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(12.dp), tint = Color.White)
                    Spacer(Modifier.width(4.dp))
                    Text("Terbaru (-$effectivePan)", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // FOOTER INFO
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Geser chart untuk riwayat • Zoom +/-", color = TextMuted, fontSize = 10.sp)
            Text("Data: ${candles.size} candle", color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        }
    }
}
