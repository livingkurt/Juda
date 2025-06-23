/* eslint-env serviceworker */
/* global clients */

self.addEventListener("push", function (event) {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: "2",
    },
    actions: [
      {
        action: "explore",
        title: "Check Tasks",
        icon: "/pwa-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/pwa-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Habit Tracker", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
