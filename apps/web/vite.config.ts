import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Bible Bawl — Copa Bíblica',
        short_name: 'Bible Bawl',
        description: 'Gestão da Copa Bíblica online e offline',
        theme_color: '#172b22',
        background_color: '#f6f1e7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https?:\/\/.*\/api\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'bible-bawl-api', networkTimeoutSeconds: 4 }
        }]
      },
      devOptions: { enabled: true }
    })
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' }
  }
})
