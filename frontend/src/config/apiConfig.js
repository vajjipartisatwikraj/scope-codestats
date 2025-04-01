/**
 * API Configuration
 * 
 * This file contains the API URL for making requests to the backend.
 * It can be overridden by environment variables.
 */

// Get the API URL from environment variables or use the default
export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Export other API-related configurations as needed
export const apiConfig = {
  baseURL: apiUrl,
  timeout: 30000, // 30 seconds
  withCredentials: true
};

export default apiConfig; 