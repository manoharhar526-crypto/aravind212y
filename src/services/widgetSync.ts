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
import {
  calculateTotalStreak,
  getAllTimeStats,
  getCompletedDaysForMonth,
  getDaysInMonth,
  calculateCompletionRate,
} from "@/lib/habitUtils";

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

  // ─── Extended widgets ─────────────────────────────────────────────────────
  const now = new Date();
  const totalDaysInMonth = getDaysInMonth(now);

  // 8. Monthly tracking grid — completed-day numbers per habit (id required for tap-to-toggle)
  const monthGrid = monthHabits.slice(0, 6).map(h => ({
    id: h.id,
    name: h.name,
    days: getCompletedDaysForMonth(h, now),
    total: totalDaysInMonth,
  }));

  // 9. Skip days — habits with skipped count in this month
  const monthPrefix = `${month}-`;
  const skipDays = monthHabits
    .map(h => ({
      name: h.name,
      count: (h.skippedDays ?? []).filter(d => d.startsWith(monthPrefix)).length,
    }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 10. Habit analytics — top habits by completion % this month
  const analytics = monthHabits
    .map(h => ({ name: h.name, pct: calculateCompletionRate(h, now, totalDaysInMonth) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  // 11. Calendar — current week (Sun→Sat), today + note markers
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const noteSet = new Set(notes.map(n => n.date));
  const calendarWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      day: d.getDate(),
      today: dStr === today,
      hasNote: noteSet.has(dStr),
    };
  });
  const calendarMonth = now.toLocaleString("default", { month: "long", year: "numeric" });

  // 12. All-time stats
  const at = getAllTimeStats(habits, frozenDates);

  // 13. Habit reports — per-habit monthly summary
  const habitReports = monthHabits.map(h => {
    const completed = getCompletedDaysForMonth(h, now).length;
    return {
      name: h.name,
      completed,
      total: totalDaysInMonth,
      rate: calculateCompletionRate(h, now, totalDaysInMonth),
    };
  }).slice(0, 6);

  // 14. Task reports + analytics
  const monthTasksAll = tasks.filter(t => !t.month || t.month === month);
  const td = monthTasksAll.filter(t => t.type === "daily");
  const tw = monthTasksAll.filter(t => t.type === "weekly");
  const tm = monthTasksAll.filter(t => t.type === "monthly");
  const doneOf = (xs: Task[]) => xs.filter(t => t.completed).length;
  const pctOf = (xs: Task[]) => (xs.length ? Math.round((doneOf(xs) / xs.length) * 100) : 0);

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

    // Extended
    setItem("month_grid", JSON.stringify(monthGrid)),
    setItem("skip_days", JSON.stringify(skipDays)),
    setItem("analytics", JSON.stringify(analytics)),
    setItem("calendar_week", JSON.stringify(calendarWeek)),
    setItem("calendar_month", calendarMonth),
    setItem("alltime_completions", String(at.totalCompletions)),
    setItem("alltime_months", String(at.totalMonths)),
    setItem("alltime_rate", String(at.allTimeRate)),
    setItem("alltime_streak", String(at.longestStreak)),
    setItem("alltime_best", at.bestHabit?.name ?? ""),
    setItem("habit_reports", JSON.stringify(habitReports)),
    setItem("task_rep_daily_done", String(doneOf(td))),
    setItem("task_rep_daily_total", String(td.length)),
    setItem("task_rep_weekly_done", String(doneOf(tw))),
    setItem("task_rep_weekly_total", String(tw.length)),
    setItem("task_rep_monthly_done", String(doneOf(tm))),
    setItem("task_rep_monthly_total", String(tm.length)),
    setItem("task_an_daily_pct", String(pctOf(td))),
    setItem("task_an_weekly_pct", String(pctOf(tw))),
    setItem("task_an_monthly_pct", String(pctOf(tm))),
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
