/**
 * AppShell - Always-visible loading shell
 * 
 * CRITICAL: This component MUST always render something visible.
 * It prevents black/blank screens during:
 * - Initial app bootstrap
 * - Auth/session recovery
 * - Chunk loading
 * 
 * @see .memory/architecture/app-shell-loading
 */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import logoM3 from "@/assets/logo-m3.png";

interface AppShellProps {
  children: React.ReactNode;
  /** Current loading reason for diagnostics */
  loadingReason?: "boot" | "auth_recovery" | "chunk_loading" | null;
  /** Whether to show loading state */
  isLoading?: boolean;
}

export function AppShell({ 
  children, 
  loadingReason = null,
  isLoading = false 
}: AppShellProps) {
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // Show slow loading warning after 4 seconds
  useEffect(() => {
    if (!isLoading) {
      setShowSlowWarning(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Log loading state for diagnostics
  useEffect(() => {
    if (isLoading && loadingReason) {
      console.log("[AppShell] Loading:", loadingReason);
    }
  }, [isLoading, loadingReason]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        {/* Logo */}
        <div className="mb-8 animate-pulse">
          <img 
            src={logoM3} 
            alt="M3 Scout" 
            className="h-16 w-auto opacity-80"
          />
        </div>

        {/* Loading spinner */}
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">
            {loadingReason === "auth_recovery" 
              ? "Sincronizando sessão..." 
              : "Carregando..."}
          </p>
        </div>

        {/* Slow loading warning */}
        {showSlowWarning && (
          <div className="mt-8 text-center text-xs text-muted-foreground/70 max-w-xs">
            <p>O carregamento está demorando mais que o esperado.</p>
            <p className="mt-1">
              Se persistir, tente{" "}
              <button 
                onClick={() => window.location.reload()}
                className="underline hover:text-primary transition-colors"
              >
                atualizar a página
              </button>
              .
            </p>
          </div>
        )}

        {/* Dev diagnostics */}
        {import.meta.env.DEV && loadingReason && (
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50 font-mono">
            reason: {loadingReason}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
