package com.aravind.habittracker.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Fires when the user taps a habit cell in a home-screen widget.
 * Queues a pending toggle in SharedPreferences so the web app can apply
 * it on next launch, and optimistically updates the widget cache so the
 * cell flips instantly.
 */
class HabitToggleReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val habitId = intent.getStringExtra(EXTRA_HABIT_ID) ?: return
        val date = intent.getStringExtra(EXTRA_DATE) ?: return
        val day = intent.getIntExtra(EXTRA_DAY, -1)

        WidgetData.queueToggle(ctx, habitId, date)
        if (day > 0) WidgetData.optimisticToggleMonthGrid(ctx, habitId, day)

        // Refresh every widget so they reflect the new state
        val mgr = AppWidgetManager.getInstance(ctx)
        val classes = listOf(
            MonthGridWidget::class.java,
            SkipDaysWidget::class.java,
            AnalyticsWidget::class.java,
            HabitReportsWidget::class.java,
            AllTimeStatsWidget::class.java,
            CalendarWidget::class.java,
            TaskReportsWidget::class.java
        )
        for (c in classes) {
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, c))
            if (ids.isNotEmpty()) {
                val i = Intent(ctx, c)
                i.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                ctx.sendBroadcast(i)
            }
        }
    }

    companion object {
        const val ACTION = "com.aravind.habittracker.widgets.TOGGLE_HABIT"
        const val EXTRA_HABIT_ID = "habitId"
        const val EXTRA_DATE = "date"
        const val EXTRA_DAY = "day"

        fun pendingIntent(ctx: Context, habitId: String, date: String, day: Int): PendingIntent {
            val i = Intent(ctx, HabitToggleReceiver::class.java).apply {
                action = ACTION
                putExtra(EXTRA_HABIT_ID, habitId)
                putExtra(EXTRA_DATE, date)
                putExtra(EXTRA_DAY, day)
            }
            // Unique request code per habit+day so PendingIntent extras don't collide
            val rc = (habitId.hashCode() * 31 + day)
            return PendingIntent.getBroadcast(
                ctx, rc, i,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}
