import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { WIDGET_PREFS_KEY, readWidgetPrefs, writeWidgetPrefs } from "@/lib/widgetPrefs";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

interface WidgetPrefsTabProps {
  habits: Habit[];
  tasks: Task[];
}

/**
 * Lets the user choose which habits and tasks appear on the home-screen
 * widgets. Empty selection = show everything (default).
 */
export const WidgetPrefsTab = ({ habits, tasks }: WidgetPrefsTabProps) => {
  const [hidden, setHidden] = useState<{ habits: string[]; tasks: string[] }>({ habits: [], tasks: [] });

  useEffect(() => {
    setHidden(readWidgetPrefs());
  }, []);

  const persist = (next: { habits: string[]; tasks: string[] }) => {
    setHidden(next);
    writeWidgetPrefs(next);
    window.dispatchEvent(new CustomEvent(WIDGET_PREFS_KEY));
  };

  const toggle = (kind: "habits" | "tasks", id: string) => {
    const list = hidden[kind];
    const next = {
      ...hidden,
      [kind]: list.includes(id) ? list.filter(x => x !== id) : [...list, id],
    };
    persist(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Home screen widgets</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Turn something off to hide it from your widgets. It stays in the app.
      </p>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Habits</Label>
        {habits.length === 0 && <p className="text-sm text-muted-foreground">No habits this month.</p>}
        {habits.map(h => (
          <div key={h.id} className="flex items-center justify-between gap-3">
            <span className="text-sm truncate">{h.name}</span>
            <Switch checked={!hidden.habits.includes(h.id)} onCheckedChange={() => toggle("habits", h.id)} />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</Label>
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks this month.</p>}
        {tasks.slice(0, 40).map(t => (
          <div key={t.id} className="flex items-center justify-between gap-3">
            <span className="text-sm truncate">{t.title}</span>
            <Switch checked={!hidden.tasks.includes(t.id)} onCheckedChange={() => toggle("tasks", t.id)} />
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          persist({ habits: [], tasks: [] });
          toast.success("All items shown on widgets again");
        }}
      >
        Show everything
      </Button>
    </div>
  );
};
