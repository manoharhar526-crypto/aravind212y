package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

abstract class TaskListWidget(
    private val prefKey: String,
    private val label: String,
    private val layoutId: Int
) : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, layoutId)
            val items = WidgetData.parseItems(WidgetData.getJsonArray(ctx, prefKey))
            val rows = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
            for (i in rows.indices) {
                val rid = rows[i]
                if (i < items.size) {
                    val it = items[i]
                    v.setTextViewText(rid, (if (it.completed) "✓ " else "○ ") + it.title)
                    v.setViewVisibility(rid, android.view.View.VISIBLE)
                } else v.setViewVisibility(rid, android.view.View.GONE)
            }
            v.setTextViewText(R.id.title, label)
            v.setTextViewText(R.id.empty, if (items.isEmpty()) "Nothing here yet" else "")
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}

class DailyTasksWidget   : TaskListWidget("tasks_daily",   "Today's Tasks",   R.layout.widget_daily_tasks)
class WeeklyTasksWidget  : TaskListWidget("tasks_weekly",  "This Week",       R.layout.widget_weekly_tasks)
class MonthlyTasksWidget : TaskListWidget("tasks_monthly", "This Month",      R.layout.widget_monthly_tasks)
