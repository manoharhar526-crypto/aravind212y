package com.aravind.habittracker.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Fires when the user taps a habit cell in a home-screen widget.
 *
 * If the tapped day is today or yesterday, we queue the toggle for the
 * web app to persist + push to cloud, and optimistically flip the cached
 * `month_grid` JSON so the cell state updates instantly.
 *
 * Otherwise (older / future days, or the habit-name label), we just open
 * the app — matching the in-app rule that only current/previous day can
 * be edited.
 */
class HabitToggleReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val habitId = intent.getStringExtra(EXTRA_HABIT_ID)
        val date = intent.getStringExtra(EXTRA_DATE)
        val day = intent.getIntExtra(EXTRA_DAY, -1)
        val toggleable = intent.getBooleanExtra(EXTRA_TOGGLEABLE, false)

        if (!toggleable || habitId.isNullOrBlank() || date.isNullOrBlank() || day <= 0) {
            // Not toggleable → just open the app on the matching screen
            WidgetData.openAppIntent(ctx).send()
            return
        }

        WidgetData.queueToggle(ctx, habitId, date)
        WidgetData.optimisticToggleMonthGrid(ctx, habitId, day)

        // Ask the ListView-based Monthly Grid widget to reload its rows
        val mgr = AppWidgetManager.getInstance(ctx)
        val monthIds = mgr.getAppWidgetIds(ComponentName(ctx, MonthGridWidget::class.java))
        if (monthIds.isNotEmpty()) {
            mgr.notifyAppWidgetViewDataChanged(monthIds, com.aravind.habittracker.R.id.list)
        }

        // Trigger onUpdate on every other Habitracker widget so downstream
        // stats reflect the new completion state.
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
        const val EXTRA_TOGGLEABLE = "toggleable"

        /** Legacy single-cell PendingIntent — kept for non-collection widgets. */
        fun pendingIntent(ctx: Context, habitId: String, date: String, day: Int): PendingIntent {
            val i = Intent(ctx, HabitToggleReceiver::class.java).apply {
                action = ACTION
                putExtra(EXTRA_HABIT_ID, habitId)
                putExtra(EXTRA_DATE, date)
                putExtra(EXTRA_DAY, day)
                putExtra(EXTRA_TOGGLEABLE, true)
            }
            val rc = (habitId.hashCode() * 31 + day)
            return PendingIntent.getBroadcast(
                ctx, rc, i,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}
