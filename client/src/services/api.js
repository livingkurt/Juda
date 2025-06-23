import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const taskAPI = {
  getTasks: userId => api.get(`/tasks/user/${userId}`),
  createTask: (userId, taskData) => api.post(`/tasks/user/${userId}`, taskData),
  completeTask: (taskId, completionData) =>
    api.post(`/tasks/${taskId}/complete`, completionData),
};

export default api;
