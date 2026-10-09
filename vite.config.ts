/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const serverPort = process.env.PORT ?? '3001';
const target = `http://localhost:${serverPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': { target, ws: true },
      '/api': target,
      '/uploads': target,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
