/**
 * widgetSync.ts — Mirrors latest user data into native SharedPreferences
 * so Android home-screen widgets can read it without opening the app.
 *
 * Uses @capacitor/preferences with group "HabitrackerWidget".
 * Safe no-op on web (Capacitor not running natively).
 */
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";
import type { CalendarNote } from "@/types/calendarNote";
import { calculateTotalStreak } from "@/lib/habitUtils";

const GROUP = "HabitrackerWidget";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const monthKey = () => todayStr().substring(0, 7);

const setItem = async (key: string, value: string) => {
  try {
    await Preferences.configure({ group: GROUP });
    await Preferences.set({ key, value });
  } catch {
    /* web fallback — ignore */
  }
};

export type WidgetSyncInput = {
  habits: Habit[];
  tasks: Task[];
  notes: CalendarNote[];
  frozenDates: string[];
};

export const syncWidgetData = async ({ habits, tasks, notes, frozenDates }: WidgetSyncInput) => {
  if (!Capacitor.isNativePlatform()) return;

  const today = todayStr();
  const month = monthKey();
  const dayNum = new Date().getDate();

  // Habits scoped to current month
  const monthHabits = habits.filter(h => h.month === month);

  // 1. Today's habits (id, name, completed)
  const todaysHabits = monthHabits.map(h => ({
    id: h.id,
    name: h.name,
    completed: h.completedDays.includes(today),
  }));

  // 2. Streak counter (max streak among habits today)
  const maxStreak = monthHabits.reduce(
    (max, h) => Math.max(max, calculateTotalStreak(h, frozenDates)),
    0
  );

  // 3. Today's progress
  const doneCount = todaysHabits.filter(h => h.completed).length;
  const totalCount = todaysHabits.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // 4. Today's tasks (daily)
  const dailyTasks = tasks
    .filter(t => t.type === "daily" && t.day === dayNum && (!t.month || t.month === month))
    .map(t => ({ id: t.id, title: t.title, completed: t.completed }));

  // 5. Weekly tasks (this week)
  const weekNum = Math.ceil((dayNum + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7);
  const weeklyTasks = tasks
    .filter(t => t.type === "weekly" && t.weekNumber === weekNum && (!t.month || t.month === month))
    .map(t => ({ id: t.id, title: t.title, completed: t.completed }));

  // 6. Monthly tasks
  const monthlyTasks = tasks
    .filter(t => t.type === "monthly" && (!t.month || t.month === month))
    .map(t => ({ id: t.id, title: t.title, completed: t.completed }));

  // 7. Today's calendar note
  const noteHit = notes.find(n => n.date === today);
  const todaysNote = noteHit ? `${noteHit.title}${noteHit.body ? " — " + noteHit.body : ""}` : "";

  await Promise.all([
    setItem("today_date", today),
    setItem("habits_today", JSON.stringify(todaysHabits)),
    setItem("streak", String(maxStreak)),
    setItem("progress_done", String(doneCount)),
    setItem("progress_total", String(totalCount)),
    setItem("progress_pct", String(progressPct)),
    setItem("tasks_daily", JSON.stringify(dailyTasks)),
    setItem("tasks_weekly", JSON.stringify(weeklyTasks)),
    setItem("tasks_monthly", JSON.stringify(monthlyTasks)),
    setItem("note_today", todaysNote),
    setItem("last_sync", new Date().toISOString()),
  ]);

  // Broadcast intent so widgets refresh
  try {
    // @ts-ignore — runtime check
    if (window.Capacitor?.Plugins?.App) {
      window.dispatchEvent(new CustomEvent("habitracker:widget-updated"));
    }
  } catch {
    /* ignore */
  }
};
