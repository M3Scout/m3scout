/**
 * PWA functionality DISABLED
 * Was causing critical performance issues
 * Will be reintroduced from scratch after site is stable
 */

import type { ReactNode } from "react";

// Disabled - no-op component
export function PWAUpdateToast() {
  return null;
}

// Disabled - no-op hook  
export function useOnlineStatus() {
  // Keep a stable return shape for any future consumers.
  return { isOnline: true };
}

// Minimal provider that just renders children
export function PWAProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
