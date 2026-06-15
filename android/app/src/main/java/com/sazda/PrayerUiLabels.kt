package com.sazda

/** User-visible salah names; JSON / logic still uses canonical keys (e.g. `Dhuhr`). */
object PrayerUiLabels {
    fun displayName(canonical: String): String = when (canonical) {
        "Dhuhr", "Dhuhar" -> "Zohar"
        else -> canonical
    }
}
