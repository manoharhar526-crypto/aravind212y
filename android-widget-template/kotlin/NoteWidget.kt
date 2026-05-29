package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class NoteWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_note)
            val note = WidgetData.getString(ctx, "note_today")
            v.setTextViewText(R.id.title, "Today's Note")
            v.setTextViewText(R.id.note_body, if (note.isBlank()) "No note for today" else note)
            v.setOnClickPendingIntent(R.id.root, TodayHabitsWidget.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
