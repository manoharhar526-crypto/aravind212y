import { useEffect, useState } from "react";
import { Habit } from "@/types/habit";
import { Task } from "@/types/task";
import { defaultHabits, generateId, getMonthName } from "@/lib/habitUtils";
import { defaultTasks } from "@/lib/taskUtils";
import { loadAppStorage, saveAppStorage } from "@/lib/appStorage";
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
import { DailyTasksView } from "@/components/DailyTasksView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const stored = loadAppStorage();

  const [habits, setHabits] = useState<Habit[]>(stored?.habits ?? defaultHabits);
  const [tasks, setTasks] = useState<Task[]>(stored?.tasks ?? defaultTasks);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    stored?.currentMonth ?? new Date(2025, 0, 1) // January 2025
  );

  useEffect(() => {
    saveAppStorage({ habits, tasks, currentMonth });
  }, [habits, tasks, currentMonth]);

  const handleToggleDay = (habitId: string, day: number) => {
    setHabits(prev =>
      prev.map(habit => {
        if (habit.id !== habitId) return habit;
        const isCompleted = habit.completedDays.includes(day);
        return {
          ...habit,
          completedDays: isCompleted
            ? habit.completedDays.filter(d => d !== day)
            : [...habit.completedDays, day].sort((a, b) => a - b),
        };
      })
    );
  };

  const handleAddHabit = (name: string) => {
    const newHabit: Habit = {
      id: generateId(),
      name,
      completedDays: [],
    };
    setHabits(prev => [...prev, newHabit]);
    toast.success(`Added "${name}" to your habits`);
  };

  const handleDeleteHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    setHabits(prev => prev.filter(h => h.id !== habitId));
    if (habit) {
      toast.success(`Removed "${habit.name}" from your habits`);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Habit Tracker</h1>
              <p className="text-sm text-muted-foreground">Track your daily progress</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-36 text-center">
                {getMonthName(currentMonth)}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Stats Overview */}
        <section>
          <StatsOverview habits={habits} currentMonth={currentMonth} />
        </section>

        <Tabs defaultValue="habits" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="habits">Habits</TabsTrigger>
            <TabsTrigger value="goals">Goals & Tasks</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="habits" className="space-y-8">
            {/* Habit Grid */}
            <section>
              <Card className="overflow-hidden border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold">Monthly Tracking Grid</h2>
                  <div className="flex items-center gap-2">
                    <AddHabitDialog onAddHabit={handleAddHabit} />
                    {habits.length > 0 && (
                    <div className="flex gap-2">
                      {habits.slice(0, 3).map(habit => (
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
                  habits={habits}
                  tasks={tasks}
                  currentMonth={currentMonth}
                  onToggleDay={handleToggleDay}
                />
              </Card>
            </section>

            {/* Habit Charts */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Habit Analytics</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                <CompletionLineChart habits={habits} currentMonth={currentMonth} />
                <HabitPieChart habits={habits} />
                <HabitBarChart habits={habits} currentMonth={currentMonth} />
                <IndividualHabitChart habits={habits} currentMonth={currentMonth} />
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

          <TabsContent value="reports" className="space-y-8">
            {/* Task Reports */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Task Reports</h2>
              <TaskReportCard tasks={tasks} />
            </section>

            {/* Task Charts */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Task Analytics</h2>
              <div className="grid lg:grid-cols-2 gap-6">
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
    </div>
  );
};

export default Index;
