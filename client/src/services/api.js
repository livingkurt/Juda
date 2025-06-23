import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Remove the full localhost URL
});

export const taskAPI = {
  getTasks: userId => api.get(`/tasks/user/${userId}`),
  createTask: (userId, taskData) => api.post(`/tasks/user/${userId}`, taskData),
  completeTask: (taskId, completionData) =>
    api.post(`/tasks/${taskId}/complete`, completionData),
};

export default api;
