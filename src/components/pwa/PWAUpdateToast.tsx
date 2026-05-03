/**
 * PWA Update Toast Component
 * With autoUpdate, new SW activates automatically — all updates are silent.
 * No toasts for offline-ready or updates.
 */

import type { ReactNode } from "react";
import { usePWA } from "@/hooks/usePWA";

export function PWAUpdateToast() {
  // Register SW silently — no toasts
  usePWA();
  return null;
}

// Simple hook for online status
export function useOnlineStatus() {
  return { isOnline: typeof navigator !== "undefined" ? navigator.onLine : true };
}

// Provider that wraps children
export function PWAProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <PWAUpdateToast />
      {children}
    </>
  );
}
