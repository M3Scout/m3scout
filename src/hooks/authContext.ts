import { createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { RecoveryReason } from "@/lib/authRecovery";

export type AppRole = Database["public"]["Enums"]["app_role"];

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

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  rolesError: string | null;
  roles: AppRole[];
  linkedPlayerId: string | null;
  rolesFromCache: boolean;
  rolesFetchedAt: number | null;
  permissions: UserPermissions | null;
  permissionsLoading: boolean;
  permissionsError: string | null;
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  isRecovering: boolean;
  hasAuthTimeout: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  triggerRecovery: (reason: RecoveryReason) => Promise<boolean>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isScout: boolean;
  isInternal: boolean;
  isPlayer: boolean;
  isApproved: boolean;
  debug: {
    fetchStage: "idle" | "start" | "success" | "error";
    fetchSource: "fresh" | "cache" | "background" | null;
    fetchDurationMs?: number;
    error?: { code?: string; message?: string };
  };
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
