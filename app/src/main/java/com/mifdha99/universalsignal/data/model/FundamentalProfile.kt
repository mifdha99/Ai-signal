package com.mifdha99.universalsignal.data.model

data class FundamentalProfile(
    val symbol: String,
    val category: AssetCategory,
    val sentimentScore: Int, // -100 to +100
    val macroRegime: String,
    val keyDrivers: List<String>,
    val riskFactors: List<String>,
    val upcomingCatalysts: List<String>,
    val updatedAt: Long = System.currentTimeMillis()
)
