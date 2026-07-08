package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.aravind.habittracker.R
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Skip Days widget — full-month grid, skipped days shown in amber.
 * Data source: SharedPreferences key `skip_days_set` (JSONArray of day numbers
 * skipped this month across all habits, written by widgetSync.ts).
 */
class SkipDaysWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, build(ctx))
    }

    private fun build(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_skip_days)
        v.setTextViewText(R.id.title, "Habit Skip Days")
        v.setTextViewText(R.id.subtitle, WidgetData.getString(ctx, "calendar_month", ""))

        val cal = Calendar.getInstance()
        val year = cal.get(Calendar.YEAR); val month = cal.get(Calendar.MONTH)
        val totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        cal.set(year, month, 1)
        val firstDow = cal.get(Calendar.DAY_OF_WEEK) - 1

        val skipSet = HashSet<Int>()
        val arr = WidgetData.getJsonArray(ctx, "skip_days_set")
        for (i in 0 until arr.length()) skipSet.add(arr.optInt(i))

        // Habit-name chips row (top 5)
        val skipList = WidgetData.getJsonArray(ctx, "skip_days")
        val chips = StringBuilder()
        for (i in 0 until minOf(5, skipList.length())) {
            val o = skipList.optJSONObject(i) ?: continue
            if (chips.isNotEmpty()) chips.append("  ")
            chips.append("[").append(o.optString("name")).append(" ").append(o.optInt("count")).append("]")
        }
        v.setTextViewText(R.id.chips, chips.toString())

        for (i in 1..42) {
            val cellId = ctx.resources.getIdentifier("s$i", "id", ctx.packageName)
            if (cellId == 0) continue
            val day = i - firstDow
            if (day in 1..totalDays) {
                v.setViewVisibility(cellId, View.VISIBLE)
                v.setTextViewText(cellId, day.toString())
                if (skipSet.contains(day)) {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell_skip)
                    v.setTextColor(cellId, 0xFFf59e0b.toInt())
                } else {
                    v.setInt(cellId, "setBackgroundResource", R.drawable.widget_cell)
                    v.setTextColor(cellId, 0xFFFFFFFF.toInt())
                }
            } else {
                v.setViewVisibility(cellId, View.INVISIBLE)
            }
        }
        v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
        return v
    }
}

/**
 * Habit Analytics — up to 6 habit rows (name + %).
 */
class AnalyticsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_analytics)
            v.setTextViewText(R.id.title, "Habit Analytics")
            v.setTextViewText(R.id.subtitle, WidgetData.getString(ctx, "calendar_month", ""))
            val arr = WidgetData.getJsonArray(ctx, "analytics")
            val rows = listOf(R.id.a1, R.id.a2, R.id.a3, R.id.a4, R.id.a5, R.id.a6)
            val names = listOf(R.id.a1_name, R.id.a2_name, R.id.a3_name, R.id.a4_name, R.id.a5_name, R.id.a6_name)
            val pcts = listOf(R.id.a1_pct, R.id.a2_pct, R.id.a3_pct, R.id.a4_pct, R.id.a5_pct, R.id.a6_pct)
            for (i in rows.indices) {
                if (i < arr.length()) {
                    val o = arr.optJSONObject(i) ?: continue
                    v.setViewVisibility(rows[i], View.VISIBLE)
                    v.setTextViewText(names[i], o.optString("name"))
                    v.setTextViewText(pcts[i], "${o.optInt("pct")}%")
                } else v.setViewVisibility(rows[i], View.GONE)
            }
            v.setViewVisibility(R.id.empty, if (arr.length() == 0) View.VISIBLE else View.GONE)
            v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}

/**
 * Habit Summary — 3 top stat cards + up to 4 habit rows.
 */
class HabitReportsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_habit_reports)
            v.setTextViewText(R.id.title, "Habit Summary")
            v.setTextViewText(R.id.subtitle, WidgetData.getString(ctx, "calendar_month", ""))

            val reports = WidgetData.getJsonArray(ctx, "habit_reports")
            val total = reports.length()
            val best = bestBy(reports, "rate")
            val streak = WidgetData.getInt(ctx, "alltime_streak")

            v.setTextViewText(R.id.sum1_num, total.toString())
            v.setTextViewText(R.id.sum1_sub, "this month")
            v.setTextViewText(R.id.sum2_num, best?.optString("name")?.ifBlank { "—" } ?: "—")
            v.setTextViewText(R.id.sum2_sub, best?.let { "${it.optInt("rate")}% rate" } ?: "")
            v.setTextViewText(R.id.sum3_num, "${streak}d")
            v.setTextViewText(R.id.sum3_sub, "longest")

            val rowIds = listOf(R.id.hrow1, R.id.hrow2, R.id.hrow3, R.id.hrow4)
            val nameIds = listOf(R.id.hrow1_name, R.id.hrow2_name, R.id.hrow3_name, R.id.hrow4_name)
            val metaIds = listOf(R.id.hrow1_meta, R.id.hrow2_meta, R.id.hrow3_meta, R.id.hrow4_meta)
            for (i in rowIds.indices) {
                if (i < reports.length()) {
                    val o = reports.optJSONObject(i) ?: continue
                    v.setViewVisibility(rowIds[i], View.VISIBLE)
                    v.setTextViewText(nameIds[i], o.optString("name"))
                    v.setTextViewText(metaIds[i], "${o.optInt("completed")}/${o.optInt("total")} · ${o.optInt("rate")}%")
                } else v.setViewVisibility(rowIds[i], View.GONE)
            }
            v.setViewVisibility(R.id.empty, if (reports.length() == 0) View.VISIBLE else View.GONE)
            v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }

    private fun bestBy(arr: JSONArray, field: String): JSONObject? {
        var best: JSONObject? = null; var max = -1
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val v = o.optInt(field)
            if (v > max) { max = v; best = o }
        }
        return best
    }
}
