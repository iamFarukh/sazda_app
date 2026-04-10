package com.sazda

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
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
            val nameId: Int,
            val timeId: Int,
        )

        private val ITEMS = listOf(
            FlowItem("Fajr",    R.id.flow_item_fajr,    R.id.flow_name_fajr,    R.id.flow_time_fajr),
            FlowItem("Dhuhr",   R.id.flow_item_dhuhr,   R.id.flow_name_dhuhr,   R.id.flow_time_dhuhr),
            FlowItem("Asr",     R.id.flow_item_asr,     R.id.flow_name_asr,     R.id.flow_time_asr),
            FlowItem("Maghrib", R.id.flow_item_maghrib, R.id.flow_name_maghrib, R.id.flow_time_maghrib),
            FlowItem("Isha",    R.id.flow_item_isha,    R.id.flow_name_isha,    R.id.flow_time_isha),
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

                    views.setTextViewText(R.id.flow_title, "Daily Flow")
                    views.setTextViewText(R.id.flow_date, formatDateKey(dateKey))

                    // Status line
                    val statusText = when (mode) {
                        "makruh" -> "⚠ $title · $subtitle"
                        "night" -> "🌙 $title · $subtitle"
                        "between" -> "$title · $subtitle"
                        else -> "$title · $subtitle"
                    }
                    views.setTextViewText(R.id.flow_status, statusText)

                    val statusColor = when (mode) {
                        "makruh" -> Color.parseColor(MAKRUH_TEXT)
                        else -> Color.parseColor(GREEN)
                    }
                    views.setTextColor(R.id.flow_status, statusColor)
                    views.setViewVisibility(R.id.flow_status, View.VISIBLE)

                    val schedule = json.optJSONArray("schedule")
                    if (schedule != null) {
                        for (i in 0 until schedule.length().coerceAtMost(5)) {
                            val entry = schedule.getJSONObject(i)
                            val name = entry.optString("name", "")
                            val time12 = entry.optString("time12", "--")

                            val item = ITEMS.find { it.key == name } ?: continue
                            views.setTextViewText(item.nameId, name.uppercase())
                            views.setTextViewText(item.timeId, time12)

                            val isHighlighted = name == highlight
                            if (isHighlighted) {
                                views.setInt(item.itemId, "setBackgroundResource", R.drawable.widget_row_highlight_bg)
                                views.setTextColor(item.nameId, Color.parseColor(GREEN))
                                views.setTextColor(item.timeId, Color.parseColor(GREEN))
                            } else {
                                views.setInt(item.itemId, "setBackgroundResource", R.drawable.widget_flow_item_bg)
                                views.setTextColor(item.nameId, Color.parseColor(GREEN))
                                views.setTextColor(item.timeId, Color.parseColor(GREEN_MUTED))
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
