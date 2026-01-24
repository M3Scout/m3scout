import { AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type PermissionsWarningBannerProps = {
  errorType: "timeout" | "abort" | "network" | "exception" | string;
  retrying?: boolean;
  onRetry: () => void;
  onLogout: () => void;
};

export function PermissionsWarningBanner({
  errorType,
  retrying,
  onRetry,
  onLogout,
}: PermissionsWarningBannerProps) {
  const message =
    errorType === "timeout"
      ? "A requisição demorou demais. Algumas permissões podem não ter sido carregadas."
      : errorType === "abort"
        ? "A requisição foi interrompida (provavelmente por reload)."
        : errorType === "network"
          ? "Erro de rede ao carregar permissões."
          : "Erro inesperado ao carregar permissões.";

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Permissões com instabilidade</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            {retrying ? "Tentando..." : "Tentar novamente"}
          </Button>
          <Button variant="destructive" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
