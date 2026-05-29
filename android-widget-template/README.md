# Habitracker — Android Widgets

This folder contains **8 native Android home-screen widgets** for Habitracker.
Capacitor cannot render React inside home-screen widgets, so they are written
in Kotlin/XML and read data from `SharedPreferences` that the web app writes
via `@capacitor/preferences` (group: `HabitrackerWidget`).

## What you get

| # | Widget | Size | Shows |
|---|--------|------|-------|
| 1 | Today's Habits      | 3×3 | List of today's habits + ✓ if done |
| 2 | Streak Counter      | 2×2 | Max current streak across habits |
| 3 | Today's Progress    | 2×2 | "X/Y done" + percent |
| 4 | Today's Tasks       | 3×3 | Daily tasks for today |
| 5 | Weekly Tasks        | 3×3 | This week's tasks |
| 6 | Monthly Tasks       | 3×3 | This month's tasks |
| 7 | Today's Note        | 3×2 | Calendar note for today |
| 8 | Quick Open          | 1×1 | One-tap app launcher |

All widgets refresh every 30 minutes and whenever the app pushes updates.

---

## One-time setup (after `npx cap add android`)

```bash
# From project root, after running: npx cap add android
bash android-widget-template/install.sh
npx cap sync android
```

Then open Android Studio (`npx cap open android`), let Gradle sync, and
build the APK. Long-press the home screen → Widgets → Habitracker to add.

---

## Files

```
android-widget-template/
├── install.sh                      # Copies everything into android/app/src/main/
├── README.md                       # (this file)
├── kotlin/
│   ├── WidgetData.kt               # Shared SharedPreferences reader
│   ├── TodayHabitsWidget.kt
│   ├── StreakWidget.kt
│   ├── ProgressWidget.kt
│   ├── DailyTasksWidget.kt
│   ├── WeeklyTasksWidget.kt
│   ├── MonthlyTasksWidget.kt
│   ├── NoteWidget.kt
│   └── QuickOpenWidget.kt
├── res-layout/                     # Goes into res/layout/
│   ├── widget_today_habits.xml
│   ├── widget_streak.xml
│   ├── widget_progress.xml
│   ├── widget_daily_tasks.xml
│   ├── widget_weekly_tasks.xml
│   ├── widget_monthly_tasks.xml
│   ├── widget_note.xml
│   └── widget_quick_open.xml
├── res-xml/                        # Goes into res/xml/
│   ├── widget_info_today_habits.xml
│   ├── widget_info_streak.xml
│   ├── widget_info_progress.xml
│   ├── widget_info_daily_tasks.xml
│   ├── widget_info_weekly_tasks.xml
│   ├── widget_info_monthly_tasks.xml
│   ├── widget_info_note.xml
│   └── widget_info_quick_open.xml
└── manifest-additions.xml          # Paste these <receiver> tags into AndroidManifest.xml
```

## Data contract (what the web app writes)

Stored in `SharedPreferences` file **`HabitrackerWidget`** (Capacitor Preferences group):

- `today_date`        → "YYYY-MM-DD"
- `habits_today`      → JSON `[{id,name,completed}]`
- `streak`            → integer string
- `progress_done`     → integer string
- `progress_total`    → integer string
- `progress_pct`      → integer string (0-100)
- `tasks_daily`       → JSON `[{id,title,completed}]`
- `tasks_weekly`      → JSON `[{id,title,completed}]`
- `tasks_monthly`     → JSON `[{id,title,completed}]`
- `note_today`        → string (title — body)
- `last_sync`         → ISO timestamp
