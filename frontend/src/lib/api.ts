import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR: Inject JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR: Handle Network Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error (backend is down, CORS, etc.)
      console.error("Network error or Backend is unreachable:", error);
      error.message = "Backend is unreachable or network error occurred. Please check your connection.";
    }
    return Promise.reject(error);
  }
);
