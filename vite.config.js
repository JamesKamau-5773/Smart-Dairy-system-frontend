import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { landingPage } from './src/landing/landingPlugin.js'
import { spaFallback } from './src/landing/spaFallback.js'

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        landing: path.resolve(import.meta.dirname, 'index.html'),
        app: path.resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
  plugins: [
    spaFallback(),
    landingPage(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Maziwa Smart',
        short_name: 'Maziwa Smart',
        description: 'Dairy farm management for Kenyan farmers: milk records, breeding, feed, buyers and finances, with offline support.',
        theme_color: '#0A5F96',
        background_color: '#f9f8f6',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // The defaults plus the self-hosted Inter, so text keeps its font offline.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: '/app.html',
        // "/" is the static landing page, and robots.txt / sitemap.xml must reach the network.
        navigateFallbackDenylist: [/^\/$/, /^\/index\.html$/, /^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})