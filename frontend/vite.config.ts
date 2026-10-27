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
      port: 5173, // ✅ Changé de 3000 à 5173 pour éviter les conflits de cache Android
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // ✅ Séparation intelligente des bibliothèques lourdes
        manualChunks(id) {
  if (id.includes('node_modules')) {
    // ✅ Tout ce qui dépend de React (React, Router, Recharts, Lucide, etc.)
    if (
      id.includes('react') || 
      id.includes('recharts') || 
      id.includes('lucide-react') || 
      id.includes('chart.js')
    ) {
      return 'vendor-react';
    }
    // ✅ Bibliothèques indépendantes de React
    if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) {
      return 'vendor-pdf';
    }
    if (id.includes('socket.io')) {
      return 'vendor-socket';
    }
    if (id.includes('i18next') || id.includes('react-i18next')) {
      return 'vendor-i18n';
    }
    if (id.includes('sentry')) {
      return 'vendor-sentry';
    }
    return 'vendor-core';
  }
},
        },
      },
    },
  };
});
