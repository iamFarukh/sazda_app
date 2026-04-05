package com.sazda

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Persists the latest prayer widget JSON for a future `AppWidgetProvider`.
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
  }

  companion object {
    const val PREFS = "sazda_widget"
    const val KEY_SNAPSHOT = "prayer_snapshot_v1"
    const val KEY_UPDATED = "prayer_snapshot_updated"
  }
}
