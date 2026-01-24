import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { PermissionsWarningBanner } from "@/components/auth/PermissionsWarningBanner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LOADING_TIMEOUT_MS = 8000; // 8 seconds fail-safe

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
    signOut,
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
  const [timedOut, setTimedOut] = useState(false);
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const isLoading = authLoading || rolesLoading || permissionsLoading;
  // Technical error (timeout/abort/network) is different from "not approved"
  const hasTechnicalError = Boolean(rolesError || permissionsErrorFlag || permissionsError);
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
      // Reset timeout state so UI can show loading again
      setTimedOut(false);
      // Re-run the exact bootstrap fetches that commonly cause this screen
      await Promise.all([refreshRoles(), refreshPermissions()]);
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = async () => {
    console.log("[AUTH] signOut start");
    try {
      await signOut();
      console.log("[AUTH] signOut success");
    } catch (error) {
      console.error("[AUTH] signOut error:", error);
    } finally {
      console.log("[AUTH] signOut redirect fallback");
      window.location.href = "/app/auth";
    }
  };

  // Fail-safe timeout: don't allow "loading" to persist indefinitely.
  // IMPORTANT: avoid timer reset loops if flags toggle briefly.
  useEffect(() => {
    if (isLoading && loadingSinceRef.current == null) {
      loadingSinceRef.current = Date.now();
    }

    if (!isLoading) {
      loadingSinceRef.current = null;
      setTimedOut(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingSinceRef.current) return;
      const elapsed = Date.now() - loadingSinceRef.current;
      if (elapsed >= LOADING_TIMEOUT_MS) {
        setTimedOut(true);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // ===== Technical error state (timeout/abort/network) =====
  // IMPORTANT: In technical errors, pages MUST mount (no blocking fullscreen).
  // We show a warning banner + keep a dev details panel.
  if (timedOut || hasTechnicalError) {
    const errorType = rolesError || (permissionsError as any) || (timedOut ? "timeout" : "exception");

    // Not logged in → redirect to login (even in error mode)
    if (!user) {
      return <Navigate to="/app/auth" state={{ from: location }} replace />;
    }

    return (
      <>
        <PermissionsWarningBanner
          errorType={errorType}
          retrying={retrying}
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

  // ===== Required RBAC order =====
  // 1) rolesLoading/auth/permissions -> loader (no redirect)
  if (isLoading) {
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

  // 2) admin bypass -> allow immediately (do NOT check pending/status)
  if (isAdmin) return <>{children}</>;

  // 3) non-admin: enforce approval + active status
  // Only redirect to pending if genuinely not approved (no technical error)
  if (!isApproved || userStatus !== "active") {
    return <Navigate to="/pending-access" replace />;
  }

  return <>{children}</>;
}
