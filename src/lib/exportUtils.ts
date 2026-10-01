import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";
import { normalizeHabitDays } from "@/lib/habitUtils";

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const download = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const csvCell = (value: string | number) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per habit + day, so the file opens cleanly in any spreadsheet. */
export const buildHabitsCsv = (habits: Habit[]): string => {
  const rows: string[] = ["month,habit,date,status"];
  for (const raw of habits) {
    const habit = normalizeHabitDays(raw);
    const marks: Array<[string, string]> = [
      ...(habit.completedDays ?? []).map(d => [d, "done"] as [string, string]),
      ...(habit.skippedDays ?? []).map(d => [d, "n/a"] as [string, string]),
    ];
    marks.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [date, status] of marks) {
      rows.push([habit.month, habit.name, date, status].map(csvCell).join(","));
    }
  }
  return rows.join("\n");
};

export const buildTasksCsv = (tasks: Task[]): string => {
  const rows: string[] = ["month,type,title,completed"];
  for (const task of tasks) {
    rows.push(
      [task.month ?? "", task.type ?? "", task.title, task.completed ? "yes" : "no"]
        .map(csvCell)
        .join(","),
    );
  }
  return rows.join("\n");
};

export const exportHabitsCsv = (habits: Habit[]) =>
  download(buildHabitsCsv(habits), `habits-${stamp()}.csv`, "text/csv");

export const exportTasksCsv = (tasks: Task[]) =>
  download(buildTasksCsv(tasks), `goals-${stamp()}.csv`, "text/csv");

export const exportEverythingJson = (habits: Habit[], tasks: Task[]) =>
  download(
    JSON.stringify(
      { exportedAt: new Date().toISOString(), habits: habits.map(normalizeHabitDays), tasks },
      null,
      2,
    ),
    `habitracker-${stamp()}.json`,
    "application/json",
  );

// ── Notes ─────────────────────────────────────────────────────────────────────
export type NoteLike = { date: string; title: string; body?: string; notifyAt?: string };

export const buildNotesCsv = (notes: NoteLike[]): string => {
  const rows: string[] = ["date,title,body,reminder"];
  for (const n of [...notes].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([n.date, n.title, n.body ?? "", n.notifyAt ?? ""].map(csvCell).join(","));
  }
  return rows.join("\n");
};

// ── Selective export ──────────────────────────────────────────────────────────
export type ExportPart = "habits" | "tasks" | "notes";
export type ExportFormat = "csv" | "json";

const inMonth = (value: string | undefined, month: string | null) =>
  !month || (value ?? "").startsWith(month);

export type ExportSelection = {
  parts: ExportPart[];
  format: ExportFormat;
  /** "YYYY-MM" for one month, "YYYY" for a whole year, or null for everything. */
  month?: string | null;
  /** Limit to these habit names (empty/undefined = all). */
  habitNames?: string[];
  /** Limit to these task types (empty/undefined = all). */
  taskTypes?: string[];
  /** Only include completed / pending tasks. */
  taskStatus?: "all" | "done" | "pending";
  habits: Habit[];
  tasks: Task[];
  notes: NoteLike[];
};

/** Filters each dataset by period and filters, then downloads one file per chosen part (CSV) or a single JSON. */
export const exportSelection = ({
  parts, format, month = null, habitNames, taskTypes, taskStatus = "all", habits, tasks, notes,
}: ExportSelection): number => {
  const pickedHabits = habits
    .filter(h => inMonth(h.month, month))
    .filter(h => !habitNames?.length || habitNames.includes(h.name))
    .map(normalizeHabitDays);
  const pickedTasks = tasks
    .filter(t => inMonth(t.month ?? month ?? undefined, month))
    .filter(t => !taskTypes?.length || taskTypes.includes(t.type ?? "general"))
    .filter(t => taskStatus === "all" || (taskStatus === "done" ? t.completed : !t.completed));
  const pickedNotes = notes.filter(n => inMonth(n.date, month));

  const suffix = month ? `${month}` : "all";
  let files = 0;

  if (format === "json") {
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), scope: suffix };
    if (parts.includes("habits")) payload.habits = pickedHabits;
    if (parts.includes("tasks")) payload.tasks = pickedTasks;
    if (parts.includes("notes")) payload.calendarNotes = pickedNotes;
    download(JSON.stringify(payload, null, 2), `habitracker-${suffix}-${stamp()}.json`, "application/json");
    return 1;
  }

  if (parts.includes("habits")) {
    download(buildHabitsCsv(pickedHabits), `habits-${suffix}-${stamp()}.csv`, "text/csv");
    files++;
  }
  if (parts.includes("tasks")) {
    download(buildTasksCsv(pickedTasks), `goals-${suffix}-${stamp()}.csv`, "text/csv");
    files++;
  }
  if (parts.includes("notes")) {
    download(buildNotesCsv(pickedNotes), `notes-${suffix}-${stamp()}.csv`, "text/csv");
    files++;
  }
  return files;
};

/** Months that contain any data, newest first — used to offer a month picker. */
export const listDataMonths = (habits: Habit[], tasks: Task[], notes: NoteLike[]): string[] => {
  const set = new Set<string>();
  habits.forEach(h => h.month && set.add(h.month));
  tasks.forEach(t => t.month && set.add(t.month));
  notes.forEach(n => n.date && set.add(n.date.slice(0, 7)));
  return Array.from(set).sort((a, b) => b.localeCompare(a));
};

