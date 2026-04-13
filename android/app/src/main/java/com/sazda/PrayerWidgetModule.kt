package com.sazda

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Persists the latest prayer widget JSON for both Android home screen widgets.
 * Reads: `getSharedPreferences("sazda_widget", MODE_PRIVATE)` key `prayer_snapshot_v1`.
 */
class PrayerWidgetModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "PrayerWidgetModule"

  @ReactMethod
  fun setSnapshot(json: String) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    prefs.edit()
      .putString(KEY_SNAPSHOT, json)
      .putLong(KEY_UPDATED, System.currentTimeMillis())
      .apply()

    scheduleAlarms(json)

    // Update both widget types
    broadcastUpdate(TodayPrayerWidgetProvider::class.java)
    broadcastUpdate(DailyFlowWidgetProvider::class.java)
  }

  private fun scheduleAlarms(jsonString: String) {
    val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    try {
      val json = org.json.JSONObject(jsonString)
      val schedule = json.optJSONArray("schedule") ?: return
      val manager = AppWidgetManager.getInstance(ctx)

      val todayIds = manager.getAppWidgetIds(ComponentName(ctx, TodayPrayerWidgetProvider::class.java))
      val flowIds = manager.getAppWidgetIds(ComponentName(ctx, DailyFlowWidgetProvider::class.java))

      for (i in 0 until schedule.length()) {
        val entry = schedule.getJSONObject(i)
        val timeMillis = entry.optLong("timeMillis", 0)
        
        // Only schedule if the time is in the future
        if (timeMillis > System.currentTimeMillis()) {
          val reqToday = i + 100
          val reqFlow = i + 1000

          if (todayIds.isNotEmpty()) {
            val iToday = Intent(ctx, TodayPrayerWidgetProvider::class.java)
            iToday.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            iToday.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, todayIds)
            val piToday = PendingIntent.getBroadcast(
              ctx, reqToday, iToday,
              PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            try {
              alarmManager.setExact(AlarmManager.RTC, timeMillis, piToday)
            } catch (e: SecurityException) {
              alarmManager.set(AlarmManager.RTC, timeMillis, piToday)
            }
          }

          if (flowIds.isNotEmpty()) {
            val iFlow = Intent(ctx, DailyFlowWidgetProvider::class.java)
            iFlow.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            iFlow.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, flowIds)
            val piFlow = PendingIntent.getBroadcast(
              ctx, reqFlow, iFlow,
              PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            try {
              alarmManager.setExact(AlarmManager.RTC, timeMillis, piFlow)
            } catch (e: SecurityException) {
              alarmManager.set(AlarmManager.RTC, timeMillis, piFlow)
            }
          }
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  private fun broadcastUpdate(providerClass: Class<*>) {
    val manager = AppWidgetManager.getInstance(ctx)
    val component = ComponentName(ctx, providerClass)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isNotEmpty()) {
      val intent = Intent(ctx, providerClass)
      intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      ctx.sendBroadcast(intent)
    }
  }

  companion object {
    const val PREFS = "sazda_widget"
    const val KEY_SNAPSHOT = "prayer_snapshot_v1"
    const val KEY_UPDATED = "prayer_snapshot_updated"
  }
}
