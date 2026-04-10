package com.sazda

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

    // Update both widget types
    broadcastUpdate(TodayPrayerWidgetProvider::class.java)
    broadcastUpdate(DailyFlowWidgetProvider::class.java)
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
