import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tailwind v4 runs through its Vite plugin. An inline PostCSS config stops Vite from
  // picking up unrelated postcss.config.js files in parent folders.
  css: { postcss: {} },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          map: ['leaflet', 'react-leaflet'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // The browser talks to the frontend origin only; Vite forwards API and image requests.
    // Same-origin requests keep the httpOnly auth cookie simple and safe.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
      '/seed-images': { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
      '/seed-images': { target: API_TARGET, changeOrigin: true },
    },
  },
});
