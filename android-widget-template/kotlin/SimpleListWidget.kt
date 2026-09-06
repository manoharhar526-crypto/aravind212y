package com.habitracker.app.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import com.habitracker.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Habit Skip Days — one habit at a time (‹ › cycles habits), full-month grid.
 * Tapping any day up to today toggles that habit's skip day, exactly like the
 * app's skip calendar. Skipped days don't count against completion rate.
 *
 * Data source: `month_grid` (per-habit `days` + `skipped` day numbers).
 */
class SkipDaysWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, build(ctx))
    }

    private fun build(ctx: Context): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_skip_days)
        v.setTextViewText(R.id.title, "Habit Skip Days")
        v.setTextViewText(R.id.subtitle, WidgetData.subtitle(ctx))

        val habits = WidgetData.getJsonArray(ctx, "month_grid")
        val idx = if (habits.length() == 0) 0
            else WidgetData.getInt(ctx, WidgetData.KEY_SKIP_HABIT, 0)
                .coerceIn(0, habits.length() - 1)
        val habit: JSONObject? = habits.optJSONObject(idx)
        val habitId = habit?.optString("id") ?: ""

        v.setTextViewText(
            R.id.skip_habit,
            habit?.optString("name")?.ifBlank { "No habits" } ?: "Open app to sync"
        )
        v.setOnClickPendingIntent(
            R.id.skip_prev,
            HabitToggleReceiver.pi(ctx, 201, HabitToggleReceiver.OP_SKIP_HABIT, delta = -1)
        )
        v.setOnClickPendingIntent(
            R.id.skip_next,
            HabitToggleReceiver.pi(ctx, 202, HabitToggleReceiver.OP_SKIP_HABIT, delta = 1)
        )
        v.setOnClickPendingIntent(R.id.title, HabitToggleReceiver.refreshPi(ctx))

        val cal = Calendar.getInstance()
        val today = cal.get(Calendar.DAY_OF_MONTH)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH)
        val totalDays = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        cal.set(year, month, 1)
        val firstDow = cal.get(Calendar.DAY_OF_WEEK) - 1
        val ym = String.format("%04d-%02d-", year, month + 1)

        val skipped = HashSet<Int>()
        habit?.optJSONArray("skipped")?.let { for (i in 0 until it.length()) skipped.add(it.optInt(i)) }
        val done = HashSet<Int>()
        habit?.optJSONArray("days")?.let { for (i in 0 until it.length()) done.add(it.optInt(i)) }

        for (i in 1..42) {
            val cellId = ctx.resources.getIdentifier("s$i", "id", ctx.packageName)
            if (cellId == 0) continue
            val day = i - firstDow
            if (day !in 1..totalDays) {
                v.setViewVisibility(cellId, View.INVISIBLE)
                continue
            }
            v.setViewVisibility(cellId, View.VISIBLE)
            val date = ym + String.format("%02d", day)
            val isSkip = skipped.contains(day)
            val isFuture = day > today

            v.setTextViewText(cellId, if (isSkip) "–" else day.toString())
            val bg = when {
                isSkip -> R.drawable.widget_cell_skip
                day == today -> R.drawable.widget_cell_today
                isFuture -> R.drawable.widget_cell_future
                done.contains(day) -> R.drawable.widget_card
                else -> R.drawable.widget_cell
            }
            v.setInt(cellId, "setBackgroundResource", bg)
            v.setTextColor(
                cellId,
                when {
                    isSkip -> 0xFFFCD34D.toInt()
                    day == today -> 0xFF7DD3FC.toInt()
                    isFuture -> 0xFF4B5058.toInt()
                    else -> 0xFFE7E9EE.toInt()
                }
            )

            val op = if (!isFuture && habitId.isNotEmpty())
                HabitToggleReceiver.OP_SKIP else HabitToggleReceiver.OP_REFRESH
            v.setOnClickPendingIntent(
                cellId,
                HabitToggleReceiver.pi(ctx, 2000 + day, op, habitId = habitId, date = date, day = day)
            )
        }
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
            v.setTextViewText(R.id.subtitle, WidgetData.subtitle(ctx))
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
            v.setOnClickPendingIntent(R.id.root, HabitToggleReceiver.refreshPi(ctx))
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
            v.setTextViewText(R.id.subtitle, WidgetData.subtitle(ctx))

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
            v.setOnClickPendingIntent(R.id.root, HabitToggleReceiver.refreshPi(ctx))
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
