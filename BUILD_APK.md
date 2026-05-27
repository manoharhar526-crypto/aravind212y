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

# 4. Copy app icons to Android
bash copy-icons.sh

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
- App ID: com.aravind.habittracker
- App Name: Habitracker
- Supabase URL: https://znkapwdqnyviudyxlofx.supabase.co
