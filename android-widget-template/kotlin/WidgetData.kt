package com.habitracker.app.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

/**
 * Reads data written by the web app via @capacitor/preferences
 * (group config = "HabitrackerWidget" → SharedPreferences file with that name).
 */
object WidgetData {
    const val PREFS = "HabitrackerWidget"

    fun prefs(ctx: Context) =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun getString(ctx: Context, key: String, default: String = ""): String =
        prefs(ctx).getString(key, default) ?: default

    fun getInt(ctx: Context, key: String, default: Int = 0): Int =
        prefs(ctx).getString(key, default.toString())?.toIntOrNull() ?: default

    fun getJsonArray(ctx: Context, key: String): JSONArray {
        val raw = getString(ctx, key, "[]")
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
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
     * Queues a pending toggle (habitId + date) into the shared prefs list
     * `pending_toggles`. The web app drains this list on startup and applies
     * the toggles to its state, then persists → cloud.
     */
    fun queueToggle(ctx: Context, habitId: String, date: String) {
        val p = prefs(ctx)
        val raw = p.getString("pending_toggles", "[]") ?: "[]"
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
     * the widget reflects the tap immediately, before the web app processes it.
     */
    fun optimisticToggleMonthGrid(ctx: Context, habitId: String, day: Int) {
        val p = prefs(ctx)
        val raw = p.getString("month_grid", "[]") ?: "[]"
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
