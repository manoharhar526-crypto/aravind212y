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

export const defaultHabits: Habit[] = [
  { id: generateId(), name: "Daily Exercise", completedDays: [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 22, 24] },
  { id: generateId(), name: "Bed Before 11pm", completedDays: [1, 3, 4, 5, 8, 9, 11, 13, 14, 17, 19, 21] },
  { id: generateId(), name: "Drink Protein", completedDays: [2, 3, 4, 5, 6, 7, 10, 11, 12, 14, 16, 18, 20, 23] },
  { id: generateId(), name: "Eat Vegetables", completedDays: [1, 2, 4, 5, 6, 8, 9, 10, 11, 13, 15, 17, 19, 21, 23, 24] },
  { id: generateId(), name: "Call Grandparents", completedDays: [1, 7, 14, 21] },
  { id: generateId(), name: "No Snacks", completedDays: [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23] },
  { id: generateId(), name: "Do Homework", completedDays: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24] },
  { id: generateId(), name: "Water Plants", completedDays: [1, 4, 7, 10, 13, 16, 19, 22] },
  { id: generateId(), name: "Read 10+ Pages", completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: generateId(), name: "Make Bed", completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
];
