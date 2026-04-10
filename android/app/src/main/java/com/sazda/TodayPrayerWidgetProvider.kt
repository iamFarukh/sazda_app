package com.sazda

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * "Today's prayers" widget — full vertical list of all five salāh
 * with countdown to the next prayer, matching the iOS WidgetKit design.
 */
class TodayPrayerWidgetProvider : AppWidgetProvider() {

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
        private const val GREEN_DIM = "#66003527"
        private const val HIGHLIGHT_BG_COLOR = 0x14003527.toInt() // ~8% green

        private data class PrayerRow(
            val key: String,
            val rowId: Int,
            val nameId: Int,
            val timeId: Int,
        )

        private val ROWS = listOf(
            PrayerRow("Fajr",    R.id.widget_row_fajr,    R.id.widget_name_fajr,    R.id.widget_time_fajr),
            PrayerRow("Dhuhr",   R.id.widget_row_dhuhr,   R.id.widget_name_dhuhr,   R.id.widget_time_dhuhr),
            PrayerRow("Asr",     R.id.widget_row_asr,     R.id.widget_name_asr,     R.id.widget_time_asr),
            PrayerRow("Maghrib", R.id.widget_row_maghrib, R.id.widget_name_maghrib, R.id.widget_time_maghrib),
            PrayerRow("Isha",    R.id.widget_row_isha,    R.id.widget_name_isha,    R.id.widget_time_isha),
        )

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_today_prayer)
            val prefs = context.getSharedPreferences(PrayerWidgetModule.PREFS, Context.MODE_PRIVATE)
            val jsonString = prefs.getString(PrayerWidgetModule.KEY_SNAPSHOT, null)

            if (jsonString != null) {
                try {
                    val json = JSONObject(jsonString)
                    val title = json.optString("title", "Today's prayers")
                    val subtitle = json.optString("subtitle", "")
                    val highlight = json.optString("highlight", "")
                    val nextName = json.optString("nextName", "")
                    val countdown = json.optString("countdownLabelMin", "--")
                    val dateKey = json.optString("dateKey", "")
                    val mode = json.optString("mode", "active")

                    // Format date from DD-MM-YYYY to readable
                    val dateFormatted = formatDateKey(dateKey)

                    views.setTextViewText(R.id.widget_title, "Today's prayers")
                    views.setTextViewText(R.id.widget_date, dateFormatted)
                    views.setTextViewText(R.id.widget_countdown, countdown)
                    views.setTextViewText(R.id.widget_next_label, "Next in")

                    // Subtitle lines — mode-aware
                    val subtitlePrimary = when (mode) {
                        "makruh" -> "⚠ Makruh time"
                        "night" -> "🌙 Next: $nextName"
                        "between" -> "Next: $nextName"
                        else -> "Next: $nextName"
                    }
                    views.setTextViewText(R.id.widget_subtitle, subtitlePrimary)
                    views.setTextViewText(R.id.widget_subtitle2, subtitle)

                    // Color the subtitle for makruh
                    val subtitleColor = when (mode) {
                        "makruh" -> Color.parseColor("#8B6508")
                        else -> Color.parseColor(GREEN)
                    }
                    views.setTextColor(R.id.widget_subtitle, subtitleColor)

                    // Schedule rows
                    val schedule = json.optJSONArray("schedule")
                    if (schedule != null) {
                        for (i in 0 until schedule.length().coerceAtMost(5)) {
                            val entry = schedule.getJSONObject(i)
                            val name = entry.optString("name", "")
                            val time12 = entry.optString("time12", "--")

                            val row = ROWS.find { it.key == name } ?: continue
                            views.setTextViewText(row.nameId, name)
                            views.setTextViewText(row.timeId, time12)

                            val isHighlighted = name == highlight
                            if (isHighlighted) {
                                views.setInt(row.rowId, "setBackgroundResource", R.drawable.widget_row_highlight_bg)
                                views.setTextColor(row.nameId, Color.parseColor(GREEN))
                                views.setTextColor(row.timeId, Color.parseColor(GREEN))
                                // Bold the name for current prayer
                                views.setTextViewTextSize(row.nameId, TypedValue.COMPLEX_UNIT_SP, 15f)
                                views.setTextViewTextSize(row.timeId, TypedValue.COMPLEX_UNIT_SP, 15f)
                            } else {
                                views.setInt(row.rowId, "setBackgroundColor", Color.TRANSPARENT)
                                views.setTextColor(row.nameId, Color.parseColor(GREEN))
                                views.setTextColor(row.timeId, Color.parseColor(GREEN))
                                views.setTextViewTextSize(row.nameId, TypedValue.COMPLEX_UNIT_SP, 14f)
                                views.setTextViewTextSize(row.timeId, TypedValue.COMPLEX_UNIT_SP, 14f)
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    views.setTextViewText(R.id.widget_title, "Today's prayers")
                    views.setTextViewText(R.id.widget_subtitle, "Open Sazda to load times")
                    views.setTextViewText(R.id.widget_subtitle2, "")
                }
            } else {
                views.setTextViewText(R.id.widget_title, "Today's prayers")
                views.setTextViewText(R.id.widget_subtitle, "Open Sazda to load times")
                views.setTextViewText(R.id.widget_subtitle2, "")
                views.setTextViewText(R.id.widget_countdown, "--")
            }

            // Tap opens the app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_title, pendingIntent)
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
