import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

const STORAGE_KEY = "habit_tracker_v1";

type StoredStateV1 = {
  habits: Habit[];
  tasks: Task[];
  currentMonth: string; // ISO string
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
    if (!Array.isArray(parsed.habits) || !Array.isArray(parsed.tasks) || !parsed.currentMonth) {
      return null;
    }

    const currentMonth = new Date(parsed.currentMonth);
    if (Number.isNaN(currentMonth.getTime())) return null;

    return {
      habits: parsed.habits as Habit[],
      tasks: parsed.tasks as Task[],
      currentMonth,
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
