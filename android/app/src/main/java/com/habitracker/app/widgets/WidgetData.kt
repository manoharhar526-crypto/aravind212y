package com.habitracker.app.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

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
        val p = prefs(ctx)
        val raw = getString(ctx, "pending_toggles", "[]")
        val arr = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        arr.put(JSONObject().apply {
            put("habitId", habitId)
            put("date", date)
            put("ts", System.currentTimeMillis())
        })
        p.edit().putString("pending_toggles", arr.toString()).apply()
    }

    /**
     * Optimistically flip the given date in the cached `month_grid` JSON so
     * the widget reflects the tap immediately.
     */
    fun optimisticToggleMonthGrid(ctx: Context, habitId: String, day: Int) {
        val p = prefs(ctx)
        val raw = getString(ctx, "month_grid", "[]")
        val arr = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            if (o.optString("id") != habitId) continue
            val days = o.optJSONArray("days") ?: JSONArray()
            val set = mutableListOf<Int>()
            for (j in 0 until days.length()) set.add(days.optInt(j))
            if (set.contains(day)) set.remove(day) else set.add(day)
            o.put("days", JSONArray(set))
            break
        }
        p.edit().putString("month_grid", arr.toString()).apply()
    }
}
