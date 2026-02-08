import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { getDaysInMonth, getDayOfWeek, getWeekNumber, calculateCompletionRate, isDayCompleted, getCompletedDaysForMonth } from "@/lib/habitUtils";
import { Check, Trash2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitGridProps {
  habits: Habit[];
  tasks: Task[];
  currentMonth: Date;
  onToggleDay: (habitId: string, day: number) => void;
  onDeleteHabit: (habitId: string) => void;
}

// Calculate current streak for a habit
const calculateStreak = (habit: Habit): number => {
  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);
  
  while (true) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    if (habit.completedDays.includes(dateString)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
};

// Get completion rate color class
const getCompletionColorClass = (rate: number): string => {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-primary";
  if (rate >= 40) return "bg-amber-500";
  return "bg-destructive";
};

const getCompletionTextClass = (rate: number): string => {
  if (rate >= 80) return "text-emerald-500";
  if (rate >= 60) return "text-primary";
  if (rate >= 40) return "text-amber-500";
  return "text-destructive";
};

export const HabitGrid = ({ habits, tasks, currentMonth, onToggleDay, onDeleteHabit }: HabitGridProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === currentMonth.getFullYear() && 
                         today.getMonth() === currentMonth.getMonth();

  const isToday = (day: number) => isCurrentMonth && day === todayDay;
  const isYesterday = (day: number) => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yMonth = yesterday.getFullYear() === currentMonth.getFullYear() && yesterday.getMonth() === currentMonth.getMonth();
    return yMonth && day === yesterday.getDate();
  };
  const isPast = (day: number) => {
    if (!isCurrentMonth) {
      if (currentMonth < new Date(today.getFullYear(), today.getMonth(), 1)) return true;
      return false;
    }
    return day < todayDay;
  };
  const isFuture = (day: number) => {
    if (!isCurrentMonth) {
      if (currentMonth > new Date(today.getFullYear(), today.getMonth(), 1)) return true;
      return false;
    }
    return day > todayDay;
  };

  const getDayTaskStats = (day: number) => {
    // Filter daily tasks assigned to this specific day
    const dailyTasks = tasks.filter(t => t.type === 'daily' && t.day === day);
    const completedCount = dailyTasks.filter(t => t.completed).length;
    const totalCount = dailyTasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { completedCount, totalCount, percentage };
  };
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
    <div className="overflow-x-auto animate-fade-in -mx-3 sm:mx-0 px-3 sm:px-0">
      <table className="min-w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="border-b border-border">
            <th className="w-40 sm:w-52 p-2 sm:p-3 text-left font-semibold text-foreground text-xs sm:text-sm sticky left-0 bg-card z-10">
              Habits
            </th>
            {weeks.map((week, idx) => (
              <th key={week.week} colSpan={week.days.length} className="border-l border-border p-0">
                <div className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                  W{idx + 1}
                </div>
              </th>
            ))}
            <th className="w-24 sm:w-32 p-2 sm:p-3 font-semibold text-foreground border-l border-border text-center text-[10px] sm:text-sm">
              Progress
            </th>
            <th className="w-14 sm:w-16 p-2 sm:p-3 font-semibold text-foreground border-l border-border text-center text-[10px] sm:text-sm">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-orange-500" />
            </th>
          </tr>
          <tr className="border-b border-border">
            <th className="w-40 sm:w-52 p-0 sticky left-0 bg-card z-10"></th>
            {weeks.map((week) => (
              week.days.map(day => (
                <th
                  key={day}
                  className={cn(
                    "w-7 sm:w-10 text-center p-0.5 sm:p-1 border-l border-border font-normal",
                    isToday(day) && "bg-primary/20"
                  )}
                >
                  <div className="text-[8px] sm:text-[10px] text-muted-foreground">
                    {getDayOfWeek(currentMonth, day)}
                  </div>
                  <div className={cn(
                    "text-[10px] sm:text-xs font-medium",
                    isToday(day) && "text-primary font-bold"
                  )}>
                    {day}
                  </div>
                </th>
              ))
            ))}
            <th className="w-24 sm:w-32 p-0 border-l border-border"></th>
            <th className="w-14 sm:w-16 p-0 border-l border-border"></th>
          </tr>
        </thead>

        <tbody>
          {/* Total Task Stats Row */}
          <tr className="border-b border-border bg-muted/30">
            <td className="w-40 sm:w-52 p-2 sm:p-3 font-semibold text-foreground sticky left-0 bg-muted/30 z-10">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Total Tasks</div>
            </td>
            {weeks.map((week) => (
              week.days.map(day => {
                const stats = getDayTaskStats(day);
                return (
                  <td
                    key={day}
                    className="w-7 sm:w-10 h-7 sm:h-10 text-center border-l border-border text-[7px] sm:text-[9px]"
                  >
                    <span className="font-medium text-foreground">{stats.completedCount}</span>
                    <br />
                    <span className="text-muted-foreground">{stats.percentage}%</span>
                  </td>
                );
              })
            ))}
            <td className="w-24 sm:w-32 p-2 border-l border-border"></td>
            <td className="w-14 sm:w-16 p-2 border-l border-border"></td>
          </tr>

          {/* Habit Rows */}
          {habits.map((habit, habitIdx) => {
            const completionRate = calculateCompletionRate(habit, currentMonth, daysInMonth);
            const streak = calculateStreak(habit);
            const completedDaysCount = getCompletedDaysForMonth(habit, currentMonth).length;
            
            return (
              <tr
                key={habit.id}
                className={cn(
                  "border-b border-border transition-colors hover:bg-muted/50 group",
                  habitIdx % 2 === 0 ? "bg-background" : "bg-secondary/30"
                )}
              >
                <td className={cn(
                  "w-40 sm:w-52 p-2 sm:p-3 sticky left-0 z-10",
                  habitIdx % 2 === 0 ? "bg-background" : "bg-secondary/30",
                  "group-hover:bg-muted/50"
                )}>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => onDeleteHabit(habit.id)}
                      className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive flex-shrink-0"
                      title="Delete habit"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <span 
                      className="font-medium text-foreground truncate text-xs sm:text-sm"
                      title={`${habit.name} - ${completedDaysCount} days completed this month`}
                    >
                      {habit.name}
                    </span>
                  </div>
                </td>
                {weeks.map(week => (
                  week.days.map(day => {
                    const isCompleted = isDayCompleted(habit, currentMonth, day);
                    const dayIsToday = isToday(day);
                    const dayIsPast = isPast(day);
                    const dayIsFuture = isFuture(day);
                    const isMissed = dayIsPast && !isCompleted;
                    const dayIsYesterday = isYesterday(day);
                    const canToggle = dayIsToday || dayIsYesterday;

                    return (
                      <td key={day} className="p-0 border-l border-border">
                        <button
                          onClick={() => canToggle && onToggleDay(habit.id, day)}
                          disabled={!canToggle}
                          title={isCompleted ? "✓ Completed" : canToggle ? "Click to complete" : isMissed ? "✗ Missed" : "Upcoming"}
                          className={cn(
                            "w-7 sm:w-10 h-7 sm:h-10 flex items-center justify-center transition-all duration-200",
                            (dayIsToday || dayIsYesterday) && "ring-2 ring-primary ring-inset",
                            isCompleted
                              ? "bg-primary"
                              : isMissed && canToggle
                              ? "bg-destructive/20 hover:bg-destructive/30 cursor-pointer"
                              : isMissed
                              ? "bg-destructive/10"
                              : dayIsFuture
                              ? "bg-muted/50 cursor-not-allowed"
                              : "bg-background hover:bg-muted",
                            !canToggle && !isCompleted && "cursor-not-allowed opacity-70"
                          )}
                        >
                          {isCompleted && (
                            <Check
                              className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground animate-check-bounce"
                              strokeWidth={3}
                            />
                          )}
                          {isMissed && !canToggle && (
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-destructive/40" />
                          )}
                        </button>
                      </td>
                    );
                  })
                ))}
                <td className="w-24 sm:w-32 p-2 sm:p-3 border-l border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 sm:h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          getCompletionColorClass(completionRate)
                        )}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs sm:text-sm font-bold min-w-[3rem] text-right",
                      getCompletionTextClass(completionRate)
                    )}>
                      {completionRate}%
                    </span>
                  </div>
                </td>
                <td className="w-14 sm:w-16 p-2 border-l border-border text-center">
                  {streak > 0 ? (
                    <div className="flex items-center justify-center gap-0.5 text-orange-500" title={`${streak} day streak!`}>
                      <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-bold">{streak}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty State */}
      {habits.length === 0 && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">No habits yet. Add your first habit to get started!</p>
        </div>
      )}
    </div>
  );
};
