/**
 * backgroundSync.ts
 *
 * Silently syncs user data to Supabase in the background.
 *
 * Flow:
 *   enqueue(userId, payload)
 *     → coalesces into per-user queue slot (localStorage)
 *     → debounces 1500 ms
 *     → UPSERT to user_sync_data
 *     → retries up to 3× with backoff on failure
 *     → if offline, defers until 'online' event fires
 *     → flushes on app resume (visibilitychange)
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";
import type { CalendarNote } from "@/types/calendarNote";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncPayload {
  habits:        Habit[];
  tasks:         Task[];
  calendarNotes: CalendarNote[];
  currentMonth?: string;
  frozenDates?:  string[];
  username?:     string | null;
  savedAt?:      string;
}

interface QueueItem {
  id:          string;
  userId:      string;
  payload:     SyncPayload;
  enqueuedAt:  string;
  attempts:    number;
  synced:      boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUEUE_KEY    = "bg_sync_queue";
const DEBOUNCE_MS  = 1500;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // ms between successive retries

// ── Queue helpers ─────────────────────────────────────────────────────────────

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch { return []; }
}

function saveQueue(q: QueueItem[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* quota exceeded */ }
}

function clearSynced(): void {
  saveQueue(loadQueue().filter(i => !i.synced));
}

// ── Per-user flush lock (BUG 1 FIX: per-user, not global) ────────────────────
// Using a Set instead of a boolean so multiple users flush concurrently.
const flushingUsers = new Set<string>();

// ── Debounce timers (per user) ────────────────────────────────────────────────
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ── Core flush ────────────────────────────────────────────────────────────────

async function flush(userId: string): Promise<void> {
  // BUG 1 FIX: per-user lock, not a single global boolean
  if (flushingUsers.has(userId)) return;

  if (!navigator.onLine) {
    // Will be retried when 'online' fires
    return;
  }

  const queue = loadQueue().filter(i => !i.synced && i.userId === userId);
  if (queue.length === 0) return;

  // Coalesce: use the latest queued snapshot for this user
  const latest = queue[queue.length - 1];

  flushingUsers.add(userId);

  let success = false;

  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        await new Promise(r => setTimeout(r, delay));
      }

      try {
        // BUG 2 FIX: The supabase client uses the anon key + user JWT from the
        // active session. The UPSERT goes through RLS so it must be called with
        // the user's own authenticated session — which supabase client already
        // does automatically (reads session from localStorage).
        const { error } = await supabase
          .from("user_sync_data")
          .upsert(
            {
              user_id:     userId,
              payload:     latest.payload as unknown as Json,
              sync_status: "synced",
              updated_at:  new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        // Mark all this user's items synced and clean up
        saveQueue(
          loadQueue().map(i => i.userId === userId ? { ...i, synced: true } : i)
        );
        clearSynced();
        success = true;
        break;

      } catch (err: any) {
        console.warn(`[bgSync] attempt ${attempt + 1}/${MAX_ATTEMPTS} failed for ${userId}:`, err?.message ?? err);

        // Increment attempt counter in queue
        saveQueue(
          loadQueue().map(i => i.id === latest.id ? { ...i, attempts: i.attempts + 1 } : i)
        );

        // BUG 3 FIX: Don't retry on auth errors — session is gone, no point
        const isAuthError = err?.status === 401 || err?.code === "PGRST301";
        if (isAuthError) {
          console.warn("[bgSync] Auth error — skipping retries");
          break;
        }
      }
    }

    if (!success) {
      console.error("[bgSync] All retries exhausted for userId:", userId);
    }
  } finally {
    // BUG 1 FIX: Always release the lock, even if an unexpected error throws
    flushingUsers.delete(userId);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enqueue a sync for userId. Debounces 1500ms then flushes.
 * Safe to call on every state change — rapid calls are coalesced.
 */
export function enqueue(userId: string, payload: SyncPayload): void {
  if (!userId) return;

  // Build queue item
  const item: QueueItem = {
    id:         `${userId}_${Date.now()}`,
    userId,
    payload,
    enqueuedAt: new Date().toISOString(),
    attempts:   0,
    synced:     false,
  };

  // Coalesce: keep only synced items + one pending item per user (the latest)
  const q = loadQueue().filter(i => i.synced || i.userId !== userId);
  saveQueue([...q, item]);

  // Reset debounce timer
  const existing = debounceTimers.get(userId);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    userId,
    setTimeout(() => {
      debounceTimers.delete(userId);
      flush(userId);
    }, DEBOUNCE_MS)
  );
}

/**
 * Cancel any pending debounce timer for a user and remove their unsynced
 * queue items. Call this on logout so stale data can't flush after session ends.
 */
export function cancelPending(userId: string): void {
  const timer = debounceTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(userId);
  }
  // Remove unsynced items for this user from the queue
  saveQueue(loadQueue().filter(i => i.synced || i.userId !== userId));
}

export function clearDebounce(userId: string): void {
  const timer = debounceTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(userId);
  }
}

/**
 * Immediately flush all (or one user's) pending queue items.
 * Called on 'online' event and app resume.
 */
export async function flushPending(userId?: string): Promise<void> {
  const q = loadQueue().filter(i => !i.synced);
  const ids = userId
    ? [userId]
    : [...new Set(q.map(i => i.userId))];

  await Promise.all(ids.map(id => flush(id)));
}

/**
 * Count of unsynced items for a user (for optional UI indicator).
 */
export function getPendingCount(userId: string): number {
  return loadQueue().filter(i => !i.synced && i.userId === userId).length;
}

// ── Auto-retry on reconnect / app resume ─────────────────────────────────────

if (typeof window !== "undefined") {
  // BUG 4 FIX: also cancel any running debounce and flush immediately on 'online'
  window.addEventListener("online", () => {
    console.log("[bgSync] Back online — flushing pending queue");
    // Cancel any pending debounce timers so we flush right now
    debounceTimers.forEach((timer, uid) => {
      clearTimeout(timer);
      debounceTimers.delete(uid);
    });
    flushPending();
  });

  // Flush on app foreground (Capacitor / mobile tab switching)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      flushPending();
    }
  });
}
