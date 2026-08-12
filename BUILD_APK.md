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

# 4. Copy app icons + auto-install all 16 home-screen widgets
#    (this script also patches AndroidManifest.xml automatically — no manual edit needed)
bash copy-icons.sh
bash android-widget-template/install.sh

# 5. Sync
npx cap sync android

# 6. Open Android Studio
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
- App ID: com.habitracker.app
- App Name: Habitracker
- Supabase URL: https://znkapwdqnyviudyxlofx.supabase.co

## Home-Screen Widgets (7 included)

After installing the APK, **long-press your home screen → Widgets → Habitracker**
and you'll see all 7 widgets:

1. **Monthly Tracking Grid** — per-habit filled/empty squares for this month (tap a day to toggle)
2. **Habit Skip Days** — habits + skipped-day count this month
3. **Habit Analytics** — top habits by completion % this month
4. **Calendar** — current month with today + note markers
5. **All-Time Statistics** — completions, months, overall %, best streak, best habit
6. **Habit Reports** — per-habit monthly completion summary
7. **Task Reports** — daily / weekly / monthly done-vs-total

Widgets refresh every 15 minutes and whenever you change something in the app.
See `android-widget-template/README.md` for details.
