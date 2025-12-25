import { Task } from "@/types/task";
import { TaskSection } from "./TaskSection";
import { getTasksByType, getWeeklyTasksByWeek, getWeeksInMonth } from "@/lib/taskUtils";

interface GoalsOverviewProps {
  tasks: Task[];
  currentMonth: Date;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const GoalsOverview = ({
  tasks,
  currentMonth,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}: GoalsOverviewProps) => {
  const generalTasks = getTasksByType(tasks, "general");
  const monthlyTasks = getTasksByType(tasks, "monthly");
  const weeksInMonth = getWeeksInMonth(currentMonth);

  return (
    <div className="space-y-6">
      {/* General & Monthly Goals Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <TaskSection
          title="General Goals"
          tasks={generalTasks}
          type="general"
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
        <TaskSection
          title="Monthly Goals"
          tasks={monthlyTasks}
          type="monthly"
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
      </div>

      {/* Weekly Goals Grid */}
      <div>
        <h3 className="font-semibold mb-3">Weekly Goals</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: weeksInMonth }, (_, i) => i + 1).map((weekNum) => (
            <TaskSection
              key={weekNum}
              title={`Week ${weekNum}`}
              tasks={getWeeklyTasksByWeek(tasks, weekNum)}
              type="weekly"
              weekNumber={weekNum}
              onToggleTask={onToggleTask}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
