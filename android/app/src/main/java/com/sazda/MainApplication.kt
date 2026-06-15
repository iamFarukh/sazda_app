package com.sazda

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(SazdaCustomNotificationPackage())
          add(PrayerWidgetPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    schedulePrayerWidgetMaintenance()
  }

  private fun schedulePrayerWidgetMaintenance() {
    val constraints = Constraints.Builder().build()
    val req = PeriodicWorkRequestBuilder<PrayerWidgetRefreshWorker>(1, TimeUnit.DAYS)
      .setConstraints(constraints)
      .build()
    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
      "prayer_widget_refresh_daily",
      ExistingPeriodicWorkPolicy.UPDATE,
      req
    )
  }
}
