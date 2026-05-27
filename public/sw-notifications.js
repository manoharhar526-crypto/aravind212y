// Service Worker for web push / scheduled notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { notifications } = event.data;
    // Store in IndexedDB-like cache via self storage
    self.__pendingNotifications = notifications || [];
  }
  if (event.data && event.data.type === 'CANCEL_NOTIFICATIONS') {
    self.__pendingNotifications = [];
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

// Check every minute if any scheduled notification is due
setInterval(() => {
  const now = Date.now();
  const pending = self.__pendingNotifications || [];
  const remaining = [];
  for (const n of pending) {
    if (n.at <= now) {
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: '/favicon.ico',
        badge: '/favicon-32.png',
        tag: String(n.id),
      });
    } else {
      remaining.push(n);
    }
  }
  self.__pendingNotifications = remaining;
}, 60000);
