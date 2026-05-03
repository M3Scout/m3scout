/**
 * PWA Update Toast Component
 * With autoUpdate, new SW activates automatically — only show offline-ready toast
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePWA } from "@/hooks/usePWA";
import { Wifi } from "lucide-react";

export function PWAUpdateToast() {
  const { offlineReady } = usePWA();

  useEffect(() => {
    if (offlineReady) {
      toast.success("App pronto para uso offline!", {
        description: "O M3 Scout agora funciona mesmo sem conexão.",
        icon: <Wifi className="h-4 w-4" />,
        duration: 4000,
      });
    }
  }, [offlineReady]);

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
