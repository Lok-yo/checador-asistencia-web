import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // El aviso de nueva versión lo muestra la interfaz (src/components/PwaNotices.tsx).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Checador de asistencia: supervisión',
        short_name: 'Checador',
        description: 'Consulta de entradas y salidas registradas en la app móvil del checador.',
        lang: 'es-MX',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EDF1F0',
        theme_color: '#14243A',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo se precachea la interfaz pública generada por Vite.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Toda petición a otro origen (Supabase Auth, REST, Storage y URLs
        // firmadas de fotos) pasa directo a la red y nunca se guarda en caché.
        runtimeCaching: [
          {
            urlPattern: ({ sameOrigin }) => !sameOrigin,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
});
