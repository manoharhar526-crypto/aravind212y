import { useEffect } from "react";
import { saveManualBackup } from "@/lib/appStorage";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

export const AUTO_BACKUP_SETTINGS_KEY = "autoBackupSettings";

export interface AutoBackupSettings {
  enabled: boolean;
  time: string; // "HH:MM" in IST
  lastRun?: string; // "YYYY-MM-DD" IST
}

export const loadAutoBackupSettings = (): AutoBackupSettings => {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
    if (raw) return { enabled: false, time: "22:00", ...JSON.parse(raw) };
  } catch {}
  return { enabled: false, time: "22:00" };
};

export const saveAutoBackupSettings = (s: AutoBackupSettings) => {
  try { localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(s)); } catch {}
};

const istNow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
};

export const useAutoBackup = (habits: Habit[], tasks: Task[]) => {
  useEffect(() => {
    const check = () => {
      const s = loadAutoBackupSettings();
      if (!s.enabled) return;
      const { date, time } = istNow();
      if (s.lastRun === date) return;
      if (time < s.time) return;
      const code = `auto-${date}`;
      const result = saveManualBackup(code, habits, tasks, "Auto backup");
      if (result.success || result.error?.toLowerCase().includes("exists")) {
        saveAutoBackupSettings({ ...s, lastRun: date });
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [habits, tasks]);
};
