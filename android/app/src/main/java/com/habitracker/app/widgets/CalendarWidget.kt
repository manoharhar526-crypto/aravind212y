package com.habitracker.app.widgets

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.view.View
import android.widget.RemoteViews
import com.habitracker.app.R
import java.util.Calendar

/**
 * Month calendar widget styled like the in-app Calendar card:
 * ‹ Month Year › header, a white "Today · 2 Oct" pill, Sun–Sat labels,
 * a ringed today cell and a small dot under days that have notes.
 * Arrows and the Today pill change month in place (no app launch);
 * tapping a day opens the small note editor pop-up.
 */
class CalendarWidget : AppWidgetProvider() {
    companion object {
        private const val ACTION_NAV = "com.habitracker.app.widgets.CAL_NAV"
        private const val EXTRA_DELTA = "delta"
        private const val PREFS = "calendar_widget_state"
        private const val KEY_OFFSET = "month_offset"
        private val MONTHS = arrayOf("January","February","March","April","May","June","July","August","September","October","November","December")
    }

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, build(ctx))
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == ACTION_NAV) {
            val sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val delta = intent.getIntExtra(EXTRA_DELTA, 0)
            val next = if (delta == 0) 0 else sp.getInt(KEY_OFFSET, 0) + delta
            sp.edit().putInt(KEY_OFFSET, next).apply()
            val mgr = AppWidgetManager.getInstance(ctx)
            val ids = mgr.getAppWidgetIds(ComponentName(ctx, CalendarWidget::class.java))
            onUpdate(ctx, mgr, ids)
            return
        }
        super.onReceive(ctx, intent)
    }

    private fun navPi(ctx: Context, delta: Int): PendingIntent {
        val i = Intent(ctx, CalendarWidget::class.java).apply {
            action = ACTION_NAV
            putExtra(EXTRA_DELTA, delta)
            data = android.net.Uri.parse("habitcal://nav/$delta")
        }
        return PendingIntent.getBroadcast(ctx, 2900 + delta + 5, i,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun build(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_calendar)
        val offset = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt(KEY_OFFSET, 0)

        val now = Calendar.getInstance()
        val todayDay = now.get(Calendar.DAY_OF_MONTH)
        val todayMonth = now.get(Calendar.MONTH)
        val todayYear = now.get(Calendar.YEAR)

        val cal = Calendar.getInstance()
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal.add(Calendar.MONTH, offset)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH)
        val totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val firstDow = cal.get(Calendar.DAY_OF_WEEK) - 1
        val isThisMonth = year == todayYear && month == todayMonth

        v.setTextViewText(R.id.title, "${MONTHS[month]} $year")
        v.setTextViewText(R.id.cal_today, "Today · $todayDay ${MONTHS[todayMonth].substring(0, 3)}")
        v.setOnClickPendingIntent(R.id.cal_prev, navPi(ctx, -1))
        v.setOnClickPendingIntent(R.id.cal_next, navPi(ctx, 1))
        v.setOnClickPendingIntent(R.id.cal_today, navPi(ctx, 0))

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
                v.setTextViewText(cellId, if (hasNote) "$day\n•" else day.toString())
                if (isThisMonth && day == todayDay) {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cal_today)
                    v.setTextColor(cellId, 0xFFFFFFFF.toInt())
                } else {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cal_day)
                    v.setTextColor(cellId, 0xFFE7E9EE.toInt())
                }
                v.setOnClickPendingIntent(cellId, notePi(ctx, i, dateStr))
            } else {
                v.setViewVisibility(cellId, if (i > 35 && firstDow + totalDays <= 35) View.GONE else View.INVISIBLE)
            }
        }
        v.setTextViewText(
            R.id.footer,
            if (hasNoteThisMonth) "• has a note — tap a day to write or edit it" else "Tap a day to add a note"
        )
        return v
    }

    /** Opens the small note editor dialog for the tapped day. */
    private fun notePi(ctx: Context, cell: Int, dateStr: String): PendingIntent {
        val i = Intent(ctx, NoteEditorActivity::class.java).apply {
            action = "com.habitracker.app.widgets.EDIT_NOTE.$dateStr"
            putExtra(NoteEditorActivity.EXTRA_DATE, dateStr)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        return PendingIntent.getActivity(
            ctx, 3000 + cell, i,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }
}
