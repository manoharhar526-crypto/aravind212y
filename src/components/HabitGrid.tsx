import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { getDaysInMonth, getDayOfWeek, getWeekNumber, calculateCompletionRate } from "@/lib/habitUtils";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitGridProps {
  habits: Habit[];
  tasks: Task[];
  currentMonth: Date;
  onToggleDay: (habitId: string, day: number) => void;
}

export const HabitGrid = ({ habits, tasks, currentMonth, onToggleDay }: HabitGridProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);

  // Calculate total task stats for each day (all completed tasks)
  const getDayTaskStats = (day: number) => {
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { completedCount, totalCount, percentage };
  };
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group days by week
  const weeks: { week: number; days: number[] }[] = [];
  days.forEach(day => {
    const weekNum = getWeekNumber(currentMonth, day);
    const existingWeek = weeks.find(w => w.week === weekNum);
    if (existingWeek) {
      existingWeek.days.push(day);
    } else {
      weeks.push({ week: weekNum, days: [day] });
    }
  });

  return (
    <div className="overflow-x-auto animate-fade-in">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="flex border-b border-border">
          <div className="w-48 flex-shrink-0 p-3 font-semibold text-foreground">
            Habit Names
          </div>
          {weeks.map((week, idx) => (
            <div key={week.week} className="flex flex-col">
              <div className="text-center text-xs font-medium text-muted-foreground py-1 border-l border-border">
                Week {idx + 1}
              </div>
              <div className="flex">
                {week.days.map(day => (
                  <div
                    key={day}
                    className="w-10 text-center p-1 border-l border-border"
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {getDayOfWeek(currentMonth, day)}
                    </div>
                    <div className="text-xs font-medium">{day}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="w-24 flex-shrink-0 p-3 font-semibold text-foreground border-l border-border text-center">
            Completed
          </div>
        </div>

        {/* Total Task Stats Row */}
        <div className="flex border-b border-border bg-muted/30">
          <div className="w-48 flex-shrink-0 p-3 font-semibold text-foreground">
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </div>
          {weeks.map((week, weekIdx) => (
            <div key={week.week} className="flex">
              {week.days.map(day => {
                const stats = getDayTaskStats(day);
                return (
                  <div
                    key={day}
                    className="w-10 h-10 flex flex-col items-center justify-center border-l border-border text-[9px]"
                  >
                    <span className="font-medium text-foreground">{stats.completedCount}</span>
                    <span className="text-muted-foreground">{stats.percentage}%</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="w-24 flex-shrink-0 p-2 border-l border-border" />
        </div>

        {/* Habit Rows */}
        {habits.map((habit, habitIdx) => {
          const completionRate = calculateCompletionRate(habit, daysInMonth);
          return (
            <div
              key={habit.id}
              className={cn(
                "flex border-b border-border transition-colors hover:bg-muted/50",
                habitIdx % 2 === 0 ? "bg-background" : "bg-secondary/30"
              )}
              style={{ animationDelay: `${habitIdx * 50}ms` }}
            >
              <div className="w-48 flex-shrink-0 p-3 font-medium text-foreground truncate">
                {habit.name}
              </div>
              {weeks.map(week => (
                <div key={week.week} className="flex">
                  {week.days.map(day => {
                    const isCompleted = habit.completedDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => onToggleDay(habit.id, day)}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center border-l border-border transition-all duration-200",
                          isCompleted
                            ? "bg-primary"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {isCompleted && (
                          <Check
                            className="w-4 h-4 text-primary-foreground animate-check-bounce"
                            strokeWidth={3}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="w-24 flex-shrink-0 p-2 border-l border-border">
                <div className="h-full flex items-center gap-2">
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">
                    {completionRate}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
