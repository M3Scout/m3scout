/**
 * PWA Update Toast Component
 * Shows a toast when a new version is available
 */

import type { ReactNode } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePWA } from "@/hooks/usePWA";
import { RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdateToast() {
  const { needRefresh, offlineReady, updateServiceWorker } = usePWA();

  useEffect(() => {
    if (offlineReady) {
      toast.success("App pronto para uso offline!", {
        description: "O M3 Scout agora funciona mesmo sem conexão.",
        icon: <Wifi className="h-4 w-4" />,
        duration: 4000,
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast("Nova versão disponível", {
        description: "Clique para atualizar o app.",
        icon: <RefreshCw className="h-4 w-4" />,
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => {
            updateServiceWorker();
          },
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

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
