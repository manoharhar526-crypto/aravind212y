import { useState } from "react";
import { Task, TaskType } from "@/types/task";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { generateId } from "@/lib/habitUtils";

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  type: TaskType;
  weekNumber?: number;
  day?: number;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  colorClass?: string;
}

export const TaskSection = ({
  title,
  tasks,
  type,
  weekNumber,
  day,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  colorClass = "bg-card",
}: TaskSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask({
        id: generateId(),
        title: newTaskTitle.trim(),
        completed: false,
        type,
        weekNumber,
        day,
      });
      setNewTaskTitle("");
      setIsAdding(false);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <Card className={`p-4 ${colorClass} border-border`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{tasks.length} completed ({completionRate}%)
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isAdding && (
        <div className="flex gap-2 mb-3">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={handleAddTask}>
            Add
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 group text-sm"
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => onToggleTask(task.id)}
              className="border-border"
            />
            <span className={`flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 focus:opacity-100 sm:transition-opacity touch-manipulation"
              onClick={() => onDeleteTask(task.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No tasks yet</p>
        )}
      </div>
    </Card>
  );
};
