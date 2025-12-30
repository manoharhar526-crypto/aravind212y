import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

const STORAGE_KEY = "habit_tracker_v1";
const SETTINGS_KEY = "habit_tracker_settings_v1";

type StoredStateV1 = {
  habits: Habit[];
  tasks: Task[];
  currentMonth: string; // ISO string
};

export type AppSettings = {
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm format
};

const defaultSettings: AppSettings = {
  reminderEnabled: false,
  reminderTime: "09:00",
};

export const loadAppStorage = (): {
  habits: Habit[];
  tasks: Task[];
  currentMonth: Date;
} | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredStateV1>;
    if (!Array.isArray(parsed.habits) || !Array.isArray(parsed.tasks)) {
      return null;
    }

    // Always use current month instead of stored month
    return {
      habits: parsed.habits as Habit[],
      tasks: parsed.tasks as Task[],
      currentMonth: new Date(),
    };
  } catch {
    return null;
  }
};

export const saveAppStorage = (state: {
  habits: Habit[];
  tasks: Task[];
  currentMonth: Date;
}) => {
  try {
    const payload: StoredStateV1 = {
      habits: state.habits,
      tasks: state.tasks,
      currentMonth: state.currentMonth.toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors (e.g., private mode / quota)
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      reminderEnabled: parsed.reminderEnabled ?? defaultSettings.reminderEnabled,
      reminderTime: parsed.reminderTime ?? defaultSettings.reminderTime,
    };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: AppSettings) => {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

export const clearAllStorage = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignore
  }
};
