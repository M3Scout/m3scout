import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Valid roles that grant app access
const VALID_ROLES: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

// ============ CACHE CONFIGURATION ============
// 30 minute TTL as requested
const RBAC_CACHE_TTL_MS = 30 * 60 * 1000;
const RBAC_CACHE_KEY = "m3_rbac_v3"; // New version for clean migration

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

// Default permissions: DENY BY DEFAULT
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

// ============ CACHE TYPES ============
interface RbacCachePayload {
  userId: string;
  roles: AppRole[];
  isAdmin: boolean;
  isPlayer: boolean;
  isOwner: boolean;
  linkedPlayerId: string | null;
  userStatus: "active" | "suspended" | null;
  permissions: UserPermissions | null;
  fetchedAt: number;
  expiresAt: number;
}

// ============ CACHE FUNCTIONS ============
function readCache(userId: string): RbacCachePayload | null {
  try {
    const raw = localStorage.getItem(RBAC_CACHE_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw) as RbacCachePayload;
    
    // Validate cache
    if (parsed?.userId !== userId) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(RBAC_CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: RbacCachePayload): void {
  try {
    localStorage.setItem(RBAC_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures
  }
}

function clearCache(): void {
  try {
    localStorage.removeItem(RBAC_CACHE_KEY);
    // Also clear old cache versions
    localStorage.removeItem("m3_rbac_v2");
    localStorage.removeItem("m3_rbac_v2_persistent");
  } catch {
    // Ignore
  }
}

// ============ DEDUPE SINGLETON ============
let inflightPromise: Promise<RbacCachePayload | null> | null = null;
let rbacCallCount = 0;

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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [rolesFromCache, setRolesFromCache] = useState(false);
  const [rolesFetchedAt, setRolesFetchedAt] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended" | null>(null);

  const [debug, setDebug] = useState<AuthContextType["debug"]>({
    fetchStage: "idle",
    fetchSource: null,
  });

  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // ============ APPLY RBAC PAYLOAD ============
  const applyPayload = useCallback((payload: RbacCachePayload, fromCache: boolean) => {
    if (!isMountedRef.current) return;

    setRoles(payload.roles);
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
      setPermissions(payload.permissions);
    } else {
      setPermissions(DEFAULT_PERMISSIONS);
    }

    setRolesLoading(false);
    setPermissionsLoading(false);

    setDebug({
      fetchStage: "success",
      fetchSource: fromCache ? "cache" : "fresh",
    });

    console.log(`[RBAC] ${fromCache ? "cache HIT" : "applied"}`, {
      userId: payload.userId,
      roles: payload.roles,
      isAdmin: payload.isAdmin,
      isPlayer: payload.isPlayer,
      cacheAge: fromCache ? `${Math.round((Date.now() - payload.fetchedAt) / 1000)}s` : "N/A",
    });
  }, []);

  // ============ FETCH RBAC (SINGLE RPC) ============
  const doFetch = useCallback(async (userId: string): Promise<RbacCachePayload | null> => {
    console.time("rbac_fetch");
    rbacCallCount++;
    console.log("[RBAC] fetch start", { userId, callNumber: rbacCallCount, source: "supabase_rpc" });

    try {
      const { data, error } = await supabase.rpc("get_user_rbac", { p_user_id: userId });

      console.timeEnd("rbac_fetch");

      if (error) {
        console.error("[RBAC] RPC error", error);
        throw error;
      }

      if (!data) {
        console.warn("[RBAC] No data returned");
        return null;
      }

      // Cast through unknown for RPC response
      const rbacData = data as unknown as {
        userId: string;
        roles: AppRole[];
        isAdmin: boolean;
        isPlayer: boolean;
        isOwner: boolean;
        linkedPlayerId: string | null;
        userStatus: string | null;
        permissions: UserPermissions | null;
        fetchedAt: number;
        ttlSeconds: number;
      };

      const payload: RbacCachePayload = {
        userId: rbacData.userId,
        roles: rbacData.roles || [],
        isAdmin: rbacData.isAdmin,
        isPlayer: rbacData.isPlayer,
        isOwner: rbacData.isOwner,
        linkedPlayerId: rbacData.linkedPlayerId,
        userStatus: (rbacData.userStatus as "active" | "suspended") || null,
        permissions: rbacData.permissions,
        fetchedAt: rbacData.fetchedAt,
        expiresAt: rbacData.fetchedAt + (rbacData.ttlSeconds * 1000),
      };

      console.log("[RBAC] fetch success", {
        roles: payload.roles,
        isAdmin: payload.isAdmin,
        ttlMinutes: rbacData.ttlSeconds / 60,
      });

      return payload;
    } catch (err) {
      console.timeEnd("rbac_fetch");
      console.error("[RBAC] fetch failed", err);
      throw err;
    }
  }, []);

  // ============ FETCH WITH DEDUPE ============
  const fetchRbac = useCallback(async (userId: string, opts?: { background?: boolean }) => {
    const background = opts?.background ?? false;

    if (!background) {
      setRolesLoading(true);
      setPermissionsLoading(true);
      setDebug({ fetchStage: "start", fetchSource: "fresh" });
    }

    // DEDUPE: Reuse existing promise if in flight
    if (inflightPromise) {
      console.log("[RBAC] dedupe - awaiting existing fetch");
      try {
        const result = await inflightPromise;
        if (result) {
          writeCache(result);
          applyPayload(result, false);
        }
      } catch {
        // Error handled by original fetch
      }
      return;
    }

    // Start new fetch
    const promise = doFetch(userId);
    inflightPromise = promise;

    try {
      const result = await promise;
      if (result) {
        writeCache(result);
        applyPayload(result, false);
      } else if (!background) {
        setRolesLoading(false);
        setPermissionsLoading(false);
      }
    } catch (err: any) {
      console.error("[RBAC] fetch error", err);
      
      if (!background) {
        setRolesError(err?.code || "exception");
        setPermissionsError(err?.code || "exception");
        setRolesLoading(false);
        setPermissionsLoading(false);
        setDebug({
          fetchStage: "error",
          fetchSource: background ? "background" : "fresh",
          error: { code: err?.code, message: err?.message },
        });
      }
    } finally {
      inflightPromise = null;
    }
  }, [doFetch, applyPayload]);

  // ============ HANDLE RBAC (CACHE FIRST) ============
  const handleRbac = useCallback(async (userId: string) => {
    rbacCallCount = 0; // Reset counter per page load
    
    // Try cache first - instant read
    const cached = readCache(userId);
    if (cached) {
      console.log("[RBAC] cache HIT", {
        cacheAge: `${Math.round((Date.now() - cached.fetchedAt) / 1000)}s`,
        expiresIn: `${Math.round((cached.expiresAt - Date.now()) / 1000)}s`,
      });
      console.log("[RBAC] calls count: 0 (cache hit)");
      applyPayload(cached, true);
      setLoading(false);
      
      // Background revalidate if cache is older than 5 minutes
      const cacheAge = Date.now() - cached.fetchedAt;
      if (cacheAge > 5 * 60 * 1000) {
        console.log("[RBAC] background revalidation triggered");
        void fetchRbac(userId, { background: true });
      }
      return;
    }

    // Cache miss - fetch fresh
    console.log("[RBAC] cache MISS - fetching fresh");
    await fetchRbac(userId);
    console.log("[RBAC] calls count:", rbacCallCount, "(cache miss)");
    setLoading(false);
  }, [applyPayload, fetchRbac]);

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
      clearCache();
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

        if (session?.user) {
          await handleRbac(session.user.id);
        } else {
          handleSignOut();
        }
      }
    );

    // Initial session check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;
        hasInitializedRef.current = true;

        if (error) {
          console.error("[Auth] session error:", error);
          setLoading(false);
          setRolesLoading(false);
          setPermissionsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await handleRbac(session.user.id);
        } else {
          setRolesLoading(false);
          setPermissionsLoading(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] init error:", err);
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
  }, [handleRbac]);

  // ============ PUBLIC API ============
  const refreshRoles = useCallback(async () => {
    if (!user?.id) return;
    clearCache();
    await fetchRbac(user.id);
  }, [user?.id, fetchRbac]);

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
    clearCache();
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
        signIn,
        signUp,
        signOut,
        refreshRoles,
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
