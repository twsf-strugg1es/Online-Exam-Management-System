import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Request interceptor to add token to Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Do NOT set a default Content-Type here; axios will set
    // the appropriate one automatically (e.g., multipart/form-data for FormData).
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
