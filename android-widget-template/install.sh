#!/usr/bin/env bash
# install.sh — installs all 16 Habitracker home-screen widgets into the
# Android project AND auto-patches AndroidManifest.xml.
#
# Run AFTER `npx cap add android` and BEFORE `npx cap sync android`.
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID="android/app/src/main"
PKG="com/aravind/habittracker"
MANIFEST="$ANDROID/AndroidManifest.xml"

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

echo "→ Patching AndroidManifest.xml..."
if [ ! -f "$MANIFEST" ]; then
  echo "❌ $MANIFEST not found."
  exit 1
fi

if grep -q "HABITRACKER_WIDGETS_BEGIN" "$MANIFEST"; then
  echo "  ✓ Widgets already registered, skipping."
else
  # Backup
  cp "$MANIFEST" "$MANIFEST.bak"

  # Extract receiver block (everything between the HTML comments stripped)
  RECEIVERS=$(grep -v '^<!--' "$ROOT/manifest-additions.xml" | grep -v '^-->' | sed '/^$/d')

  # Inject receivers before the closing </application> tag using python (portable)
  python3 - "$MANIFEST" <<PYEOF
import sys, re
path = sys.argv[1]
with open(path, "r") as f:
    content = f.read()

receivers = open("$ROOT/manifest-additions.xml").read()
# Strip the leading explanatory comment block
receivers = re.sub(r"<!--.*?-->", "", receivers, count=1, flags=re.S).strip()

block = "\n        <!-- HABITRACKER_WIDGETS_BEGIN -->\n" + \
        "\n".join("        " + line for line in receivers.splitlines()) + \
        "\n        <!-- HABITRACKER_WIDGETS_END -->\n    "

if "</application>" not in content:
    print("❌ Could not find </application> in manifest")
    sys.exit(1)

content = content.replace("</application>", block + "</application>", 1)
with open(path, "w") as f:
    f.write(content)
print("  ✓ Injected 16 widget receivers")
PYEOF
fi

echo ""
echo "✅ Done! All 16 widgets installed and registered."
echo ""
echo "Next: npx cap sync android && npx cap open android"
echo "Then build the APK in Android Studio."
echo "Long-press your home screen → Widgets → Habitracker to add them."
