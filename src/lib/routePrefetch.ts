/**
 * Route Prefetch Utility
 * 
 * Intelligently prefetches critical route bundles after boot completion.
 * Focuses on Live Match as the most-used mobile feature.
 * 
 * @see .memory/architecture/pwa-configuration-standard-v2
 */

// Track what has been prefetched to avoid duplicate requests
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a lazy module by invoking its import
 */
async function prefetchModule(importFn: () => Promise<unknown>, routeName: string): Promise<void> {
  if (prefetchedRoutes.has(routeName)) return;
  
  try {
    prefetchedRoutes.add(routeName);
    await importFn();
    if (import.meta.env.DEV) {
      console.log(`[PREFETCH] ✓ ${routeName} loaded`);
    }
  } catch (error) {
    // Remove from set so it can be retried
    prefetchedRoutes.delete(routeName);
    if (import.meta.env.DEV) {
      console.warn(`[PREFETCH] ✗ ${routeName} failed:`, error);
    }
  }
}

/**
 * Prefetch Live Match bundle (priority #1 for mobile scouts)
 * Call this after boot_complete for optimal UX
 */
export function prefetchLiveMatch(): void {
  // Use requestIdleCallback for non-blocking prefetch
  const prefetch = () => {
    // Live Match core pages
    prefetchModule(() => import("@/pages/app/LiveMatchGame"), "LiveMatchGame");
    prefetchModule(() => import("@/pages/app/LiveMatchNew"), "LiveMatchNew");
    prefetchModule(() => import("@/pages/app/LiveMatchHistory"), "LiveMatchHistory");
  };
  
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    // Fallback for Safari
    setTimeout(prefetch, 100);
  }
}

/**
 * Prefetch secondary routes (lower priority)
 * Call this after Live Match prefetch completes
 */
export function prefetchSecondaryRoutes(): void {
  const prefetch = () => {
    prefetchModule(() => import("@/pages/app/AppPlayers"), "AppPlayers");
    prefetchModule(() => import("@/pages/app/ComparePlayers"), "ComparePlayers");
    prefetchModule(() => import("@/pages/app/ScoutingReports"), "ScoutingReports");
  };
  
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 5000 });
  } else {
    setTimeout(prefetch, 2000);
  }
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(routeName: string): boolean {
  return prefetchedRoutes.has(routeName);
}

/**
 * Get list of prefetched routes (for debug)
 */
export function getPrefetchedRoutes(): string[] {
  return Array.from(prefetchedRoutes);
}
