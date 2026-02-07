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

// Helper to create a date string from month and day
export const createDateString = (currentMonth: Date, day: number): string => {
  const year = currentMonth.getFullYear();
  const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

// Helper to check if a day is completed for a specific month
export const isDayCompleted = (habit: Habit, currentMonth: Date, day: number): boolean => {
  const dateString = createDateString(currentMonth, day);
  return habit.completedDays.some(d => typeof d === 'string' && d === dateString);
};

// Get completed days for a specific month (returns day numbers)
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
  return Math.round((completedDaysInMonth.length / totalDays) * 100);
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
  return habits.filter(h => h.month === monthKey);
};

export const getPreviousMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

export const defaultHabits: Habit[] = [];
