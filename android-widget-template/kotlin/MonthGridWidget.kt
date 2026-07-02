package com.aravind.habittracker.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.aravind.habittracker.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Monthly Tracking Grid — a collection widget.
 *
 * Renders a ListView where every row = one habit, showing all 30/31 day
 * cells colored by state (completed / today / skipped / missed / future).
 * Each cell is individually tappable:
 *   • today / yesterday  → toggle completion (matches app rule)
 *   • any other day      → open the app
 *
 * Data is read by MonthGridRemoteViewsService from SharedPreferences
 * (group "HabitrackerWidget", key "month_grid") — written by the web app
 * via @capacitor/preferences on every state change.
 */
class MonthGridWidget : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) mgr.updateAppWidget(id, buildViews(ctx, id))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Force the ListView to reload its rows whenever we're pinged
        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(ComponentName(context, MonthGridWidget::class.java))
        if (ids.isNotEmpty()) mgr.notifyAppWidgetViewDataChanged(ids, R.id.list)
    }

    private fun buildViews(ctx: Context, appWidgetId: Int): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.widget_month_grid)

        // Subtitle: current month name
        val month = WidgetData.getString(ctx, "calendar_month", "")
        v.setTextViewText(R.id.subtitle, month)

        // Wire the ListView to our RemoteViewsService (per-widget-id intent)
        val svc = Intent(ctx, MonthGridRemoteViewsService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
        }
        v.setRemoteAdapter(R.id.list, svc)
        v.setEmptyView(R.id.list, R.id.empty)

        // Template intent for cell taps — MonthGridRemoteViewsService fills in the extras
        val templateIntent = Intent(ctx, HabitToggleReceiver::class.java).apply {
            action = HabitToggleReceiver.ACTION
        }
        val templatePi = PendingIntent.getBroadcast(
            ctx, 0, templateIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                    or PendingIntent.FLAG_MUTABLE
        )
        v.setPendingIntentTemplate(R.id.list, templatePi)

        // Title bar taps → open app
        v.setOnClickPendingIntent(R.id.title, WidgetData.openAppIntent(ctx))
        v.setOnClickPendingIntent(R.id.subtitle, WidgetData.openAppIntent(ctx))

        return v
    }
}
