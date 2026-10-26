import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Keeps a copy of the built app on the phone (service worker), so it opens with no signal.
    // Only in `npm run build`; `npm run dev` has no service worker.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'VisitCoach',
        short_name: 'VisitCoach',
        description: 'Turns a CRP school visit into one coaching step for the teacher',
        theme_color: '#047857',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Any app page opens from the saved copy; API calls always go to the network.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // In dev, forward /api calls to the FastAPI backend on port 8000.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
