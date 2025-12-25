export type TaskType = 'general' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: TaskType;
  weekNumber?: number; // For weekly tasks (1-5)
  day?: number; // For daily tasks (1-31)
}

export interface TaskData {
  tasks: Task[];
}
