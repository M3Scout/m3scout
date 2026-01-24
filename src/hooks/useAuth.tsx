import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { retryWithBackoff } from "@/lib/retry";
import { classifyRbacError } from "@/lib/rbacError";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Valid roles that grant app access
const VALID_ROLES: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

// Priority when user has multiple roles
const ROLE_PRIORITY: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

const RBAC_BACKOFF_MS = [500, 1200, 2500];
const RBAC_ATTEMPT_TIMEOUT_MS = 4000;

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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isScout: boolean;
  isInternal: boolean;
  isPlayer: boolean;

  /** DEV diagnostics for profile/access bootstrap */
  debug: {
    rolesFetch?: {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [debug, setDebug] = useState<AuthContextType["debug"]>({});

  const nowIso = () => new Date().toISOString();

  const fetchUserRoles = async (userId: string) => {
    setRolesLoading(true);
    setRolesError(null); // Reset error at start
    try {
      setDebug({
        rolesFetch: {
          stage: "start",
          table: "user_roles",
          query: { user_id: userId },
          startedAt: nowIso(),
        },
      });

      if (import.meta.env.DEV) {
        console.log("[RBAC][Roles] start", {
          table: "user_roles",
          query: { user_id: userId },
          backoffMs: RBAC_BACKOFF_MS,
          attemptTimeoutMs: RBAC_ATTEMPT_TIMEOUT_MS,
        });
      }

      const { data, status, statusText } = await retryWithBackoff(
        async (attempt) => {
          if (import.meta.env.DEV) {
            console.log("[RBAC][Roles] attempt", attempt + 1, {
              table: "user_roles",
              query: { user_id: userId },
            });
          }

          const res = await withTimeout(
            supabase.from("user_roles").select("role, linked_player_id, status").eq("user_id", userId),
            "user_roles",
            RBAC_ATTEMPT_TIMEOUT_MS
          );

          const { data, error, status, statusText } = res as any;
          if (error) throw { ...error, status, statusText };
          return { data, status, statusText };
        },
        { backoffMs: RBAC_BACKOFF_MS }
      );

      if (data && data.length > 0) {
        // Only count active roles
        const activeRoles = data.filter((r: any) => r.status === "active");
        const rolesListRaw = activeRoles.map((r: any) => r.role).filter((r: any) => Boolean(r));
        const rolesList = sortRolesByPriority(rolesListRaw);

        if (import.meta.env.DEV) {
          console.log("[RBAC] Role resolution:", {
            userId,
            rawData: data,
            activeRoles,
            resolvedRoles: rolesList,
            primaryRole: rolesList[0] ?? null,
            isAdmin: rolesList.includes("admin"),
            isApproved: rolesList.length > 0,
            source: "user_roles",
          });
        }

        setDebug({
          rolesFetch: {
            stage: "success",
            table: "user_roles",
            query: { user_id: userId },
            startedAt: nowIso(),
            finishedAt: nowIso(),
            status,
            statusText,
          },
        });

        setRoles(rolesList);
        const playerRole = activeRoles.find((r: any) => r.role === "player");
        setLinkedPlayerId(playerRole?.linked_player_id ?? null);
      } else {
        if (import.meta.env.DEV) console.log("[RBAC][Roles] empty", { userId });
        setDebug({
          rolesFetch: {
            stage: "success",
            table: "user_roles",
            query: { user_id: userId },
            startedAt: nowIso(),
            finishedAt: nowIso(),
            status,
            statusText,
          },
        });
        setRoles([]);
        setLinkedPlayerId(null);
      }
    } catch (err) {
      const errorType = classifyRbacError(err);
      const errorObj = err as any;

      if (import.meta.env.DEV) {
        console.error("[RBAC][Roles] error", {
          errorType,
          table: "user_roles",
          query: { user_id: userId },
          code: errorObj?.code,
          message: errorObj?.message ?? String(err),
          status: errorObj?.status,
          statusText: errorObj?.statusText,
        });
      }

      setRolesError(errorType);
      setDebug({
        rolesFetch: {
          stage: "error",
          table: "user_roles",
          query: { user_id: userId },
          startedAt: nowIso(),
          finishedAt: nowIso(),
          error: {
            code: errorObj?.code ?? errorType.toUpperCase(),
            message: errorObj?.message ?? String(err),
            details: errorObj?.details,
          },
        },
      });
      setRoles([]);
      setLinkedPlayerId(null);
    } finally {
      setRolesLoading(false);
    }
  };

  // Fail-safe timeout: rolesLoading can hang if the roles fetch stalls after login.
  // IMPORTANT: This is a LAST RESORT timeout. The ProtectedRoute handles slow loading display.
  // We only set error here after a very long time (20s) to allow retries to complete.
  useEffect(() => {
    if (!rolesLoading) return;

    const timeout = setTimeout(() => {
      console.warn("[Auth] rolesLoading timeout (20s) - forcing roles loading to complete");
      setRolesLoading(false);
      // Only set error if roles are still empty after this timeout
      if (roles.length === 0) {
        setRolesError("timeout");
      }

      // Preserve existing debug if present; if it's still "start", flip to timeout error.
      setDebug((prev) => {
        const started = prev.rolesFetch?.startedAt ?? nowIso();
        const isInFlight = prev.rolesFetch?.stage === "start";
        if (!isInFlight) return prev;
        return {
          ...prev,
          rolesFetch: {
            stage: "error",
            table: "user_roles",
            query: prev.rolesFetch?.query ?? { user_id: user?.id ?? "unknown" },
            startedAt: started,
            finishedAt: nowIso(),
            status: 0,
            statusText: "timeout",
            error: {
              code: "TIMEOUT",
              message: "Timeout ao buscar user_roles",
            },
          },
        };
      });
    }, 20000); // 20 seconds - very last resort

    return () => clearTimeout(timeout);
  }, [rolesLoading, user?.id, roles.length]);

  // Fail-safe timeout: ensure loading state never hangs indefinitely
  // This is a last resort - ProtectedRoute handles slow loading UI
  useEffect(() => {
    if (!loading) return; // Already finished loading
    
    const timeout = setTimeout(() => {
      console.warn("[Auth] Loading timeout (20s) - forcing auth loading to complete");
      setLoading(false);
      setRolesLoading(false);
    }, 20000); // 20 seconds - last resort

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch roles synchronously before setting loading to false
          await fetchUserRoles(session.user.id);
        } else {
          setRoles([]);
          setLinkedPlayerId(null);
          setRolesLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      try {
        console.log("[Auth] Initializing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth] Error getting session:", error.code, error.message);
          setLoading(false);
          setRolesLoading(false);
          return;
        }
        
        console.log("[Auth] Session loaded:", session?.user?.id ?? "no session");
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch roles before setting loading to false
          await fetchUserRoles(session.user.id);
        } else {
          setRolesLoading(false);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("[Auth] Unexpected error initializing session:", err);
        setLoading(false);
        setRolesLoading(false);
      }
    };
    
    initSession();

    return () => subscription.unsubscribe();
  }, []);

  const refreshRoles = async () => {
    if (!user?.id) return;
    await fetchUserRoles(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/app`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
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
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isScout = hasRole("scout");
  const isPlayer = hasRole("player");
  const isInternal = isAdmin || isScout;
  
  // User is approved if they have at least one valid role
  const isApproved = roles.some(role => VALID_ROLES.includes(role));

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
        isApproved,
        signIn,
        signUp,
        signOut,
        refreshRoles,
        hasRole,
        isAdmin,
        isScout,
        isPlayer,
        isInternal,
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
