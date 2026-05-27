import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from '@/types/task';

const isNative = () => Capacitor.isNativePlatform();

// ─── Register web service worker ──────────────────────────────────────────────

let _swReg: ServiceWorkerRegistration | null = null;

const getSwReg = async (): Promise<ServiceWorkerRegistration | null> => {
  if (isNative()) return null;
  if (!('serviceWorker' in navigator)) return null;
  if (_swReg) return _swReg;
  try {
    _swReg = await navigator.serviceWorker.register('/sw-notifications.js', { scope: '/' });
    return _swReg;
  } catch {
    return null;
  }
};

// ─── Permission ───────────────────────────────────────────────────────────────

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isNative()) {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    await getSwReg(); // ensure SW is registered
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await getSwReg();
      return true;
    }
  }
  return false;
};

export const getNotificationStatus = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (isNative()) return 'granted';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const getNotificationStatusAsync = async (): Promise<'granted' | 'denied' | 'default' | 'unsupported'> => {
  if (isNative()) {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return 'granted';
    if (display === 'denied') return 'denied';
    return 'default';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// ─── Send immediate notification ─────────────────────────────────────────────

export const sendNotification = async (title: string, body: string): Promise<void> => {
  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 900000) + 1,
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
          smallIcon: 'ic_stat_notify',
          sound: 'default',
          actionTypeId: '',
          extra: null,
        }],
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
    return;
  }
  // Web: use SW if available, else direct
  const sw = await getSwReg();
  if (sw && Notification.permission === 'granted') {
    sw.showNotification(title, { body, icon: '/notification-icon.png' });
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/notification-icon.png' });
  }
};

// ─── Schedule all smart notifications ────────────────────────────────────────
// Native IDs: 2001=morning, 2002=evening, 2003=night, 2004=weekly, 3000+=tasks
// Web: posts schedule to SW via postMessage

export const scheduleSmartNotifications = async (
  incompleteHabits: string[],
  totalHabits: number,
  tasks: Task[],
  currentMonth: Date,
  morningTime = '06:00',
  eveningTime = '18:00',
  nightTime = '22:00',
): Promise<void> => {
  if (isNative()) {
    await _scheduleNative(incompleteHabits, totalHabits, tasks, currentMonth, morningTime, eveningTime, nightTime);
  } else {
    await _scheduleWeb(incompleteHabits, totalHabits, tasks, currentMonth, morningTime, eveningTime, nightTime);
  }
};

// ─── Web scheduling via Service Worker ───────────────────────────────────────

const _scheduleWeb = async (
  incompleteHabits: string[],
  totalHabits: number,
  tasks: Task[],
  currentMonth: Date,
  morningTime: string,
  eveningTime: string,
  nightTime: string,
) => {
  if (Notification.permission !== 'granted') return;
  const sw = await getSwReg();
  if (!sw || !sw.active) return;

  const now = new Date();

  const parseWebTime = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  };

  const notifications: { id: number; at: number; title: string; body: string }[] = [];

  // Morning
  const morningBody = totalHabits === 0
    ? "You haven't created any habits yet. Open the app and start tracking today!"
    : incompleteHabits.length === 0
      ? "You already completed all habits! Keep it up! 🔥"
      : `Today's habits: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
  notifications.push({ id: 2001, at: parseWebTime(morningTime).getTime(), title: '🌅 Morning Check-in', body: morningBody });

  // Evening
  if (totalHabits > 0) {
    const eveningBody = incompleteHabits.length === 0
      ? "All habits done for today! Amazing work! 🌟"
      : `Not done yet: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
    notifications.push({ id: 2002, at: parseWebTime(eveningTime).getTime(), title: incompleteHabits.length === 0 ? '✅ Evening Check' : '⏰ Habit Check', body: eveningBody });
  }

  // Night
  if (totalHabits > 0) {
    const nightBody = incompleteHabits.length === 0
      ? "You completed ALL your habits today! Incredible! 🎉"
      : `Last chance! Still pending: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
    notifications.push({ id: 2003, at: parseWebTime(nightTime).getTime(), title: incompleteHabits.length === 0 ? '🏆 All Done!' : '🌙 Final Reminder', body: nightBody });
  }

  // Weekly Sunday summary
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date();
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  nextSunday.setHours(20, 0, 0, 0);
  if (nextSunday > now) {
    notifications.push({ id: 2004, at: nextSunday.getTime(), title: '📊 Weekly Summary', body: 'Check how many habits you completed this week! Open the app to see your progress. 🔥' });
  }

  // Task notifications - monthly goals only
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  let taskNotifId = 3000;
  for (const task of tasks.filter(t => !t.completed)) {
    if (taskNotifId >= 3100) break;
    if (task.type === 'monthly') {
      const taskDate = new Date(year, month, 1, 9, 0, 0, 0);
      if (taskDate > now) {
        notifications.push({ id: taskNotifId++, at: taskDate.getTime(), title: '📌 Monthly Goal Reminder', body: `Don't forget: "${task.title}"` });
      }
    }
  }

  sw.active.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', notifications });
  console.log(`Scheduled ${notifications.length} web notifications via SW`);
};

// ─── Native scheduling ────────────────────────────────────────────────────────

