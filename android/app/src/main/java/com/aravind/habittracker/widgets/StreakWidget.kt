package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class StreakWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_streak)
            val n = WidgetData.getInt(ctx, "streak")
            v.setTextViewText(R.id.streak_num, "🔥 " + n.toString())
            v.setTextViewText(R.id.streak_label, if (n == 1) "day streak" else "day streak")
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
