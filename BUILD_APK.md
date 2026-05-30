# 📱 Build APK Instructions — Habitracker Native Android App

## Prerequisites
- ✅ Android Studio installed
- ✅ Node.js 18+ installed

---

## Steps

```bash
# 1. Install dependencies
npm install

# 2. Build web app
npm run build

# 3. Add Android (first time only)
npx cap add android

# 4. Copy app icons + install 8 home-screen widgets
bash copy-icons.sh
bash android-widget-template/install.sh

# 5. Edit android/app/src/main/AndroidManifest.xml
#    Paste the <receiver> blocks from android-widget-template/manifest-additions.xml
#    inside the <application> tag (after the <activity> block).

# 6. Sync
npx cap sync android

# 7. Open Android Studio
npx cap open android
```

## In Android Studio
1. Wait for Gradle sync
2. Build → Build Bundle(s) / APK(s) → Build APK(s)
3. Click "locate" when done

## APK location
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## App Details
- App ID: com.aravind.habittracker
- App Name: Habitracker
- Supabase URL: https://znkapwdqnyviudyxlofx.supabase.co

## Home-Screen Widgets (16 included)

After installing the APK, **long-press your home screen → Widgets → Habitracker**
and you'll see all 16 widgets:

1. **Today's Habits** — list with ✓ for done
2. **Streak Counter** — current best streak
3. **Today's Progress** — "X/Y done" + bar + %
4. **Today's Tasks** — daily tasks for today
5. **Weekly Tasks** — this week's tasks
6. **Monthly Tasks** — this month's tasks
7. **Today's Note** — calendar note for today
8. **Quick Open** — 1×1 launcher
9. **Monthly Tracking Grid** — per-habit filled/empty squares for this month
10. **Habit Skip Days** — habits + skipped-day count this month
11. **Habit Analytics** — top habits by completion % this month
12. **Calendar** — current week with today + note markers
13. **All-Time Statistics** — completions, months, overall %, best streak, best habit
14. **Habit Reports** — per-habit monthly completion summary
15. **Task Reports** — daily / weekly / monthly done-vs-total
16. **Task Analytics** — daily / weekly / monthly completion bars

Widgets refresh every 30 minutes and whenever you change something in the app.
See `android-widget-template/README.md` for details.
