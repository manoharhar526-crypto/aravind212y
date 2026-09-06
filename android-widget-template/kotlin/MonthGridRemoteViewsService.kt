package com.habitracker.app.widgets

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.habitracker.app.R
import org.json.JSONArray
import java.util.Calendar

/**
 * Rows for the Weekly Tracking widget: one habit per row, seven large day
 * cells (Sun→Sat) for the week currently selected in the widget header.
 *
 * Cell states: completed (filled), skipped (amber), today (ring),
 * missed (dim), future (very dim & not tappable).
 * Tapping any day up to today toggles completion instantly.
 */
class MonthGridRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        MonthGridFactory(applicationContext)
}

private class MonthGridFactory(private val ctx: Context) : RemoteViewsService.RemoteViewsFactory {

    private val cellIds = intArrayOf(
        R.id.cell_1, R.id.cell_2, R.id.cell_3, R.id.cell_4, R.id.cell_5, R.id.cell_6, R.id.cell_7
    )

    private var habits: JSONArray = JSONArray()
    private var dates: List<Triple<String, Int, Boolean>> = emptyList() // date, dayNum, isPast/today
    private var todayStr: String = ""

    override fun onCreate() {}

    override fun onDataSetChanged() {
        habits = WidgetData.getJsonArray(ctx, "month_grid")
        todayStr = WidgetData.todayStr()
        val start = WidgetData.weekStart(ctx)
        val out = mutableListOf<Triple<String, Int, Boolean>>()
        for (i in 0 until 7) {
            val c = start.clone() as Calendar
            c.add(Calendar.DAY_OF_MONTH, i)
            val ds = WidgetData.dateStr(c)
            out.add(Triple(ds, c.get(Calendar.DAY_OF_MONTH), ds <= todayStr))
        }
        dates = out
    }

    override fun onDestroy() {}

    override fun getCount(): Int = habits.length()

    override fun getViewAt(position: Int): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_month_grid_row)
        val o = habits.optJSONObject(position) ?: return v
        val habitId = o.optString("id")
        v.setTextViewText(R.id.habit_name, o.optString("name"))

        val done = HashSet<Int>()
        o.optJSONArray("days")?.let { for (i in 0 until it.length()) done.add(it.optInt(i)) }
        val skipped = HashSet<Int>()
        o.optJSONArray("skipped")?.let { for (i in 0 until it.length()) skipped.add(it.optInt(i)) }

        val currentMonth = todayStr.substring(0, 7)

        for (i in cellIds.indices) {
            val (date, dayNum, notFuture) = dates[i]
            val id = cellIds[i]
            val inMonth = date.startsWith(currentMonth)
            val isDone = inMonth && done.contains(dayNum)
            val isSkip = inMonth && skipped.contains(dayNum)
            val isToday = date == todayStr

            v.setTextViewText(id, if (isDone) "✓" else if (isSkip) "–" else dayNum.toString())

            val bg = when {
                isDone -> R.drawable.widget_cell_done
                isSkip -> R.drawable.widget_cell_skip
                isToday -> R.drawable.widget_cell_today
                !notFuture -> R.drawable.widget_cell_future
                else -> R.drawable.widget_cell
            }
            v.setInt(id, "setBackgroundResource", bg)
            v.setTextColor(
                id,
                when {
                    isDone -> 0xFF0B0D10.toInt()
                    isSkip -> 0xFFFCD34D.toInt()
                    !notFuture -> 0xFF4b5058.toInt()
                    else -> 0xFFE7E9EE.toInt()
                }
            )

            // Tap: any day up to today toggles completion; future days open the app.
            val fill = Intent().apply {
                putExtra(HabitToggleReceiver.EXTRA_OP,
                    if (notFuture && inMonth) HabitToggleReceiver.OP_TOGGLE else HabitToggleReceiver.OP_REFRESH)
                putExtra(HabitToggleReceiver.EXTRA_HABIT_ID, habitId)
                putExtra(HabitToggleReceiver.EXTRA_DATE, date)
                putExtra(HabitToggleReceiver.EXTRA_DAY, dayNum)
                putExtra(HabitToggleReceiver.EXTRA_TOGGLEABLE, notFuture && inMonth)
            }
            v.setOnClickFillInIntent(id, fill)
        }
        return v
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
