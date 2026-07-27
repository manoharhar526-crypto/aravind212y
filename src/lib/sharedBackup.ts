import { supabase } from "@/integrations/supabase/client";
import { EDGE_FUNCTIONS } from "@/lib/constants";
import type { Habit } from "@/types/habit";
import type { Task } from "@/types/task";

export interface SharedBackupMeta {
  code: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}

const invoke = async <T = any>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTIONS.SHARED_BACKUP, { body });
  if (error) {
    // Prefer the server-provided error message when present
    const serverMsg = (data as any)?.error;
    throw new Error(serverMsg || error.message || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const checkSharedCode = (code: string) =>
  invoke<{ available: boolean; mine?: boolean }>({ action: "check", code });

export const saveSharedBackup = (
  code: string,
  habits: Habit[],
  tasks: Task[],
  label?: string,
) => invoke<{ success: true; code: string; created?: boolean; updated?: boolean }>({
  action: "save", code, habits, tasks, label,
});

export const restoreSharedBackup = (code: string) =>
  invoke<{ success: true; habits: Habit[]; tasks: Task[]; label: string | null; updatedAt: string; mine: boolean }>({
    action: "restore", code,
  });

export const listMySharedBackups = () =>
  invoke<{ success: true; backups: SharedBackupMeta[] }>({ action: "list-mine" });

export const deleteSharedBackup = (code: string) =>
  invoke<{ success: true }>({ action: "delete", code });
