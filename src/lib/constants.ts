/**
 * Shared application constants.
 * Single source of truth — never hardcode these strings elsewhere.
 */

// ── LocalStorage keys ────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  APP_DATA:       "habit_tracker_v1",
  SETTINGS:       "habit_tracker_settings_v1",
  CALENDAR_NOTES: "habit_tracker_calendar_notes",
  IS_ADMIN:       "habitracker_is_admin",
} as const;

// ── Supabase edge function names ─────────────────────────────────────────────
export const EDGE_FUNCTIONS = {
  BACKUP_MANAGER: "backup-manager",
  ADMIN_MANAGE:   "admin-manage",
  AUTH_LOGIN:     "auth-login",
  DELETE_ACCOUNT: "delete-account",
  SHARED_BACKUP:  "shared-backup",
} as const;

// ── Backup manager actions ───────────────────────────────────────────────────
export const BACKUP_ACTIONS = {
  BACKUP:              "backup",
  RESTORE:             "restore",
  DELETE:              "delete",
  CHECK:               "check",
  CHECK_PIN_AVAILABLE: "check-pin-available",
} as const;
