import { Habit } from "@/types/habit";

export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getMonthName = (date: Date): string => {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export const getDayOfWeek = (date: Date, day: number): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), day);
  return d.toLocaleString('default', { weekday: 'short' });
};

export const getWeekNumber = (date: Date, day: number): number => {
  const d = new Date(date.getFullYear(), date.getMonth(), day);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay();
  return Math.ceil((day + dayOfWeek) / 7);
};

export const createDateString = (currentMonth: Date, day: number): string => {
  const year = currentMonth.getFullYear();
  const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

export const isDayCompleted = (habit: Habit, currentMonth: Date, day: number): boolean => {
  const dateString = createDateString(currentMonth, day);
  return habit.completedDays.some(d => typeof d === 'string' && d === dateString);
};

export const getCompletedDaysForMonth = (habit: Habit, currentMonth: Date): number[] => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return habit.completedDays
    .filter((dateStr): dateStr is string => typeof dateStr === 'string' && dateStr.startsWith(prefix))
    .map(dateStr => parseInt(dateStr.split('-')[2], 10));
};

export const calculateCompletionRate = (habit: Habit, currentMonth: Date, totalDays: number): number => {
  const completedDaysInMonth = getCompletedDaysForMonth(habit, currentMonth);
  // Exclude skipped days from the denominator
  const prefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-`;
  const skippedInMonth = (habit.skippedDays ?? []).filter(d => d.startsWith(prefix)).length;
  const effectiveDays = Math.max(1, totalDays - skippedInMonth);
  return Math.round((completedDaysInMonth.length / effectiveDays) * 100);
};

export const calculateDailyCompletion = (habits: Habit[], currentMonth: Date, day: number): number => {
  if (habits.length === 0) return 0;
  const completed = habits.filter(h => isDayCompleted(h, currentMonth, day)).length;
  return Math.round((completed / habits.length) * 100);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getHabitsForMonth = (habits: Habit[], date: Date): Habit[] => {
  const monthKey = getMonthKey(date);
  return habits
    .filter(h => h.month === monthKey)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getPreviousMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

// ─── All-time statistics across all months ────────────────────────────────────

export const getAllTimeStats = (habits: Habit[], frozenDates: string[] = []) => {
  const totalCompletions = habits.reduce((sum, h) => sum + h.completedDays.length, 0);

  // Unique months tracked
  const monthsSet = new Set(habits.map(h => h.month));
  const totalMonths = monthsSet.size;

  // Overall all-time rate — count days that had at least one habit active
  // Sum of completions / sum of (days-in-month * habits-per-month)
  let totalPossible = 0;
  monthsSet.forEach(monthKey => {
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const habitsInMonth = habits.filter(h => h.month === monthKey).length;
    totalPossible += daysInMonth * habitsInMonth;
  });
  const allTimeRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

  // Longest ever streak across all habits — frozen dates bridge gaps
  let longestStreak = 0;
  for (const habit of habits) {
    // Merge completedDays + frozenDates into one sorted set of qualifying days
    const allQualifying = Array.from(new Set([...habit.completedDays, ...frozenDates])).sort();
    let streak = 0;
    let maxStreak = 0;
    for (let i = 0; i < allQualifying.length; i++) {
      if (i === 0) { streak = 1; }
      else {
        const prev = new Date(allQualifying[i - 1]);
        const curr = new Date(allQualifying[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        streak = diff === 1 ? streak + 1 : 1;
      }
      maxStreak = Math.max(maxStreak, streak);
    }
    longestStreak = Math.max(longestStreak, maxStreak);
  }

  // Best habit (by all-time completion count)
  const bestHabit = habits.length > 0
    ? habits.reduce((best, h) => h.completedDays.length > best.completedDays.length ? h : best)
    : null;

  return { totalCompletions, totalMonths, allTimeRate, longestStreak, bestHabit };
};

// ─── Cross-month streak (total streak for display) ────────────────────────────
// Returns the current active streak counting across all months.
// frozenDates are treated as "protected" — a frozen missed day does NOT break
// the streak; it is skipped over transparently so the count continues.

export const calculateTotalStreak = (habit: Habit, frozenDates: string[] = []): number => {
  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // A day "counts" toward the streak if completed OR frozen
  const countsForStreak = (dateStr: string): boolean =>
    habit.completedDays.includes(dateStr) || frozenDates.includes(dateStr);

  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // If neither today nor yesterday qualifies, streak is 0
  if (!countsForStreak(todayStr) && !countsForStreak(toDateStr(yesterday))) return 0;

  // Walk backward from the most recent qualifying day
  let streak = 0;
  const cursor = new Date(today);
  if (!countsForStreak(todayStr)) cursor.setDate(cursor.getDate() - 1);

  while (countsForStreak(toDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const defaultHabits: Habit[] = [];
