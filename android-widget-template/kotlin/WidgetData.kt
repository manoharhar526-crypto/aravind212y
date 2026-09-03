package com.habitracker.app.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Reads data written by the web app via @capacitor/preferences.
 *
 * IMPORTANT: the web app writes with the DEFAULT Capacitor Preferences group,
 * which maps to the SharedPreferences file "CapacitorStorage". A previous
 * version used a custom group ("HabitrackerWidget"); we still read that file
 * as a fallback so old installs keep working.
 */
object WidgetData {
    const val PREFS = "CapacitorStorage"
    private const val LEGACY_PREFS = "HabitrackerWidget"

    const val KEY_WEEK_OFFSET = "widget_week_offset"
    const val KEY_SKIP_HABIT = "widget_skip_habit_idx"
    const val KEY_PENDING_SKIPS = "pending_skips"
    const val KEY_PENDING_TOGGLES = "pending_toggles"
    const val KEY_NAV_DATE = "widget_nav_date"

    fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun legacy(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE)

    fun getString(ctx: Context, key: String, default: String = ""): String {
        val v = prefs(ctx).getString(key, null)
        if (!v.isNullOrEmpty()) return v
        val l = legacy(ctx).getString(key, null)
        return if (!l.isNullOrEmpty()) l else default
    }

    fun putString(ctx: Context, key: String, value: String) {
        prefs(ctx).edit().putString(key, value).apply()
    }

    fun getInt(ctx: Context, key: String, default: Int = 0): Int =
        getString(ctx, key, default.toString()).trim().toIntOrNull() ?: default

    fun getJsonArray(ctx: Context, key: String): JSONArray {
        val raw = getString(ctx, key, "[]")
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    }

    /** Header subtitle: month name, or a hint when the app has never synced. */
    fun subtitle(ctx: Context): String {
        val m = getString(ctx, "calendar_month", "")
        return if (m.isNotEmpty()) m else "Open app to sync"
    }

    /** True when the app has synced data to native storage at least once. */
    fun hasData(ctx: Context): Boolean =
        getString(ctx, "last_sync", "").isNotEmpty()

    // ── Dates ───────────────────────────────────────────────────────────────
    private val fmt get() = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun dateStr(cal: Calendar): String = fmt.format(cal.time)

    fun today(): Calendar = Calendar.getInstance()

    fun todayStr(): String = dateStr(Calendar.getInstance())

    /**
     * Start (Sunday) of the week currently shown by the Monthly Tracking Grid.
     * Offset 0 = week containing today; the widget's ‹ › buttons shift it.
     * When the real week rolls over, offset 0 automatically follows.
     */
    fun weekStart(ctx: Context): Calendar {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_MONTH, -(cal.get(Calendar.DAY_OF_WEEK) - 1))
        cal.add(Calendar.DAY_OF_MONTH, weekOffset(ctx) * 7)
        cal.set(Calendar.HOUR_OF_DAY, 12)
        return cal
    }

    fun weekOffset(ctx: Context): Int = getInt(ctx, KEY_WEEK_OFFSET, 0)

    fun setWeekOffset(ctx: Context, value: Int) =
        putString(ctx, KEY_WEEK_OFFSET, value.toString())

    /** "Sep 1 – 7" style label for the shown week. */
    fun weekLabel(ctx: Context): String {
        val start = weekStart(ctx)
        val end = (start.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 6) }
        val mFmt = SimpleDateFormat("MMM", Locale.US)
        val a = mFmt.format(start.time) + " " + start.get(Calendar.DAY_OF_MONTH)
        val b = if (start.get(Calendar.MONTH) == end.get(Calendar.MONTH))
            end.get(Calendar.DAY_OF_MONTH).toString()
        else
            mFmt.format(end.time) + " " + end.get(Calendar.DAY_OF_MONTH)
        return "$a – $b"
    }

    data class Item(val id: String, val title: String, val completed: Boolean)

    fun parseItems(arr: JSONArray, titleKey: String = "title"): List<Item> {
        val out = mutableListOf<Item>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                Item(
                    id = o.optString("id"),
                    title = o.optString(titleKey, o.optString("name", "")),
                    completed = o.optBoolean("completed", false)
                )
            )
        }
        return out
    }

    /** Opens the app (used for row/whole-widget clicks). */
    fun openAppIntent(ctx: Context): PendingIntent {
        val i = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
            ?: Intent(Intent.ACTION_MAIN)
        return PendingIntent.getActivity(
            ctx, 0, i,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    /**
     * Queues a pending toggle (habitId + date) into `pending_toggles`.
     * The web app drains this list on startup and applies the toggles.
     */
    fun queueToggle(ctx: Context, habitId: String, date: String) {
        queueInto(ctx, KEY_PENDING_TOGGLES, habitId, date)
    }

    /** Queues a pending skip-day toggle into `pending_skips`. */
    fun queueSkip(ctx: Context, habitId: String, date: String) {
        queueInto(ctx, KEY_PENDING_SKIPS, habitId, date)
    }

    private fun queueInto(ctx: Context, key: String, habitId: String, date: String) {
        val raw = getString(ctx, key, "[]")
        val arr = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        arr.put(JSONObject().apply {
            put("habitId", habitId)
            put("date", date)
            put("ts", System.currentTimeMillis())
        })
        putString(ctx, key, arr.toString())
    }

    /**
     * Optimistically flip the given day in the cached `month_grid` JSON so the
     * widget reflects the tap immediately. `field` is "days" or "skipped".
     */
    fun optimisticToggle(ctx: Context, habitId: String, day: Int, field: String) {
        val raw = getString(ctx, "month_grid", "[]")
        val arr = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optString("id") != habitId) continue
            val days = o.optJSONArray(field) ?: JSONArray()
            val set = mutableListOf<Int>()
            for (j in 0 until days.length()) set.add(days.optInt(j))
            if (set.contains(day)) set.remove(day) else set.add(day)
            o.put(field, JSONArray(set))
            break
        }
        putString(ctx, "month_grid", arr.toString())
    }

    fun optimisticToggleMonthGrid(ctx: Context, habitId: String, day: Int) =
        optimisticToggle(ctx, habitId, day, "days")

    /** Repaints every Habitracker widget right away. */
    fun refreshAll(ctx: Context) = WidgetRefreshScheduler.refreshAllNow(ctx)
}
