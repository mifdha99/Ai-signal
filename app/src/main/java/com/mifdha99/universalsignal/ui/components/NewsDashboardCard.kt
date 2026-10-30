package com.mifdha99.universalsignal.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mifdha99.universalsignal.data.model.NewsItem

@Composable
fun NewsDashboardCard(
    news: List<NewsItem>,
    modifier: Modifier = Modifier
) {
    val avgSentiment = if (news.isNotEmpty()) news.map { it.sentimentScore }.average().toInt() else 0
    val sentimentColor = when {
        avgSentiment >= 40 -> Color(0xFF27D69B)
        avgSentiment <= -40 -> Color(0xFFFF5D70)
        else -> Color(0xFFF59E0B)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFF151D30), RoundedCornerShape(16.dp))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "SENTIMEN PASAR GLOBAL",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Skor: ${if (avgSentiment > 0) "+$avgSentiment" else avgSentiment}",
                color = sentimentColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                fontFamily = FontFamily.Monospace
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (news.isEmpty()) {
            Text(
                text = "Tidak ada berita terbaru yang tersedia saat ini.",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                news.take(4).forEach { item ->
                    val isBull = item.sentimentScore >= 20
                    val isBear = item.sentimentScore <= -20
                    val scoreColor = if (isBull) Color(0xFF27D69B) else if (isBear) Color(0xFFFF5D70) else Color(0xFF94A3B8)

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF0F172A), RoundedCornerShape(10.dp))
                            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${item.source} · Dampak: ${item.impact.name}",
                                color = Color(0xFF9CAAC2),
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "Sentimen: ${if (item.sentimentScore > 0) "+${item.sentimentScore}" else item.sentimentScore}",
                                color = scoreColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        Spacer(modifier = Modifier.height(3.dp))

                        Text(
                            text = item.title,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 2
                        )
                    }
                }
            }
        }
    }
}
