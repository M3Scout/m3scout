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
        // Don't precache index.html - it must always be fetched fresh
        globPatterns: ["**/*.{css,ico,png,svg,woff,woff2}"],
        // Skip precaching of JS files - they'll be cached at runtime
        globIgnores: ["**/index-*.js", "**/index.html"],
        runtimeCaching: [
          // CRITICAL: Auth/RBAC endpoints must NEVER be cached
          // NetworkOnly strategy for Supabase auth and RPC calls
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
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
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
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // CRITICAL: Network-first for ALL navigation requests (index.html)
            // This ensures we always get the latest index.html from the server
            // Only falls back to cache if offline (after 3s timeout)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour max (short TTL for HTML)
              },
              networkTimeoutSeconds: 3,
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
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (hashed = immutable)
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
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (hashed = immutable)
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
        // Don't cache Supabase API requests (fallback denylist)
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
