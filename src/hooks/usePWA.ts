import { useEffect, useState, useCallback } from "react";

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
}

export function usePWA(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateServiceWorker = useCallback(async () => {
    if (registration?.waiting) {
      // Tell waiting SW to skip waiting and activate
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      setNeedRefresh(false);
    }
  }, [registration]);

  useEffect(() => {
    // Only run in production
    if (import.meta.env.DEV) return;

    const registerSW = async () => {
      try {
        // Dynamic import to avoid issues in dev
        const { registerSW } = await import("virtual:pwa-register");
        
        registerSW({
          immediate: true,
          onRegisteredSW(swUrl, r) {
            if (r) {
              setRegistration(r);
              console.log("[PWA] Service worker registered:", swUrl);
              
              // Check for updates periodically (every hour)
              setInterval(() => {
                r.update();
              }, 60 * 60 * 1000);
            }
          },
          onOfflineReady() {
            console.log("[PWA] App ready to work offline");
            setOfflineReady(true);
          },
          onNeedRefresh() {
            console.log("[PWA] New content available, please refresh");
            setNeedRefresh(true);
          },
          onRegisterError(error) {
            console.error("[PWA] Service worker registration error:", error);
          },
        });
      } catch (error) {
        // PWA plugin not available (dev mode or build issue)
        console.log("[PWA] Service worker registration skipped");
      }
    };

    registerSW();
  }, []);

  // Listen for SW state changes
  useEffect(() => {
    if (!registration) return;

    const handleStateChange = () => {
      if (registration.waiting) {
        setNeedRefresh(true);
      }
    };

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", handleStateChange);
      }
    });

    // Listen for controller change (SW activated)
    navigator.serviceWorker?.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, [registration]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
}
