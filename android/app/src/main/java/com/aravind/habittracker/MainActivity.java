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
        } catch (Throwable t) {
            // never block app startup
        }
    }
}
