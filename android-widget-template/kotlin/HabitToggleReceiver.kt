package com.habitracker.app.widgets

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Single broadcast entry point for every interactive widget tap.
 *
 * Operations (`EXTRA_OP`):
 *  • OP_TOGGLE     — flip habit completion for a date (today or earlier)
 *  • OP_SKIP       — flip a per-habit skip day (marks the day N/A)
 *  • OP_WEEK       — shift the Monthly Tracking Grid week window (±1, 0 = today)
 *  • OP_SKIP_HABIT — cycle the habit shown by the Habit Skip Days widget
 *  • OP_OPEN       — just open the app (optionally at a given date)
 *
 * Toggles are queued in SharedPreferences and drained by the web app, while the
 * cached widget JSON is flipped optimistically so the tap feels instant.
 */
class HabitToggleReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val op = intent.getStringExtra(EXTRA_OP) ?: OP_TOGGLE
        val habitId = intent.getStringExtra(EXTRA_HABIT_ID)
        val date = intent.getStringExtra(EXTRA_DATE)
        val day = intent.getIntExtra(EXTRA_DAY, -1)

        when (op) {
            OP_WEEK -> {
                val delta = intent.getIntExtra(EXTRA_DELTA, 0)
                val next = if (delta == 0) 0 else
                    (WidgetData.weekOffset(ctx) + delta).coerceIn(-26, 26)
                WidgetData.setWeekOffset(ctx, next)
            }

            OP_SKIP_HABIT -> {
                val delta = intent.getIntExtra(EXTRA_DELTA, 1)
                val count = WidgetData.getJsonArray(ctx, "month_grid").length()
                if (count > 0) {
                    val cur = WidgetData.getInt(ctx, WidgetData.KEY_SKIP_HABIT, 0)
                    val next = ((cur + delta) % count + count) % count
                    WidgetData.putString(ctx, WidgetData.KEY_SKIP_HABIT, next.toString())
                }
            }

            OP_TOGGLE -> {
                if (habitId.isNullOrBlank() || date.isNullOrBlank() || day <= 0) {
                    WidgetData.openAppIntent(ctx).send(); return
                }
                WidgetData.queueToggle(ctx, habitId, date)
                WidgetData.optimisticToggle(ctx, habitId, day, "days")
            }

            OP_SKIP -> {
                if (habitId.isNullOrBlank() || date.isNullOrBlank() || day <= 0) {
                    WidgetData.openAppIntent(ctx).send(); return
                }
                WidgetData.queueSkip(ctx, habitId, date)
                WidgetData.optimisticToggle(ctx, habitId, day, "skipped")
            }

            else -> {
                if (!date.isNullOrBlank()) WidgetData.putString(ctx, WidgetData.KEY_NAV_DATE, date)
                WidgetData.openAppIntent(ctx).send()
                return
            }
        }

        WidgetData.refreshAll(ctx)
    }

    companion object {
        const val ACTION = "com.habitracker.app.widgets.TOGGLE_HABIT"
        const val EXTRA_OP = "op"
        const val EXTRA_HABIT_ID = "habitId"
        const val EXTRA_DATE = "date"
        const val EXTRA_DAY = "day"
        const val EXTRA_DELTA = "delta"
        const val EXTRA_TOGGLEABLE = "toggleable"

        const val OP_TOGGLE = "toggle"
        const val OP_SKIP = "skip"
        const val OP_WEEK = "week"
        const val OP_SKIP_HABIT = "skipHabit"
        const val OP_OPEN = "open"

        /** Direct PendingIntent for non-collection widgets. */
        fun pi(
            ctx: Context,
            requestCode: Int,
            op: String,
            habitId: String? = null,
            date: String? = null,
            day: Int = -1,
            delta: Int = 0
        ): PendingIntent {
            val i = Intent(ctx, HabitToggleReceiver::class.java).apply {
                action = "$ACTION.$op.$requestCode"
                putExtra(EXTRA_OP, op)
                putExtra(EXTRA_HABIT_ID, habitId)
                putExtra(EXTRA_DATE, date)
                putExtra(EXTRA_DAY, day)
                putExtra(EXTRA_DELTA, delta)
            }
            return PendingIntent.getBroadcast(
                ctx, requestCode, i,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
        }
    }
}
