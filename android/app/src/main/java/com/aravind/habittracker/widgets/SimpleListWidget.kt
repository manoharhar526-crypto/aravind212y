package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Generic list widget — renders a title + up to 6 text rows from a JSON array
 * stored in SharedPreferences. Subclasses pick the pref key, title, row template
 * and layout. Used by Skip Days, Habit Analytics, Habit Reports, Monthly Grid.
 */
abstract class SimpleListWidget(
    private val prefKey: String,
    private val label: String,
    private val layoutId: Int,
    private val emptyMsg: String = "No data yet"
) : AppWidgetProvider() {

    /** Override to format one JSON row → display string. */
    abstract fun formatRow(obj: JSONObject): String

    /** Optional hook — subclass may wire per-row tap-intents. */
    open fun onRowBound(ctx: Context, v: RemoteViews, rowId: Int, obj: JSONObject) {}

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, layoutId)
            val arr = WidgetData.getJsonArray(ctx, prefKey)
            val rows = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
            for (i in rows.indices) {
                val rid = rows[i]
                if (i < arr.length()) {
                    val o = arr.optJSONObject(i)
                    v.setTextViewText(rid, if (o != null) formatRow(o) else "")
                    v.setViewVisibility(rid, android.view.View.VISIBLE)
                    if (o != null) onRowBound(ctx, v, rid, o)
                } else v.setViewVisibility(rid, android.view.View.GONE)
            }
            v.setTextViewText(R.id.title, label)
            v.setTextViewText(R.id.empty, if (arr.length() == 0) emptyMsg else "")
            v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}

/**
 * Monthly Tracking Grid — each row is one habit. Tapping the row toggles
 * TODAY for that habit without opening the app.
 */
class MonthGridWidget : SimpleListWidget(
    "month_grid", "Monthly Tracking", R.layout.widget_month_grid
) {
    override fun formatRow(obj: JSONObject): String {
        val name = obj.optString("name")
        val daysArr = obj.optJSONArray("days") ?: JSONArray()
        val totalDays = obj.optInt("total", 30)
        val set = mutableSetOf<Int>()
        for (i in 0 until daysArr.length()) set.add(daysArr.optInt(i))
        val today = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
        val sb = StringBuilder()
        for (d in 1..totalDays) {
            val done = set.contains(d)
            sb.append(when {
                d == today && done -> "●"
                d == today         -> "◉"
                done               -> "▪"
                else               -> "▫"
            })
        }
        val done = set.size
        return "$name  ($done/$totalDays)\n$sb\n👆 Tap to toggle today"
    }

    override fun onRowBound(ctx: Context, v: RemoteViews, rowId: Int, obj: JSONObject) {
        val habitId = obj.optString("id")
        if (habitId.isBlank()) return
        val cal = Calendar.getInstance()
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
        v.setOnClickPendingIntent(rowId, HabitToggleReceiver.pendingIntent(ctx, habitId, dateStr, day))
    }
}

class SkipDaysWidget : SimpleListWidget(
    "skip_days", "Skip Days", R.layout.widget_skip_days, "No skipped days"
) {
    override fun formatRow(obj: JSONObject): String =
        "${obj.optString("name")} — ${obj.optInt("count")} skipped"
}

class AnalyticsWidget : SimpleListWidget(
    "analytics", "Habit Analytics", R.layout.widget_analytics
) {
    override fun formatRow(obj: JSONObject): String =
        "${obj.optString("name")} — ${obj.optInt("pct")}%"
}

class HabitReportsWidget : SimpleListWidget(
    "habit_reports", "Habit Reports", R.layout.widget_habit_reports
) {
    override fun formatRow(obj: JSONObject): String =
        "${obj.optString("name")}: ${obj.optInt("completed")}/${obj.optInt("total")} (${obj.optInt("rate")}%)"
}
