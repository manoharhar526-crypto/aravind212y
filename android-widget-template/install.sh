#!/usr/bin/env bash
# install.sh — copies widget files into the generated Android project.
# Run AFTER `npx cap add android` and BEFORE `npx cap sync android`.
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID="android/app/src/main"
PKG="com/aravind/habittracker"

if [ ! -d "android" ]; then
  echo "❌ android/ folder not found. Run 'npx cap add android' first."
  exit 1
fi

mkdir -p "$ANDROID/java/$PKG/widgets"
mkdir -p "$ANDROID/res/layout"
mkdir -p "$ANDROID/res/xml"

echo "→ Copying Kotlin sources..."
cp "$ROOT"/kotlin/*.kt "$ANDROID/java/$PKG/widgets/"

echo "→ Copying layouts..."
cp "$ROOT"/res-layout/*.xml "$ANDROID/res/layout/"

echo "→ Copying widget-info XML..."
cp "$ROOT"/res-xml/*.xml "$ANDROID/res/xml/"

echo ""
echo "✅ Files copied."
echo ""
echo "👉 Final step: open $ANDROID/AndroidManifest.xml and paste the <receiver> blocks"
echo "   from android-widget-template/manifest-additions.xml inside the <application> tag."
echo ""
echo "   Then run: npx cap sync android && npx cap open android"
