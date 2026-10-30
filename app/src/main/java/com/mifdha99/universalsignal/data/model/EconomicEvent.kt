package com.mifdha99.universalsignal.data.model

enum class EventStatus {
    UPCOMING,
    ACTIVE,
    RELEASED
}

data class EconomicEvent(
    val id: String,
    val event: String,
    val currency: String,
    val country: String,
    val impact: ImpactLevel,
    val scheduledTime: Long,
    val previous: String,
    val forecast: String,
    val actual: String? = null,
    val status: EventStatus = EventStatus.UPCOMING,
    val marketImplication: String = "",
    val affectedSymbols: List<String> = emptyList()
)
