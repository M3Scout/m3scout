import { ReactNode, useEffect, useRef, useState } from "react";
import { usePermissions, ModuleKey, ActionKey } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Lock, RefreshCw, LogOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermissionGateProps {
  module: ModuleKey;
  action: ActionKey;
  children: ReactNode;
  fallback?: ReactNode;
  showLock?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions.
 * Use this to wrap UI elements that should only be visible/enabled for users with specific permissions.
 * 
 * @example
 * <PermissionGate module="players" action="delete">
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({ 
  module, 
  action, 
  children, 
  fallback = null,
  showLock = false 
}: PermissionGateProps) {
  const { can, canDelete } = usePermissions();
  
  const hasPermission = action === "delete" 
    ? canDelete(module) 
    : can(module, action);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showLock) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
        <Lock className="w-3.5 h-3.5" />
        <span>Bloqueado</span>
      </div>
    );
  }

  return <>{fallback}</>;
}

interface AccessDeniedProps {
  message?: string;
}

/**
 * Full page access denied component
 */
export function AccessDenied({ message = "Você não tem permissão para acessar esta página." }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}

interface RequirePermissionProps {
  module: ModuleKey;
  action?: ActionKey;
  children: ReactNode;
}

// PERFORMANCE: Reduced from 8s to 4s for faster error detection
const REQUIRE_PERMISSION_TIMEOUT_MS = 4000;

/**
 * Route-level permission check component.
 * Shows access denied page if user doesn't have permission.
 * IMPORTANT: In technical error state, renders children with a warning banner (never blocks indefinitely).
 */
export function RequirePermission({ module, action = "view", children }: RequirePermissionProps) {
  const { can, loading, permissionsError, refreshPermissions } = usePermissions();
  const { loading: authLoading, signOut } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const loadingStartRef = useRef<number | null>(null);

  const isLoading = loading || authLoading;

  // Track loading start and set timeout
  useEffect(() => {
    if (isLoading && loadingStartRef.current === null) {
      loadingStartRef.current = Date.now();
    }
    if (!isLoading) {
      loadingStartRef.current = null;
      setTimedOut(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loadingStartRef.current && Date.now() - loadingStartRef.current >= REQUIRE_PERMISSION_TIMEOUT_MS) {
        setTimedOut(true);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setTimedOut(false);
    loadingStartRef.current = null;
    try {
      await refreshPermissions();
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = "/app/auth";
    }
  };

  // Technical error or timeout: render children with warning banner (NEVER block render)
  if (timedOut || permissionsError) {
    return (
      <>
        <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2 max-w-6xl">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">
                Permissões temporariamente indisponíveis (erro técnico)
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {retrying ? "Tentando..." : "Retry"}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  // Still loading (before timeout)
  // CRITICAL PERFORMANCE FIX: Render children immediately without any blocking overlay.
  // This allows pages to fire their own data fetches in parallel with RBAC.
  // The opacity reduction was causing perceived slowness - now fully transparent.
  if (isLoading) {
    // Mount children immediately - no visual blocking. Just a subtle top banner.
    return (
      <>
        {/* Minimal non-blocking loading indicator */}
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />
        {children}
      </>
    );
  }

  // Loaded but no permission
  if (!can(module, action)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
