import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { retryWithBackoff } from "@/lib/retry";
import { classifyRbacError } from "@/lib/rbacError";

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

export interface UserPermissions {
  app_view: boolean;
  players_view: boolean;
  players_create: boolean;
  players_edit: boolean;
  players_delete: boolean;
  players_export: boolean;
  compare_view: boolean;
  reports_view: boolean;
  reports_create: boolean;
  reports_edit: boolean;
  reports_delete: boolean;
  reports_export: boolean;
  live_match_view: boolean;
  live_match_log: boolean;
  competitions_view: boolean;
  competitions_create: boolean;
  competitions_edit: boolean;
  competitions_delete: boolean;
  news_view: boolean;
  news_create: boolean;
  news_edit: boolean;
  news_delete: boolean;
  news_publish: boolean;
  leads_view: boolean;
  leads_create: boolean;
  leads_edit: boolean;
  leads_delete: boolean;
  leads_export: boolean;
  users_manage: boolean;
}

interface PermissionsContextType {
  permissions: UserPermissions | null;
  loading: boolean;
  /** Error state: 'timeout' | 'abort' | 'network' | 'exception' | null */
  error: string | null;
  /** Convenience boolean for guards: true when `error` is set */
  permissionsError: boolean;
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  linkedPlayerId: string | null;
  isPlayerRole: boolean;
  can: (module: ModuleKey, action: ActionKey) => boolean;
  canDelete: (module: ModuleKey) => boolean;
  refreshPermissions: () => Promise<void>;

  /** DEV diagnostics for profile/access bootstrap */
  debug: {
    permissionsFetch?: {
      stage: "idle" | "start" | "success" | "error";
      table: "user_permissions";
      query: { user_id: string };
      startedAt: string;
      finishedAt?: string;
      status?: number;
      statusText?: string;
      error?: {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      };
    };
    roleFetch?: {
      stage: "idle" | "start" | "success" | "error";
      table: "user_roles";
      query: { user_id: string };
      startedAt: string;
      finishedAt?: string;
      status?: number;
      statusText?: string;
      error?: {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      };
    };
  };
}

