/**
 * PWA functionality DISABLED
 * Was causing critical performance issues
 * Will be reintroduced from scratch after site is stable
 */

// Disabled - no-op component
export function PWAUpdateToast() {
  return null;
}

// Disabled - no-op hook  
export function useOnlineStatus() {
  // No-op - online/offline detection disabled temporarily
}

// Minimal provider that just renders children
export function PWAProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
