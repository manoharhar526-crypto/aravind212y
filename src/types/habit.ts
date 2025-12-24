export interface Habit {
  id: string;
  name: string;
  completedDays: number[]; // Array of day numbers (1-31) that are completed
}

export interface HabitData {
  habits: Habit[];
  currentMonth: Date;
}
