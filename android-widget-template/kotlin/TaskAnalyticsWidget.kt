package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class TaskAnalyticsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_task_analytics)
            v.setTextViewText(R.id.title, "Task Analytics")
            val d = WidgetData.getInt(ctx, "task_an_daily_pct")
            val w = WidgetData.getInt(ctx, "task_an_weekly_pct")
            val m = WidgetData.getInt(ctx, "task_an_monthly_pct")
            v.setTextViewText(R.id.daily_label, "Daily $d%")
            v.setProgressBar(R.id.daily_bar, 100, d, false)
            v.setTextViewText(R.id.weekly_label, "Weekly $w%")
            v.setProgressBar(R.id.weekly_bar, 100, w, false)
            v.setTextViewText(R.id.monthly_label, "Monthly $m%")
            v.setProgressBar(R.id.monthly_bar, 100, m, false)
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
