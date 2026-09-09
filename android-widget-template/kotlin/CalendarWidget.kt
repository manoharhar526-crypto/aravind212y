package com.habitracker.app.widgets

import android.content.Context
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.view.View
import android.widget.RemoteViews
import com.habitracker.app.R
import java.util.Calendar

/**
 * Full-month calendar widget. Renders a 7x6 grid (Sun→Sat) for the current
 * month, highlights today, and marks days that have notes with a "•".
 *
 * Every day cell is tappable — it opens the app with that date remembered
 * (`widget_nav_date`) so the calendar view can jump straight to it.
 */
class CalendarWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, build(ctx))
    }

    private fun build(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_calendar)
        v.setTextViewText(R.id.title, "Calendar")
        v.setTextViewText(R.id.subtitle, WidgetData.subtitle(ctx))

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
                v.setTextViewText(cellId, if (hasNote) "$day•" else day.toString())
                if (day == today) {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell_today)
                    v.setTextColor(cellId, 0xFF7DD3FC.toInt())
                } else if (hasNote) {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_card)
                    v.setTextColor(cellId, 0xFFFFFFFF.toInt())
                } else {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell)
                    v.setTextColor(cellId, 0xFFE7E9EE.toInt())
                }
                v.setOnClickPendingIntent(cellId, notePi(ctx, day, dateStr))
            } else {
                v.setViewVisibility(cellId, View.INVISIBLE)
            }
        }
        v.setTextViewText(
            R.id.footer,
            if (hasNoteThisMonth) "• has a note — tap a day to write or edit it" else "Tap a day to add a note"
        )
        v.setOnClickPendingIntent(R.id.title, HabitToggleReceiver.refreshPi(ctx))
        return v
    }

    /** Opens the small note editor dialog for the tapped day. */
    private fun notePi(ctx: Context, day: Int, dateStr: String): PendingIntent {
        val i = Intent(ctx, NoteEditorActivity::class.java).apply {
            action = "com.habitracker.app.widgets.EDIT_NOTE.$dateStr"
            putExtra(NoteEditorActivity.EXTRA_DATE, dateStr)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        return PendingIntent.getActivity(
            ctx, 3000 + day, i,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}
