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

const patchFile = (file, patcher) => {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, "utf8");
  const after = patcher(before);
  if (after !== before) fs.writeFileSync(file, after);
};

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

// Patch AndroidManifest.xml
if (!fs.existsSync(MANIFEST)) {
  console.warn("[widgets] AndroidManifest.xml not found — skipping patch");
  process.exit(0);
}

let manifest = fs.readFileSync(MANIFEST, "utf8");
if (manifest.includes("HABITRACKER_WIDGETS_BEGIN")) {
  console.log("[widgets] manifest already patched ✓");
  process.exit(0);
}

const additions = fs.readFileSync(
  path.join(TEMPLATE, "manifest-additions.xml"),
  "utf8"
);
// Strip the leading explanatory <!-- ... --> comment
const receivers = additions
  .replace(/<!--[\s\S]*?-->/, "")
  .trim()
  .split("\n")
  .map((l) => "        " + l)
  .join("\n");

const block =
  "\n        <!-- HABITRACKER_WIDGETS_BEGIN -->\n" +
  receivers +
  "\n        <!-- HABITRACKER_WIDGETS_END -->\n    ";

if (!manifest.includes("</application>")) {
  console.error("[widgets] </application> tag not found in manifest");
  process.exit(1);
}

manifest = manifest.replace("</application>", block + "</application>");
fs.writeFileSync(MANIFEST, manifest);
console.log("[widgets] ✓ injected 16 widget receivers into AndroidManifest.xml");
