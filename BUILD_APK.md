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

## Home-Screen Widgets (8 included)

After installing the APK, **long-press your home screen → Widgets → Habitracker**
and you'll see all 8 widgets:

1. **Today's Habits** — list of today's habits with ✓ for done
2. **Streak Counter** — current best streak in big numbers
3. **Today's Progress** — "X/Y done" + progress bar + %
4. **Today's Tasks** — daily tasks for today
5. **Weekly Tasks** — this week's tasks
6. **Monthly Tasks** — this month's tasks
7. **Today's Note** — calendar note for today
8. **Quick Open** — 1×1 launcher icon

Widgets refresh every 30 minutes and whenever you change something in the app.
See `android-widget-template/README.md` for details.
