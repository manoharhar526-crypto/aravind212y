export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
    });
  }
};

export const getNotificationStatus = (): "granted" | "denied" | "default" | "unsupported" => {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
};
