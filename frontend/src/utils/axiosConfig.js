import axios from 'axios';

// Set the base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// Add request interceptor
axios.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors silently for better UX
    if (!error.response) {
      console.error('Network Error:', error.message);
      // No visible error notifications for deployment
    }
    return Promise.reject(error);
  }
);

export default axios; 