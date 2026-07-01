package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class TaskReportsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_task_reports)
            v.setTextViewText(R.id.title, "Task Reports")
            v.setTextViewText(R.id.daily_line,
                "Daily: ${WidgetData.getInt(ctx, "task_rep_daily_done")}/${WidgetData.getInt(ctx, "task_rep_daily_total")}")
            v.setTextViewText(R.id.weekly_line,
                "Weekly: ${WidgetData.getInt(ctx, "task_rep_weekly_done")}/${WidgetData.getInt(ctx, "task_rep_weekly_total")}")
            v.setTextViewText(R.id.monthly_line,
                "Monthly: ${WidgetData.getInt(ctx, "task_rep_monthly_done")}/${WidgetData.getInt(ctx, "task_rep_monthly_total")}")
            v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
