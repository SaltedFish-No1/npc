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
      '/ark-api': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        secure: true,
        rewrite: (incomingPath) => incomingPath.replace(/^\/ark-api/, '/api/v3')
      }
    }
  }
});
