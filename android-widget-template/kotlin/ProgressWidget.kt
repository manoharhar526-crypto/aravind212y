package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class ProgressWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_progress)
            val done = WidgetData.getInt(ctx, "progress_done")
            val total = WidgetData.getInt(ctx, "progress_total")
            val pct = WidgetData.getInt(ctx, "progress_pct")
            v.setTextViewText(R.id.progress_num, "$done/$total")
            v.setTextViewText(R.id.progress_pct, "$pct%")
            v.setTextViewText(R.id.progress_label, "today")
            v.setProgressBar(R.id.progress_bar, 100, pct, false)
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
