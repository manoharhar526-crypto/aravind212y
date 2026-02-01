export interface Habit {
  id: string;
  name: string;
  completedDays: string[]; // Array of date strings "YYYY-MM-DD" that are completed
}

export interface HabitData {
  habits: Habit[];
  currentMonth: Date;
}
