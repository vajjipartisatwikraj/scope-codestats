/**
 * API Configuration
 *
 * This file contains the API URL for making requests to the backend.
 * It can be overridden by environment variables.
 */

// The address of the API comes from the environment the app is built with (VITE_API_URL). Without one, a development
// build talks to the local server and a production build to the same site it is served from ("/api", the way a reverse
// proxy usually exposes it), never to a localhost that only exists on the developer's computer.
export const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

// Export other API-related configurations as needed
export const apiConfig = {
  baseURL: apiUrl,
  timeout: 30000, // 30 seconds
  withCredentials: true,
};

export default apiConfig;
