package com.sazda

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject

/**
 * Best-effort daily maintenance:
 * - Re-broadcast widget updates
 * - Re-schedule AlarmManager boundary alarms from the last known snapshot
 *
 * This keeps widgets ticking even after device restarts or long app inactivity.
 */
class PrayerWidgetRefreshWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {
  override fun doWork(): Result {
    val prefs = applicationContext.getSharedPreferences(PrayerWidgetModule.PREFS, Context.MODE_PRIVATE)
    val jsonString = prefs.getString(PrayerWidgetModule.KEY_SNAPSHOT, null) ?: return Result.success()
    rescheduleAlarms(jsonString)
    broadcastUpdate(TodayPrayerWidgetProvider::class.java)
    broadcastUpdate(DailyFlowWidgetProvider::class.java)
    return Result.success()
  }

  private fun rescheduleAlarms(jsonString: String) {
    val alarmManager = applicationContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
    try {
      val json = JSONObject(jsonString)
      val timeline = json.optJSONArray("timeline") ?: return
      val manager = AppWidgetManager.getInstance(applicationContext)

      val todayIds = manager.getAppWidgetIds(ComponentName(applicationContext, TodayPrayerWidgetProvider::class.java))
      val flowIds = manager.getAppWidgetIds(ComponentName(applicationContext, DailyFlowWidgetProvider::class.java))

      for (i in 0 until timeline.length()) {
        val entry = timeline.getJSONObject(i)
        val timeMillis = entry.optLong("atMs", 0)
        if (timeMillis <= System.currentTimeMillis()) continue

        val reqToday = i + 5100
        val reqFlow = i + 6100

        if (todayIds.isNotEmpty()) {
          val iToday = Intent(applicationContext, TodayPrayerWidgetProvider::class.java)
          iToday.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          iToday.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, todayIds)
          val piToday = PendingIntent.getBroadcast(
            applicationContext, reqToday, iToday,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )
          try {
            alarmManager.setExact(AlarmManager.RTC, timeMillis, piToday)
          } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.RTC, timeMillis, piToday)
          }
        }

        if (flowIds.isNotEmpty()) {
          val iFlow = Intent(applicationContext, DailyFlowWidgetProvider::class.java)
          iFlow.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          iFlow.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, flowIds)
          val piFlow = PendingIntent.getBroadcast(
            applicationContext, reqFlow, iFlow,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
          )
          try {
            alarmManager.setExact(AlarmManager.RTC, timeMillis, piFlow)
          } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.RTC, timeMillis, piFlow)
          }
        }
      }
    } catch (_: Exception) {
      // Ignore
    }
  }

  private fun broadcastUpdate(providerClass: Class<*>) {
    val manager = AppWidgetManager.getInstance(applicationContext)
    val component = ComponentName(applicationContext, providerClass)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isNotEmpty()) {
      val intent = Intent(applicationContext, providerClass)
      intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      applicationContext.sendBroadcast(intent)
    }
  }
}

