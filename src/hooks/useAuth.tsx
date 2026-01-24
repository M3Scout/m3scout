import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { classifyRbacError } from "@/lib/rbacError";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Valid roles that grant app access
const VALID_ROLES: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

// Priority when user has multiple roles
const ROLE_PRIORITY: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

const RBAC_BACKOFF_MS = [500, 1200, 2500];
const RBAC_ATTEMPT_TIMEOUT_MS = 4000;

// Cache configuration - use localStorage for persistence across tabs/sessions
const RBAC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RBAC_CACHE_KEY = "m3_rbac_v2";
const RBAC_CACHE_KEY_PERSISTENT = "m3_rbac_v2_persistent"; // localStorage for cold starts

// Performance timing helper
const logTiming = (label: string, startTime?: number) => {
  if (!import.meta.env.DEV) return;
  const now = performance.now();
  const appStart = (window as any).__APP_MOUNT_START ?? now;
  const elapsed = startTime != null ? now - startTime : 0;
  console.log(`[TIMING] ${label}`, {
    sinceAppMount: `${Math.round(now - appStart)}ms`,
    ...(startTime != null && { duration: `${Math.round(elapsed)}ms` }),
  });
  return now;
};

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
type RbacCachePayload = {
  userId: string;
  roles: AppRole[];
  linkedPlayerId: string | null;
  isOwner: boolean;
  userStatus: "active" | "suspended" | null;
  permissions: UserPermissions | null; // null means use role-based defaults
  fetchedAt: number;
};

function readCache(userId: string): RbacCachePayload | null {
  try {
    // First try sessionStorage (same-tab, more recent)
    const rawSession = window.sessionStorage.getItem(RBAC_CACHE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as RbacCachePayload;
      if (parsed?.userId === userId && parsed.fetchedAt && Date.now() - parsed.fetchedAt <= RBAC_CACHE_TTL_MS) {
        return parsed;
      }
    }
    // Fallback to localStorage (persistent across tabs/cold starts)
    const rawLocal = window.localStorage.getItem(RBAC_CACHE_KEY_PERSISTENT);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as RbacCachePayload;
      if (parsed?.userId === userId && parsed.fetchedAt && Date.now() - parsed.fetchedAt <= RBAC_CACHE_TTL_MS) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(payload: RbacCachePayload) {
  try {
    const json = JSON.stringify(payload);
    window.sessionStorage.setItem(RBAC_CACHE_KEY, json);
    window.localStorage.setItem(RBAC_CACHE_KEY_PERSISTENT, json);
  } catch {
    // ignore cache failures
  }
}

function clearCache() {
  try {
    window.sessionStorage.removeItem(RBAC_CACHE_KEY);
    window.localStorage.removeItem(RBAC_CACHE_KEY_PERSISTENT);
  } catch {
    // ignore
  }
}

// ============ HELPERS ============
function withTimeout<T>(promiseLike: PromiseLike<T>, label: string, ms: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`Timeout ao buscar ${label}`)), ms);
  });
  const promise = Promise.resolve(promiseLike);
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

