import { useEffect, useRef, useState, useCallback } from "react";
import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { defaultHabits, generateId, getMonthName, createDateString, isDayCompleted, getMonthKey, getHabitsForMonth, getPreviousMonth } from "@/lib/habitUtils";
import { useAuth } from "@/hooks/useAuth";
import { defaultTasks } from "@/lib/taskUtils";
import {
  loadAppStorage,
  saveAppStorage,
  loadSettings,
  saveSettings,
  clearAllStorage,
  AppSettings,
} from "@/lib/appStorage";
import { sendNotification } from "@/lib/notificationUtils";
import { HabitGrid } from "@/components/HabitGrid";
import { StatsOverview } from "@/components/StatsOverview";
import { CompletionLineChart } from "@/components/charts/CompletionLineChart";
import { HabitPieChart } from "@/components/charts/HabitPieChart";
import { HabitBarChart } from "@/components/charts/HabitBarChart";
import { IndividualHabitChart } from "@/components/charts/IndividualHabitChart";
import { TaskCompletionChart } from "@/components/charts/TaskCompletionChart";
import { TaskProgressChart } from "@/components/charts/TaskProgressChart";
import { AddHabitDialog } from "@/components/AddHabitDialog";
import { GoalsOverview } from "@/components/GoalsOverview";
import { TaskReportCard } from "@/components/TaskReportCard";
import { HabitReportCard } from "@/components/HabitReportCard";
import { DailyTasksView } from "@/components/DailyTasksView";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Trash2, Bell, BellOff, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { BackupRestoreDialog } from "@/components/BackupRestoreDialog";
import { CopyHabitsDialog } from "@/components/CopyHabitsDialog";
import { InstallButton } from "@/components/InstallButton";

