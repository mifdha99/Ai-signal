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
import com.mifdha99.universalsignal.data.model.UnifiedConfluenceBreakdown

@Composable
fun NewsAlertBanner(
    confluence: UnifiedConfluenceBreakdown,
    modifier: Modifier = Modifier
) {
    if (!confluence.highImpactNewsActive && !confluence.isConflictDetected) return

    val isHighImpact = confluence.highImpactNewsActive
    val bgColor = if (isHighImpact) Color(0xFF3A141A) else Color(0xFF332211)
    val borderColor = if (isHighImpact) Color(0xFFEF4444) else Color(0xFFF59E0B)
    val titleText = if (isHighImpact) "PERINGATAN BERITA BERDAMPAK TINGGI" else "KONFLIK MAKRO & TEKNIKAL"

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(bgColor, RoundedCornerShape(16.dp))
            .border(1.dp, borderColor.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = titleText,
                color = borderColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Proteksi Risiko Aktif",
                color = Color(0xFF94A3B8),
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = confluence.conflictReason ?: confluence.activeHighImpactEvent ?: "Kondisi pasar berisiko tinggi. Sinyal entri baru ditangguhkan.",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            lineHeight = 16.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Rekomendasi:",
                color = Color(0xFF9CAAC2),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Box(
                modifier = Modifier
                    .background(borderColor, RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "HOLD / WAIT",
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
    }
}
