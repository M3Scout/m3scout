import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon2.png",
        "logo-m3.png",
        "logoapp-512.png",
        "icons/*.png",
      ],
      manifest: false, // Use manual manifest.webmanifest
      workbox: {
        // Use skipWaiting + clientsClaim for immediate SW activation
        skipWaiting: true,
        clientsClaim: true,
        // CRITICAL: Clean up old caches to prevent stale asset references
        cleanupOutdatedCaches: true,
        // Only precache static assets - NOT index.html or JS bundles
        globPatterns: ["**/*.{css,ico,png,svg,woff,woff2}"],
        // Explicitly exclude index.html and JS from precache
        globIgnores: ["**/index-*.js", "**/index.html", "**/*.html"],
        // CRITICAL: Disable navigateFallback to prevent "non-precached-url" errors
        // Navigation will be handled by runtimeCaching instead
        navigateFallback: null,
        // Import the sync handler for Background Sync
        importScripts: ["/sw-sync-handler.js"],
        runtimeCaching: [
          // CRITICAL: ALL Supabase API calls must NEVER be cached or intercepted.
          // A single broad pattern prevents slow responses from being misreported as offline.
          {
            urlPattern: /supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/rest\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/functions\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/realtime\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // CRITICAL: Handle ALL navigation requests with NetworkFirst
            // This replaces navigateFallback and prevents "non-precached-url" errors
            // Falls back to cache only if offline (after 3s timeout)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase Storage images - Stale-While-Revalidate for fast load + freshness
            urlPattern: /supabase\.co\/storage\/v1\/render\/image\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "m3-images-v1",
              expiration: {
                maxEntries: 300, // LRU: keep last 300 images
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Supabase Storage direct objects - Stale-While-Revalidate
            urlPattern: /supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "m3-images-v1",
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 7,
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Local static images - CacheFirst (immutable after build)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "m3-assets-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (immutable)
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // JS/CSS assets have content hashes in filenames — new deploys produce new URLs
          // No SW caching needed; CDN Cache-Control headers handle these
        ],
        // Denylist for navigation fallback (extra safety)
        navigateFallbackDenylist: [
          /^\/rest\//,
          /^\/auth\//,
          /^\/storage\//,
          /^\/functions\//,
          /supabase\.co/,
          /\/rpc\//,
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid issues
      },
    }),
  ].filter(Boolean),
  build: {
    // Target modern browsers for smaller output
    target: "es2020",
    // Split chunks for better caching and smaller initial load
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: isolate heavy libs so they cache independently
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-motion": ["framer-motion"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-recharts": ["recharts"],
        },
      },
    },
    // Increase warning threshold (we have code-splitting already)
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
