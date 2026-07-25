package com.aravind.habittracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.aravind.habittracker.widgets.WidgetRefreshScheduler;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WidgetRefreshScheduler.INSTANCE.scheduleAll(getApplicationContext());
            WidgetRefreshScheduler.INSTANCE.refreshAllNow(getApplicationContext());
        } catch (Throwable t) { /* ignore */ }
    }

    @Override
    public void onPause() {
        super.onPause();
        // App is going to background — push latest data snapshot to widgets now.
        try { WidgetRefreshScheduler.INSTANCE.refreshAllNow(getApplicationContext()); } catch (Throwable t) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        try { WidgetRefreshScheduler.INSTANCE.refreshAllNow(getApplicationContext()); } catch (Throwable t) {}
    }
}
