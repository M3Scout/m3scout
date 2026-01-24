import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LOADING_TIMEOUT_MS = 10000; // 10 seconds fail-safe

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    session,
    loading: authLoading,
    rolesLoading,
    roles,
    isAdmin,
    isApproved,
    signOut,
    refreshRoles,
    debug: authDebug,
  } = useAuth();
  const {
    loading: permissionsLoading,
    refreshPermissions,
    debug: permissionsDebug,
  } = usePermissions();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const isLoading = authLoading || rolesLoading || permissionsLoading;
  const isDev = import.meta.env.DEV;

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

  // Fail-safe timeout: if loading takes too long, show error state
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Timeout reached - show error state with logout option
  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-lg font-semibold">Falha ao carregar</h2>
          <p className="text-muted-foreground text-sm">
            Não foi possível carregar seu perfil. Isso pode ser um problema temporário.
          </p>

          {isDev && (
            <div className="w-full text-left rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Detalhes técnicos (dev)</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDevDetails((v) => !v)}
                >
                  {showDevDetails ? "Ocultar" : "Mostrar"}
                </Button>
              </div>

              {showDevDetails && (
                <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-muted-foreground">
{JSON.stringify(
  {
    route: location.pathname,
    loadingFlags: {
      authLoading,
      rolesLoading,
      permissionsLoading,
    },
    auth: {
      userId: user?.id ?? null,
      email: maskEmail(user?.email) ?? null,
      hasSession: Boolean(session),
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
          )}

          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={handleRetry} disabled={retrying}>
              {retrying ? "Tentando..." : "Tentar novamente"}
            </Button>
            <Button variant="destructive" onClick={() => signOut()}>
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while auth, roles, or permissions are being fetched
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
  const decision = isAdmin ? "ALLOW_ADMIN" : (isApproved ? "ALLOW" : "REDIRECT_PENDING");
  
  if (import.meta.env.DEV) {
    console.log("[RBAC] Access decision:", {
      userId: user.id,
      email: maskEmail(user.email),
      roles,
      isAdmin,
      isApproved,
      rolesLoading,
      decision,
      route: location.pathname,
    });
  }

  // CRITICAL: Admin bypass - ADMIN never goes to pending-access
  if (isAdmin) {
    console.log("[RBAC] Admin bypass - allowing access");
    return <>{children}</>;
  }

  // Logged in but no valid role → redirect to pending access page
  if (!isApproved) {
    return <Navigate to="/pending-access" replace />;
  }

  return <>{children}</>;
}
