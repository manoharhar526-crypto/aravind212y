package com.aravind.habittracker.widgets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Reads data written by the web app via @capacitor/preferences
 * (group config = "HabitrackerWidget" → SharedPreferences file with that name).
 */
object WidgetData {
    private const val PREFS = "HabitrackerWidget"

    private fun prefs(ctx: Context) =
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
}
