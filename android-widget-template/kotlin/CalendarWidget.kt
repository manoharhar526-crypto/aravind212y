package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.aravind.habittracker.R
import java.util.Calendar

/**
 * Full-month calendar widget. Renders a 7x6 grid (Sun→Sat) for the current
 * month, highlights today, and marks days that have notes with a "•".
 * Reads note-dates from SharedPreferences key `calendar_notes` (JSONArray of
 * "YYYY-MM-DD" strings) written by widgetSync.ts.
 */
class CalendarWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, build(ctx))
    }

    private fun build(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_calendar)
        v.setTextViewText(R.id.title, "Calendar")
        v.setTextViewText(R.id.subtitle, WidgetData.getString(ctx, "calendar_month", ""))

        val cal = Calendar.getInstance()
        val today = cal.get(Calendar.DAY_OF_MONTH)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH)
        val totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        cal.set(year, month, 1)
        val firstDow = cal.get(Calendar.DAY_OF_WEEK) - 1  // Sun = 0

        val notesArr = WidgetData.getJsonArray(ctx, "calendar_notes")
        val noteSet = HashSet<String>()
        for (i in 0 until notesArr.length()) noteSet.add(notesArr.optString(i))
        val ym = String.format("%04d-%02d-", year, month + 1)

        var hasNoteThisMonth = false
        for (i in 1..42) {
            val cellId = ctx.resources.getIdentifier("c$i", "id", ctx.packageName)
            if (cellId == 0) continue
            val day = i - firstDow
            if (day in 1..totalDays) {
                v.setViewVisibility(cellId, View.VISIBLE)
                val dateStr = ym + String.format("%02d", day)
                val hasNote = noteSet.contains(dateStr)
                if (hasNote) hasNoteThisMonth = true
                val label = if (hasNote) "$day•" else day.toString()
                v.setTextViewText(cellId, label)
                if (day == today) {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell_done)
                    v.setTextColor(cellId, 0xFF000000.toInt())
                } else {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell)
                    v.setTextColor(cellId, 0xFFFFFFFF.toInt())
                }
            } else {
                v.setViewVisibility(cellId, View.INVISIBLE)
            }
        }
        v.setTextViewText(R.id.footer, if (hasNoteThisMonth) "• indicates a note" else "Tap a day to add a note")
        v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
        return v
    }
}
