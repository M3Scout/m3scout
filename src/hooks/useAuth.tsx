import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

// Valid roles that grant app access
const VALID_ROLES: AppRole[] = ["admin", "scout", "editor", "viewer", "player"];

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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);
  const [debug, setDebug] = useState<AuthContextType["debug"]>({});

  const nowIso = () => new Date().toISOString();

  const fetchUserRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      setDebug({
        rolesFetch: {
          stage: "start",
          table: "user_roles",
          query: { user_id: userId },
          startedAt: nowIso(),
        },
      });

      console.log("[Auth] Fetching roles for user:", userId);
      
      const { data, error, status, statusText } = await supabase
        .from("user_roles")
        .select("role, linked_player_id, status")
        .eq("user_id", userId);

      if (error) {
        console.error("[Auth] Error fetching user roles:", error.code, error.message);
        setDebug({
          rolesFetch: {
            stage: "error",
            table: "user_roles",
            query: { user_id: userId },
            startedAt: nowIso(),
            finishedAt: nowIso(),
            status,
            statusText,
            error: {
              code: (error as any)?.code,
              message: (error as any)?.message,
              details: (error as any)?.details,
              hint: (error as any)?.hint,
            },
          },
        });
        setRoles([]);
        setLinkedPlayerId(null);
      } else if (data && data.length > 0) {
        console.log("[Auth] Roles fetched:", data);
        
        // Only count active roles
        const activeRoles = data.filter(r => r.status === 'active');
        const rolesList = activeRoles.map((r) => r.role);
        
        // RBAC Debug log
        console.log("[RBAC] Role resolution:", {
          userId,
          rawData: data,
          activeRoles,
          resolvedRoles: rolesList,
          isAdmin: rolesList.includes('admin'),
          isApproved: rolesList.length > 0,
          source: 'user_roles'
        });
        
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
        // Get linked_player_id if user is a player
        const playerRole = activeRoles.find((r) => r.role === "player");
        setLinkedPlayerId(playerRole?.linked_player_id ?? null);
      } else {
        console.log("[Auth] No roles found for user");
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
      console.error("[Auth] Unexpected error fetching user roles:", err);
      setDebug({
        rolesFetch: {
          stage: "error",
          table: "user_roles",
          query: { user_id: userId },
          startedAt: nowIso(),
          finishedAt: nowIso(),
          error: {
            code: (err as any)?.code,
            message: (err as any)?.message ?? String(err),
            details: (err as any)?.details,
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
  useEffect(() => {
    if (!rolesLoading) return;

    const timeout = setTimeout(() => {
      console.warn("[Auth] rolesLoading timeout - forcing roles loading to complete");
      setRolesLoading(false);

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
    }, 8000);

    return () => clearTimeout(timeout);
  }, [rolesLoading, user?.id]);

  // Fail-safe timeout: ensure loading state never hangs indefinitely
  useEffect(() => {
    if (!loading) return; // Already finished loading
    
    const timeout = setTimeout(() => {
      console.warn("[Auth] Loading timeout - forcing auth loading to complete");
      setLoading(false);
      setRolesLoading(false);
    }, 8000); // 8 seconds

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
