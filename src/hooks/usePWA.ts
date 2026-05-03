/**
 * PWA Service Worker Hook
 * Uses vite-plugin-pwa with autoUpdate — SW activates immediately on new deploy
 */

import { useEffect, useState, useCallback } from "react";
import { registerSW } from "virtual:pwa-register";

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function usePWA(): PWAUpdateState {
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    registerSW({
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegistered(registration) {
        if (import.meta.env.DEV) {
          console.log("[PWA] Service Worker registered:", registration);
        }
        // Periodically check for SW updates (every 60s)
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error("[PWA] Service Worker registration error:", error);
      },
    });
  }, []);

  return {
    needRefresh: false, // autoUpdate handles this automatically
    offlineReady,
    updateServiceWorker: useCallback(async () => {
      window.location.reload();
    }, []),
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
