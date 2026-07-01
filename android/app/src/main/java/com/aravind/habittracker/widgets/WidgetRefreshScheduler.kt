package com.aravind.habittracker.widgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock

/**
 * Schedules a 30-minute repeating AlarmManager broadcast that fires
 * APPWIDGET_UPDATE intents for every Habitracker widget provider.
 *
 * This is belt-and-suspenders on top of `android:updatePeriodMillis` —
 * the system can defer the built-in scheduler under doze, so we keep
 * our own inexact alarm running so widgets refresh even when the
 * Capacitor WebView is fully closed.
 */
object WidgetRefreshScheduler {
    private const val INTERVAL_MS = 30L * 60L * 1000L  // 30 minutes
    private const val ACTION = "com.aravind.habittracker.REFRESH_WIDGETS"

    private val PROVIDERS = arrayOf(
        MonthGridWidget::class.java,
        SkipDaysWidget::class.java,
        AnalyticsWidget::class.java,
        CalendarWidget::class.java,
        AllTimeStatsWidget::class.java,
        HabitReportsWidget::class.java,
        TaskReportsWidget::class.java
    )

    fun scheduleAll(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, WidgetAlarmReceiver::class.java).setAction(ACTION)
        val flags = if (Build.VERSION.SDK_INT >= 23)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else
            PendingIntent.FLAG_UPDATE_CURRENT
        val pi = PendingIntent.getBroadcast(ctx, 4242, intent, flags)
        am.cancel(pi)
        am.setInexactRepeating(
            AlarmManager.ELAPSED_REALTIME,
            SystemClock.elapsedRealtime() + INTERVAL_MS,
            INTERVAL_MS,
            pi
        )
    }

    fun refreshAllNow(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        for (cls in PROVIDERS) {
            try {
                val cn = ComponentName(ctx, cls)
                val ids = mgr.getAppWidgetIds(cn)
                if (ids.isNotEmpty()) {
                    val intent = Intent(ctx, cls)
                        .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    ctx.sendBroadcast(intent)
                }
            } catch (_: Exception) { /* skip */ }
        }
    }
}

class WidgetAlarmReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        WidgetRefreshScheduler.refreshAllNow(ctx)
    }
}
