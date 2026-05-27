import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNotificationsOnNative } from "./lib/notificationUtils";

let appStarted = false;

const startApp = async () => {
  if (appStarted) return;
  appStarted = true;
  await initNotificationsOnNative();
  createRoot(document.getElementById("root")!).render(<App />);
};

if ((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
  document.addEventListener("deviceready", () => startApp(), false);
  setTimeout(() => startApp(), 2000); // fallback if deviceready doesn't fire
} else {
  startApp();
}
