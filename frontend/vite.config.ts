import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'https://ebeno-backend.onrender.com';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/.git/**', '**/build/**'],
      },
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true, secure: true },
        '/socket.io': { target: backendUrl, changeOrigin: true, secure: true, ws: true },
      },
    },
    build: {
      outDir: 'build',
      sourcemap: true,
      target: 'es2020',
      // ✅ Le bloc "rollupOptions" est complètement supprimé !
    },
  };
});
