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
    // Handle 401 Unauthorized errors - clear auth data and redirect
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized access detected. Logging out.');
      
      // Clear all auth data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to SCOPE club website
      window.location.href = 'http://scope.mlrit.ac.in/';
      return new Promise(() => {});
    }

    // Handle network errors silently for better UX
    if (!error.response) {
      console.error('Network Error:', error.message);
      // No visible error notifications for deployment
    }
    return Promise.reject(error);
  }
);

export default axios; 