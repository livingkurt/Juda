class ApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  }

  // Helper method to get auth token
  getAuthToken() {
    return localStorage.getItem("token");
  }

  // Helper method to set auth token
  setAuthToken(token) {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  // Helper method to handle API requests
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // If token is invalid, clear it
        if (response.status === 401) {
          this.setAuthToken(null);
        }
        throw new Error(data.message || "Something went wrong");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (data.data?.token) {
      this.setAuthToken(data.data.token);
    }
    return data;
  }

  async register(userData) {
    const data = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (data.data?.token) {
      this.setAuthToken(data.data.token);
    }
    return data;
  }

  async logout() {
    this.setAuthToken(null);
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

  async toggleReminderCompletion(id, status) {
    return this.request(`/reminders/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }

  // User settings endpoints
  async updateUserSettings(settings) {
    return this.request("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  async getUserSettings() {
    return this.request("/settings");
  }

  // Notification endpoints
  async updateNotificationToken(token) {
    return this.request("/settings/notification-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async updateNotificationSettings(settings) {
    return this.request("/settings/notifications", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
