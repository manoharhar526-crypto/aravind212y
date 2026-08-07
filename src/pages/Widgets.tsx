import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  loadAppStorage, saveAppStorage, loadSettings, loadCalendarNotes,
} from "@/lib/appStorage";
import {
  getDaysInMonth, getHabitsForMonth, createDateString,
  getCompletedDaysForMonth, calculateCompletionRate, getAllTimeStats, calculateTotalStreak,
} from "@/lib/habitUtils";
import { getTasksByType } from "@/lib/taskUtils";
import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { CalendarNote } from "@/types/calendarNote";
import {
  ArrowLeft, LayoutGrid, Calendar as CalendarIcon, BarChart3, PieChart,
  Trophy, CheckCircle2, Flame, ListChecks, Ban,
} from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Widgets() {
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const userId = user?.id;

  const stored = loadAppStorage(userId);
  const settings = loadSettings(userId);
  const [habits, setHabits] = useState<Habit[]>(stored?.habits ?? []);
  const [tasks, setTasks] = useState<Task[]>(stored?.tasks ?? []);
  const [notes, setNotes] = useState<CalendarNote[]>(loadCalendarNotes(userId));
  const [currentMonth, setCurrentMonth] = useState<Date>(stored?.currentMonth ?? new Date());
  const [frozenDates] = useState<string[]>(settings.frozenDates ?? []);

  const today = todayStr();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalDaysInMonth = getDaysInMonth(now);

  const monthHabits = useMemo(() => getHabitsForMonth(habits, now), [habits, now]);

  // Persist changes back to storage
  const persist = useCallback((newHabits: Habit[], newTasks: Task[]) => {
    saveAppStorage({ habits: newHabits, tasks: newTasks, currentMonth }, userId);
  }, [currentMonth, userId]);

  const handleToggleHabitDay = (habitId: string, dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const isToday = date.getTime() === todayDate.getTime();
    const isYesterday = date.getTime() === yesterdayDate.getTime();

    if (!isToday && !isYesterday) {
      toast.error("Can only complete today or yesterday");
      return;
    }

    const newHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      const completed = h.completedDays.includes(dateStr);
      return {
        ...h,
        completedDays: completed
          ? h.completedDays.filter((d) => d !== dateStr)
          : [...h.completedDays, dateStr],
      };
    });
    setHabits(newHabits);
    persist(newHabits, tasks);
    toast.success(completed(habitId, dateStr) ? "Habit unchecked" : "Habit completed");
  };

  const completed = (habitId: string, dateStr: string) => {
    return habits.find((h) => h.id === habitId)?.completedDays.includes(dateStr) ?? false;
  };

  const handleToggleTask = (taskId: string) => {
    const newTasks = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    setTasks(newTasks);
    persist(habits, newTasks);
  };

  // ─── Widget data helpers ────────────────────────────────────────────────────

  const allTime = useMemo(() => getAllTimeStats(habits, frozenDates), [habits, frozenDates]);

  const analytics = useMemo(
    () =>
      monthHabits
        .map((h) => ({
          name: h.name,
          pct: calculateCompletionRate(h, now, totalDaysInMonth),
          completed: getCompletedDaysForMonth(h, now).length,
        }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5),
    [monthHabits, now, totalDaysInMonth]
  );

  const skipDays = useMemo(
    () =>
      monthHabits
        .map((h) => ({
          name: h.name,
          count: (h.skippedDays ?? []).filter((d) => d.startsWith(`${monthKey}-`)).length,
        }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [monthHabits, monthKey]
  );

  const calendarWeek = useMemo(() => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const noteSet = new Set(notes.map((n) => n.date));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        day: d.getDate(),
        label: DAY_LABELS[d.getDay()],
        today: dStr === today,
        hasNote: noteSet.has(dStr),
      };
    });
  }, [now, notes, today]);

  const habitReports = useMemo(
    () =>
      monthHabits.map((h) => ({
        name: h.name,
        completed: getCompletedDaysForMonth(h, now).length,
        total: totalDaysInMonth,
        rate: calculateCompletionRate(h, now, totalDaysInMonth),
        streak: calculateTotalStreak(h, frozenDates),
      })),
    [monthHabits, now, totalDaysInMonth, frozenDates]
  );

  const taskReports = useMemo(() => {
    const monthTasks = tasks.filter((t) => !t.month || t.month === monthKey);
    const dayNum = now.getDate();
    const weekNum = Math.ceil(
      (dayNum + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7
    );

    const daily = monthTasks.filter((t) => t.type === "daily" && t.day === dayNum);
    const weekly = monthTasks.filter((t) => t.type === "weekly" && t.weekNumber === weekNum);
    const monthly = monthTasks.filter((t) => t.type === "monthly");
    const general = getTasksByType(monthTasks, "general");

    return [
      { title: "Daily", done: daily.filter((t) => t.completed).length, total: daily.length, tasks: daily },
      { title: "Weekly", done: weekly.filter((t) => t.completed).length, total: weekly.length, tasks: weekly },
      { title: "Monthly", done: monthly.filter((t) => t.completed).length, total: monthly.length, tasks: monthly },
      { title: "General", done: general.filter((t) => t.completed).length, total: general.length, tasks: general },
    ];
  }, [tasks, monthKey, now]);

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const WidgetHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-md bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold truncate">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Widgets</h1>
                <p className="text-xs text-muted-foreground truncate">{username ? `Hello, ${username}` : "Home screen preview"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate("/")} className="hidden sm:flex gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back to app
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
          These are the same widgets that appear on your Android home screen. Tap a habit day in the Monthly Tracking Grid to check it off.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* 1. Monthly Tracking Grid */}
          <Card className="p-4 border-border bg-card md:col-span-2 xl:col-span-2">
            <WidgetHeader icon={LayoutGrid} title="Monthly Tracking Grid" subtitle={now.toLocaleString("default", { month: "long", year: "numeric" })} />
            {monthHabits.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No habits for this month</div>
            ) : (
              <div className="space-y-3">
                {monthHabits.slice(0, 5).map((habit) => {
                  const completedDays = getCompletedDaysForMonth(habit, now);
                  const skipped = new Set((habit.skippedDays ?? []).filter((d) => d.startsWith(`${monthKey}-`)).map((d) => parseInt(d.slice(-2), 10)));
                  return (
                    <div key={habit.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate max-w-[60%]">{habit.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {completedDays.length}/{totalDaysInMonth}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 sm:grid-cols-[repeat(31,minmax(0,1fr))] gap-0.5">
                        {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((day) => {
                          const dateStr = createDateString(now, day);
                          const isCompleted = completedDays.includes(day);
                          const isSkipped = skipped.has(day);
                          const isToday = day === now.getDate();
                          const dayDate = new Date(dateStr + "T00:00:00");
                          const todayDate = new Date();
                          todayDate.setHours(0, 0, 0, 0);
                          const yesterdayDate = new Date(todayDate);
                          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                          const canToggle = dayDate.getTime() === todayDate.getTime() || dayDate.getTime() === yesterdayDate.getTime();

                          return (
                            <button
                              key={day}
                              onClick={() => canToggle && handleToggleHabitDay(habit.id, dateStr)}
                              disabled={!canToggle && !isCompleted && !isSkipped}
                              className={cn(
                                "aspect-square rounded-[2px] text-[9px] sm:text-[10px] font-medium flex items-center justify-center transition-colors",
                                isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : isSkipped
                                  ? "bg-orange-500/30 text-orange-400"
                                  : "bg-muted/50 text-muted-foreground",
                                isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                                canToggle && !isCompleted && !isSkipped && "hover:bg-muted cursor-pointer",
                                !canToggle && !isCompleted && !isSkipped && "opacity-50 cursor-default"
                              )}
                              title={day.toString()}
                            >
                              {isCompleted ? "✓" : isSkipped ? "⊘" : day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Done</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/30" /> Skipped</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/50 border border-border" /> Pending</span>
              <span className="ml-auto">Tap today/yesterday to toggle</span>
            </div>
          </Card>

          {/* 2. Habit Skip Days */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={Ban} title="Habit Skip Days" subtitle="Days marked N/A this month" />
            {skipDays.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No skipped days</div>
            ) : (
              <div className="space-y-2">
                {skipDays.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                    <span className="text-xs font-medium truncate max-w-[70%]">{item.name}</span>
                    <Badge variant="secondary" className="text-[10px]">⊘ {item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 3. Habit Analytics */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={BarChart3} title="Habit Analytics" subtitle="Top habits by completion" />
            {analytics.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No habits to analyze</div>
            ) : (
              <div className="space-y-3">
                {analytics.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[65%]">{item.name}</span>
                      <span className="font-bold">{item.pct}%</span>
                    </div>
                    <Progress value={item.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 4. Calendar */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={CalendarIcon} title="Calendar" subtitle={now.toLocaleString("default", { month: "long", year: "numeric" })} />
            <div className="grid grid-cols-7 gap-2">
              {calendarWeek.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium relative",
                      d.today
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground"
                    )}
                  >
                    {d.day}
                    {d.hasNote && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Notes on that day
            </div>
          </Card>

          {/* 5. All-Time Statistics */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={Trophy} title="All-Time Statistics" subtitle="Across every tracked month" />
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-md bg-muted/40">
                <p className="text-[10px] text-muted-foreground">Completions</p>
                <p className="text-xl font-bold">{allTime.totalCompletions}</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/40">
                <p className="text-[10px] text-muted-foreground">Months</p>
                <p className="text-xl font-bold">{allTime.totalMonths}</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/40">
                <p className="text-[10px] text-muted-foreground">Rate</p>
                <p className="text-xl font-bold">{allTime.allTimeRate}%</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/40">
                <p className="text-[10px] text-muted-foreground">Best Streak</p>
                <p className="text-xl font-bold">{allTime.longestStreak}</p>
              </div>
            </div>
            {allTime.bestHabit && (
              <div className="mt-3 p-2.5 rounded-md bg-primary/10">
                <p className="text-[10px] text-muted-foreground">Best Habit</p>
                <p className="text-sm font-semibold truncate">{allTime.bestHabit.name}</p>
              </div>
            )}
          </Card>

          {/* 6. Habit Reports */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={PieChart} title="Habit Reports" subtitle="Monthly per-habit summary" />
            {habitReports.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No habits this month</div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {habitReports.map((item) => (
                  <div key={item.name} className="p-2.5 rounded-md bg-muted/40 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[60%]">{item.name}</span>
                      <span className="font-bold">{item.rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{item.completed}/{item.total} days</span>
                      {item.streak > 0 && <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" /> {item.streak}d</span>}
                    </div>
                    <Progress value={item.rate} className="h-1" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 7. Task Reports */}
          <Card className="p-4 border-border bg-card">
            <WidgetHeader icon={ListChecks} title="Task Reports" subtitle="Task completion by type" />
            {taskReports.every((r) => r.total === 0) ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No tasks set</div>
            ) : (
              <div className="space-y-3">
                {taskReports.map((report) => (
                  <div key={report.title} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{report.title}</span>
                      <span className="font-bold">{report.total > 0 ? Math.round((report.done / report.total) * 100) : 0}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={report.total > 0 ? (report.done / report.total) * 100 : 0} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{report.done}/{report.total}</span>
                    </div>
                    {report.tasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {report.tasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => handleToggleTask(task.id)}
                            className="w-full flex items-center gap-1.5 text-[10px] text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                          >
                            <span className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0", task.completed ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                              {task.completed && <CheckCircle2 className="w-3 h-3" />}
                            </span>
                            <span className={cn("truncate", task.completed && "line-through text-muted-foreground")}>{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
