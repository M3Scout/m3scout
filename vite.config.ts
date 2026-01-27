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
        // OPTIMIZED: Only precache essential files (not images)
        globPatterns: ["**/*.{js,css,html,ico,woff,woff2}"],
        
        // Increase max file size for large bundles
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        
        // Runtime caching strategies
        runtimeCaching: [
          // ============ NETWORK ONLY FOR ALL APIS ============
          // CRITICAL: These MUST NOT be cached by Service Worker
          // This ensures the app (not workbox) initiates API requests
          
          // Supabase REST API - NETWORK ONLY (never cache)
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/rest\/.*/i,
            handler: "NetworkOnly",
          },
          // Supabase Edge Functions - NETWORK ONLY (never cache)
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/functions\/.*/i,
            handler: "NetworkOnly",
          },
          // Supabase Auth - NETWORK ONLY (never cache)
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/auth\/.*/i,
            handler: "NetworkOnly",
          },
          // Supabase Realtime - NETWORK ONLY
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/realtime\/.*/i,
            handler: "NetworkOnly",
          },
          // Any other Supabase API endpoint - NETWORK ONLY
          {
            urlPattern: /^https:\/\/httxbfcvzknyncprzcuy\.supabase\.co\/.*$/i,
            handler: "NetworkOnly",
          },
          
          // ============ CACHEABLE STATIC ASSETS ============
          
          // Google Fonts: Cache First (static, rarely changes)
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
          // Supabase Storage bucket images: Stale While Revalidate
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
        ],
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,
        
        // Disable navigateFallback - we handle offline in app
        navigateFallback: null,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
