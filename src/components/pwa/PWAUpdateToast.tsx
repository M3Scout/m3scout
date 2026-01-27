import { useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, WifiOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdateToast() {
  const { needRefresh, offlineReady, updateServiceWorker } = usePWA();

  // Show toast when update is available
  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Atualização Disponível",
        description: (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Uma nova versão do app está disponível.
            </p>
            <Button
              size="sm"
              onClick={() => updateServiceWorker()}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Agora
            </Button>
          </div>
        ),
        duration: 0, // Don't auto-dismiss
      });
    }
  }, [needRefresh, updateServiceWorker]);

  // Show toast when app is ready for offline
  useEffect(() => {
    if (offlineReady) {
      toast({
        title: "Pronto para Offline",
        description: "O app foi instalado e pode funcionar sem internet.",
        duration: 4000,
      });
    }
  }, [offlineReady]);

  return null;
}

// Hook to detect online/offline status
export function useOnlineStatus() {
  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "Sem Conexão",
        description: "Você está offline. Algumas funcionalidades podem estar limitadas.",
        duration: 5000,
      });
    };

    const handleOnline = () => {
      toast({
        title: "Conexão Restaurada",
        description: "Você está online novamente.",
        duration: 3000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}

// Component that handles all PWA-related toasts
export function PWAProvider({ children }: { children: React.ReactNode }) {
  useOnlineStatus();
  
  return (
    <>
      <PWAUpdateToast />
      {children}
    </>
  );
}
