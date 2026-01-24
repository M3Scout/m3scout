import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  linkedPlayerId: string | null;
  isPlayerRole: boolean;
  can: (module: ModuleKey, action: ActionKey) => boolean;
  canDelete: (module: ModuleKey) => boolean;
  refreshPermissions: () => Promise<void>;
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
  const { user, isAdmin, isPlayer, isApproved, linkedPlayerId: authLinkedPlayerId, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended" | null>(null);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    // Always set loading false at the end, no matter what
    try {
      if (!user) {
        setPermissions(null);
        setIsOwner(false);
        setUserStatus(null);
        setLinkedPlayerId(null);
        return;
      }

      // CRITICAL: If user is not approved (no valid role), deny all access
      // This is the expected state for pending users - not an error
      if (!isApproved) {
        console.log("[Permissions] User not approved, setting default permissions");
        setPermissions(defaultPermissions);
        setIsOwner(false);
        setUserStatus(null);
        setLinkedPlayerId(null);
        return;
      }

      // Set linked player ID from auth context
      setLinkedPlayerId(authLinkedPlayerId);

      // Fetch permissions - this might fail for new users (no row yet)
      const { data: permsData, error: permsError } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle to avoid error on no row

      if (permsError) {
        console.error("[Permissions] Error fetching permissions:", permsError.code, permsError.message);
      }

      // Fetch role info - use maybeSingle to handle missing rows gracefully
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("is_owner, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("[Permissions] Error fetching role info:", roleError.code, roleError.message);
      }

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
      } else if (permsData) {
        // Non-admin: use permissions from DB, but FORCE delete=false
        setPermissions({
          ...permsData,
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

      setIsOwner(roleData?.is_owner ?? false);
      setUserStatus((roleData?.status as "active" | "suspended") ?? "active");
    } catch (error) {
      console.error("[Permissions] Unexpected error in fetchPermissions:", error);
      setPermissions(defaultPermissions);
    } finally {
      // CRITICAL: Always set loading to false
      setLoading(false);
    }
  }, [user, isAdmin, isPlayer, isApproved, authLinkedPlayerId]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

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
        isOwner,
        userStatus,
        linkedPlayerId,
        isPlayerRole: isPlayer,
        can,
        canDelete,
        refreshPermissions,
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
