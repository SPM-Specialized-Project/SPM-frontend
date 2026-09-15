/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from 'node:path';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

const backendProxy = {
  '/api': {
    target: 'http://127.0.0.1:4000',
    changeOrigin: true,
  },
};

export default defineConfig({
  base: './',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    viteTsconfigPaths(),
  ],
  server: {
    port: 3000,
    allowedHosts: [],
    proxy: backendProxy,
  },
  preview: {
    port: 3000,
    allowedHosts: [],
    proxy: backendProxy,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: { exclude: ['fsevents'] },
});
