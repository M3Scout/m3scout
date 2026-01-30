/**
 * PWA Service Worker Hook
 * Uses vite-plugin-pwa for proper SW registration
 */

import { useEffect, useState, useCallback } from "react";
import { registerSW } from "virtual:pwa-register";

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function usePWA(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSWFn = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegistered(registration) {
        if (import.meta.env.DEV) {
          console.log("[PWA] Service Worker registered:", registration);
        }
      },
      onRegisterError(error) {
        console.error("[PWA] Service Worker registration error:", error);
      },
    });

    setUpdateSW(() => updateSWFn);
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (updateSW) {
      await updateSW();
    }
  }, [updateSW]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
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
