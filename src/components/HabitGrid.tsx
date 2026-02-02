import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { getDaysInMonth, getDayOfWeek, getWeekNumber, calculateCompletionRate, isDayCompleted, getCompletedDaysForMonth } from "@/lib/habitUtils";
import { Check, X, Trash2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HabitGridProps {
  habits: Habit[];
  tasks: Task[];
  currentMonth: Date;
  onToggleDay: (habitId: string, day: number) => void;
  onDeleteHabit: (habitId: string) => void;
}

// Calculate current streak for a habit
const calculateStreak = (habit: Habit, currentMonth: Date): number => {
  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);
  
  // Check backwards from today
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

// Get completion rate color
const getCompletionColor = (rate: number): string => {
  if (rate >= 80) return "text-green-500";
  if (rate >= 60) return "text-primary";
  if (rate >= 40) return "text-yellow-500";
  return "text-destructive";
};

export const HabitGrid = ({ habits, tasks, currentMonth, onToggleDay, onDeleteHabit }: HabitGridProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getFullYear() === currentMonth.getFullYear() && 
                         today.getMonth() === currentMonth.getMonth();

  const isToday = (day: number) => isCurrentMonth && day === todayDay;
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
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
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
    <TooltipProvider>
      <div className="overflow-x-auto animate-fade-in -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex border-b border-border">
            <div className="w-36 sm:w-56 flex-shrink-0 p-2 sm:p-3 font-semibold text-foreground text-xs sm:text-sm">
              Habits
            </div>
            {weeks.map((week, idx) => (
              <div key={week.week} className="flex flex-col">
                <div className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1 border-l border-border">
                  W{idx + 1}
                </div>
                <div className="flex">
                  {week.days.map(day => (
                    <div
                      key={day}
                      className={cn(
                        "w-7 sm:w-10 text-center p-0.5 sm:p-1 border-l border-border",
                        isToday(day) && "bg-primary/10"
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="w-20 sm:w-28 flex-shrink-0 p-2 sm:p-3 font-semibold text-foreground border-l border-border text-center text-[10px] sm:text-sm">
              Progress
            </div>
            <div className="w-12 sm:w-16 flex-shrink-0 p-2 sm:p-3 font-semibold text-foreground border-l border-border text-center text-[10px] sm:text-sm">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 mx-auto text-orange-500" />
            </div>
          </div>

          {/* Total Task Stats Row */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="w-36 sm:w-56 flex-shrink-0 p-2 sm:p-3 font-semibold text-foreground">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Total Tasks</div>
            </div>
            {weeks.map((week) => (
              <div key={week.week} className="flex">
                {week.days.map(day => {
                  const stats = getDayTaskStats(day);
                  return (
                    <div
                      key={day}
                      className="w-7 sm:w-10 h-7 sm:h-10 flex flex-col items-center justify-center border-l border-border text-[7px] sm:text-[9px]"
                    >
                      <span className="font-medium text-foreground">{stats.completedCount}</span>
                      <span className="text-muted-foreground">{stats.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="w-20 sm:w-28 flex-shrink-0 p-2 border-l border-border" />
            <div className="w-12 sm:w-16 flex-shrink-0 p-2 border-l border-border" />
          </div>

          {/* Habit Rows */}
          {habits.map((habit, habitIdx) => {
            const completionRate = calculateCompletionRate(habit, currentMonth, daysInMonth);
            const streak = calculateStreak(habit, currentMonth);
            const completedDaysCount = getCompletedDaysForMonth(habit, currentMonth).length;
            
            return (
              <div
                key={habit.id}
                className={cn(
                  "flex border-b border-border transition-colors hover:bg-muted/50 group",
                  habitIdx % 2 === 0 ? "bg-background" : "bg-secondary/30"
                )}
                style={{ animationDelay: `${habitIdx * 50}ms` }}
              >
                <div className="w-36 sm:w-56 flex-shrink-0 p-2 sm:p-3 flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive flex-shrink-0"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium text-foreground truncate text-xs sm:text-sm cursor-help">
                        {habit.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{habit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedDaysCount} days completed this month
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {weeks.map(week => (
                  <div key={week.week} className="flex">
                    {week.days.map(day => {
                      const isCompleted = isDayCompleted(habit, currentMonth, day);
                      const dayIsToday = isToday(day);
                      const dayIsPast = isPast(day);
                      const dayIsFuture = isFuture(day);
                      const isMissed = dayIsPast && !isCompleted;
                      const canToggle = dayIsToday;

                      return (
                        <Tooltip key={day}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => canToggle && onToggleDay(habit.id, day)}
                              disabled={!canToggle}
                              className={cn(
                                "w-7 sm:w-10 h-7 sm:h-10 flex items-center justify-center border-l border-border transition-all duration-200",
                                dayIsToday && "ring-2 ring-primary ring-inset",
                                isCompleted
                                  ? "bg-primary"
                                  : isMissed
                                  ? "bg-destructive/20"
                                  : dayIsFuture
                                  ? "bg-muted/50 cursor-not-allowed"
                                  : "bg-background hover:bg-muted",
                                !canToggle && "cursor-not-allowed opacity-70"
                              )}
                            >
                              {isCompleted && (
                                <Check
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground animate-check-bounce"
                                  strokeWidth={3}
                                />
                              )}
                              {isMissed && (
                                <X
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-destructive"
                                  strokeWidth={2}
                                />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getDayOfWeek(currentMonth, day)}, {day}</p>
                            <p className="text-xs">
                              {isCompleted ? "✓ Completed" : isMissed ? "✗ Missed" : dayIsFuture ? "Upcoming" : "Click to complete"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
                <div className="w-20 sm:w-28 flex-shrink-0 p-1 sm:p-2 border-l border-border">
                  <div className="h-full flex items-center gap-1 sm:gap-2">
                    <div className="flex-1 h-2 sm:h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          completionRate >= 80 ? "bg-green-500" :
                          completionRate >= 60 ? "bg-primary" :
                          completionRate >= 40 ? "bg-yellow-500" :
                          "bg-destructive"
                        )}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-bold w-8 sm:w-10 text-right",
                      getCompletionColor(completionRate)
                    )}>
                      {completionRate}%
                    </span>
                  </div>
                </div>
                <div className="w-12 sm:w-16 flex-shrink-0 p-1 sm:p-2 border-l border-border flex items-center justify-center">
                  {streak > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 text-orange-500">
                          <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="text-[10px] sm:text-xs font-bold">{streak}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{streak} day streak! 🔥</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {habits.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No habits yet. Add your first habit to get started!</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
