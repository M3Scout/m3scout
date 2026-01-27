/**
 * PWA/Service Worker functionality DISABLED
 * Was causing critical performance issues (46s+ load times)
 * Will be reintroduced from scratch after site is stable
 */

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
}

// Completely disabled - returns no-op values
export function usePWA(): PWAUpdateState {
  return {
    needRefresh: false,
    offlineReady: false,
    updateServiceWorker: async () => {},
  };
}

// Simple connectivity check without SW dependency
export async function checkRealConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`/favicon2.png?_=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
