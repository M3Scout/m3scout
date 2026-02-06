/**
 * Background Sync for Live Match Event Queue
 * 
 * Registers Background Sync when supported (Chrome, Edge, Opera, Android WebView).
 * Falls back to online event listener on unsupported browsers (Safari, iOS, Firefox).
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
 */

import { logLiveMatchEvent } from "@/lib/liveMatchTelemetry";

// ============ CONSTANTS ============

/** Sync tag used to identify our sync registration */
export const SYNC_TAG = "m3-live-match-sync";

// ============ FEATURE DETECTION ============

/**
 * Check if Background Sync API is available
 */
export function isBackgroundSyncSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("SyncManager" in window)) return false;
  return true;
}

/**
 * Get sync support status for UI display
 */
export function getSyncSupportInfo(): {
  supported: boolean;
  method: "background-sync" | "online-event" | "manual";
  label: string;
} {
  if (isBackgroundSyncSupported()) {
    return {
      supported: true,
      method: "background-sync",
      label: "Sincroniza automaticamente em background",
    };
  }
  
  if (typeof window !== "undefined" && "onLine" in navigator) {
    return {
      supported: true,
      method: "online-event",
      label: "Sincroniza ao voltar online",
    };
  }
  
  return {
    supported: false,
    method: "manual",
    label: "Sincronização manual",
  };
}

// ============ SYNC REGISTRATION ============

/**
 * Register a Background Sync to flush the event queue.
 * Call this after enqueuing events when the device might be offline.
 * 
 * @returns true if sync was registered, false if not supported
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (!isBackgroundSyncSupported()) {
    if (import.meta.env.DEV) {
      console.log("[BackgroundSync] Not supported, using fallback");
    }
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if sync is available on the registration
    if (!("sync" in registration)) {
      return false;
    }
    
    // Register the sync event
    await (registration as any).sync.register(SYNC_TAG);
    
    logLiveMatchEvent("sync_status_change", {
      action: "bg_sync_registered",
      tag: SYNC_TAG,
    });
    
    if (import.meta.env.DEV) {
      console.log("[BackgroundSync] Registered sync:", SYNC_TAG);
    }
    
    return true;
  } catch (error) {
    console.warn("[BackgroundSync] Failed to register sync:", error);
    return false;
  }
}

/**
 * Check if there are pending syncs registered
 */
export async function getPendingSyncs(): Promise<string[]> {
  if (!isBackgroundSyncSupported()) return [];
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!("sync" in registration)) {
      return [];
    }
    
    const tags = await (registration as any).sync.getTags();
    return tags as string[];
  } catch {
    return [];
  }
}

// ============ SERVICE WORKER COMMUNICATION ============

/**
 * Send a message to the Service Worker to trigger queue flush.
 * Used as fallback when Background Sync is not available.
 */
export async function requestSWFlush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.active) {
      return false;
    }
    
    // Post message to SW to flush queue
    registration.active.postMessage({
      type: "FLUSH_LIVE_MATCH_QUEUE",
    });
    
    if (import.meta.env.DEV) {
      console.log("[BackgroundSync] Requested SW flush via postMessage");
    }
    
    return true;
  } catch (error) {
    console.warn("[BackgroundSync] Failed to request SW flush:", error);
    return false;
  }
}

// ============ ONLINE EVENT FALLBACK ============

let onlineHandlerRegistered = false;

/**
 * Register online event handler as fallback for browsers without Background Sync.
 * This ensures the queue is flushed when the device comes back online.
 */
export function registerOnlineFallback(flushCallback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  // Only register once globally
  if (onlineHandlerRegistered) {
    return () => {};
  }
  
  const handleOnline = () => {
    logLiveMatchEvent("sync_status_change", {
      action: "online_event_triggered",
    });
    
    if (import.meta.env.DEV) {
      console.log("[BackgroundSync] Online event - triggering flush");
    }
    
    // Small delay to allow network to stabilize
    setTimeout(flushCallback, 500);
  };
  
  window.addEventListener("online", handleOnline);
  onlineHandlerRegistered = true;
  
  return () => {
    window.removeEventListener("online", handleOnline);
    onlineHandlerRegistered = false;
  };
}

// ============ HYBRID SYNC STRATEGY ============

/**
 * Request sync using the best available method:
 * 1. Background Sync (if supported) - works even when tab is closed
 * 2. Online event fallback - works when tab is open
 * 
 * @param immediateFlush - Callback to flush immediately if online
 */
export async function requestSync(immediateFlush: () => void): Promise<void> {
  const isOnline = navigator.onLine;
  
  // If online, just flush immediately
  if (isOnline) {
    immediateFlush();
    return;
  }
  
  // Try Background Sync first
  const bgSyncRegistered = await registerBackgroundSync();
  
  if (!bgSyncRegistered) {
    // Fallback: Register online event handler
    // The hook should handle this via its own online listener
    if (import.meta.env.DEV) {
      console.log("[BackgroundSync] Using online event fallback");
    }
  }
}

// ============ TYPE DECLARATIONS ============

// Extend ServiceWorkerRegistration for TypeScript
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
      getTags(): Promise<string[]>;
    };
  }
  
  interface WindowEventMap {
    online: Event;
    offline: Event;
  }
}
