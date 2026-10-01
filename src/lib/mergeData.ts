/**
 * mergeData.ts — conflict-free merge between the copy on this device and the
 * copy in the cloud.
 *
 * Rule: a mark someone made is never thrown away. Completed/skipped days are
 * unioned, entries that exist on only one side are kept, and for text fields
 * the newer snapshot wins. This is what makes "offline for a week, then open
 * the app on a new phone" safe — neither side can erase the other.
 */
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";
import type { CalendarNote } from "@/types/calendarNote";
import { normalizeHabitDays } from "@/lib/habitUtils";

const uniqSorted = (xs: (string | undefined)[]): string[] =>
  Array.from(new Set(xs.filter((x): x is string => typeof x === "string"))).sort();

export type MergeSide = {
  habits: Habit[];
  tasks: Task[];
  calendarNotes: CalendarNote[];
  frozenDates?: string[];
  savedAt?: string;
};

export const mergeHabits = (local: Habit[], remote: Habit[], remoteIsNewer: boolean): Habit[] => {
  const byId = new Map<string, Habit>();
  for (const h of local) byId.set(h.id, h);

  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) {
      byId.set(r.id, r);
      continue;
    }
    const newer = remoteIsNewer ? r : l;
    byId.set(
      r.id,
      normalizeHabitDays({
        ...l,
        ...newer,
        name: newer.name,
        month: newer.month ?? l.month,
        order: newer.order ?? l.order,
        restDays: newer.restDays ?? l.restDays,
        // Marks are additive — a day ticked offline survives the merge.
        completedDays: uniqSorted([...(l.completedDays ?? []), ...(r.completedDays ?? [])]),
        skippedDays: uniqSorted([...(l.skippedDays ?? []), ...(r.skippedDays ?? [])]),
        recoveries: [...(l.recoveries ?? []), ...(r.recoveries ?? [])].filter(
          (rec, i, arr) => arr.findIndex(x => x.endedOn === rec.endedOn && x.length === rec.length) === i,
        ),
      }),
    );
  }
  return Array.from(byId.values());
};

export const mergeTasks = (local: Task[], remote: Task[], remoteIsNewer: boolean): Task[] => {
  const byId = new Map<string, Task>();
  for (const t of local) byId.set(t.id, t);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) { byId.set(r.id, r); continue; }
    const newer = remoteIsNewer ? r : l;
    // A finished task stays finished — completion is never undone by a merge.
    byId.set(r.id, { ...l, ...newer, completed: l.completed || r.completed });
  }
  return Array.from(byId.values());
};

export const mergeNotes = (
  local: CalendarNote[],
  remote: CalendarNote[],
  remoteIsNewer: boolean,
): CalendarNote[] => {
  const byId = new Map<string, CalendarNote>();
  for (const n of local) byId.set(n.id, n);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l) { byId.set(r.id, r); continue; }
    byId.set(r.id, remoteIsNewer ? { ...l, ...r } : { ...r, ...l });
  }
  return Array.from(byId.values());
};

/** Merges a local and a remote snapshot without losing anything from either. */
export const mergeSnapshots = (local: MergeSide, remote: MergeSide) => {
  const localAt = Date.parse(local.savedAt ?? "") || 0;
  const remoteAt = Date.parse(remote.savedAt ?? "") || 0;
  const remoteIsNewer = remoteAt >= localAt;

  return {
    habits: mergeHabits(local.habits ?? [], remote.habits ?? [], remoteIsNewer),
    tasks: mergeTasks(local.tasks ?? [], remote.tasks ?? [], remoteIsNewer),
    calendarNotes: mergeNotes(local.calendarNotes ?? [], remote.calendarNotes ?? [], remoteIsNewer),
    frozenDates: uniqSorted([...(local.frozenDates ?? []), ...(remote.frozenDates ?? [])]),
  };
};
