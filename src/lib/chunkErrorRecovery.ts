/**
 * Chunk Error Recovery Service
 * 
 * Detects chunk load errors (cache/build mismatch) and performs auto-recovery:
 * 1. Clears CacheStorage (service worker caches)
 * 2. Unregisters service workers
 * 3. Forces hard reload (once per session, to avoid loop)
 * 
 * If recovery already ran this session, shows error UI instead of looping.
 */

import { logAppState } from "./diagnosticLogger";

const CHUNK_RECOVERY_RAN_KEY = "m3_chunk_recovery_ran";
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

// Callbacks for UI notification when recovery is blocked
let onRecoveryBlocked: ((reason: string) => void) | null = null;

/**
 * Register a callback to be notified when chunk recovery is blocked (already ran)
 */
export function setOnRecoveryBlocked(callback: (reason: string) => void): void {
  onRecoveryBlocked = callback;
}

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
 * Check if chunk recovery already ran this session
 */
export function hasChunkRecoveryRan(): boolean {
  return sessionStorage.getItem(CHUNK_RECOVERY_RAN_KEY) === "1";
}

/**
 * Perform full cache cleanup and reload (ONE TIME ONLY per session)
 */
export async function performChunkRecovery(reason: string): Promise<void> {
  if (isRecovering) {
    console.log("[ChunkRecovery] Already recovering, skipping");
    return;
  }

  logAppState("chunk_error_detected", { reason });

  // ONE-SHOT CHECK: If we already ran recovery this session, don't loop
  if (hasChunkRecoveryRan()) {
    logAppState("chunk_recovery_skipped_already_ran");
    console.warn("[ChunkRecovery] Already ran recovery this session - showing error UI instead");
    
    // Notify UI to show error state with manual reload button
    logAppState("chunk_recovery_blocked_show_ui", { reason });
    onRecoveryBlocked?.(reason);
    return;
  }

  isRecovering = true;
  logAppState("chunk_recovery_run", { reason });
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

    // 4. Set flag to prevent future auto-reload loops THIS SESSION
    sessionStorage.setItem(CHUNK_RECOVERY_RAN_KEY, "1");

    // 5. Hard reload (bypass cache)
    console.log("[ChunkRecovery] Performing hard reload...");
    window.location.reload();
  } catch (err) {
    console.error("[ChunkRecovery] Error during recovery:", err);
    isRecovering = false;
    
    // Set flag and try simple reload as fallback
    sessionStorage.setItem(CHUNK_RECOVERY_RAN_KEY, "1");
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

  // Clear the recovery flag after 10 seconds of successful operation
  // This allows recovery to work again if user manually refreshes later
  setTimeout(() => {
    sessionStorage.removeItem(CHUNK_RECOVERY_RAN_KEY);
    console.log("[ChunkRecovery] Recovery flag cleared (app loaded successfully)");
  }, 10000);

  console.log("[ChunkRecovery] Error handlers initialized");
}

/**
 * Check if we're in a post-recovery state (just reloaded after recovery)
 */
export function isPostRecoveryState(): boolean {
  return hasChunkRecoveryRan();
}

/**
 * Manual reload with cache clearing (for user-initiated retry)
 */
export async function manualReloadWithCacheClear(): Promise<void> {
  try {
    // Clear caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    
    // Unregister SW
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch {
    // Ignore errors, just reload
  }
  
  // Clear the recovery flag to allow auto-recovery next time
  sessionStorage.removeItem(CHUNK_RECOVERY_RAN_KEY);
  
  // Hard reload
  window.location.reload();
}
