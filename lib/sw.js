import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

// Precache manifest will be injected by Serwist
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache API responses with network-first strategy
    {
      matcher: ({ url }) => {
        return url.pathname.startsWith("/api/") && !url.pathname.includes("/auth/"); // Don't cache auth endpoints
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache static assets
    {
      matcher: ({ request }) => {
        return request.destination === "style" || request.destination === "script" || request.destination === "font";
      },
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    // Cache images
    {
      matcher: ({ request }) => request.destination === "image",
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    // Default cache for everything else
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Listen for sync events (Background Sync API)
self.addEventListener("sync", event => {
  if (event.tag === "sync-pending-changes") {
    event.waitUntil(syncPendingChanges());
  }
});

// Listen for messages from the app
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "TRIGGER_SYNC") {
    syncPendingChanges();
  }
});

// Sync pending changes function
async function syncPendingChanges() {
  // This will be handled by the app's sync manager
  // Send message to all clients to trigger sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "SYNC_REQUIRED" });
  });
}

// Handle offline fallback for navigation
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline") || caches.match("/");
      })
    );
  }
});
