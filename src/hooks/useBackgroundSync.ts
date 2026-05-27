/**
 * useBackgroundSync.ts
 *
 * Watches habits / tasks / calendarNotes and enqueues a background sync
 * on any change. Completely silent — no toasts, no spinners, no UI impact.
 *
 * Fixes vs previous version:
 *  - isFirstRender is now per-userId so a user switch doesn't skip the
 *    first real sync for the new account
 *  - username changes alone don't trigger a sync (not real data)
 *  - Stable JSON comparison avoids spurious syncs on reference changes
 */

import { useEffect, useRef } from "react";
import { enqueue, flushPending, type SyncPayload } from "@/services/backgroundSync";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";
import type { CalendarNote } from "@/types/calendarNote";

interface Props {
  userId:        string | undefined;
  habits:        Habit[];
  tasks:         Task[];
  calendarNotes: CalendarNote[];
  username?:     string | null;
}

export function useBackgroundSync({ userId, habits, tasks, calendarNotes, username }: Props): void {
  // Track which userIds have already had their initial load skipped
  const initializedUsers = useRef<Set<string>>(new Set());

  // Stable serialized snapshots to detect real changes (not just reference changes)
  const prevHabits        = useRef<string>("");
  const prevTasks         = useRef<string>("");
  const prevCalendarNotes = useRef<string>("");

  // Track the last userId we were syncing for — so we never flush after logout
  const lastUserId = useRef<string | undefined>(undefined);

  // Flush leftover queue on login/app resume — but NOT on logout (userId → undefined)
  useEffect(() => {
    if (userId) {
      lastUserId.current = userId;
      flushPending(userId);
    }
  }, [userId]);

  useEffect(() => {
    // Never sync if no user or if user just logged out
    if (!userId) return;

    const habitsJson  = JSON.stringify(habits);
    const tasksJson   = JSON.stringify(tasks);
    const notesJson   = JSON.stringify(calendarNotes);

    // On first render for this userId: ALWAYS push current data to server.
    // This ensures the admin panel always has fresh data after every app open,
    // even if the user makes no changes. The UPSERT is idempotent — safe to always run.
    if (!initializedUsers.current.has(userId)) {
      initializedUsers.current.add(userId);
      // Seed the previous snapshots so the next real change is detected
      prevHabits.current        = habitsJson;
      prevTasks.current         = tasksJson;
      prevCalendarNotes.current = notesJson;

      // Always push on first open — keeps server in sync with localStorage
      enqueue(userId, { habits, tasks, calendarNotes, username });
      return;
    }

    // Only enqueue if actual data changed (not just a reference change)
    const dataChanged =
      habitsJson  !== prevHabits.current ||
      tasksJson   !== prevTasks.current  ||
      notesJson   !== prevCalendarNotes.current;

    if (!dataChanged) return;

    prevHabits.current        = habitsJson;
    prevTasks.current         = tasksJson;
    prevCalendarNotes.current = notesJson;

    enqueue(userId, { habits, tasks, calendarNotes, username });

  // username intentionally excluded — it's metadata, not user data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, habits, tasks, calendarNotes]);
}
