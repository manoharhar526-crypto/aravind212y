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

export const calculateCompletionRate = (habit: Habit, totalDays: number): number => {
  return Math.round((habit.completedDays.length / totalDays) * 100);
};

export const calculateDailyCompletion = (habits: Habit[], day: number): number => {
  if (habits.length === 0) return 0;
  const completed = habits.filter(h => h.completedDays.includes(day)).length;
  return Math.round((completed / habits.length) * 100);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const defaultHabits: Habit[] = [];
