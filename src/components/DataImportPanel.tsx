import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Habit } from "@/types/habit";
import type { Task, TaskType } from "@/types/task";

type Imported = { habits?: Habit[]; tasks?: Task[]; calendarNotes?: any[] };

const uid = () => (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Small CSV parser that handles quoted cells, commas and line breaks. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
};

const fromCsv = (text: string): Imported => {
  const [head, ...rows] = parseCsv(text);
  const h = (head ?? []).map(x => x.trim().toLowerCase());
  const col = (r: string[], name: string) => r[h.indexOf(name)] ?? "";
  if (h.includes("habit") && h.includes("date")) {
    const map = new Map<string, Habit>();
    for (const r of rows) {
      const name = col(r, "habit"), month = col(r, "month") || col(r, "date").slice(0, 7);
      const key = `${month}|${name}`;
      const habit = map.get(key) ?? { id: `imp-${month}-${name}`, name, month, completedDays: [], skippedDays: [] };
      (col(r, "status") === "n/a" ? habit.skippedDays! : habit.completedDays).push(col(r, "date"));
      map.set(key, habit);
    }
    return { habits: [...map.values()] };
  }
  if (h.includes("title") && h.includes("completed")) {
    return {
      tasks: rows.map(r => ({
        id: uid(), title: col(r, "title"), completed: col(r, "completed") === "yes",
        type: ((col(r, "type") || "general") as TaskType), month: col(r, "month") || undefined,
      })),
    };
  }
  if (h.includes("title") && h.includes("date")) {
    return {
      calendarNotes: rows.map(r => ({
        id: uid(), date: col(r, "date"), title: col(r, "title"),
        body: col(r, "body") || undefined, notifyAt: col(r, "reminder") || undefined,
      })),
    };
  }
  throw new Error("This spreadsheet isn't one of the app's export files");
};

export const DataImportPanel = ({ onImport }: { onImport: (d: Imported) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const all: Imported = { habits: [], tasks: [], calendarNotes: [] };
    try {
      for (const f of Array.from(files)) {
        const text = await f.text();
        let d: Imported;
        if (f.name.toLowerCase().endsWith(".json") || text.trim().startsWith("{")) {
          const j = JSON.parse(text);
          d = { habits: j.habits, tasks: j.tasks, calendarNotes: j.calendarNotes ?? j.notes };
        } else d = fromCsv(text);
        all.habits!.push(...(d.habits ?? []));
        all.tasks!.push(...(d.tasks ?? []));
        all.calendarNotes!.push(...(d.calendarNotes ?? []));
      }
      const n = all.habits!.length + all.tasks!.length + all.calendarNotes!.length;
      if (!n) throw new Error("Nothing to import in this file");
      onImport(all);
      toast.success(`Imported ${all.habits!.length} habits, ${all.tasks!.length} tasks, ${all.calendarNotes!.length} notes`);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't read this file");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Import Data</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Bring back a file you exported (full file or spreadsheets). Imported data is added — nothing you have now is removed.
      </p>
      <input ref={ref} type="file" multiple accept=".json,.csv,application/json,text/csv" className="hidden"
        onChange={e => handle(e.target.files)} />
      <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Choose file(s) to import
      </Button>
    </div>
  );
};
