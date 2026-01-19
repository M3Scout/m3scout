import { ReactNode } from "react";
import { usePermissions, ModuleKey, ActionKey } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Lock } from "lucide-react";

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

/**
 * Route-level permission check component.
 * Shows access denied page if user doesn't have permission.
 */
export function RequirePermission({ module, action = "view", children }: RequirePermissionProps) {
  const { can, loading } = usePermissions();
  const { loading: authLoading } = useAuth();

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!can(module, action)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
