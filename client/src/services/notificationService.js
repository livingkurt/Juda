let registration = null;

export const initServiceWorker = async () => {
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);

      await navigator.serviceWorker.ready;
      console.log("Service Worker is ready");

      return true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return false;
    }
  }
  return false;
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const subscribeToPush = async () => {
  if (!registration) {
    console.error("Service worker not registered");
    return null;
  }

  try {
    const serviceWorker =
      registration.active || registration.installing || registration.waiting;
    if (!serviceWorker) {
      console.error("No service worker available");
      return null;
    }

    console.log(
      "Service worker is available, skipping push subscription for now"
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
    return null;
  }
};

export const showTestNotification = () => {
  console.log(
    "Attempting to show test notification, permission:",
    Notification.permission
  );

  if (Notification.permission === "granted") {
    try {
      const notification = new Notification("Habit Tracker Test", {
        body: "This is a test notification from your habit tracker!",
        icon: "/pwa-192x192.png",
        tag: "test-notification",
        requireInteraction: true,
        silent: false,
      });

      notification.onshow = () => {
        console.log("Notification shown successfully");
      };

      notification.onerror = error => {
        console.error("Notification error:", error);
      };

      notification.onclose = () => {
        console.log("Notification closed");
      };

      notification.onclick = () => {
        console.log("Notification clicked");
        notification.close();
        window.focus();
      };

      console.log("Notification created:", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  } else {
    console.error("Notification permission not granted");
  }
};

export const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";

  // Check if we're in a PWA on iOS
  const isIOSPWA = window.navigator.standalone === true;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  console.log("iOS PWA:", isIOSPWA, "Standalone:", isStandalone);
  console.log("User Agent:", navigator.userAgent);

  if (
    navigator.userAgent.includes("iPhone") ||
    navigator.userAgent.includes("iPad")
  ) {
    if (!isIOSPWA && !isStandalone) {
      return "ios_needs_install";
    }
  }

  return Notification.permission;
};
