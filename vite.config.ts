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
      registerType: "prompt",
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
          // CRITICAL: Auth/RBAC endpoints must NEVER be cached
          {
            urlPattern: /supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/rest\/v1\/rpc\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/rest\/v1\/user_roles.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /supabase\.co\/rest\/v1\/user_permissions.*/i,
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
          {
            // CacheFirst for JS assets with hash - immutable
            urlPattern: /\/assets\/.*\.js$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "js-assets-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            // CacheFirst for CSS assets with hash - immutable
            urlPattern: /\/assets\/.*\.css$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "css-assets-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
