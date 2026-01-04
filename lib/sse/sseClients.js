// In-memory client registry (consider Redis for multi-server deployments)
const clients = new Map(); // userId -> Map(clientId -> sendFunction)

export function addSSEClient(userId, clientId, sendFunction) {
  if (!clients.has(userId)) {
    clients.set(userId, new Map());
  }
  clients.get(userId).set(clientId, sendFunction);
}

export function removeSSEClient(userId, clientId) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(clientId);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

/**
 * Broadcast to all clients for a user, optionally excluding the originating client
 * @param {string} userId - The user ID
 * @param {object} data - The data to broadcast
 * @param {string|null} excludeClientId - Client ID to exclude (the one that made the change)
 */
export function broadcastToUser(userId, data, excludeClientId = null) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  userClients.forEach((sendFunction, clientId) => {
    // Skip the client that originated this change
    if (clientId !== excludeClientId) {
      try {
        sendFunction(data);
      } catch (error) {
        // Client disconnected - remove it
        console.warn(`SSE: Failed to send to client ${clientId}:`, error);
        removeSSEClient(userId, clientId);
      }
    }
  });
}

export function getConnectedClientCount(userId) {
  return clients.get(userId)?.size || 0;
}

export function getAllConnectedClients(userId) {
  return Array.from(clients.get(userId)?.keys() || []);
}
