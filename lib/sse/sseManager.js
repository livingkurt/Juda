"use client";

import { nanoid } from "nanoid";

class SSEManager {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.getAccessToken = null;
    // Unique client ID for this browser tab/instance
    this.clientId = typeof window !== "undefined" ? nanoid() : null;
  }

  getClientId() {
    return this.clientId;
  }

  setAuthFunction(getAccessToken) {
    this.getAccessToken = getAccessToken;
  }

  async connect() {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    const token = this.getAccessToken ? await this.getAccessToken() : null;
    if (!token) {
      console.warn("SSE: No auth token available");
      return;
    }

    // Close existing connection
    this.disconnect();

    // Create new connection with auth token and client ID as query params
    const url = `/api/sse?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(this.clientId)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      this.notifyListeners({ type: "connection", status: "connected" });
    };

    this.eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data);
      } catch (error) {
        console.error("SSE: Failed to parse message", error);
      }
    };

    this.eventSource.onerror = () => {
      console.warn("SSE: Connection error");
      this.notifyListeners({ type: "connection", status: "disconnected" });
      this.eventSource?.close();
      this.scheduleReconnect();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("SSE: Max reconnection attempts reached");
      this.notifyListeners({ type: "connection", status: "failed" });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.notifyListeners({ type: "connection", status: "reconnecting", attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (typeof window !== "undefined" && navigator.onLine) {
        this.connect();
      }
    }, delay);
  }

  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }

  isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export const sseManager = new SSEManager();
