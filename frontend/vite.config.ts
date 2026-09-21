/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from 'node:path';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

const frontendPort = Number(process.env.VITE_FRONTEND_PORT ?? 3000);
const backendProxyTarget = process.env.VITE_BACKEND_PROXY_TARGET ?? 'http://127.0.0.1:4000';

const backendProxy = {
  '/api': {
    target: backendProxyTarget,
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
    port: frontendPort,
    allowedHosts: [],
    proxy: backendProxy,
  },
  preview: {
    port: frontendPort,
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
