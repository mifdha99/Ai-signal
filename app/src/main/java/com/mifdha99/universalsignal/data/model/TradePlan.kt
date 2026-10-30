package com.mifdha99.universalsignal.data.model

data class TradePlan(
    val entryPrice: Double,
    val stopLoss: Double,
    val takeProfit1: Double,
    val takeProfit2: Double,
    val takeProfit3: Double,
    val riskRewardRatio: String = "1:1 / 1:2 / 1:3",
    val riskDistance: Double,
    val precision: Int,
    val formattedEntry: String,
    val formattedSl: String,
    val formattedTp1: String,
    val formattedTp2: String,
    val formattedTp3: String
)
