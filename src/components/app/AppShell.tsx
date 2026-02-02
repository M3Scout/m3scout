/**
 * AppShell - Always-visible loading shell
 * 
 * CRITICAL: This component MUST always render something visible.
 * It prevents black/blank screens during:
 * - Initial app bootstrap
 * - Auth/session recovery
 * - Chunk loading
 * 
 * States:
 * 1. Normal loading (spinner + message)
 * 2. Slow loading (4s+): Shows warning text
 * 3. Timeout (8s+): Shows action buttons (Reload / Logout)
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAppState } from "@/lib/diagnosticLogger";
import { manualReloadWithCacheClear, setOnRecoveryBlocked, hasChunkRecoveryRan } from "@/lib/chunkErrorRecovery";
import logoM3 from "@/assets/logo-m3.png";

interface AppShellProps {
  children: React.ReactNode;
  /** Current loading reason for diagnostics */
  loadingReason?: "boot" | "auth_recovery" | "chunk_loading" | null;
  /** Whether to show loading state */
  isLoading?: boolean;
  /** Whether auth watchdog has timed out */
  hasAuthTimeout?: boolean;
  /** Callback to trigger logout */
  onLogout?: () => void;
}

const SLOW_WARNING_MS = 4000;
const TIMEOUT_MS = 8000;

export function AppShell({ 
  children, 
  loadingReason = null,
  isLoading = false,
  hasAuthTimeout = false,
  onLogout
}: AppShellProps) {
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [chunkErrorBlocked, setChunkErrorBlocked] = useState<string | null>(null);
  const [loadingStartTime] = useState(() => Date.now());

  // Register chunk recovery blocked callback
  useEffect(() => {
    setOnRecoveryBlocked((reason) => {
      setChunkErrorBlocked(reason);
    });
    
    // Check if we're in a blocked state from page load
    if (hasChunkRecoveryRan() && isLoading) {
      // We just recovered but still loading = might be stuck
      const checkTimer = setTimeout(() => {
        if (isLoading) {
          setChunkErrorBlocked("post-recovery-still-loading");
        }
      }, 3000);
      return () => clearTimeout(checkTimer);
    }
  }, [isLoading]);

  // Progressive timeout states
  useEffect(() => {
    if (!isLoading) {
      setShowSlowWarning(false);
      setShowTimeout(false);
      return;
    }

    logAppState("boot_loading", { reason: loadingReason || "unknown" });

    // Show slow warning after 4 seconds
    const slowTimer = setTimeout(() => {
      setShowSlowWarning(true);
    }, SLOW_WARNING_MS);

    // Show timeout UI after 8 seconds
    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
      logAppState("appshell_timeout_reached", { 
        reason: loadingReason || "unknown",
        duration: Date.now() - loadingStartTime 
      });
    }, TIMEOUT_MS);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
    };
  }, [isLoading, loadingReason, loadingStartTime]);

  // Handle auth timeout prop
  useEffect(() => {
    if (hasAuthTimeout) {
      setShowTimeout(true);
    }
  }, [hasAuthTimeout]);

  const handleReload = useCallback(async () => {
    logAppState("boot_loading", { reason: "manual_reload" });
    await manualReloadWithCacheClear();
  }, []);

  const handleLogout = useCallback(() => {
    logAppState("signout_due_to_auth_fail", { reason: "user_initiated_from_timeout" });
    onLogout?.();
  }, [onLogout]);

  // Chunk error blocked state (recovery already ran, show error UI)
  if (chunkErrorBlocked) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center bg-background p-4"
      >
        <div className="mb-6">
          <img 
            src={logoM3} 
            alt="M3 Scout" 
            className="h-12 w-auto opacity-60"
          />
        </div>

        <div className="flex items-center gap-2 mb-4 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Erro ao carregar a aplicação</span>
        </div>

        <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
          Houve um problema ao carregar os recursos da página. 
          Isso pode acontecer quando há uma atualização disponível.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleReload} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recarregar página
          </Button>
          {onLogout && (
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair e entrar novamente
            </Button>
          )}
        </div>

        {import.meta.env.DEV && (
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50 font-mono max-w-xs truncate">
            chunk_error: {chunkErrorBlocked}
          </div>
        )}
      </div>
    );
  }

  if (isLoading || hasAuthTimeout) {
    // Timeout state - show action buttons
    if (showTimeout || hasAuthTimeout) {
      return (
        <div 
          className="min-h-screen flex flex-col items-center justify-center bg-background p-4"
        >
          <div className="mb-6">
            <img 
              src={logoM3} 
              alt="M3 Scout" 
              className="h-12 w-auto opacity-60"
            />
          </div>

          <div className="flex flex-col items-center gap-4 mb-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            <p className="text-muted-foreground text-sm text-center">
              Estamos recuperando sua sessão...
            </p>
          </div>

          <p className="text-muted-foreground/70 text-xs text-center max-w-xs mb-6">
            O carregamento está demorando mais que o esperado. 
            Você pode tentar recarregar ou fazer login novamente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleReload} variant="default" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </Button>
            {onLogout && (
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sair e entrar novamente
              </Button>
            )}
          </div>

          {import.meta.env.DEV && loadingReason && (
            <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50 font-mono">
              reason: {loadingReason} | timeout: true
            </div>
          )}
        </div>
      );
    }

    // Normal/slow loading state
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center bg-background"
      >
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
        {showSlowWarning && !showTimeout && (
          <div className="mt-8 text-center text-xs text-muted-foreground/70 max-w-xs">
            <p>O carregamento está demorando mais que o esperado.</p>
            <p className="mt-1">Aguarde mais um momento...</p>
          </div>
        )}

        {/* Dev diagnostics */}
        {import.meta.env.DEV && loadingReason && (
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground/50 font-mono">
            reason: {loadingReason} | slow: {showSlowWarning ? "true" : "false"}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
