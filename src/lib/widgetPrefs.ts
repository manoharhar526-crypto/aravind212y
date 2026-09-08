/**
 * Widget visibility preferences — which habits/tasks are hidden from the
 * home-screen widgets. Stored locally; empty lists mean "show everything".
 */
export const WIDGET_PREFS_KEY = "habit_tracker_widget_prefs";

export type WidgetPrefs = { habits: string[]; tasks: string[] };

const EMPTY: WidgetPrefs = { habits: [], tasks: [] };

export const readWidgetPrefs = (): WidgetPrefs => {
  try {
    const raw = localStorage.getItem(WIDGET_PREFS_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<WidgetPrefs>;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return EMPTY;
  }
};

export const writeWidgetPrefs = (prefs: WidgetPrefs) => {
  try {
    localStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};
