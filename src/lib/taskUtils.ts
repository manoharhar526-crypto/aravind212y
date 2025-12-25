import { Task, TaskType } from "@/types/task";
import { generateId } from "./habitUtils";

export const defaultTasks: Task[] = [
  // General Goals
  { id: generateId(), title: "Improve overall fitness", completed: false, type: "general" },
  { id: generateId(), title: "Read 4 books this month", completed: false, type: "general" },
  { id: generateId(), title: "Save $500", completed: true, type: "general" },

  // Monthly Tasks
  { id: generateId(), title: "Complete monthly review", completed: false, type: "monthly" },
  { id: generateId(), title: "Plan next month's goals", completed: false, type: "monthly" },
  { id: generateId(), title: "Deep clean house", completed: true, type: "monthly" },

  // Weekly Tasks
  { id: generateId(), title: "Meal prep for the week", completed: true, type: "weekly", weekNumber: 1 },
  { id: generateId(), title: "Review weekly expenses", completed: false, type: "weekly", weekNumber: 1 },
  { id: generateId(), title: "Plan weekend activities", completed: true, type: "weekly", weekNumber: 2 },
  { id: generateId(), title: "Grocery shopping", completed: false, type: "weekly", weekNumber: 2 },
  { id: generateId(), title: "Laundry day", completed: true, type: "weekly", weekNumber: 3 },
  { id: generateId(), title: "Check appointments", completed: false, type: "weekly", weekNumber: 3 },
  { id: generateId(), title: "Organize workspace", completed: false, type: "weekly", weekNumber: 4 },
  
  // Daily Tasks
  { id: generateId(), title: "Morning meditation", completed: true, type: "daily", day: 1 },
  { id: generateId(), title: "Check emails", completed: true, type: "daily", day: 1 },
  { id: generateId(), title: "Plan tomorrow", completed: false, type: "daily", day: 1 },
];

export const getTasksByType = (tasks: Task[], type: TaskType): Task[] => {
  return tasks.filter(task => task.type === type);
};

export const getWeeklyTasksByWeek = (tasks: Task[], weekNumber: number): Task[] => {
  return tasks.filter(task => task.type === "weekly" && task.weekNumber === weekNumber);
};

export const getDailyTasksByDay = (tasks: Task[], day: number): Task[] => {
  return tasks.filter(task => task.type === "daily" && task.day === day);
};

export const calculateTaskCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(task => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

export const getWeeksInMonth = (date: Date): number => {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((daysInMonth + firstDay) / 7);
};
