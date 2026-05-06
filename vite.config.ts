import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // removeConsole disabled - causes build errors when console.log is inside arrow functions
    VitePWA({
      registerType: 'autoUpdate',
      // ⚡ Apply update immediately when new SW is available
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon.svg', 'robots.txt'],
      manifest: {
        name: 'TexaCore ERP',
        short_name: 'TexaCore',
        description: 'نظام إدارة تجارة الأقمشة المتكامل - Complete Fabric Trading Management System',
        theme_color: '#047857',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // ⚡ Take control immediately without waiting for old SW to die
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Exclude HTML from precache — always fetch fresh from network
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // 🔐 Exclude OAuth callbacks & auth redirects from SW navigateFallback
        // Without this, SW intercepts /?code=... from Google OAuth causing ERR_FAILED
        navigateFallbackDenylist: [
          new RegExp('^\\/api'),
          new RegExp('[?&](code|access_token|refresh_token|token|error|error_description)='),
          new RegExp('[#](access_token|refresh_token|token_type|expires_in)='),
        ],
        runtimeCaching: [
          {
            // HTML navigation — Network First (always try server first)
            // 🔐 Exclude OAuth callback URLs — let browser handle natively
            urlPattern: ({ request, url }) => {
              if (request.mode !== 'navigate') return false;
              // Skip SW for auth callback URLs — prevents ERR_FAILED on OAuth redirect
              const search = url.search || '';
              const hash = url.hash || '';
              if (search.includes('code=') || search.includes('access_token=') || search.includes('error=')) return false;
              if (hash.includes('access_token=') || hash.includes('token_type=')) return false;
              return true;
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour max
              },
            },
          },
          {
            // Cache Supabase storage files (images, documents)
            urlPattern: new RegExp('^https://.*\\.supabase\\.co/storage/.*', 'i'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: new RegExp('^https://fonts\\.googleapis\\.com/.*', 'i'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache font files
            urlPattern: new RegExp('^https://fonts\\.gstatic\\.com/.*', 'i'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in development to avoid caching issues
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
  build: {
    // Optimize build
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-data': ['@supabase/supabase-js', '@tanstack/react-query'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
});
