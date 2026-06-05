#!/usr/bin/env node
/**
 * after-sync.cjs — runs automatically after `npx cap sync` / `cap copy` / `cap update`
 * via the `capacitor:sync:after` / `capacitor:copy:after` / `capacitor:update:after`
 * npm script hooks declared in package.json.
 *
 * Copies all 16 Habitracker home-screen widget sources into the generated
 * android/ project and patches AndroidManifest.xml to register them.
 *
 * Safe to run repeatedly — re-copies files and skips manifest patch if
 * already applied. Silent no-op if android/ folder doesn't exist yet
 * (e.g. iOS-only or web build).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = path.join(ROOT, "android-widget-template");
const ANDROID = path.join(ROOT, "android", "app", "src", "main");
const PKG_DIR = path.join(ANDROID, "java", "com", "aravind", "habittracker", "widgets");
const LAYOUT_DIR = path.join(ANDROID, "res", "layout");
const XML_DIR = path.join(ANDROID, "res", "xml");
const MANIFEST = path.join(ANDROID, "AndroidManifest.xml");
const STRINGS_XML = path.join(ANDROID, "res", "values", "strings.xml");
const ROOT_GRADLE = path.join(ROOT, "android", "build.gradle");
const APP_GRADLE = path.join(ROOT, "android", "app", "build.gradle");
const VARIABLES_GRADLE = path.join(ROOT, "android", "variables.gradle");

if (!fs.existsSync(path.join(ROOT, "android"))) {
  // No android platform yet — nothing to do
  process.exit(0);
}
if (!fs.existsSync(TEMPLATE)) {
  console.warn("[widgets] android-widget-template/ missing — skipping");
  process.exit(0);
}

const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });
const copyAll = (from, to, ext) => {
  ensureDir(to);
  for (const f of fs.readdirSync(from)) {
    if (!f.endsWith(ext)) continue;
    fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
};

console.log("[widgets] copying widget sources into android/");
copyAll(path.join(TEMPLATE, "kotlin"), PKG_DIR, ".kt");
copyAll(path.join(TEMPLATE, "res-layout"), LAYOUT_DIR, ".xml");
copyAll(path.join(TEMPLATE, "res-xml"), XML_DIR, ".xml");
console.log("[widgets] copied Kotlin, layout, and widget-provider XML files ✓");

const patchFile = (file, patcher) => {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, "utf8");
  const after = patcher(before);
  if (after !== before) fs.writeFileSync(file, after);
};

for (const f of fs.readdirSync(XML_DIR).filter((name) => name.startsWith("widget_info_") && name.endsWith(".xml"))) {
  patchFile(path.join(XML_DIR, f), (s) =>
    s.includes("android:previewImage")
      ? s
      : s.replace(/android:previewLayout="([^"]+)"/, 'android:previewLayout="$1"\n    android:previewImage="@drawable/ic_launcher_background"')
  );
}

patchFile(VARIABLES_GRADLE, (s) =>
  s.includes("kotlinVersion")
    ? s
    : s.replace("targetSdkVersion = 34", "targetSdkVersion = 34\n    kotlinVersion = '1.9.22'")
);

patchFile(ROOT_GRADLE, (s) =>
  s.includes("org.jetbrains.kotlin:kotlin-gradle-plugin")
    ? s
    : s.replace(
        "classpath 'com.android.tools.build:gradle:8.2.1'",
        "classpath 'com.android.tools.build:gradle:8.2.1'\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'"
      )
);

patchFile(APP_GRADLE, (s) => {
  let out = s.includes("org.jetbrains.kotlin.android")
    ? s
    : s.replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'");
  if (!out.includes("kotlinOptions")) {
    out = out.replace(
      /\n}\s*\n\nrepositories \{/,
      "\n    kotlinOptions {\n        jvmTarget = '17'\n    }\n}\n\nrepositories {"
    );
  }
  return out;
});

patchFile(STRINGS_XML, (s) => {
  if (s.includes('name="widget_today_habits"')) return s;
  const labels = `
    <string name="widget_today_habits">Today&apos;s Habits</string>
    <string name="widget_streak">Streak Counter</string>
    <string name="widget_progress">Today&apos;s Progress</string>
    <string name="widget_daily_tasks">Today&apos;s Tasks</string>
    <string name="widget_weekly_tasks">Weekly Tasks</string>
    <string name="widget_monthly_tasks">Monthly Tasks</string>
    <string name="widget_note">Today&apos;s Note</string>
    <string name="widget_quick_open">Quick Open</string>
    <string name="widget_month_grid">Monthly Tracking Grid</string>
    <string name="widget_skip_days">Habit Skip Days</string>
    <string name="widget_analytics">Habit Analytics</string>
    <string name="widget_calendar">Calendar</string>
    <string name="widget_all_time_stats">All-Time Statistics</string>
    <string name="widget_habit_reports">Habit Reports</string>
    <string name="widget_task_reports">Task Reports</string>
    <string name="widget_task_analytics">Task Analytics</string>`;
  return s.replace("</resources>", `${labels}\n</resources>`);
});

// Patch AndroidManifest.xml
if (!fs.existsSync(MANIFEST)) {
  console.warn("[widgets] AndroidManifest.xml not found — skipping patch");
  process.exit(0);
}

let manifest = fs.readFileSync(MANIFEST, "utf8");
const additions = fs.readFileSync(
  path.join(TEMPLATE, "manifest-additions.xml"),
  "utf8"
);
// Strip the leading explanatory <!-- ... --> comment
const receivers = additions
  .replace(/<!--[\s\S]*?-->/, "")
  .trim()
  .replace(/<receiver(?![^>]*android:icon=)/g, '<receiver android:icon="@mipmap/ic_launcher"')
  .split("\n")
  .map((l) => "        " + l)
  .join("\n");

const block =
  "\n        <!-- HABITRACKER_WIDGETS_BEGIN -->\n" +
  receivers +
  "\n        <!-- HABITRACKER_WIDGETS_END -->\n    ";

if (manifest.includes("HABITRACKER_WIDGETS_BEGIN")) {
  if (!manifest.includes("android:installLocation")) {
    manifest = manifest.replace(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    android:installLocation="internalOnly">'
    );
  }
  manifest = manifest.replace(
    /\n\s*<!-- HABITRACKER_WIDGETS_BEGIN -->[\s\S]*?<!-- HABITRACKER_WIDGETS_END -->\n\s*/,
    block
  );
  fs.writeFileSync(MANIFEST, manifest);
  console.log("[widgets] ✓ refreshed 16 widget receivers in AndroidManifest.xml");
  process.exit(0);
}

if (!manifest.includes("</application>")) {
  console.error("[widgets] </application> tag not found in manifest");
  process.exit(1);
}

if (!manifest.includes("android:installLocation")) {
  manifest = manifest.replace(
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    android:installLocation="internalOnly">'
  );
}

manifest = manifest.replace("</application>", block + "</application>");
fs.writeFileSync(MANIFEST, manifest);
console.log("[widgets] ✓ injected 16 widget receivers into AndroidManifest.xml");
