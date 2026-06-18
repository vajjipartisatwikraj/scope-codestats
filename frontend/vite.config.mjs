// vite.config.mjs - Using ESM format to avoid CJS deprecation warning
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import path from "path";

// Determine environment and set appropriate API URL with fallback
const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === "production";

// Fallback mechanism: Detect API URL based on environment
const getApiUrl = () => {
  // Priority 1: Use environment variable if explicitly set
  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  
  // Priority 2: Use NODE_ENV to determine
  if (isProduction) {
    return "https://scope.mlrit.ac.in/api";
  }
  
  // Priority 3: Default to localhost for development
  return "http://localhost:5000/api";
};

const apiUrl = getApiUrl();
const apiHost = apiUrl.replace(/^https?:\/\//, "").replace(/\/api\/?$/, "");

export default defineConfig({
  // Use empty string as base for relative paths
  base: "/",
  define: {
    // Make API URL available globally in the app
    __API_URL__: JSON.stringify(apiUrl),
    __API_HOST__: JSON.stringify(apiHost),
  },
  plugins: [react(), viteTsconfigPaths()],
  server: {
    open: true,
    proxy: {
      "/api": {
        // Fallback mechanism: Try production URL first, then localhost
        target: isDevelopment ? "http://localhost:5000" : "https://scope.mlrit.ac.in",
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
  },
  build: {
    target: ["es2015", "chrome80", "firefox80", "safari14"],
  },
  // Configure esbuild to handle JSX in .js files
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  resolve: {
    alias: {
      // Add path aliases as needed
    },
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  },
});
