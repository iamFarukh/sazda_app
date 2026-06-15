package com.sazda

/**
 * Timeline entries store [countdownToNextMs] from
 * `computePrayerWidgetSnapshot(Date(atMs + 1000))`, i.e. one second after the boundary.
 * The wall-clock instant when that countdown hits zero is therefore
 * `(atMs + 1000) + countdownToNextMs`, not `atMs + countdownToNextMs`.
 */
object PrayerWidgetCountdown {
    fun segmentEndWallTimeMs(atMs: Long, countdownToNextMs: Long): Long {
        if (countdownToNextMs <= 0L) return atMs
        return atMs + 1000L + countdownToNextMs
    }
}
