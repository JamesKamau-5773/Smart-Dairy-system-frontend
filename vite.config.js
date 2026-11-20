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
      // The brand files the app shows, precached so the logo and icons work offline. Only these:
      // public/brand/ also holds large PNG exports (PDFs, print, social) the app never loads.
      includeAssets: [
        'brand/logo-horizontal.svg',
        'brand/logo-horizontal-white.svg',
        'brand/logo-stacked-endorsed.svg',
        'brand/mascot.png',
        'brand/favicon*',
        'brand/apple-touch-icon.png',
      ],
      manifest: {
        name: 'Maziwa Smart',
        short_name: 'Maziwa Smart',
        description: 'Dairy farm management for Kenyan farmers: milk records, breeding, feed, buyers and finances, with offline support.',
        theme_color: '#0A5F96',
        background_color: '#F7F6F3',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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