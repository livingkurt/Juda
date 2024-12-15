import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add auth token if it exists
    const token = Cookies.get("token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
    });
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  // Reminder endpoints
  async getReminders() {
    return this.request("/reminders");
  }

  async createReminder(reminderData) {
    return this.request("/reminders", {
      method: "POST",
      body: JSON.stringify(reminderData),
    });
  }

  async updateReminder(id, reminderData) {
    return this.request(`/reminders/${id}`, {
      method: "PUT",
      body: JSON.stringify(reminderData),
    });
  }

  async deleteReminder(id) {
    return this.request(`/reminders/${id}`, {
      method: "DELETE",
    });
  }

  // Completion endpoints
  async updateCompletion(reminderId, completionData) {
    return this.request(`/completion/${reminderId}`, {
      method: "POST",
      body: JSON.stringify(completionData),
    });
  }

  async getCompletionHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/completion/history?${queryString}`);
  }

  async getCompletionStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/completion/stats?${queryString}`);
  }

  // Settings endpoints
  async updateWakeTime(wakeTimeData) {
    return this.request("/settings/wake-time", {
      method: "PUT",
      body: JSON.stringify(wakeTimeData),
    });
  }

  async getWakeTime() {
    return this.request("/settings/wake-time");
  }

  async updateNotificationSettings(notificationData) {
    return this.request("/settings/notifications", {
      method: "PUT",
      body: JSON.stringify(notificationData),
    });
  }

  async getNotificationSettings() {
    return this.request("/settings/notifications");
  }

  async updateNotificationToken(data) {
    return this.request("/settings/notification-token", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