function sortRolesByPriority(roles: AppRole[]) {
  const idx = new Map<AppRole, number>(ROLE_PRIORITY.map((r, i) => [r, i]));
  return [...roles].sort((a, b) => (idx.get(a) ?? 999) - (idx.get(b) ?? 999));
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

// ============ DEDUPE SINGLETON ============
// Global promise to dedupe concurrent RBAC fetches
let inflightRbacPromise: Promise<RbacCachePayload | null> | null = null;

// ============ CONTEXT ============
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  linkedPlayerId: string | null;
  /** True if user has at least one valid role (not pending/member) */
  isApproved: boolean;
  /** True while roles are still being fetched after auth */
  rolesLoading: boolean;
  /** Error type if roles fetch failed: 'timeout' | 'abort' | 'network' | 'exception' | null */
  rolesError: string | null;
  /** Best-effort cache indicator */
  rolesFromCache: boolean;
  rolesFetchedAt: number | null;

  // Permissions (now centralized)
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

  /** DEV diagnostics */
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

  // Permissions state (centralized)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userStatus, setUserStatus] = useState<"active" | "suspended" | null>(null);

  const [debug, setDebug] = useState<AuthContextType["debug"]>({
    fetchStage: "idle",
    fetchSource: null,
  });

  // Track if we're currently doing a background revalidation
  const isBackgroundRef = useRef(false);
  
  // Track if document is visible (for pausing background fetches)
  const isDocumentVisibleRef = useRef(true);
  
  // Track last known good permissions (for resilience)
  const lastKnownGoodRef = useRef<RbacCachePayload | null>(null);

  // ============ CORE RBAC FETCH ============
  const doRbacFetch = useCallback(async (userId: string): Promise<RbacCachePayload | null> => {
    const startedMs = performance.now();

    if (import.meta.env.DEV) {
      console.log("[RBAC] fetch start", { userId, backoffMs: RBAC_BACKOFF_MS });
    }

    let lastErr: unknown;

    for (let attempt = 0; attempt < RBAC_BACKOFF_MS.length + 1; attempt++) {
      try {
        if (import.meta.env.DEV) {
          console.log("[RBAC] attempt", attempt + 1, { userId });
        }

        // Fetch user_roles
        const rolesRes = await withTimeout(
          supabase
            .from("user_roles")
            .select("role, linked_player_id, status, is_owner")
            .eq("user_id", userId),
          "user_roles",
          RBAC_ATTEMPT_TIMEOUT_MS
        );

        if (rolesRes.error) throw rolesRes.error;

        const roleRows = Array.isArray(rolesRes.data) ? rolesRes.data : [];
        const activeRoles = roleRows.filter((r: any) => r.status === "active");
        const rolesList = sortRolesByPriority(
          activeRoles.map((r: any) => r.role).filter(Boolean)
        );

        const isAdminRole = rolesList.includes("admin");
        const isPlayerRole = rolesList.includes("player");

        const playerRole = activeRoles.find((r: any) => r.role === "player");
        const linkedPlayerIdValue = playerRole?.linked_player_id ?? null;

        const isOwnerAny = roleRows.some((r: any) => Boolean(r?.is_owner));
        const statusValues = roleRows.map((r: any) => r?.status).filter(Boolean);
        const derivedStatus: "active" | "suspended" | null = statusValues.includes("suspended")
          ? "suspended"
          : statusValues.includes("active")
            ? "active"
            : null;

        // ADMIN BYPASS: Don't fetch user_permissions for admin
        let permsFromDb: UserPermissions | null = null;
        if (!isAdminRole && !isPlayerRole && rolesList.length > 0) {
          // Only fetch user_permissions for non-admin, non-player roles
          const permsRes = await withTimeout(
            supabase
              .from("user_permissions")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(1),
            "user_permissions",
            RBAC_ATTEMPT_TIMEOUT_MS
          );

          if (permsRes.error) throw permsRes.error;

          const permsRow = Array.isArray(permsRes.data) ? permsRes.data[0] ?? null : null;
          if (permsRow) {
            permsFromDb = {
              ...permsRow,
              // SECURITY: Force delete=false for non-admins
              players_delete: false,
              reports_delete: false,
              competitions_delete: false,
              news_delete: false,
              leads_delete: false,
            } as UserPermissions;
          }
        }

        const fetchedAt = Date.now();
        const payload: RbacCachePayload = {
          userId,
          roles: rolesList,
          linkedPlayerId: linkedPlayerIdValue,
          isOwner: isOwnerAny,
          userStatus: derivedStatus,
          permissions: permsFromDb,
          fetchedAt,
        };

        if (import.meta.env.DEV) {
          console.log("[RBAC] success", {
            userId,
            roles: rolesList,
            isAdmin: isAdminRole,
            isPlayer: isPlayerRole,
            durationMs: Math.round(performance.now() - startedMs),
          });
        }

        return payload;
      } catch (e) {
        lastErr = e;
        const delay = RBAC_BACKOFF_MS[attempt];
        if (delay == null) break;

        // Don't retry on 401/403/400
        const errObj = e as any;
        const status = errObj?.status ?? errObj?.code;
        if (status === 401 || status === 403 || status === 400) {
          if (import.meta.env.DEV) {
            console.warn("[RBAC] non-retryable error", { status });
          }
          break;
        }

        if (import.meta.env.DEV) {
          console.log("[RBAC] retry after", delay, "ms");
        }
        await sleep(delay);
      }
    }

    // All retries exhausted
    const errorType = classifyRbacError(lastErr);
    if (import.meta.env.DEV) {
      console.error("[RBAC] fetch failed", {
        errorType,
        error: lastErr,
        durationMs: Math.round(performance.now() - startedMs),
      });
    }

    throw { errorType, originalError: lastErr };
  }, []);

  // ============ MAIN FETCH WITH DEDUPE + CACHE ============
  const fetchRbac = useCallback(
    async (userId: string, opts?: { background?: boolean }) => {
      const background = Boolean(opts?.background);
      isBackgroundRef.current = background;

      if (!background) {
        setRolesLoading(true);
        setPermissionsLoading(true);
        setRolesError(null);
        setPermissionsError(null);
      }

      setDebug({
        fetchStage: "start",
        fetchSource: background ? "background" : "fresh",
      });

      // DEDUPE: If there's already a fetch in flight, await it
      if (inflightRbacPromise) {
        if (import.meta.env.DEV) {
          console.log("[RBAC] dedupe - awaiting existing fetch");
        }
        try {
          const result = await inflightRbacPromise;
          if (result) {
            applyRbacPayload(result, background);
          }
        } catch {
          // Error already handled by original fetch
        }
        return;
      }

      // Start new fetch
      const fetchPromise = doRbacFetch(userId);
      inflightRbacPromise = fetchPromise;

      try {
        const result = await fetchPromise;
        if (result) {
          writeCache(result);
          lastKnownGoodRef.current = result;
          applyRbacPayload(result, background);
        }
      } catch (err: any) {
        const errorType = err?.errorType ?? classifyRbacError(err);

        // CRITICAL FIX: Treat "abort" as a non-error (tab switch, navigation, etc.)
        // Also, if we have last known good permissions, DON'T set error state
        const hasGoodFallback = lastKnownGoodRef.current !== null || roles.length > 0;
        const isAbortError = errorType === "abort";

        if (isAbortError) {
          if (import.meta.env.DEV) {
            console.log("[RBAC] Ignoring abort error (tab switch or navigation)");
          }
          // DON'T set error state for aborts - just silently ignore
          if (!background) {
            setRolesLoading(false);
            setPermissionsLoading(false);
          }
          return;
        }

        // If we have valid cached/known permissions, DON'T block UI with error
        if (background && hasGoodFallback) {
          if (import.meta.env.DEV) {
            console.log("[RBAC] Background fetch failed but have fallback, ignoring error", { errorType });
          }
          // Keep current state, don't set error
          return;
        }

        // Only set error if this is a foreground fetch without fallback
        if (!hasGoodFallback) {
          setRolesError(errorType);
          setPermissionsError(errorType);
        }
        
        setDebug({
          fetchStage: "error",
          fetchSource: background ? "background" : "fresh",
          error: { code: errorType, message: err?.originalError?.message ?? String(err) },
        });

        if (!background) {
          setRolesLoading(false);
          setPermissionsLoading(false);
        }
      } finally {
        inflightRbacPromise = null;
      }
    },
    [doRbacFetch, roles.length]
  );

  const applyRbacPayload = useCallback(
    (payload: RbacCachePayload, fromCache: boolean) => {
      const isAdminRole = payload.roles.includes("admin");
      const isPlayerRole = payload.roles.includes("player");

      // Store as last known good state (for resilience)
      lastKnownGoodRef.current = payload;

      setRoles(payload.roles);
      setLinkedPlayerId(payload.linkedPlayerId);
      setIsOwner(payload.isOwner);
      setUserStatus(payload.userStatus);
      setRolesFromCache(fromCache);
      setRolesFetchedAt(payload.fetchedAt);
      setRolesError(null);
      setPermissionsError(null);

      // Compute permissions based on role
      if (isAdminRole) {
        setPermissions(ADMIN_PERMISSIONS);
      } else if (isPlayerRole) {
        setPermissions(PLAYER_PERMISSIONS);
      } else if (payload.permissions) {
        setPermissions(payload.permissions);
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }

      if (!isBackgroundRef.current) {
        setRolesLoading(false);
        setPermissionsLoading(false);
      }

      setDebug({
        fetchStage: "success",
        fetchSource: fromCache ? "cache" : "fresh",
      });

      if (import.meta.env.DEV) {
        console.log("[RBAC] applied", {
          userId: payload.userId,
          roles: payload.roles,
          isAdmin: isAdminRole,
          isPlayer: isPlayerRole,
          fromCache,
        });
      }
    },
    []
  );

  // ============ INIT + AUTH STATE CHANGE ============
  useEffect(() => {
    const authStart = logTiming("Auth init start");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logTiming("Auth state changed: " + event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fast path: use cache (now includes localStorage for cold starts!)
          const cached = readCache(session.user.id);
          if (cached) {
            logTiming("RBAC cache hit (localStorage/sessionStorage)");
            applyRbacPayload(cached, true);
            setLoading(false);
            // Revalidate in background - NON-BLOCKING
            void fetchRbac(session.user.id, { background: true });
          } else {
            const rbacStart = logTiming("RBAC fetch start (no cache)");
            await fetchRbac(session.user.id);
            logTiming("RBAC fetch complete", rbacStart);
            setLoading(false);
          }
        } else {
          // Signed out
          setRoles([]);
          setLinkedPlayerId(null);
          setIsOwner(false);
          setUserStatus(null);
          setPermissions(null);
          setRolesFromCache(false);
          setRolesFetchedAt(null);
          setRolesLoading(false);
          setPermissionsLoading(false);
          clearCache();
          setLoading(false);
        }
      }
    );

    // Check for existing session
    const initSession = async () => {
      try {
        logTiming("Auth getSession start");
        const sessionStart = performance.now();
        const { data: { session }, error } = await supabase.auth.getSession();
        logTiming("Auth getSession complete", sessionStart);

        if (error) {
          console.error("[Auth] session error:", error.code, error.message);
          setLoading(false);
          setRolesLoading(false);
          setPermissionsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const cached = readCache(session.user.id);
          if (cached) {
            logTiming("RBAC cache hit (init)");
            applyRbacPayload(cached, true);
            setLoading(false);
            // Background revalidate - NON-BLOCKING
            void fetchRbac(session.user.id, { background: true });
          } else {
            const rbacStart = logTiming("RBAC fetch start (init, no cache)");
            await fetchRbac(session.user.id);
            logTiming("RBAC fetch complete (init)", rbacStart);
            setLoading(false);
          }
        } else {
          logTiming("No session - public user");
          setRolesLoading(false);
          setPermissionsLoading(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] init error:", err);
        setLoading(false);
        setRolesLoading(false);
        setPermissionsLoading(false);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, [fetchRbac, applyRbacPayload]);

  // ============ FAIL-SAFE TIMEOUT ============
  useEffect(() => {
    if (!rolesLoading && !permissionsLoading) return;

    const timeout = setTimeout(() => {
      console.warn("[Auth] RBAC timeout (15s) - forcing completion");
      setRolesLoading(false);
      setPermissionsLoading(false);
      // Only set error if we don't have any valid permissions
      if (roles.length === 0 && !lastKnownGoodRef.current) {
        setRolesError("timeout");
        setPermissionsError("timeout");
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [rolesLoading, permissionsLoading, roles.length]);

  // ============ VISIBILITY CHANGE HANDLER ============
  // Revalidate permissions in BACKGROUND when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible";
      isDocumentVisibleRef.current = isVisible;

      if (isVisible && user?.id) {
        if (import.meta.env.DEV) {
          console.log("[RBAC] Tab became visible, revalidating in background...");
        }
        // Clear any existing error state when tab becomes visible
        // This ensures we don't show stale errors
        if (rolesError || permissionsError) {
          setRolesError(null);
          setPermissionsError(null);
        }
        // Revalidate in background (won't block UI or trigger error state)
        void fetchRbac(user.id, { background: true });
      }
    };

    const handleWindowFocus = () => {
      if (user?.id && isDocumentVisibleRef.current) {
        if (import.meta.env.DEV) {
          console.log("[RBAC] Window focused, revalidating in background...");
        }
        // Clear errors on focus as well
        if (rolesError || permissionsError) {
          setRolesError(null);
          setPermissionsError(null);
        }
        void fetchRbac(user.id, { background: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user?.id, fetchRbac, rolesError, permissionsError]);

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
