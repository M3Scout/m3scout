import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { PermissionsWarningBanner } from "@/components/auth/PermissionsWarningBanner";
import { hardLogoutToAuth } from "@/lib/hardLogout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Thresholds for distinguishing slow loading from definitive error
const SLOW_LOADING_THRESHOLD_MS = 1200; // After 1.2s show "Sincronizando..." (no buttons)
const ERROR_FINAL_THRESHOLD_MS = 15000; // After 15s, consider it a final error (show buttons)

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    session,
    loading: authLoading,
    rolesLoading,
    rolesError,
    roles,
    isAdmin,
    isApproved,
    refreshRoles,
    debug: authDebug,
  } = useAuth();
  const {
    loading: permissionsLoading,
    error: permissionsError,
    permissionsError: permissionsErrorFlag,
    userStatus,
    refreshPermissions,
    debug: permissionsDebug,
  } = usePermissions();
  const location = useLocation();
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // New: separate states for slow loading vs final error
  const [slowLoading, setSlowLoading] = useState(false);
  const [errorFinal, setErrorFinal] = useState(false);

  const isLoading = authLoading || rolesLoading || permissionsLoading;
  // Technical error from hooks (only set after retries exhausted)
  const hasHookError = Boolean(rolesError || permissionsErrorFlag || permissionsError);
  const isDev = import.meta.env.DEV;
  const loadingSinceRef = useRef<number | null>(null);

  const maskEmail = (email?: string | null) => {
    if (!email) return null;
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    if (!local) return `***@${domain}`;
    const head = local.slice(0, 2);
    return `${head}***@${domain}`;
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Reset states so UI can show loading again
      setSlowLoading(false);
      setErrorFinal(false);
      loadingSinceRef.current = null;
      // Re-run the exact bootstrap fetches
      await Promise.all([refreshRoles(), refreshPermissions()]);
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await hardLogoutToAuth(1800);
  };

  // Track loading duration to distinguish slow loading from final error
  useEffect(() => {
    // Start tracking when loading begins
    if (isLoading && loadingSinceRef.current == null) {
      loadingSinceRef.current = Date.now();
    }

    // Reset when loading completes successfully
    if (!isLoading && !hasHookError) {
      loadingSinceRef.current = null;
      setSlowLoading(false);
      setErrorFinal(false);
    }
  }, [isLoading, hasHookError]);

  // Check elapsed time periodically to set slow/error states
  useEffect(() => {
    const interval = setInterval(() => {
      // If we got a hook error (after retries exhausted), that's final
      if (hasHookError && !isLoading) {
        setErrorFinal(true);
        setSlowLoading(false);
        return;
      }

      // If not loading or we have user without loading, no need to show banners
      if (!loadingSinceRef.current) return;

      const elapsed = Date.now() - loadingSinceRef.current;

      // After ERROR_FINAL_THRESHOLD_MS, consider it a final error
      if (elapsed >= ERROR_FINAL_THRESHOLD_MS) {
        setErrorFinal(true);
        setSlowLoading(false);
      }
      // After SLOW_LOADING_THRESHOLD_MS, show "syncing" message (no buttons)
      else if (elapsed >= SLOW_LOADING_THRESHOLD_MS) {
        setSlowLoading(true);
        setErrorFinal(false);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [hasHookError, isLoading]);

  // Determine what banner to show
  const showSlowLoadingBanner = slowLoading && !errorFinal && isLoading && (user || session);
  const showErrorFinalBanner = errorFinal || (hasHookError && !isLoading);

  // ===== Error Final state (after all retries exhausted) =====
  if (showErrorFinalBanner) {
    const errorType = rolesError || (permissionsError as any) || "timeout";

    // Not logged in → redirect to login (even in error mode)
    if (!user) {
      return <Navigate to="/app/auth" state={{ from: location }} replace />;
    }

    return (
      <>
        <PermissionsWarningBanner
          mode="errorFinal"
          errorType={errorType}
          retrying={retrying}
          loggingOut={loggingOut}
          onRetry={handleRetry}
          onLogout={handleLogout}
        />

        {isDev && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-16">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium">Detalhes técnicos (dev)</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowDevDetails((v) => !v)}>
                  {showDevDetails ? "Ocultar" : "Mostrar"}
                </Button>
              </div>

              {showDevDetails && (
                <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-muted-foreground">
{JSON.stringify(
  {
    route: location.pathname,
    errorType,
    loadingFlags: {
      authLoading,
      rolesLoading,
      permissionsLoading,
    },
    errors: {
      rolesError,
      permissionsError,
    },
    auth: {
      userId: user?.id ?? null,
      email: maskEmail(user?.email) ?? null,
      hasSession: Boolean(session),
      isAdmin,
      isApproved,
    },
    requests: {
      user_roles: authDebug?.rolesFetch ?? null,
      user_permissions: permissionsDebug?.permissionsFetch ?? null,
      user_roles_roleinfo: permissionsDebug?.roleFetch ?? null,
    },
  },
  null,
  2
)}
                </pre>
              )}
            </div>
          </div>
        )}

        <div className={isDev ? "pt-4" : "pt-16"}>{children}</div>
      </>
    );
  }

  // ===== Slow Loading state (still trying, no buttons) =====
  if (showSlowLoadingBanner) {
    return (
      <>
        <PermissionsWarningBanner
          mode="slowLoading"
          onRetry={handleRetry}
          onLogout={handleLogout}
        />
        <div className="pt-10">{children}</div>
      </>
    );
  }

  // ===== Normal loading state =====
  if (isLoading) {
    // If there's already an authenticated session/user, keep children mounted
    if (user || session) {
      return (
        <>
          <div className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2">
              <p className="text-xs text-muted-foreground">Carregando permissões...</p>
            </div>
          </div>
          <div className="pt-10">{children}</div>
        </>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/app/auth" state={{ from: location }} replace />;
  }

  // RBAC Decision Log (dev only) - ALWAYS log before decision
  const decision = isAdmin
    ? "ALLOW_ADMIN"
    : !isApproved || userStatus !== "active"
      ? "REDIRECT_PENDING"
      : "ALLOW";
  
  if (import.meta.env.DEV) {
    console.log("[RBAC] Access decision:", {
      userId: user.id,
      email: maskEmail(user.email),
      resolvedRoles: roles,
      isAdmin,
      isApproved,
      rolesLoading,
      rolesError,
      permissionsLoading,
      permissionsError,
      status: userStatus,
      decision,
      route: location.pathname,
    });
  }

  // Admin bypass -> allow immediately (do NOT check pending/status)
  if (isAdmin) return <>{children}</>;

  // Non-admin: enforce approval + active status
  // Only redirect to pending if genuinely not approved (no technical error)
  if (!isApproved || userStatus !== "active") {
    return <Navigate to="/pending-access" replace />;
  }

  return <>{children}</>;
}
