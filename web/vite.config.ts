import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/npc-api': {
        target: process.env.NPC_DEV_BACKEND || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (incomingPath) => incomingPath.replace(/^\/npc-api/, '')
      }
    }
  }
});
