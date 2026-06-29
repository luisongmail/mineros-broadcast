import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webPort = Number(process.env.PLAYFLOW_WEB_PORT ?? 5173);
const apiPort = Number(process.env.PLAYFLOW_API_PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: webPort,
    strictPort: true, // puerto fijo — si está ocupado falla explícitamente
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: webPort,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      '/assets': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${apiPort}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
