export interface Habit {
  id: string;
  name: string;
  month: string; // "YYYY-MM" - the month this habit belongs to
  completedDays: string[]; // Array of date strings "YYYY-MM-DD" that are completed
  skippedDays?: string[]; // Array of date strings "YYYY-MM-DD" marked as N/A (e.g. holiday, off-day)
  order?: number; // For drag-to-reorder
}

export interface HabitData {
  habits: Habit[];
  currentMonth: Date;
}
