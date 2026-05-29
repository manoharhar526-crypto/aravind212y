package com.aravind.habittracker.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.aravind.habittracker.R

class TodayHabitsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) updateOne(ctx, mgr, id)
    }
    companion object {
        fun updateOne(ctx: Context, mgr: AppWidgetManager, id: Int) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_today_habits)
            val items = WidgetData.parseItems(WidgetData.getJsonArray(ctx, "habits_today"), "name")
            val rows = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
            for (i in rows.indices) {
                val rid = rows[i]
                if (i < items.size) {
                    val it = items[i]
                    v.setTextViewText(rid, (if (it.completed) "✓ " else "○ ") + it.title)
                    v.setViewVisibility(rid, android.view.View.VISIBLE)
                } else v.setViewVisibility(rid, android.view.View.GONE)
            }
            v.setTextViewText(R.id.title, "Today's Habits")
            v.setTextViewText(R.id.empty, if (items.isEmpty()) "No habits for today" else "")
            v.setOnClickPendingIntent(R.id.root, openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
        fun openAppIntent(ctx: Context): PendingIntent {
            val i = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
                ?: Intent(Intent.ACTION_MAIN)
            return PendingIntent.getActivity(ctx, 0, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
    }
}
