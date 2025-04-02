// vite.config.mjs - Using ESM format to avoid CJS deprecation warning
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  // Use empty string as base for relative paths
  base: '/',
  plugins: [react(), viteTsconfigPaths()],
  server: {
    open: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://34.204.47.217:5000',
        changeOrigin: true,
        secure: false
      }
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  build: {
    target: ['es2015', 'chrome80', 'firefox80', 'safari14'],
  },
  // Configure esbuild to handle JSX in .js files
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: {
      // Add path aliases as needed
    }
  }
}); 