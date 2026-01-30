# Memory: architecture/pwa-configuration-v2
Updated: 2026-01-30

## PWA Configuration

PWA is now **fully enabled** using `vite-plugin-pwa` with the following setup:

### Files
- `/public/manifest.webmanifest` - Manual manifest with M3 Scout branding
- `/public/icons/` - PWA icons (192x192, 512x512, maskable variants)
- `vite.config.ts` - VitePWA plugin with Workbox configuration
- `src/hooks/usePWA.ts` - Hook for SW registration and update prompts
- `src/components/pwa/PWAUpdateToast.tsx` - Toast notifications for updates/offline ready

### Workbox Strategy
- **CacheFirst**: Google Fonts, images (long-lived assets)
- **NetworkFirst**: Navigation requests, HTML pages (for offline of visited pages)
- **Excluded from cache**: Supabase API endpoints (`/rest/`, `/auth/`, `/storage/`, `/functions/`)

### Theme
- `theme_color`: #0b0b0b
- `background_color`: #0b0b0b
- `display`: standalone

### Update Flow
- `registerType: "prompt"` - Users see a toast when a new version is available
- Toast shows "Nova versão disponível" with "Atualizar" button
- Offline-ready toast shows when app is cached for first time
