import { useEffect } from "react";
import { saveSharedBackup } from "@/lib/sharedBackup";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

export const AUTO_BACKUP_SETTINGS_KEY = "autoBackupSettings";

export interface AutoBackupSettings {
  enabled: boolean;
  time: string;      // "HH:MM" in IST
  code?: string;     // user's reserved shared-backup code
  lastRun?: string;  // "YYYY-MM-DD" IST
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
    const check = async () => {
      const s = loadAutoBackupSettings();
      if (!s.enabled || !s.code) return;
      const { date, time } = istNow();
      if (s.lastRun === date) return;
      if (time < s.time) return;
      try {
        await saveSharedBackup(s.code, habits, tasks, "Auto backup");
        saveAutoBackupSettings({ ...s, lastRun: date });
      } catch (err) {
        console.warn("[autoBackup] failed:", err);
      }
    };
    void check();
    const id = setInterval(() => void check(), 60_000);
    return () => clearInterval(id);
  }, [habits, tasks]);
};
