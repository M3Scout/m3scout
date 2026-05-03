import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { logAppState } from "@/lib/diagnosticLogger";
import { hardResetAuthToLogin } from "@/lib/authBootReset";
import {
  recoverAuthAndRbac,
  readRbacCache,
  writeRbacCache,
  clearRbacCache,
  resetInflightState,
  initRecoveryListeners,
  shouldTriggerRecovery,
  cleanupLegacyCaches,
  getSessionWithTimeout,
  type RbacPayload,
  type RecoveryReason,
} from "@/lib/authRecovery";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Valid roles that grant app access
const VALID_ROLES: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

// ============ PERMISSIONS TYPES ============
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

// Admin gets everything
const ADMIN_PERMISSIONS: UserPermissions = {
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

// Player role: read-only access to their own data
const PLAYER_PERMISSIONS: UserPermissions = {
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

/**
 * DEFAULT PERMISSIONS: DENY BY DEFAULT
 * 
 * SECURITY CRITICAL: This is the fallback when RBAC fails, times out, or returns no data.
 * All permissions are FALSE to prevent privilege escalation.
 * 
 * NOTE: Client-side RBAC is UX ONLY. Real security is enforced by RLS policies on the database.
 */
const DEFAULT_PERMISSIONS: UserPermissions = {
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

// Cleanup legacy caches on module load
cleanupLegacyCaches();

// ============ CONTEXT TYPE ============
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  linkedPlayerId: string | null;
  isApproved: boolean;
  rolesLoading: boolean;
  rolesError: string | null;
  rolesFromCache: boolean;
  rolesFetchedAt: number | null;
  permissions: UserPermissions | null;
  permissionsLoading: boolean;
  permissionsError: string | null;
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  /** True when recovery is running in background (SWR mode) */
  isRecovering: boolean;
  /** True when auth recovery watchdog has timed out */
  hasAuthTimeout: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  /** Manual recovery function - exposed for Retry button */
  triggerRecovery: (reason: RecoveryReason) => Promise<boolean>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isScout: boolean;
  isInternal: boolean;
  isPlayer: boolean;
  debug: {
    fetchStage: "idle" | "start" | "success" | "error";
    fetchSource: "fresh" | "cache" | "background" | null;
    fetchDurationMs?: number;
    error?: { code?: string; message?: string };
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ============ INSTANT BOOT: Check localStorage synchronously ============
  // If we have a cached Supabase session AND cached RBAC, skip the loading splash entirely.
  const [bootState] = useState(() => {
    try {
      // Check for Supabase session in localStorage
      const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      const hasLocalSession = !!sbKey && !!localStorage.getItem(sbKey);
      
      if (hasLocalSession) {
        // Check for RBAC cache
        const rbacKeys = Object.keys(localStorage).filter(k => k.startsWith("m3_rbac_"));
        if (rbacKeys.length > 0) {
          const cached = localStorage.getItem(rbacKeys[0]);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              const cacheAge = Date.now() - (parsed.fetchedAt || 0);
              // Accept cache up to 30 minutes old for instant boot
              if (cacheAge < 30 * 60 * 1000 && parsed.roles?.length > 0) {
                return { hasCache: true, skipLoading: true };
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch { /* localStorage unavailable */ }
    return { hasCache: false, skipLoading: false };
  });

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!bootState.skipLoading);
  const [rolesLoading, setRolesLoading] = useState(!bootState.skipLoading);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [rolesFromCache, setRolesFromCache] = useState(false);
  const [rolesFetchedAt, setRolesFetchedAt] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(!bootState.skipLoading);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended" | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [hasAuthTimeout, setHasAuthTimeout] = useState(false);

  const [debug, setDebug] = useState<AuthContextType["debug"]>({
    fetchStage: "idle",
    fetchSource: null,
  });

  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const lastRecoveryRef = useRef<number>(0);

  // ============ APPLY RBAC PAYLOAD ============
  const applyPayload = useCallback((payload: RbacPayload, fromCache: boolean) => {
    if (!isMountedRef.current) return;

    setRoles(payload.roles as AppRole[]);
    setLinkedPlayerId(payload.linkedPlayerId);
    setIsOwner(payload.isOwner);
    setUserStatus(payload.userStatus);
    setRolesFromCache(fromCache);
    setRolesFetchedAt(payload.fetchedAt);
    setRolesError(null);
    setPermissionsError(null);

    // Compute permissions based on role
    if (payload.isAdmin) {
      setPermissions(ADMIN_PERMISSIONS);
    } else if (payload.isPlayer) {
      setPermissions(PLAYER_PERMISSIONS);
    } else if (payload.permissions) {
      // Cast through unknown for dynamic permissions from RPC
      setPermissions(payload.permissions as unknown as UserPermissions);
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }

    setRolesLoading(false);
    setPermissionsLoading(false);

    setDebug({
      fetchStage: "success",
      fetchSource: fromCache ? "cache" : "fresh",
    });

    if (import.meta.env.DEV) {
      console.log(`[Auth] RBAC ${fromCache ? "cache HIT" : "applied"}`, {
        userId: payload.userId,
        roles: payload.roles,
        isAdmin: payload.isAdmin,
        isPlayer: payload.isPlayer,
        cacheAge: fromCache ? `${Math.round((Date.now() - payload.fetchedAt) / 1000)}s` : "N/A",
      });
    }
  }, []);

  // ============ TRIGGER RECOVERY ============
  const triggerRecovery = useCallback(async (reason: RecoveryReason): Promise<boolean> => {
    // Throttle recovery to prevent spam (min 2s between recoveries)
    const now = Date.now();
    if (now - lastRecoveryRef.current < 2000 && reason !== "manual-retry") {
      console.log("[Auth] Recovery throttled");
      return false;
    }
    lastRecoveryRef.current = now;

    // Check if recovery is needed (based on cache state)
    const userId = user?.id ?? session?.user?.id;
    if (userId && !shouldTriggerRecovery(userId) && reason !== "manual-retry") {
      // Cache is fresh enough, no recovery needed
      const cached = readRbacCache(userId);
      if (cached) {
        applyPayload(cached, true);
        return true;
      }
    }

    // If we already have valid roles, use SWR approach (show existing data, update in background)
    const hasValidRoles = roles.length > 0;
    if (hasValidRoles && reason !== "manual-retry") {
      setIsRecovering(true);
      setHasAuthTimeout(false); // Reset timeout on new recovery attempt
    } else {
      setRolesLoading(true);
      setPermissionsLoading(true);
      setHasAuthTimeout(false);
    }

    setDebug({ fetchStage: "start", fetchSource: "fresh" });

    const result = await recoverAuthAndRbac(reason, {
      onRecovering: () => {
        if (!hasValidRoles) {
          setRolesLoading(true);
          setPermissionsLoading(true);
        }
      },
      onSuccess: (payload) => {
        if (isMountedRef.current) {
          applyPayload(payload, false);
          setIsRecovering(false);
        }
      },
      onError: (error) => {
        if (isMountedRef.current) {
          setRolesError(error);
          setPermissionsError(error);
          setDebug({
            fetchStage: "error",
            fetchSource: null,
            error: { message: error },
          });
        }
      },
    });

    if (isMountedRef.current) {
      setRolesLoading(false);
      setPermissionsLoading(false);
      setIsRecovering(false);
      
      // Check if watchdog timed out
      if (!result.success) {
        const failureResult = result as { success: false; reason: string; shouldLogout: boolean; watchdogTimeout?: boolean };
        if (failureResult.watchdogTimeout) {
          setHasAuthTimeout(true);
        }
      }
    }

    // Handle logout redirect as last resort
    if (!result.success) {
      // Type narrowing: result is now the failure variant
      const failureResult = result as { success: false; reason: string; shouldLogout: boolean };
      if (failureResult.shouldLogout) {
        console.warn("[Auth] Recovery failed, redirecting to login", { reason: failureResult.reason });
        // Clear local state
        setUser(null);
        setSession(null);
        setRoles([]);
        setPermissions(null);
        clearRbacCache();
        // Hard redirect
        window.location.href = "/app/auth";
        return false;
      }
    }

    return result.success;
  }, [user?.id, session?.user?.id, roles.length, applyPayload]);

  // ============ HANDLE RBAC (CACHE FIRST + SWR) ============
  const handleRbac = useCallback(async (userId: string) => {
    // Import dynamically to avoid circular dependency
    const { getMeContextCacheTtlMs } = await import("@/lib/authRecovery");
    const ME_CONTEXT_TTL = getMeContextCacheTtlMs();
    
    // Try cache first for instant UI
    const cached = readRbacCache(userId);
    if (cached) {
      const cacheAge = Date.now() - cached.fetchedAt;
      console.log("[Auth] cache HIT - applying immediately", {
        cacheAge: `${Math.round(cacheAge / 1000)}s`,
      });
      applyPayload(cached, true);
      setLoading(false);

      // Background revalidation if cache is older than ME_CONTEXT_TTL (3 min)
      if (cacheAge > ME_CONTEXT_TTL) {
        console.log("[Auth] background revalidation triggered");
        setIsRecovering(true);
        triggerRecovery("init").finally(() => {
          if (isMountedRef.current) {
            setIsRecovering(false);
          }
        });
      }
      return;
    }

    // Cache miss - do full recovery
    console.log("[Auth] cache MISS - fetching fresh");
    await triggerRecovery("init");
    setLoading(false);
  }, [applyPayload, triggerRecovery]);

  // ============ VISIBILITY/FOCUS RECOVERY ============
  useEffect(() => {
    const cleanup = initRecoveryListeners((reason) => {
      // Only trigger if we have a user
      if (user?.id) {
        triggerRecovery(reason);
      }
    });

    return cleanup;
  }, [user?.id, triggerRecovery]);

  // ============ INIT EFFECT ============
  useEffect(() => {
    isMountedRef.current = true;

    const handleSignOut = () => {
      setRoles([]);
      setLinkedPlayerId(null);
      setIsOwner(false);
      setUserStatus(null);
      setPermissions(null);
      setRolesFromCache(false);
      setRolesFetchedAt(null);
      setRolesLoading(false);
      setPermissionsLoading(false);
      setRolesError(null);
      setPermissionsError(null);
      setIsRecovering(false);
      clearRbacCache();
      resetInflightState();
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;

        // Skip duplicate INITIAL_SESSION
        if (event === "INITIAL_SESSION" && hasInitializedRef.current) {
          return;
        }

        console.log("[Auth] state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "TOKEN_REFRESHED") {
          console.log("[Auth] token refreshed - triggering recovery");
          if (session?.user) {
            triggerRecovery("token-refresh");
          }
        } else if (session?.user) {
          await handleRbac(session.user.id);
        } else {
          handleSignOut();
        }
      }
    );

    // Initial session check with timeout
    const initSession = async () => {
      logAppState("app_boot", { sbClientCount: typeof window !== "undefined" ? window.__sbClientCount : 0 });
      logAppState("getSession_start");
      
      const getSessionStartTime = Date.now();
      
      try {
        // Use getSessionWithTimeout for deterministic behavior
        const { session, error } = await getSessionWithTimeout();
        const getSessionDurationMs = Date.now() - getSessionStartTime;

        if (!isMountedRef.current) return;
        hasInitializedRef.current = true;

        if (error) {
          const msg = error.message?.toLowerCase?.() ?? "";
          const isTimeout = msg.includes("timeout");

          console.error("[Auth] session error:", error);

          if (isTimeout) {
            logAppState("getSession_timeout", { durationMs: getSessionDurationMs, message: error.message });
            // Definitive fallback: never stay stuck on iOS/Safari.
            await hardResetAuthToLogin({
              reason: "getSession_timeout",
              redirectTo: "/login",
              message: "Sessão expirada. Faça login novamente.",
              error,
            });
            return;
          }

          logAppState("getSession_fail", { message: error.message, durationMs: getSessionDurationMs });
          setLoading(false);
          setRolesLoading(false);
          setPermissionsLoading(false);
          return;
        }

        logAppState("getSession_ok", { hasSession: !!session, durationMs: getSessionDurationMs });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const meContextStartTime = Date.now();
          logAppState("me_context_start");
          await handleRbac(session.user.id);
          const meContextDurationMs = Date.now() - meContextStartTime;
          logAppState("me_context_ok", { durationMs: meContextDurationMs });
        } else {
          setRolesLoading(false);
          setPermissionsLoading(false);
          setLoading(false);
        }
        
        const bootDurationMs = Date.now() - getSessionStartTime;
        logAppState("boot_complete", { durationMs: bootDurationMs });
      } catch (err) {
        console.error("[Auth] init error:", err);
        logAppState("getSession_fail", { message: (err as Error)?.message });
        if (isMountedRef.current) {
          setLoading(false);
          setRolesLoading(false);
          setPermissionsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [handleRbac, triggerRecovery]);

  // ============ PUBLIC API ============
  const refreshRoles = useCallback(async () => {
    if (!user?.id) return;
    clearRbacCache();
    resetInflightState();
    await triggerRecovery("manual-retry");
  }, [user?.id, triggerRecovery]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/app`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setLinkedPlayerId(null);
    setIsOwner(false);
    setUserStatus(null);
    setPermissions(null);
    clearRbacCache();
    resetInflightState();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isScout = hasRole("scout");
  const isPlayer = hasRole("player");
  const isInternal = isAdmin || isScout;
  const isApproved = roles.some((role) => VALID_ROLES.includes(role));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        rolesLoading,
        rolesError,
        roles,
        linkedPlayerId,
        rolesFromCache,
        rolesFetchedAt,
        permissions,
        permissionsLoading,
        permissionsError,
        isOwner,
        userStatus,
        isRecovering,
        hasAuthTimeout,
        signIn,
        signUp,
        signOut,
        refreshRoles,
        triggerRecovery,
        hasRole,
        isAdmin,
        isScout,
        isInternal,
        isPlayer,
        isApproved,
        debug,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