const _scheduleNative = async (
  incompleteHabits: string[],
  totalHabits: number,
  tasks: Task[],
  currentMonth: Date,
  morningTime: string,
  eveningTime: string,
  nightTime: string,
) => {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    const now = new Date();
    const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

    const cancelIds = [{ id: 2001 }, { id: 2002 }, { id: 2003 }, { id: 2004 }];
    for (let i = 3000; i < 3100; i++) cancelIds.push({ id: i });
    try { await LocalNotifications.cancel({ notifications: cancelIds }); } catch (e) { console.warn("Notification error:", e); }

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    };

    const morningBody = totalHabits === 0
      ? "You haven't created any habits yet. Open the app and start tracking today!"
      : incompleteHabits.length === 0
        ? "You already completed all habits! Keep it up! 🔥"
        : `Today's habits: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
    notifications.push({ id: 2001, title: '🌅 Morning Check-in', body: morningBody, schedule: { at: parseTime(morningTime), repeats: true, every: 'day' }, smallIcon: 'ic_stat_notify', sound: 'default', actionTypeId: '', extra: null });

    if (totalHabits > 0) {
      const eveningBody = incompleteHabits.length === 0 ? "All habits done for today! Amazing work! 🌟" : `Not done yet: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
      notifications.push({ id: 2002, title: incompleteHabits.length === 0 ? '✅ Evening Check' : '⏰ Habit Check', body: eveningBody, schedule: { at: parseTime(eveningTime), repeats: true, every: 'day' }, smallIcon: 'ic_stat_notify', sound: 'default', actionTypeId: '', extra: null });
    }

    if (totalHabits > 0) {
      const nightBody = incompleteHabits.length === 0 ? "You completed ALL your habits today! Incredible! 🎉" : `Last chance! Still pending: ${incompleteHabits.slice(0, 3).join(', ')}${incompleteHabits.length > 3 ? ` +${incompleteHabits.length - 3} more` : ''}`;
      notifications.push({ id: 2003, title: incompleteHabits.length === 0 ? '🏆 All Done!' : '🌙 Final Reminder', body: nightBody, schedule: { at: parseTime(nightTime), repeats: true, every: 'day' }, smallIcon: 'ic_stat_notify', sound: 'default', actionTypeId: '', extra: null });
    }

    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const nextSunday = new Date();
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    nextSunday.setHours(20, 0, 0, 0);
    if (nextSunday > now) {
      notifications.push({ id: 2004, title: '📊 Weekly Summary', body: 'Check how many habits you completed this week! 🔥', schedule: { at: nextSunday, repeats: true, every: 'week' }, smallIcon: 'ic_stat_notify', sound: 'default', actionTypeId: '', extra: null });
    }

    // Monthly goal reminders only (daily type removed)
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let taskNotifId = 3000;
    for (const task of tasks.filter(t => !t.completed)) {
      if (taskNotifId >= 3100) break;
      if (task.type === 'monthly') {
        const taskDate = new Date(year, month, 1, 9, 0, 0, 0);
        if (taskDate > now) {
          notifications.push({ id: taskNotifId++, title: '📌 Monthly Goal Reminder', body: `Don't forget: "${task.title}"`, schedule: { at: taskDate, repeats: false }, smallIcon: 'ic_stat_notify', sound: 'default', actionTypeId: '', extra: null });
        }
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} native notifications`);
    }
  } catch (e) {
    console.error('scheduleSmartNotifications error:', e);
  }
};

// ─── Cancel all notifications ─────────────────────────────────────────────────

export const cancelAllNotifications = async (): Promise<void> => {
  if (isNative()) {
    try {
      const cancelIds = [{ id: 2001 }, { id: 2002 }, { id: 2003 }, { id: 2004 }];
      for (let i = 3000; i < 3100; i++) cancelIds.push({ id: i });
      await LocalNotifications.cancel({ notifications: cancelIds });
    } catch (e) { console.warn("Notification error:", e); }
    return;
  }
  const sw = await getSwReg();
  if (sw?.active) {
    sw.active.postMessage({ type: 'CANCEL_NOTIFICATIONS' });
  }
};

// ─── Auto-request permission on native app start ──────────────────────────────

export const initNotificationsOnNative = async (): Promise<void> => {
  if (!isNative()) return;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    console.error('Init notifications error:', e);
  }
};

// ── Calendar Note Notifications ───────────────────────────────────────────────
export const scheduleCalendarNoteNotifications = async (notes: import("@/types/calendarNote").CalendarNote[]): Promise<void> => {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") await LocalNotifications.requestPermissions();

    // Cancel existing calendar note notifications (ids 4000-4999)
    const cancelIds = Array.from({ length: 1000 }, (_, i) => ({ id: 4000 + i }));
    try { await LocalNotifications.cancel({ notifications: cancelIds }); } catch (e) { console.warn("Notification error:", e); }

    const now = new Date();
    const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
    let idCounter = 4000;

    for (const note of notes) {
      if (!note.notifyAt) continue;
      const [h, m] = note.notifyAt.split(":").map(Number);
      const notifDate = new Date(`${note.date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
      if (notifDate <= now) continue;
      if (idCounter >= 4999) break;

      toSchedule.push({
        id: idCounter++,
        title: "📅 Today's Reminder",
        body: note.title + (note.body ? ` — ${note.body}` : ""),
        schedule: { at: notifDate, repeats: false },
        smallIcon: "ic_stat_notify",
        sound: "default",
        actionTypeId: "",
        extra: null,
      });
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
      console.log(`Scheduled ${toSchedule.length} calendar note notifications`);
    }
  } catch (e) {
    console.error("scheduleCalendarNoteNotifications error:", e);
  }
};
