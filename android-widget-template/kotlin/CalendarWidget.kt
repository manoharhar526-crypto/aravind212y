package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

/** Renders current week — 7 day numbers, today highlighted, dot if note exists. */
class CalendarWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_calendar)
            v.setTextViewText(R.id.title, WidgetData.getString(ctx, "calendar_month", ""))
            val arr = WidgetData.getJsonArray(ctx, "calendar_week")
            val cells = listOf(R.id.cell1, R.id.cell2, R.id.cell3, R.id.cell4, R.id.cell5, R.id.cell6, R.id.cell7)
            for (i in cells.indices) {
                val rid = cells[i]
                if (i < arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    val day = o.optInt("day")
                    val isToday = o.optBoolean("today")
                    val hasNote = o.optBoolean("hasNote")
                    val text = (if (isToday) "[" else " ") + day + (if (hasNote) "•" else "") + (if (isToday) "]" else " ")
                    v.setTextViewText(rid, text)
                } else v.setTextViewText(rid, "")
            }
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
