package com.sazda

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * Stitch-style prayer notification using [RemoteViews] (custom layout in the shade).
 * Scheduled triggers still use Notifee from JS; this module is used for immediate displays
 * and can be extended later for AlarmManager-based scheduling if needed.
 */
class SazdaCustomNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SazdaCustomNotification"

  @ReactMethod
  fun showPrayerStyleNotification(options: ReadableMap, promise: Promise) {
    try {
      val id = options.getString("id") ?: run {
        promise.reject("E_BAD_ARGS", "id required")
        return
      }
      val channelId = options.getString("channelId") ?: "default"
      val meta = options.getString("meta") ?: ""
      val headline = options.getString("headline") ?: ""
      val body = options.getString("body") ?: ""
      val variant = options.getString("variant") ?: "prayer"

      ensureChannel(channelId)

      val ctx = reactApplicationContext
      val remoteViews = RemoteViews(ctx.packageName, R.layout.notification_sazda_prayer)
      remoteViews.setTextViewText(R.id.ntf_meta, meta)
      remoteViews.setTextViewText(R.id.ntf_headline, headline)
      remoteViews.setTextViewText(R.id.ntf_body, body)

      val iconBg: Int
      val iconFg: Int
      when (variant) {
        "reminder" -> {
          iconBg = R.drawable.sazda_notif_icon_reminder_bg
          iconFg = R.drawable.ic_sazda_notif_reminder_fg
        }
        "silent" -> {
          iconBg = R.drawable.sazda_notif_icon_silent_bg
          iconFg = R.drawable.ic_sazda_notif_silent_fg
        }
        else -> {
          iconBg = R.drawable.sazda_notif_icon_prayer_bg
          iconFg = R.drawable.ic_sazda_notif_prayer_fg
        }
      }
      remoteViews.setInt(R.id.ntf_icon_frame, "setBackgroundResource", iconBg)
      remoteViews.setImageViewResource(R.id.ntf_icon, iconFg)

      val launchIntent = Intent(ctx, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
      val contentPending = PendingIntent.getActivity(ctx, id.hashCode(), launchIntent, pendingFlags)

      val notification = NotificationCompat.Builder(ctx, channelId)
        .setSmallIcon(R.drawable.ic_stat_sazda)
        .setColor(Color.parseColor("#003527"))
        .setOnlyAlertOnce(true)
        .setAutoCancel(true)
        .setContentIntent(contentPending)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .setCustomContentView(remoteViews)
        .setCustomBigContentView(remoteViews)
        .build()

      NotificationManagerCompat.from(ctx).notify(id.hashCode(), notification)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_CUSTOM_NOTIF", e.message, e)
    }
  }

  private fun ensureChannel(channelId: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = reactContext.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(channelId) != null) return
    // Fallback if JS channel was not created yet (should not happen in normal flow)
    val ch = NotificationChannel(
      channelId,
      "Sazda",
      NotificationManager.IMPORTANCE_HIGH,
    )
    nm.createNotificationChannel(ch)
  }
}