const Index = () => {
  const { username, signOut } = useAuth();
  const stored = loadAppStorage();
  const initialSettings = loadSettings();

  const [habits, setHabits] = useState<Habit[]>(stored?.habits ?? defaultHabits);
  const [tasks, setTasks] = useState<Task[]>(stored?.tasks ?? defaultTasks);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    stored?.currentMonth ?? new Date() // Current date
  );
  const [reminderEnabled, setReminderEnabled] = useState(initialSettings.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(initialSettings.reminderTime);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<Date | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Habits filtered for the current month view
  const currentMonthHabits = getHabitsForMonth(habits, currentMonth);

  const reminderTimeoutRef = useRef<number | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIndianDateTime = useCallback((date: Date) => {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, []);

  // Save app data
  useEffect(() => {
    saveAppStorage({ habits, tasks, currentMonth });
  }, [habits, tasks, currentMonth]);

  // Save settings
  useEffect(() => {
    saveSettings({ reminderEnabled, reminderTime });
  }, [reminderEnabled, reminderTime]);

  // Schedule daily reminder
  useEffect(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }

    if (!reminderEnabled) return;

    const scheduleNextReminder = () => {
      const now = new Date();
      const [hours, minutes] = reminderTime.split(":").map(Number);
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      // If target time has passed today, schedule for tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const delay = target.getTime() - now.getTime();

      reminderTimeoutRef.current = window.setTimeout(() => {
        sendNotification(
          "Habit Tracker Reminder",
          "Don't forget to track your habits and tasks today!"
        );
        // Schedule the next reminder
        scheduleNextReminder();
      }, delay);
    };

    scheduleNextReminder();

    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, [reminderEnabled, reminderTime]);

  const handleResetData = () => {
    clearAllStorage();
    setHabits(defaultHabits);
    setTasks(defaultTasks);
    setCurrentMonth(new Date());
    setReminderEnabled(false);
    setReminderTime("09:00");
    toast.success("All data has been reset");
  };

  const handleToggleReminder = async () => {
    if (!reminderEnabled) {
      const { requestNotificationPermission } = await import("@/lib/notificationUtils");
      const granted = await requestNotificationPermission();
      if (granted) {
        setReminderEnabled(true);
        toast.success("Reminders enabled!");
      } else {
        toast.error("Please allow notifications in your browser settings");
      }
    } else {
      setReminderEnabled(false);
      toast.success("Reminders disabled");
    }
  };

  const handleToggleDay = (habitId: string, day: number) => {
    const dateString = createDateString(currentMonth, day);
    setHabits(prev =>
      prev.map(habit => {
        if (habit.id !== habitId) return habit;
        const isCompleted = isDayCompleted(habit, currentMonth, day);
        return {
          ...habit,
          completedDays: isCompleted
            ? habit.completedDays.filter(d => d !== dateString)
            : [...habit.completedDays, dateString].sort(),
        };
      })
    );
  };

  const handleAddHabit = (name: string) => {
    const monthKey = getMonthKey(currentMonth);
    const newHabit: Habit = {
      id: generateId(),
      name,
      month: monthKey,
      completedDays: [],
    };
    setHabits(prev => [...prev, newHabit]);
    toast.success(`Added "${name}" to your habits`);
  };

  const handleDeleteHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Confirm before deleting
    const confirmed = window.confirm(`Delete "${habit.name}"? You can undo this action.`);
    if (!confirmed) return;

    setHabits(prev => prev.filter(h => h.id !== habitId));
    toast.success(`Removed "${habit.name}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          setHabits(prev => [...prev, habit]);
          toast.success(`Restored "${habit.name}"`);
        },
      },
      duration: 5000,
    });
  };

  const navigateToMonth = (newMonth: Date) => {
    const habitsInNewMonth = getHabitsForMonth(habits, newMonth);
    const prevMonth = getPreviousMonth(newMonth);
    const habitsInPrevMonth = getHabitsForMonth(habits, prevMonth);

    if (habitsInNewMonth.length === 0 && habitsInPrevMonth.length > 0) {
      // New month has no habits but previous month does - ask to copy
      setPendingMonth(newMonth);
      setShowCopyDialog(true);
    } else {
      setCurrentMonth(newMonth);
    }
  };

  const handleCopyHabits = () => {
    if (!pendingMonth) return;
    const prevMonth = getPreviousMonth(pendingMonth);
    const prevHabits = getHabitsForMonth(habits, prevMonth);
    const monthKey = getMonthKey(pendingMonth);

    const copiedHabits: Habit[] = prevHabits.map(h => ({
      id: generateId(),
      name: h.name,
      month: monthKey,
      completedDays: [],
    }));

    setHabits(prev => [...prev, ...copiedHabits]);
    setCurrentMonth(pendingMonth);
    setPendingMonth(null);
    setShowCopyDialog(false);
    toast.success(`Copied ${copiedHabits.length} habits from previous month`);
  };

  const handleSkipCopy = () => {
    if (!pendingMonth) return;
    setCurrentMonth(pendingMonth);
    setPendingMonth(null);
    setShowCopyDialog(false);
  };

  const handlePrevMonth = () => {
    navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleAddTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
    toast.success(`Added "${task.title}"`);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (task) {
      toast.success(`Removed "${task.title}"`);
    }
  };

  const handleRestore = (restoredHabits: Habit[], restoredTasks: Task[]) => {
    setHabits(restoredHabits);
    setTasks(restoredTasks);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-shrink">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Habit Tracker</h1>
                  {username && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1 truncate max-w-[120px]">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{username}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{formatIndianDateTime(currentTime)}</p>
              </div>
              <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
                <BackupRestoreDialog habits={habits} tasks={tasks} onRestore={handleRestore} />
                <Button
                  variant={reminderEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleReminder}
                  className="h-8 w-8 flex-shrink-0"
                >
                  {reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>
                <SettingsDialog
                  onResetData={handleResetData}
                  reminderEnabled={reminderEnabled}
                  reminderTime={reminderTime}
                  onReminderEnabledChange={setReminderEnabled}
                  onReminderTimeChange={setReminderTime}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="h-8 w-8 flex-shrink-0"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <InstallButton />
                <BackupRestoreDialog habits={habits} tasks={tasks} onRestore={handleRestore} />
                <Button
                  variant={reminderEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleReminder}
                  className="gap-1.5"
                >
                  {reminderEnabled ? (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Reminder On</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" />
                      <span>Reminder Off</span>
                    </>
                  )}
                </Button>
                <SettingsDialog
                  onResetData={handleResetData}
                  reminderEnabled={reminderEnabled}
                  reminderTime={reminderTime}
                  onReminderEnabledChange={setReminderEnabled}
                  onReminderTimeChange={setReminderTime}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 sm:h-10 sm:w-10">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-24 sm:min-w-36 text-center text-sm sm:text-base">
                  {getMonthName(currentMonth)}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 sm:h-10 sm:w-10">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Stats Overview */}
        <section>
          <StatsOverview habits={currentMonthHabits} currentMonth={currentMonth} />
        </section>

        <Tabs defaultValue="habits" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4 sm:mb-6">
            <TabsTrigger value="habits" className="text-xs sm:text-sm">Habits</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">Goals</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="habits" className="space-y-6 sm:space-y-8">
            {/* Habit Grid */}
            <section>
              <Card className="overflow-hidden border-border">
                <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="font-semibold text-sm sm:text-base">Monthly Tracking Grid</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <AddHabitDialog onAddHabit={handleAddHabit} />
                    {currentMonthHabits.length > 0 && (
                      <div className="hidden md:flex gap-2">
                        {currentMonthHabits.slice(0, 3).map(habit => (
                          <Button
                            key={habit.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteHabit(habit.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {habit.name.substring(0, 10)}...
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <HabitGrid
                  habits={currentMonthHabits}
                  tasks={tasks}
                  currentMonth={currentMonth}
                  onToggleDay={handleToggleDay}
                  onDeleteHabit={handleDeleteHabit}
                />
              </Card>
            </section>

            {/* Habit Charts */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Habit Analytics</h2>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <CompletionLineChart habits={currentMonthHabits} currentMonth={currentMonth} />
                <HabitPieChart habits={currentMonthHabits} currentMonth={currentMonth} />
                <HabitBarChart habits={currentMonthHabits} currentMonth={currentMonth} />
                <IndividualHabitChart habits={currentMonthHabits} currentMonth={currentMonth} />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="goals" className="space-y-8">
            <GoalsOverview
              tasks={tasks}
              currentMonth={currentMonth}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
            <DailyTasksView
              tasks={tasks}
              currentMonth={currentMonth}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 sm:space-y-8">
            {/* Habit Reports */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Habit Reports</h2>
              <HabitReportCard habits={currentMonthHabits} currentMonth={currentMonth} />
            </section>

            {/* Task Reports */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Task Reports</h2>
              <TaskReportCard tasks={tasks} />
            </section>

            {/* Task Charts */}
            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Task Analytics</h2>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <TaskCompletionChart tasks={tasks} />
                <TaskProgressChart tasks={tasks} currentMonth={currentMonth} />
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Build better habits, one day at a time.
        </div>
      </footer>

      {/* Copy Habits Dialog */}
      <CopyHabitsDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        previousMonthName={getMonthName(getPreviousMonth(pendingMonth ?? currentMonth))}
        currentMonthName={getMonthName(pendingMonth ?? currentMonth)}
        previousHabitNames={getHabitsForMonth(habits, getPreviousMonth(pendingMonth ?? currentMonth)).map(h => h.name)}
        onCopy={handleCopyHabits}
        onSkip={handleSkipCopy}
      />
    </div>
  );
};

export default Index;
