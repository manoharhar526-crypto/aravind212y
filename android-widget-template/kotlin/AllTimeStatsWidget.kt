package com.aravind.habittracker.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.aravind.habittracker.R

class AllTimeStatsWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val v = RemoteViews(ctx.packageName, R.layout.widget_all_time_stats)
            v.setTextViewText(R.id.title, "All-Time Statistics")
            v.setTextViewText(R.id.stat1_num, WidgetData.getInt(ctx, "alltime_completions").toString())
            v.setTextViewText(R.id.stat1_label, "completions")
            v.setTextViewText(R.id.stat2_num, WidgetData.getInt(ctx, "alltime_months").toString())
            v.setTextViewText(R.id.stat2_label, "months")
            v.setTextViewText(R.id.stat3_num, "${WidgetData.getInt(ctx, "alltime_rate")}%")
            v.setTextViewText(R.id.stat3_label, "overall")
            v.setTextViewText(R.id.stat4_num, WidgetData.getInt(ctx, "alltime_streak").toString())
            v.setTextViewText(R.id.stat4_label, "best streak")
            v.setTextViewText(R.id.best_habit, "Best: " + WidgetData.getString(ctx, "alltime_best", "—"))
            v.setOnClickPendingIntent(R.id.root, WidgetData.openAppIntent(ctx))
            mgr.updateAppWidget(id, v)
        }
    }
}