// Default permissions: DENY BY DEFAULT - no access to anything
const defaultPermissions: UserPermissions = {
  app_view: false,
  players_view: false,
  players_create: false,
  players_edit: false,
  players_delete: false,
  players_export: false,
  compare_view: false,
  reports_view: false,
  reports_create: false,
  reports_edit: false,
  reports_delete: false,
  reports_export: false,
  live_match_view: false,
  live_match_log: false,
  competitions_view: false,
  competitions_create: false,
  competitions_edit: false,
  competitions_delete: false,
  news_view: false,
  news_create: false,
  news_edit: false,
  news_delete: false,
  news_publish: false,
  leads_view: false,
  leads_create: false,
  leads_edit: false,
  leads_delete: false,
  leads_export: false,
  users_manage: false,
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, isPlayer, isApproved, linkedPlayerId: authLinkedPlayerId, loading: authLoading, rolesError } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended" | null>(null);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [debug, setDebug] = useState<PermissionsContextType["debug"]>({});

  const nowIso = () => new Date().toISOString();
  const REQUEST_TIMEOUT_MS = 1200;
  const RBAC_BACKOFF_MS = [300, 800, 1500];

  const fetchPermissions = useCallback(async () => {
    // Reset error state at the start
    setError(null);
    
    // Always set loading false at the end, no matter what
    try {
      if (import.meta.env.DEV) {
        console.log("[Permissions] START permissions fetch", {
          userId: user?.id ?? null,
          email: user?.email ?? null,
          isAdmin,
          isPlayer,
          isApproved,
          authLoading,
          rolesError,
        });
      }

      if (!user) {
        setPermissions(null);
        setIsOwner(false);
        setUserStatus(null);
        setLinkedPlayerId(null);
        return;
      }

      // CRITICAL: If there was an error fetching roles (timeout/abort/network),
      // do NOT treat as "not approved" - set error state instead
      if (rolesError) {
        console.warn("[Permissions] Auth had rolesError, not treating as 'not approved':", rolesError);
        setError(rolesError);
        // For admin (from cache or prior state), still allow - handled by ProtectedRoute
        // For non-admin, permissions will be null and ProtectedRoute shows error UI
        setPermissions(null);
        return;
      }

      // CRITICAL: isApproved can be false for two reasons:
      // 1. User genuinely not approved (status !== 'active' in DB)
      // 2. Fetch failed/timed out (rolesError set above)
      // Only deny access if genuinely not approved (no rolesError)
      if (!isApproved) {
        console.log("[Permissions] User not approved (confirmed by DB), setting default permissions");
        setPermissions(defaultPermissions);
        setIsOwner(false);
        setUserStatus(null);
        setLinkedPlayerId(null);
        return;
      }

      // Set linked player ID from auth context
      setLinkedPlayerId(authLinkedPlayerId);

      // Supabase queries return a "thenable" (PromiseLike), not always a real Promise in TS.
      // Wrap with Promise.resolve so we can race with a timeout reliably.
      const withTimeout = async <T,>(promiseLike: PromiseLike<T>, label: string): Promise<T> => {
        let timeoutId: number | undefined;
        const timeoutPromise = new Promise<T>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error(`Timeout ao buscar ${label}`));
          }, REQUEST_TIMEOUT_MS);
        });

        const promise = Promise.resolve(promiseLike);
        try {
          return await Promise.race([promise, timeoutPromise]);
        } finally {
          if (timeoutId) window.clearTimeout(timeoutId);
        }
      };

      if (import.meta.env.DEV) {
        console.log("[RBAC][Permissions] start", {
          userId: user.id,
          backoffMs: RBAC_BACKOFF_MS,
          attemptTimeoutMs: REQUEST_TIMEOUT_MS,
        });
      }

      const { permsRow, roleRows } = await retryWithBackoff(
        async (attempt) => {
          if (import.meta.env.DEV) {
            console.log("[RBAC][Permissions] attempt", attempt + 1, {
              tables: ["user_permissions", "user_roles"],
              query: { user_id: user.id },
            });
          }

          // Fetch permissions (0..N) WITHOUT maybeSingle/single; pick latest (if duplicated)
          setDebug((prev) => ({
            ...prev,
            permissionsFetch: {
              stage: "start",
              table: "user_permissions",
              query: { user_id: user.id },
              startedAt: nowIso(),
            },
          }));

          const permsRes = (await withTimeout(
            supabase
              .from("user_permissions")
              .select("*")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(1),
            "user_permissions",
          )) as any;

          if (permsRes.error) throw { ...permsRes.error, status: permsRes.status, statusText: permsRes.statusText };

          setDebug((prev) => ({
            ...prev,
            permissionsFetch: {
              stage: "success",
              table: "user_permissions",
              query: { user_id: user.id },
              startedAt: prev.permissionsFetch?.startedAt ?? nowIso(),
              finishedAt: nowIso(),
              status: permsRes.status,
              statusText: permsRes.statusText,
            },
          }));

          // Fetch roles info (0..N) WITHOUT maybeSingle/single
          setDebug((prev) => ({
            ...prev,
            roleFetch: {
              stage: "start",
              table: "user_roles",
              query: { user_id: user.id },
              startedAt: nowIso(),
            },
          }));

          const roleRes = (await withTimeout(
            supabase
              .from("user_roles")
              .select("role, status, is_owner, linked_player_id")
              .eq("user_id", user.id),
            "user_roles",
          )) as any;

          if (roleRes.error) throw { ...roleRes.error, status: roleRes.status, statusText: roleRes.statusText };

          setDebug((prev) => ({
            ...prev,
            roleFetch: {
              stage: "success",
              table: "user_roles",
              query: { user_id: user.id },
              startedAt: prev.roleFetch?.startedAt ?? nowIso(),
              finishedAt: nowIso(),
              status: roleRes.status,
              statusText: roleRes.statusText,
            },
          }));

          const permsRow = Array.isArray(permsRes.data) ? permsRes.data[0] ?? null : null;
          const roleRows = Array.isArray(roleRes.data) ? roleRes.data : [];
          return { permsRow, roleRows };
        },
        { backoffMs: RBAC_BACKOFF_MS }
      );

      // If admin, grant all permissions
      if (isAdmin) {
        const adminPerms: UserPermissions = {
          app_view: true,
          players_view: true,
          players_create: true,
          players_edit: true,
          players_delete: true,
          players_export: true,
          compare_view: true,
          reports_view: true,
          reports_create: true,
          reports_edit: true,
          reports_delete: true,
          reports_export: true,
          live_match_view: true,
          live_match_log: true,
          competitions_view: true,
          competitions_create: true,
          competitions_edit: true,
          competitions_delete: true,
          news_view: true,
          news_create: true,
          news_edit: true,
          news_delete: true,
          news_publish: true,
          leads_view: true,
          leads_create: true,
          leads_edit: true,
          leads_delete: true,
          leads_export: true,
          users_manage: true,
        };
        setPermissions(adminPerms);
      } else if (isPlayer) {
        // Player role: read-only access to their own data
        const playerPerms: UserPermissions = {
          app_view: true,
          players_view: true,
          players_create: false,
          players_edit: false,
          players_delete: false,
          players_export: false,
          compare_view: false,
          reports_view: true,
          reports_create: false,
          reports_edit: false,
          reports_delete: false,
          reports_export: false,
          live_match_view: true,
          live_match_log: false,
          competitions_view: true,
          competitions_create: false,
          competitions_edit: false,
          competitions_delete: false,
          news_view: false,
          news_create: false,
          news_edit: false,
          news_delete: false,
          news_publish: false,
          leads_view: false,
          leads_create: false,
          leads_edit: false,
          leads_delete: false,
          leads_export: false,
          users_manage: false,
        };
        setPermissions(playerPerms);
      } else if (permsRow) {
        // Non-admin: use permissions from DB, but FORCE delete=false
        setPermissions({
          ...permsRow,
          players_delete: false,
          reports_delete: false,
          competitions_delete: false,
          news_delete: false,
          leads_delete: false,
        } as UserPermissions);
      } else {
        // No permissions found - use defaults
        setPermissions(defaultPermissions);
      }

      // Derive owner + status from 0..N rows (no single-row assumption)
      const isOwnerAny = roleRows.some((r: any) => Boolean(r?.is_owner));
      const statusValues = roleRows.map((r: any) => r?.status).filter(Boolean);
      const derivedStatus: "active" | "suspended" | null = statusValues.includes("suspended")
        ? "suspended"
        : statusValues.includes("active")
          ? "active"
          : null;

      setIsOwner(isOwnerAny);
      setUserStatus(derivedStatus);

      if (import.meta.env.DEV) {
        console.log("[Permissions] SUCCESS permissions fetch", {
          userId: user.id,
          isAdmin,
          isPlayer,
          isApproved,
          status: derivedStatus,
          isOwner: isOwnerAny,
          hasDbPermissionsRow: Boolean(permsRow),
        });
      }
    } catch (err) {
      const errorType = classifyRbacError(err);
      const errorObj = err as any;

      if (import.meta.env.DEV) {
        console.error("[RBAC][Permissions] error", {
          errorType,
          tables: ["user_permissions", "user_roles"],
          query: { user_id: user?.id ?? null },
          code: errorObj?.code,
          message: errorObj?.message ?? String(err),
          status: errorObj?.status,
          statusText: errorObj?.statusText,
        });
      }
      
      // CRITICAL: Do NOT set defaultPermissions on error - set error state instead
      // This prevents "not approved" redirect on technical failures
      setError(errorType);
      setPermissions(null);

      // Ensure debug reflects failure if we were in-flight
      setDebug((prev) => {
        return {
          ...prev,
          permissionsFetch:
            prev.permissionsFetch?.stage === "start"
              ? {
                  ...prev.permissionsFetch,
                  stage: "error",
                  finishedAt: nowIso(),
                  status: 0,
                  statusText: errorType,
                  error: {
                    code: errorType.toUpperCase(),
                    message: errorObj.message ?? "Erro inesperado ao buscar permissões",
                  },
                }
              : prev.permissionsFetch,
          roleFetch:
            prev.roleFetch?.stage === "start"
              ? {
                  ...prev.roleFetch,
                  stage: "error",
                  finishedAt: nowIso(),
                  status: 0,
                  statusText: errorType,
                  error: {
                    code: errorType.toUpperCase(),
                    message: errorObj.message ?? "Erro inesperado ao buscar role info",
                  },
                }
              : prev.roleFetch,
        };
      });

      if (import.meta.env.DEV) {
        console.log("[Permissions] ERROR permissions fetch", {
          userId: user?.id ?? null,
          errorType,
          error: {
            message: errorObj?.message ?? String(err),
            stack: errorObj?.stack,
          },
        });
      }
    } finally {
      // CRITICAL: Always set loading to false
      setLoading(false);
    }
  }, [user, isAdmin, isPlayer, isApproved, authLinkedPlayerId, rolesError]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

  // Fail-safe: if auth never finishes loading, stop permissions loading after timeout
  useEffect(() => {
    if (!authLoading) return; // Auth finished, no need for timeout
    
    const timeout = setTimeout(() => {
      console.warn("[Permissions] Auth loading timeout - forcing permissions loading to complete");
      setLoading(false);
    }, 8000); // 8 seconds - before ProtectedRoute's 10s timeout

    return () => clearTimeout(timeout);
  }, [authLoading]);

  // Fail-safe: permissions loading itself can hang even after authLoading completes.
  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => {
      console.warn("[Permissions] Loading timeout - forcing permissions loading to complete");
      setLoading(false);

      setDebug((prev) => {
        const isInFlight = prev.permissionsFetch?.stage === "start" || prev.roleFetch?.stage === "start";
        if (!isInFlight) return prev;
        return {
          ...prev,
          permissionsFetch: prev.permissionsFetch?.stage === "start"
            ? {
                ...prev.permissionsFetch,
                stage: "error",
                finishedAt: nowIso(),
                status: 0,
                statusText: "timeout",
                error: { code: "TIMEOUT", message: "Timeout ao buscar user_permissions" },
              }
            : prev.permissionsFetch,
          roleFetch: prev.roleFetch?.stage === "start"
            ? {
                ...prev.roleFetch,
                stage: "error",
                finishedAt: nowIso(),
                status: 0,
                statusText: "timeout",
                error: { code: "TIMEOUT", message: "Timeout ao buscar user_roles (role info)" },
              }
            : prev.roleFetch,
        };
      });
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading]);

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
    // DELETE is ADMIN-only - always check isAdmin from context
    if (!isAdmin) return false;
    return can(module, "delete");
  }, [isAdmin, can]);

  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        loading,
        error,
        permissionsError: Boolean(error),
        isOwner,
        userStatus,
        linkedPlayerId,
        isPlayerRole: isPlayer,
        can,
        canDelete,
        refreshPermissions,
        debug,
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
