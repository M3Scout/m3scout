/**
 * Chunk Error Recovery Service
 * 
 * Detects chunk load errors (cache/build mismatch) and performs auto-recovery:
 * 1. Clears CacheStorage (service worker caches)
 * 2. Unregisters service workers
 * 3. Forces hard reload (once, to avoid loop)
 * 
 * @see .memory/architecture/chunk-error-recovery
 */

const FORCE_RELOAD_KEY = "m3_force_reload_once";
const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
  /Failed to load module script/i,
];

// Track if we're already recovering to prevent multiple triggers
let isRecovering = false;

/**
 * Check if an error message indicates a chunk/module load failure
 */
export function isChunkLoadError(message: string): boolean {
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Check if a network request is a failed JS/CSS asset request
 */
export function isAssetLoadError(url: string, status: number): boolean {
  if (status !== 404 && status !== 0) return false;
  const isAsset = /\.(js|css|mjs)(\?.*)?$/i.test(url);
  const isOurAsset = url.includes(window.location.origin) || url.startsWith("/");
  return isAsset && isOurAsset;
}

/**
 * Perform full cache cleanup and reload
 */
export async function performChunkRecovery(reason: string): Promise<void> {
  if (isRecovering) {
    console.log("[ChunkRecovery] Already recovering, skipping");
    return;
  }

  // Check if we already did a force reload to prevent infinite loop
  const alreadyReloaded = sessionStorage.getItem(FORCE_RELOAD_KEY);
  if (alreadyReloaded) {
    console.warn("[ChunkRecovery] Already reloaded once this session, not looping");
    sessionStorage.removeItem(FORCE_RELOAD_KEY);
    return;
  }

  isRecovering = true;
  console.log("[ChunkRecovery] Starting recovery:", reason);

  try {
    // 1. Clear all CacheStorage caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      console.log("[ChunkRecovery] Clearing caches:", cacheNames);
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 2. Unregister all service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log("[ChunkRecovery] Unregistering service workers:", registrations.length);
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    // 3. Clear any stale auth/RBAC caches that might reference old data
    try {
      localStorage.removeItem("m3_rbac_v1");
      localStorage.removeItem("m3_rbac_v2");
      localStorage.removeItem("m3_rbac_v3");
    } catch {
      // Ignore storage errors
    }

    // 4. Set flag to prevent reload loop
    sessionStorage.setItem(FORCE_RELOAD_KEY, "1");

    // 5. Hard reload (bypass cache)
    console.log("[ChunkRecovery] Performing hard reload...");
    window.location.reload();
  } catch (err) {
    console.error("[ChunkRecovery] Error during recovery:", err);
    isRecovering = false;
    
    // Try simple reload as fallback
    sessionStorage.setItem(FORCE_RELOAD_KEY, "1");
    window.location.reload();
  }
}

/**
 * Initialize global error handlers to catch chunk load errors
 * Call this once at app startup (main.tsx)
 */
export function initChunkErrorRecovery(): void {
  // Handle synchronous errors
  window.addEventListener("error", (event) => {
    const message = event.message || event.error?.message || "";
    
    if (isChunkLoadError(message)) {
      console.error("[ChunkRecovery] Caught chunk error:", message);
      event.preventDefault();
      performChunkRecovery(`error: ${message}`);
      return;
    }

    // Check for script load errors (no message, but has target)
    if (event.target instanceof HTMLScriptElement) {
      const src = event.target.src || "";
      if (src && isAssetLoadError(src, 0)) {
        console.error("[ChunkRecovery] Script failed to load:", src);
        event.preventDefault();
        performChunkRecovery(`script-404: ${src}`);
      }
    }
  }, true); // Capture phase to catch before other handlers

  // Handle promise rejections (dynamic imports)
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message || String(event.reason) || "";
    
    if (isChunkLoadError(message)) {
      console.error("[ChunkRecovery] Caught unhandled chunk error:", message);
      event.preventDefault();
      performChunkRecovery(`rejection: ${message}`);
    }
  });

  // Clear the reload flag on successful boot (after a delay to ensure app loaded)
  setTimeout(() => {
    sessionStorage.removeItem(FORCE_RELOAD_KEY);
  }, 5000);

  console.log("[ChunkRecovery] Error handlers initialized");
}

/**
 * Check if we're in a post-recovery state (just reloaded)
 */
export function isPostRecoveryState(): boolean {
  return sessionStorage.getItem(FORCE_RELOAD_KEY) === "1";
}
