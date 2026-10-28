import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import criticalCss from 'vite-plugin-critical-css';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'https://ebeno-backend.onrender.com';

  return {
    plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate', // Met à jour le SW automatiquement
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Fichiers à précacher
      },
      manifest: {
        name: 'Ebeno Research Platform',
        short_name: 'Ebeno',
        description: 'Plateforme de recherche collaborative augmentée par l\'IA',
        theme_color: '#4A6CF7',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          // ... tes icônes PWA existantes
        ]
      }
    })
  ],
    visualizer({ open: true, gzipSize: true, brotliSize: true }),
    criticalCss()
    ],
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
		  modulePreload: { polyfill: false }, 
    },
  };
});
