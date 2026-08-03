package com.habitracker.app.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.habitracker.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Feeds rows to the Monthly Tracking Grid widget's ListView.
 * Each row = one habit × all 30/31 day cells, colored by state,
 * each cell wired with a fillInIntent so HabitToggleReceiver can
 * toggle today/yesterday or open the app for other days.
 */
class MonthGridRemoteViewsService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        MonthGridFactory(applicationContext)
}

private const val MAX_CELLS = 31

// Palette — matches the app's minimalist B/W grid
private const val COL_DONE      = 0xFFFFFFFF.toInt()  // completed → white
private const val COL_TODAY     = 0xFF3B82F6.toInt()  // today (not done) → accent
private const val COL_SKIPPED   = 0xFF666666.toInt()  // skipped → mid-grey
private const val COL_MISSED    = 0xFF2a2a2a.toInt()  // past not done → dim
private const val COL_FUTURE    = 0xFF141414.toInt()  // future → almost bg
private const val TXT_DARK      = 0xFF000000.toInt()
private const val TXT_LIGHT     = 0xFFFFFFFF.toInt()

private class MonthGridFactory(private val ctx: Context) : RemoteViewsService.RemoteViewsFactory {

    private val cellIds = IntArray(MAX_CELLS) { i ->
        ctx.resources.getIdentifier("cell_${i + 1}", "id", ctx.packageName)
    }
    private var habits: JSONArray = JSONArray()
    private var today = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
    private var totalDays = 30
    private var todayDateStr = ""
    private var yesterdayDateStr = ""

    override fun onCreate() {}

    override fun onDataSetChanged() {
        habits = WidgetData.getJsonArray(ctx, "month_grid")
        val cal = Calendar.getInstance()
        today = cal.get(Calendar.DAY_OF_MONTH)
        totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        todayDateStr = fmt.format(cal.time)
        cal.add(Calendar.DAY_OF_MONTH, -1)
        yesterdayDateStr = fmt.format(cal.time)
    }

    override fun onDestroy() {}
    override fun getCount(): Int = habits.length()
    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true

    override fun getViewAt(position: Int): RemoteViews {
        val row = RemoteViews(ctx.packageName, R.layout.widget_month_grid_row)
        val habit = habits.optJSONObject(position) ?: return row
        val habitId = habit.optString("id")
        val name = habit.optString("name")
        val total = habit.optInt("total", totalDays).coerceAtMost(MAX_CELLS)

        // Parse completed/skipped day-numbers into fast lookup sets
        val doneSet = jsonArrToIntSet(habit.optJSONArray("days"))
        val skipSet = jsonArrToIntSet(habit.optJSONArray("skipped"))

        val doneCount = doneSet.count { it in 1..total }
        row.setTextViewText(R.id.habit_name, "$name  $doneCount/$total")

        // Compute year-month prefix from today (habits are month-scoped in the app)
        val cal = Calendar.getInstance()
        val ymPrefix = String.format(
            Locale.US, "%04d-%02d-",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1
        )

        for (i in 0 until MAX_CELLS) {
            val cellId = cellIds[i]
            if (cellId == 0) continue
            val day = i + 1
            if (day > total) {
                row.setViewVisibility(cellId, View.INVISIBLE)
                continue
            }
            row.setViewVisibility(cellId, View.VISIBLE)

            val isToday = day == today
            val done = doneSet.contains(day)
            val skipped = skipSet.contains(day)
            val future = day > today

            val bg = when {
                done              -> COL_DONE
                skipped           -> COL_SKIPPED
                isToday           -> COL_TODAY
                future            -> COL_FUTURE
                else              -> COL_MISSED
            }
            row.setInt(cellId, "setBackgroundColor", bg)
            row.setTextColor(cellId, if (done) TXT_DARK else TXT_LIGHT)
            row.setTextViewText(cellId, day.toString())

            // Fill-in intent per cell — toggles today/yesterday, opens app for others.
            val dateStr = "$ymPrefix${String.format(Locale.US, "%02d", day)}"
            val toggleable = dateStr == todayDateStr || dateStr == yesterdayDateStr
            val fill = Intent().apply {
                putExtra(HabitToggleReceiver.EXTRA_HABIT_ID, habitId)
                putExtra(HabitToggleReceiver.EXTRA_DATE, dateStr)
                putExtra(HabitToggleReceiver.EXTRA_DAY, day)
                putExtra(HabitToggleReceiver.EXTRA_TOGGLEABLE, toggleable)
            }
            row.setOnClickFillInIntent(cellId, fill)
        }

        // Habit-name tap → open app
        val openFill = Intent().apply {
            putExtra(HabitToggleReceiver.EXTRA_HABIT_ID, habitId)
            putExtra(HabitToggleReceiver.EXTRA_TOGGLEABLE, false)
        }
        row.setOnClickFillInIntent(R.id.habit_name, openFill)

        return row
    }

    private fun jsonArrToIntSet(arr: JSONArray?): Set<Int> {
        if (arr == null) return emptySet()
        val out = HashSet<Int>(arr.length())
        for (i in 0 until arr.length()) out.add(arr.optInt(i))
        return out
    }
}
