export interface Habit {
  id: string;
  name: string;
  month: string; // "YYYY-MM" - the month this habit belongs to
  completedDays: string[]; // Array of date strings "YYYY-MM-DD" that are completed
}

export interface HabitData {
  habits: Habit[];
  currentMonth: Date;
}
