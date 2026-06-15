package com.sazda

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * "Daily Flow" widget — compact horizontal grid of 5 prayer cards
 * matching the iOS WidgetKit compact widget style.
 */
class DailyFlowWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private const val GREEN = "#003527"
        private const val GREEN_MUTED = "#88003527"
        private const val MAKRUH_TEXT = "#8B6508"

        private data class FlowItem(
            val key: String,
            val itemId: Int,
            val iconId: Int,
            val nameId: Int,
            val timeId: Int,
        )

        private val ITEMS = listOf(
            FlowItem("Fajr",    R.id.flow_item_fajr,    R.id.flow_icon_fajr,    R.id.flow_name_fajr,    R.id.flow_time_fajr),
            FlowItem("Dhuhr",   R.id.flow_item_dhuhr,   R.id.flow_icon_dhuhr,   R.id.flow_name_dhuhr,   R.id.flow_time_dhuhr),
            FlowItem("Asr",     R.id.flow_item_asr,     R.id.flow_icon_asr,     R.id.flow_name_asr,     R.id.flow_time_asr),
            FlowItem("Maghrib", R.id.flow_item_maghrib, R.id.flow_icon_maghrib, R.id.flow_name_maghrib, R.id.flow_time_maghrib),
            FlowItem("Isha",    R.id.flow_item_isha,    R.id.flow_icon_isha,    R.id.flow_name_isha,    R.id.flow_time_isha),
        )

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_flow)
            val prefs = context.getSharedPreferences(PrayerWidgetModule.PREFS, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(PrayerWidgetModule.KEY_SNAPSHOT, null)

            if (jsonString != null) {
                try {
                    val json = JSONObject(jsonString)
                    val highlight = json.optString("highlight", "")
                    val dateKey = json.optString("dateKey", "")
                    val mode = json.optString("mode", "active")
                    val title = json.optString("title", "")
                    val subtitle = json.optString("subtitle", "")
                    val countdown = json.optString("countdownLabelMin", "")
                    val city = json.optString("city", "")
                    val isStale = json.optBoolean("isStale", false)
                    val staleLabel = json.optString("staleLabel", "")
                    val periodNote = json.optString("periodNote", "")

                    views.setTextViewText(R.id.flow_title, "Daily Flow")
                    views.setTextViewText(R.id.flow_date, formatDateKey(dateKey))
                    views.setTextViewText(R.id.flow_city, city)

                    if (periodNote.isNotEmpty() && (mode == "between" || mode == "night")) {
                        views.setTextViewText(R.id.flow_period_note, periodNote)
                        views.setViewVisibility(R.id.flow_period_note, View.VISIBLE)
                    } else {
                        views.setTextViewText(R.id.flow_period_note, "")
                        views.setViewVisibility(R.id.flow_period_note, View.GONE)
                    }

                    val schedule = json.optJSONArray("schedule")
                    var currentHighlight = highlight
                    var finalStatusText = when (mode) {
                        "makruh" -> "⚠ $title · $subtitle"
                        "night" -> "🌙 $title · $subtitle"
                        else -> "$title · $subtitle"
                    }
                    var statusColor = when (mode) {
                        "makruh" -> Color.parseColor(MAKRUH_TEXT)
                        else -> Color.parseColor(GREEN)
                    }

                    // Use timeline to accurately calculate the active state
                    val timeline = json.optJSONArray("timeline")
                    if (timeline != null && timeline.length() > 0) {
                        val now = System.currentTimeMillis()
                        var activeEntry: JSONObject? = null

                        for (i in 0 until timeline.length()) {
                            val entry = timeline.getJSONObject(i)
                            val t = entry.optLong("atMs", 0L)
                            if (now >= t) {
                                activeEntry = entry
                            } else {
                                break
                            }
                        }

                        if (activeEntry != null) {
                            currentHighlight = activeEntry.optString("highlight", "")
                            val activeMode = activeEntry.optString("mode", "active")
                            val activeTitle = activeEntry.optString("title", "")
                            val activeSubtitle = activeEntry.optString("subtitle", "")
                            val activeNextName = activeEntry.optString("nextName", "")
                            
                            val atMs = activeEntry.optLong("atMs", 0L)
                            val cdMs = activeEntry.optLong("countdownToNextMs", 0L)
                            val targetTimeMs = PrayerWidgetCountdown.segmentEndWallTimeMs(atMs, cdMs)
                            val remainingMs = targetTimeMs - now
                            
                            val secondaryText = when (activeMode) {
                                "makruh" -> "Next: ${PrayerUiLabels.displayName(activeNextName)} in %s"
                                "active" -> "Ends in %s"
                                "between", "night" -> "In %s"
                                else -> activeSubtitle
                            }
                            
                            finalStatusText = when (activeMode) {
                                "makruh" -> "⚠ $activeTitle · $secondaryText"
                                "night" -> "🌙 $activeTitle · $secondaryText"
                                else -> "$activeTitle · $secondaryText"
                            }
                            
                            if (remainingMs > 0L && finalStatusText.contains("%s")) {
                                views.setChronometerCountDown(R.id.flow_status, true)
                                views.setChronometer(
                                    R.id.flow_status,
                                    SystemClock.elapsedRealtime() + remainingMs,
                                    finalStatusText,
                                    true,
                                )
                            } else {
                                views.setChronometerCountDown(R.id.flow_status, false)
                                val fallback = activeEntry.optString("countdownLabelMin", "").ifEmpty { "0:00" }
                                views.setChronometer(
                                    R.id.flow_status,
                                    0L,
                                    finalStatusText.replace("%s", fallback),
                                    false,
                                )
                            }
                            
                            statusColor = when (activeMode) {
                                "makruh" -> Color.parseColor(MAKRUH_TEXT)
                                else -> Color.parseColor(GREEN)
                            }
                        }
                    }

                    views.setTextColor(R.id.flow_status, statusColor)
                    views.setViewVisibility(R.id.flow_status, View.VISIBLE)

                    if (isStale && staleLabel.isNotEmpty()) {
                        views.setChronometerCountDown(R.id.flow_status, false)
                        views.setChronometer(
                            R.id.flow_status,
                            0L,
                            "$finalStatusText · $staleLabel".replace("%s", "--"),
                            false,
                        )
                    }

                    if (schedule != null) {
                        for (i in 0 until schedule.length().coerceAtMost(5)) {
                            val entry = schedule.getJSONObject(i)
                            val name = entry.optString("name", "")
                            val time12 = entry.optString("time12", "--")

                            val item = ITEMS.find { it.key == name } ?: continue
                            views.setTextViewText(item.nameId, PrayerUiLabels.displayName(name).uppercase())
                            views.setTextViewText(item.timeId, time12)

                            val isHighlighted = name == currentHighlight
                            if (isHighlighted) {
                                views.setInt(item.itemId, "setBackgroundResource", R.drawable.widget_row_highlight_bg)
                                views.setTextColor(item.nameId, Color.WHITE)
                                views.setTextColor(item.timeId, Color.WHITE)
                                views.setInt(item.iconId, "setColorFilter", Color.WHITE)
                            } else {
                                views.setInt(item.itemId, "setBackgroundResource", R.drawable.widget_flow_item_bg)
                                views.setTextColor(item.nameId, Color.parseColor(GREEN))
                                views.setTextColor(item.timeId, Color.parseColor(GREEN_MUTED))
                                views.setInt(item.iconId, "setColorFilter", Color.parseColor(GREEN))
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    views.setTextViewText(R.id.flow_title, "Daily Flow")
                    views.setTextViewText(R.id.flow_date, "Open Sazda")
                    views.setViewVisibility(R.id.flow_status, View.GONE)
                }
            } else {
                views.setTextViewText(R.id.flow_title, "Daily Flow")
                views.setTextViewText(R.id.flow_date, "Open Sazda to load")
                views.setViewVisibility(R.id.flow_status, View.GONE)
            }

            // Tap opens the app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, 1, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.flow_title, pendingIntent)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun formatDateKey(dateKey: String): String {
            if (dateKey.isEmpty()) return ""
            return try {
                val parts = dateKey.split("-")
                if (parts.size != 3) return dateKey
                val day = parts[0].toInt()
                val month = parts[1].toInt()
                val months = arrayOf(
                    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                )
                val dayNames = arrayOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
                val cal = java.util.Calendar.getInstance()
                cal.set(parts[2].toInt(), month - 1, day)
                val dayOfWeek = dayNames[cal.get(java.util.Calendar.DAY_OF_WEEK) - 1]
                "$dayOfWeek, $day ${months[month]}"
            } catch (e: Exception) {
                dateKey
            }
        }
    }
}
