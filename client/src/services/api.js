import axios from "axios";

// Khi chạy trong Docker (production build), VITE_SERVER_URL không được set
// → SERVER_BASE = "" → baseURL = "/api" → Nginx proxy đến server container
// Khi chạy npm run dev (ngoài Docker), đọc từ .env.development
export const SERVER_BASE = import.meta.env.VITE_SERVER_URL ?? "";

const api = axios.create({
  baseURL: `${SERVER_BASE}/api`,
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
