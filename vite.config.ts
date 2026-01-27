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
      registerType: "prompt", // Prompt user for updates
      includeAssets: ["favicon.png", "logoapp-512.png", "logo-m3.png"],
      manifest: {
        name: "M3 Scout",
        short_name: "M3",
        description: "Scouting e Gestão de Atletas de Futebol",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#000000",
        background_color: "#000000",
        icons: [
          {
            src: "/logoapp-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/logoapp-512.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Precache all static assets
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}"],
        
        // Increase max file size for large bundles (6MB)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        
        // Runtime caching strategies
        runtimeCaching: [
          // Static assets: Cache First (fonts, images)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Storage bucket images: Stale While Revalidate
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/storage\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Instagram CDN images: Stale While Revalidate
          {
            urlPattern: /^https:\/\/scontent.*\.cdninstagram\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "instagram-images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 3, // 3 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // API calls (REST): Network First with fallback - GET only
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Edge functions: Network First (no aggressive caching) - GET only
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/functions\/.*/i,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-functions-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Auth endpoints: Network Only (never cache)
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,
        
        // IMPORTANT: Disable automatic navigateFallback
        // This prevents false offline screens when online
        // We handle offline detection in the app itself
        navigateFallback: null,
      },
      devOptions: {
        enabled: false, // Disable in dev for stability
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
