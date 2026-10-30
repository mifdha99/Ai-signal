package com.mifdha99.universalsignal.ui.components

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mifdha99.universalsignal.data.model.SignalResult
import com.mifdha99.universalsignal.data.model.TradePlan

private val PanelBg = Color(0xFF151D30)
private val CardBg = Color(0xFF0F172A)
private val TextMuted = Color(0xFF9CAAC2)
private val ColorGreen = Color(0xFF27D69B)
private val ColorRed = Color(0xFFFF5D70)
private val ColorAmber = Color(0xFFF59E0B)
private val Blue = Color(0xFF69A7FF)

@Composable
fun TradePlanCard(result: SignalResult) {
    val plan = result.tradePlan
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    Card(
        colors = CardDefaults.cardColors(containerColor = PanelBg),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        Icons.Default.Shield,
                        contentDescription = null,
                        tint = Blue,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "MANAJEMEN RISIKO (SL & TP)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .background(Blue.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 7.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "ATR & STRUKTUR HARGA",
                        color = Blue,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            if (plan == null || (result.side != "BUY" && result.side != "SELL")) {
                // Neutral / WAIT state
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0C1322), RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = ColorAmber,
                            modifier = Modifier.size(20.dp).padding(top = 1.dp)
                        )
                        Column {
                            Text(
                                text = "Sinyal WAIT (Menunggu Konfirmasi)",
                                color = ColorAmber,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "Level Entry, Stop Loss, dan Take Profit hanya dihitung otomatis saat mesin mendeteksi sinyal BUY atau SELL yang valid.",
                                color = TextMuted,
                                fontSize = 11.sp,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            } else {
                // Summary Meta Info
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(CardBg, RoundedCornerShape(10.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("ARAH", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(
                            text = result.side,
                            color = if (result.side == "BUY") ColorGreen else ColorRed,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Column {
                        Text("INSTRUMEN", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(result.symbol, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Column {
                        Text("TIMEFRAME", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(result.timeframe, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("RISK / REWARD", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text(plan.riskRewardRatio, color = Blue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(10.dp))

                // Price Levels with individual copy buttons
                TradeLevelRow(
                    label = "ENTRY",
                    priceFormatted = plan.formattedEntry,
                    badgeText = "HARGA PASAR",
                    badgeColor = Blue,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(plan.formattedEntry))
                        Toast.makeText(context, "Entry berhasil disalin", Toast.LENGTH_SHORT).show()
                    }
                )

                TradeLevelRow(
                    label = "STOP LOSS (SL)",
                    priceFormatted = plan.formattedSl,
                    badgeText = if (result.side == "BUY") "DI BAWAH ENTRY" else "DI ATAS ENTRY",
                    badgeColor = ColorRed,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(plan.formattedSl))
                        Toast.makeText(context, "SL berhasil disalin", Toast.LENGTH_SHORT).show()
                    }
                )

                TradeLevelRow(
                    label = "TAKE PROFIT 1 (TP1)",
                    priceFormatted = plan.formattedTp1,
                    badgeText = "RR 1:1",
                    badgeColor = ColorGreen,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(plan.formattedTp1))
                        Toast.makeText(context, "TP1 berhasil disalin", Toast.LENGTH_SHORT).show()
                    }
                )

                TradeLevelRow(
                    label = "TAKE PROFIT 2 (TP2)",
                    priceFormatted = plan.formattedTp2,
                    badgeText = "RR 1:2",
                    badgeColor = ColorGreen,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(plan.formattedTp2))
                        Toast.makeText(context, "TP2 berhasil disalin", Toast.LENGTH_SHORT).show()
                    }
                )

                TradeLevelRow(
                    label = "TAKE PROFIT 3 (TP3)",
                    priceFormatted = plan.formattedTp3,
                    badgeText = "RR 1:3",
                    badgeColor = ColorGreen,
                    onCopy = {
                        clipboardManager.setText(AnnotatedString(plan.formattedTp3))
                        Toast.makeText(context, "TP3 berhasil disalin", Toast.LENGTH_SHORT).show()
                    }
                )

                Spacer(Modifier.height(12.dp))

                // COPY ALL Button
                Button(
                    onClick = {
                        val text = buildString {
                            appendLine(result.symbol.replace("/", ""))
                            appendLine(result.side)
                            appendLine("Entry: ${plan.formattedEntry}")
                            appendLine("SL: ${plan.formattedSl}")
                            appendLine("TP1: ${plan.formattedTp1}")
                            appendLine("TP2: ${plan.formattedTp2}")
                            appendLine("TP3: ${plan.formattedTp3}")
                            append("Risk/Reward: ${plan.riskRewardRatio}")
                        }
                        clipboardManager.setText(AnnotatedString(text))
                        Toast.makeText(context, "Semua level berhasil disalin", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        Icons.Default.ContentCopy,
                        contentDescription = "Salin Semua",
                        tint = Blue,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "COPY ALL (SALIN SEMUA LEVEL)",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun TradeLevelRow(
    label: String,
    priceFormatted: String,
    badgeText: String,
    badgeColor: Color,
    onCopy: () -> Unit
) {
    var justCopied by remember { mutableStateOf(false) }

    LaunchedEffect(justCopied) {
        if (justCopied) {
            kotlinx.coroutines.delay(1500)
            justCopied = false
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
            .background(Color(0xFF0C1322), RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = label,
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Box(
                    modifier = Modifier
                        .background(badgeColor.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = badgeText,
                        color = badgeColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(Modifier.height(2.dp))
            Text(
                text = priceFormatted,
                color = Color.White,
                fontSize = 14.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )
        }

        OutlinedButton(
            onClick = {
                justCopied = true
                onCopy()
            },
            modifier = Modifier.height(32.dp),
            shape = RoundedCornerShape(8.dp),
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = if (justCopied) Blue.copy(alpha = 0.2f) else Color.Transparent
            ),
            border = BorderStroke(1.dp, if (justCopied) Blue else Color(0xFF26334F))
        ) {
            if (justCopied) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Tersalin",
                    tint = Blue,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Tersalin", color = Blue, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            } else {
                Icon(
                    Icons.Default.ContentCopy,
                    contentDescription = "Salin",
                    tint = TextMuted,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text("Copy", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
