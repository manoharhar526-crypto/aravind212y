import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { CalendarNote } from "@/types/calendarNote";
import {
  defaultHabits, generateId, getMonthName, createDateString, isDayCompleted,
  getMonthKey, getHabitsForMonth, getPreviousMonth, getAllTimeStats,
} from "@/lib/habitUtils";
import { useAuth } from "@/hooks/useAuth";
import { defaultTasks } from "@/lib/taskUtils";
import {
  loadAppStorage, saveAppStorage, loadSettings, saveSettings, clearAllStorage,
  AppSettings, loadCalendarNotes, saveCalendarNotes,
} from "@/lib/appStorage";
import { scheduleSmartNotifications, cancelAllNotifications, scheduleCalendarNoteNotifications } from "@/lib/notificationUtils";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { cancelPending, clearDebounce, enqueue, flushPending } from "@/services/backgroundSync";
import { supabase } from "@/integrations/supabase/client";

import { HabitGrid } from "@/components/HabitGrid";
import { HabitCalendar } from "@/components/HabitCalendar";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, ChevronRight, Bell, BellOff, LogOut, User, Loader2,
  Trophy, Calendar, CheckCircle2, Flame, SnowflakeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CopyHabitsDialog } from "@/components/CopyHabitsDialog";
import { BackupRestoreDialog } from "@/components/BackupRestoreDialog";
import { useAutoBackup } from "@/hooks/useAutoBackup";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today as "YYYY-MM-DD" */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Format a date using the user's local timezone (or a given IANA string). */
const formatLocalDateTime = (date: Date, timezone: string): string => {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return date.toLocaleString("en", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const { username, signOut, user } = useAuth();
  const userId = user?.id;
  const [searchParams] = useSearchParams();
  const stored = loadAppStorage(userId);
  const initialSettings = loadSettings(userId);
  const defaultTab = searchParams.get("tab") || "habits";

  const [habits, setHabits] = useState<Habit[]>(stored?.habits ?? defaultHabits);
  const [tasks, setTasks] = useState<Task[]>(stored?.tasks ?? defaultTasks);
  useAutoBackup(habits, tasks);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>(() => loadCalendarNotes(userId));

  // FIX 1: currentMonth is now properly restored from localStorage
  const [currentMonth, setCurrentMonth] = useState<Date>(stored?.currentMonth ?? new Date());

  // FIX 2: reminderTime removed — replaced by morningTime/eveningTime/nightTime only
  // FIX 7: frozenDates + timezone added to settings
  const [reminderEnabled, setReminderEnabled] = useState(initialSettings.reminderEnabled);
  const [morningTime, setMorningTime] = useState(initialSettings.morningTime);
  const [eveningTime, setEveningTime] = useState(initialSettings.eveningTime);
  const [nightTime, setNightTime] = useState(initialSettings.nightTime);
  const [frozenDates, setFrozenDates] = useState<string[]>(initialSettings.frozenDates ?? []);
  // FIX 5: timezone from settings, empty string = auto-detect
  const [timezone, setTimezone] = useState<string>(initialSettings.timezone ?? "");

  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncReady, setSyncReady] = useState(false);
  const isFirstSave = useRef(true);

  // Habits & tasks for the current month
  const currentMonthHabits = getHabitsForMonth(habits, currentMonth);
  const currentMonthKey = getMonthKey(currentMonth);
  const currentMonthTasks = tasks.filter(t => !t.month || t.month === currentMonthKey);

  // ── Restore latest cloud data before enabling background sync ──────────────
  useEffect(() => {
    let cancelled = false;
    setSyncReady(false);
    isFirstSave.current = true;

    if (!userId) {
      setSyncReady(true);
      return;
    }

    const local = loadAppStorage(userId);
    const localNotes = loadCalendarNotes(userId);
    const localHasData = !!local && (local.habits.length > 0 || local.tasks.length > 0 || localNotes.length > 0);
    const localSavedAt = Date.parse(local?.savedAt ?? "") || 0;

    Promise.resolve(supabase
      .from("user_sync_data")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle())
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setSyncReady(localHasData);
          return;
        }

        const payload = (data?.payload ?? {}) as any;
        const remoteHabits = Array.isArray(payload.habits) ? (payload.habits as Habit[]) : null;
        const remoteTasks = Array.isArray(payload.tasks) ? (payload.tasks as Task[]) : null;
        const remoteNotes = Array.isArray(payload.calendarNotes) ? (payload.calendarNotes as CalendarNote[]) : null;
        const remoteFrozenDates = Array.isArray(payload.frozenDates) ? (payload.frozenDates as string[]) : [];
        const remoteHasData = !!remoteHabits?.length || !!remoteTasks?.length || !!remoteNotes?.length;
        const remoteSavedAt = Date.parse(payload.savedAt ?? data?.updated_at ?? "") || 0;

        if (remoteHasData && (!localHasData || remoteSavedAt >= localSavedAt)) {
          cancelPending(userId);
          const restoredMonth = payload.currentMonth ? new Date(payload.currentMonth) : new Date();
          const safeMonth = isNaN(restoredMonth.getTime()) ? new Date() : restoredMonth;
          const nextHabits = remoteHabits ?? defaultHabits;
          const nextTasks = remoteTasks ?? defaultTasks;
          const nextNotes = remoteNotes ?? [];

          setHabits(nextHabits);
          setTasks(nextTasks);
          setCalendarNotes(nextNotes);
          setCurrentMonth(safeMonth);
          setFrozenDates(remoteFrozenDates);
          saveAppStorage({ habits: nextHabits, tasks: nextTasks, currentMonth: safeMonth }, userId);
          saveCalendarNotes(nextNotes, userId);
          saveSettings({ ...loadSettings(userId), frozenDates: remoteFrozenDates }, userId);
          scheduleCalendarNoteNotifications(nextNotes);
          if (!localHasData) toast.success("Your saved data was restored");
        }

        setSyncReady(true);
      })
      .catch(() => {
        if (!cancelled) setSyncReady(localHasData);
      });

    return () => { cancelled = true; };
  }, [userId]);

  // ── Background sync — silently keeps cloud storage up-to-date ───────────────
  useBackgroundSync({ enabled: syncReady, userId, habits, tasks, calendarNotes, currentMonth, frozenDates, username });

  // ── Widget sync — mirrors latest data to native SharedPreferences for Android home-screen widgets
  useEffect(() => {
    import("@/services/widgetSync").then(({ syncWidgetData }) => {
      syncWidgetData({ habits, tasks, notes: calendarNotes, frozenDates });
    }).catch(() => { /* ignore on web */ });
  }, [habits, tasks, calendarNotes, frozenDates]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save app data on change — skip first render (data was just loaded from storage)
  useEffect(() => {
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    saveAppStorage({ habits, tasks, currentMonth }, userId);
  }, [habits, tasks, currentMonth]);

  // FIX 2 + FIX 3 (web SW notifications): reschedule whenever relevant state changes
  useEffect(() => {
    if (!reminderEnabled) return;
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const dateString = `${monthKey}-${String(today.getDate()).padStart(2, "0")}`;
    // Always use TODAY's month habits, regardless of which month is being viewed
    const todayHabits = habits.filter(h => h.month === monthKey);
    const totalHabits = todayHabits.length;
    const incomplete = totalHabits > 0
      ? todayHabits
          .filter(h => !h.completedDays.includes(dateString))
          .map(h => h.name)
      : [];
    scheduleSmartNotifications(
      incomplete, totalHabits, tasks, currentMonth,
      morningTime, eveningTime, nightTime,
    );
  }, [habits, tasks, reminderEnabled, currentMonth, morningTime, eveningTime, nightTime]);

  // Save settings (no reminderTime — removed dead code)
  useEffect(() => {
    const s: AppSettings = {
      reminderEnabled,
      morningTime,
      eveningTime,
      nightTime,
      frozenDates,
      timezone,
    };
    saveSettings(s, userId);
  }, [reminderEnabled, morningTime, eveningTime, nightTime, frozenDates, timezone]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleResetData = () => {
    clearAllStorage(userId);
    setHabits(defaultHabits);
    setTasks(defaultTasks);
    setCurrentMonth(new Date());
    setReminderEnabled(false);
    setMorningTime("06:00");
    setEveningTime("18:00");
    setNightTime("22:00");
    setFrozenDates([]);
    setTimezone("");
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
        toast.error("Please allow notifications in your browser/device settings");
      }
    } else {
      setReminderEnabled(false);
      cancelAllNotifications();
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
      }),
    );
  };

  const handleAddHabit = (name: string) => {
    const monthKey = getMonthKey(currentMonth);
    const maxOrder = currentMonthHabits.reduce((m, h) => Math.max(m, h.order ?? 0), -1);
    const newHabit: Habit = {
      id: generateId(),
      name,
      month: monthKey,
      completedDays: [],
      order: maxOrder + 1,
    };
    setHabits(prev => [...prev, newHabit]);
    toast.success(`Added "${name}" to your habits`);
  };

  const handleDeleteHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
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

  const handleRenameHabit = (habitId: string, newName: string) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, name: newName } : h));
    toast.success(`Habit renamed to "${newName}"`);
  };

  const handleReorderHabits = (reordered: Habit[]) => {
    setHabits(prev => {
      const otherHabits = prev.filter(h => h.month !== currentMonthKey);
      return [...otherHabits, ...reordered];
    });
  };

  const navigateToMonth = (newMonth: Date) => {
    const habitsInNewMonth = getHabitsForMonth(habits, newMonth);
    const prevMonth = getPreviousMonth(newMonth);
    const habitsInPrevMonth = getHabitsForMonth(habits, prevMonth);
    if (habitsInNewMonth.length === 0 && habitsInPrevMonth.length > 0) {
      setPendingMonth(newMonth);
      setShowCopyDialog(true);
    } else {
      setCurrentMonth(newMonth);
    }
  };

  const handleCopyHabits = (copyTasks: boolean) => {
    if (!pendingMonth) return;
    const prevMonth = getPreviousMonth(pendingMonth);
    const prevHabits = getHabitsForMonth(habits, prevMonth);
    const monthKey = getMonthKey(pendingMonth);
    const copiedHabits: Habit[] = prevHabits.map((h, i) => ({
      id: generateId(),
      name: h.name,
      month: monthKey,
      completedDays: [],
      order: i,
    }));
    setHabits(prev => [...prev, ...copiedHabits]);
    if (copyTasks) {
      const prevMonthKey = getMonthKey(prevMonth);
      const incompletePrev = tasks.filter(t => (t.month === prevMonthKey || !t.month) && !t.completed);
      const carriedTasks: Task[] = incompletePrev.map(t => ({
        ...t,
        id: generateId(),
        completed: false,
        month: monthKey,
      }));
      setTasks(prev => [...prev, ...carriedTasks]);
      toast.success(`Copied ${copiedHabits.length} habits + ${carriedTasks.length} tasks to ${getMonthName(pendingMonth)}`);
    } else {
      toast.success(`Copied ${copiedHabits.length} habits from previous month`);
    }
    setCurrentMonth(pendingMonth);
    setPendingMonth(null);
    setShowCopyDialog(false);
  };

  const handleSkipCopy = () => {
    if (!pendingMonth) return;
    setCurrentMonth(pendingMonth);
    setPendingMonth(null);
    setShowCopyDialog(false);
  };

  const handlePrevMonth = () =>
    navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () =>
    navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (task: Task) => {
    const scopedTask: Task = { ...task, month: currentMonthKey };
    setTasks(prev => [...prev, scopedTask]);
    toast.success(`Added "${task.title}"`);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (task) toast.success(`Removed "${task.title}"`);
  };

  // FIX 4: Task editing handler
  const handleEditTask = (taskId: string, newTitle: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
    toast.success(`Task renamed to "${newTitle}"`);
  };

  // ── Calendar Note Handlers ──────────────────────────────────────────────────
  const handleAddCalendarNote = useCallback((note: CalendarNote) => {
    setCalendarNotes(prev => {
      const updated = [...prev, note];
      saveCalendarNotes(updated, userId);
      scheduleCalendarNoteNotifications(updated);
      return updated;
    });
  }, [userId]);

  const handleDeleteCalendarNote = useCallback((id: string) => {
    setCalendarNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveCalendarNotes(updated, userId);
      scheduleCalendarNoteNotifications(updated);
      return updated;
    });
  }, [userId]);

  const handleEditCalendarNote = useCallback((id: string, updated: Partial<CalendarNote>) => {
    setCalendarNotes(prev => {
      const newNotes = prev.map(n => n.id === id ? { ...n, ...updated } : n);
      saveCalendarNotes(newNotes, userId);
      scheduleCalendarNoteNotifications(newNotes);
      return newNotes;
    });
  }, [userId]);

  const handleRestore = (restoredHabits: Habit[], restoredTasks: Task[]) => {
    setHabits(restoredHabits);
    setTasks(restoredTasks);
  };

  const handleSignOut = async () => {
    if (userId) {
      clearDebounce(userId);
      enqueue(userId, {
        habits,
        tasks,
        calendarNotes,
        currentMonth: currentMonth.toISOString(),
        frozenDates,
        username,
        savedAt: new Date().toISOString(),
      });
      await flushPending(userId);
    }
    await signOut();
  };

  // FIX 7: Streak freeze toggle for a date
  const handleToggleFreeze = (dateStr: string) => {
    setFrozenDates(prev => {
      if (prev.includes(dateStr)) {
        toast.success("Freeze removed — day counts as missed");
        return prev.filter(d => d !== dateStr);
      }
      toast.success("Day frozen ❄️ — streak protected");
      return [...prev, dateStr];
    });
  };

  // Per-habit skip day toggle (e.g. college closed on Sunday)
  const handleToggleSkipDay = (habitId: string, dateStr: string) => {
    setHabits(prev =>
      prev.map(habit => {
        if (habit.id !== habitId) return habit;
        const skipped = habit.skippedDays ?? [];
        return {
          ...habit,
          skippedDays: skipped.includes(dateStr)
            ? skipped.filter(d => d !== dateStr)
            : [...skipped, dateStr].sort(),
        };
      })
    );
  };

  // Dialog helpers
  const prevMonthForDialog = getPreviousMonth(pendingMonth ?? currentMonth);
  const prevMonthKey = getMonthKey(prevMonthForDialog);
  const incompletePrevTasks = tasks
    .filter(t => (t.month === prevMonthKey || !t.month) && !t.completed)
    .map(t => ({ id: t.id, title: t.title }));

  const allTime = getAllTimeStats(habits, frozenDates);

  // FIX 5: today's freeze button — only on today's date in current month
  const today = new Date();
  const isViewingCurrentMonth =
    today.getMonth() === currentMonth.getMonth() &&
    today.getFullYear() === currentMonth.getFullYear();
  const todayDateStr = todayStr();
  const todayFrozen = frozenDates.includes(todayDateStr);

  return (
    <div className="min-h-screen bg-background">
      {/* Cloud-restore overlay */}
      {userId && !syncReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
            <p className="text-sm text-muted-foreground">Syncing your data…</p>
          </div>
        </div>
      )}
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
                {/* FIX 5: clock uses user timezone */}
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {formatLocalDateTime(currentTime, timezone)}
                </p>

              </div>

              {/* Mobile header buttons */}
              <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
                {isViewingCurrentMonth && (
                  <Button
                    variant={todayFrozen ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleToggleFreeze(todayDateStr)}
                    className="h-8 w-8 flex-shrink-0"
                    title="Freeze today's streak"
                    aria-label="Freeze today's streak"
                  >
                    <SnowflakeIcon className="w-4 h-4" />
                  </Button>
                )}
                <BackupRestoreDialog habits={habits} tasks={tasks} onRestore={handleRestore} />
                <Button
                  variant={reminderEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleReminder}
                  className="h-8 w-8 flex-shrink-0"
                  title={reminderEnabled ? "Reminders On" : "Reminders Off"}
                  aria-label={reminderEnabled ? "Disable reminders" : "Enable reminders"}
                >
                  {reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>
                <SettingsDialog
                  onResetData={handleResetData}
                  reminderEnabled={reminderEnabled}
                  morningTime={morningTime}
                  eveningTime={eveningTime}
                  nightTime={nightTime}
                  timezone={timezone}
                  onReminderEnabledChange={setReminderEnabled}
                  onMorningTimeChange={setMorningTime}
                  onEveningTimeChange={setEveningTime}
                  onNightTimeChange={setNightTime}
                  onTimezoneChange={setTimezone}
                />
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 flex-shrink-0" title="Log out" aria-label="Log out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Desktop header buttons */}
              <div className="hidden sm:flex items-center gap-2">
                {/* FIX 7: Streak freeze button shown when viewing current month */}
                {isViewingCurrentMonth && (
                  <Button
                    variant={todayFrozen ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleFreeze(todayDateStr)}
                    className="gap-1.5"
                    title="Freeze today's streak — a missed day won't break it"
                  >
                    <SnowflakeIcon className="w-4 h-4" />
                    <span>{todayFrozen ? "Frozen" : "Freeze Day"}</span>
                  </Button>
                )}
                <BackupRestoreDialog habits={habits} tasks={tasks} onRestore={handleRestore} />
                <Button
                  variant={reminderEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleReminder}
                  className="gap-1.5"
                >
                  {reminderEnabled ? (
                    <><Bell className="w-4 h-4" /><span>Reminder On</span></>
                  ) : (
                    <><BellOff className="w-4 h-4" /><span>Reminder Off</span></>
                  )}
                </Button>
                <SettingsDialog
                  onResetData={handleResetData}
                  reminderEnabled={reminderEnabled}
                  morningTime={morningTime}
                  eveningTime={eveningTime}
                  nightTime={nightTime}
                  timezone={timezone}
                  onReminderEnabledChange={setReminderEnabled}
                  onMorningTimeChange={setMorningTime}
                  onEveningTimeChange={setEveningTime}
                  onNightTimeChange={setNightTime}
                  onTimezoneChange={setTimezone}
                />
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>

              {/* Month navigation */}
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 sm:h-10 sm:w-10" aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-24 sm:min-w-36 text-center text-sm sm:text-base">
                  {getMonthName(currentMonth)}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 sm:h-10 sm:w-10" aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        <section>
          <StatsOverview habits={currentMonthHabits} currentMonth={currentMonth} />
        </section>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full max-w-sm grid-cols-3 mb-4 sm:mb-6">
            <TabsTrigger value="habits" className="text-xs sm:text-sm">Habits</TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">Goals</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
          </TabsList>

          {/* ── Habits Tab ── */}
          <TabsContent value="habits" className="space-y-6 sm:space-y-8">
            <section>
              <Card className="overflow-hidden border-border">
                <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-sm sm:text-base">Monthly Tracking Grid</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Drag rows to reorder · Click ✏️ to rename
                      {frozenDates.length > 0 && ` · ❄️ ${frozenDates.length} day(s) frozen`}
                    </p>
                  </div>
                  <AddHabitDialog onAddHabit={handleAddHabit} />
                </div>
                <HabitGrid
                  habits={currentMonthHabits}
                  currentMonth={currentMonth}
                  onToggleDay={handleToggleDay}
                  onDeleteHabit={handleDeleteHabit}
                  onReorderHabits={handleReorderHabits}
                  onRenameHabit={handleRenameHabit}
                  frozenDates={frozenDates}
                />
              </Card>
            </section>

            <section>
              <HabitCalendar
                habits={currentMonthHabits}
                currentMonth={currentMonth}
                onToggleSkipDay={handleToggleSkipDay}
              />
            </section>

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

          {/* ── Goals Tab ── */}
          <TabsContent value="goals" className="space-y-8">
            <GoalsOverview
              tasks={currentMonthTasks}
              currentMonth={currentMonth}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={handleEditTask}
              calendarNotes={calendarNotes}
              onAddCalendarNote={handleAddCalendarNote}
              onDeleteCalendarNote={handleDeleteCalendarNote}
              onEditCalendarNote={handleEditCalendarNote}
            />
          </TabsContent>

          {/* ── Reports Tab ── */}
          <TabsContent value="reports" className="space-y-6 sm:space-y-8">
            {habits.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-foreground" />
                  All-Time Statistics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Card className="p-3 sm:p-4 bg-card border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Months Tracked</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{allTime.totalMonths}</p>
                      </div>
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                  <Card className="p-3 sm:p-4 bg-card border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Completions</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{allTime.totalCompletions}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                    </div>
                  </Card>
                  <Card className="p-3 sm:p-4 bg-card border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">All-Time Rate</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{allTime.allTimeRate}%</p>
                      </div>
                      <Trophy className="w-4 h-4 text-foreground" />
                    </div>
                  </Card>
                  <Card className="p-3 sm:p-4 bg-card border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Longest Streak</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{allTime.longestStreak}d</p>
                      </div>
                      <Flame className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Card>
                  {allTime.bestHabit && (
                    <Card className="p-3 sm:p-4 bg-card border-border col-span-2 sm:col-span-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Best Habit</p>
                          <p className="text-sm font-bold mt-1 truncate">{allTime.bestHabit.name}</p>
                          <p className="text-xs text-muted-foreground">{allTime.bestHabit.completedDays.length} completions</p>
                        </div>
                        <Trophy className="w-4 h-4 text-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  )}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Habit Reports</h2>
              <HabitReportCard habits={currentMonthHabits} currentMonth={currentMonth} frozenDates={frozenDates} />
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Task Reports</h2>
              <TaskReportCard tasks={currentMonthTasks} />
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Task Analytics</h2>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <TaskCompletionChart tasks={currentMonthTasks} />
                <TaskProgressChart tasks={currentMonthTasks} currentMonth={currentMonth} />
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Build better habits, one day at a time.</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5">
            <span>🐛 Found a bug or need help?</span>
            <span className="text-foreground/30">·</span>
            <a
              href="https://wa.me/918660579096"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-green-500 hover:text-green-400 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact Admin on WhatsApp
            </a>
          </div>
        </div>
      </footer>

      <CopyHabitsDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        previousMonthName={getMonthName(prevMonthForDialog)}
        currentMonthName={getMonthName(pendingMonth ?? currentMonth)}
        previousHabitNames={getHabitsForMonth(habits, prevMonthForDialog).map(h => h.name)}
        incompleteTasks={incompletePrevTasks}
        onCopy={handleCopyHabits}
        onSkip={handleSkipCopy}
      />
    </div>
  );
};

export default Index;
