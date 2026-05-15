import { createContext, useContext, ReactNode, useCallback } from "react";
import { useAuth, UserPermissions } from "@/hooks/authContext";

export type ModuleKey = 
  | "app" 
  | "players" 
  | "compare" 
  | "reports" 
  | "live_match" 
  | "competitions" 
  | "news" 
  | "leads" 
  | "users";

export type ActionKey = 
  | "view" 
  | "create" 
  | "edit" 
  | "delete" 
  | "export" 
  | "log" 
  | "publish" 
  | "manage";

// Re-export UserPermissions for convenience
export type { UserPermissions } from "@/hooks/authContext";

interface PermissionsContextType {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  permissionsError: boolean;
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  linkedPlayerId: string | null;
  isPlayerRole: boolean;
  can: (module: ModuleKey, action: ActionKey) => boolean;
  canDelete: (module: ModuleKey) => boolean;
  refreshPermissions: () => Promise<void>;
  debug: {
    fetchStage: string;
    fetchSource: string | null;
    error?: { code?: string; message?: string };
  };
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

/**
 * PermissionsProvider is a thin wrapper around useAuth.
 * All RBAC data is centralized in AuthProvider to avoid N+1 calls.
 * 
 * SECURITY CRITICAL:
 * - Client-side permissions are for UX ONLY (hide/show UI elements)
 * - Real security is enforced by RLS policies on the database
 * - On error/timeout, permissions default to DENY ALL (restrictive fallback)
 * - Never trust client-side checks for security decisions
 */
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const {
    permissions,
    permissionsLoading,
    permissionsError,
    isOwner,
    userStatus,
    linkedPlayerId,
    isPlayer,
    isAdmin,
    refreshRoles,
    debug: authDebug,
  } = useAuth();

  const can = useCallback((module: ModuleKey, action: ActionKey): boolean => {
    if (!permissions) return false;
    
    // Suspended users can't do anything
    if (userStatus === "suspended") return false;

    // Map module and action to permission key
    let key: keyof UserPermissions;
    
    if (module === "users" && action === "manage") {
      key = "users_manage";
    } else if (module === "app" && action === "view") {
      key = "app_view";
    } else {
      key = `${module}_${action}` as keyof UserPermissions;
    }

    return permissions[key] ?? false;
  }, [permissions, userStatus]);

  const canDelete = useCallback((module: ModuleKey): boolean => {
    // DELETE is ADMIN-only
    if (!isAdmin) return false;
    return can(module, "delete");
  }, [isAdmin, can]);

  const refreshPermissions = useCallback(async () => {
    // Delegate to auth's refreshRoles which now handles everything
    await refreshRoles();
  }, [refreshRoles]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading: permissionsLoading,
        error: permissionsError,
        permissionsError: Boolean(permissionsError),
        isOwner,
        userStatus,
        linkedPlayerId,
        isPlayerRole: isPlayer,
        can,
        canDelete,
        refreshPermissions,
        debug: {
          fetchStage: authDebug.fetchStage,
          fetchSource: authDebug.fetchSource,
          error: authDebug.error,
        },
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
