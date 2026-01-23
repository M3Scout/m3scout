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
  const { user, loading: authLoading, rolesLoading, isApproved, signOut } = useAuth();
  const { loading: permissionsLoading } = usePermissions();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  const isLoading = authLoading || rolesLoading || permissionsLoading;

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
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
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

  // Logged in but no valid role → redirect to pending access page
  if (!isApproved) {
    return <Navigate to="/pending-access" replace />;
  }

  return <>{children}</>;
}
