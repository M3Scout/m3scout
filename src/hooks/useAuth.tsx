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
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isScout: boolean;
  isInternal: boolean;
  isPlayer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);

  const fetchUserRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, linked_player_id, status")
        .eq("user_id", userId);

      if (!error && data) {
        // Only count active roles
        const activeRoles = data.filter(r => r.status === 'active');
        setRoles(activeRoles.map((r) => r.role));
        // Get linked_player_id if user is a player
        const playerRole = activeRoles.find((r) => r.role === "player");
        setLinkedPlayerId(playerRole?.linked_player_id ?? null);
      } else {
        setRoles([]);
        setLinkedPlayerId(null);
      }
    } catch (err) {
      console.error("Error fetching user roles:", err);
      setRoles([]);
      setLinkedPlayerId(null);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch roles before setting loading to false
        await fetchUserRoles(session.user.id);
      } else {
        setRolesLoading(false);
      }
      
      setLoading(false);
    };
    
    initSession();

    return () => subscription.unsubscribe();
  }, []);

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
        hasRole,
        isAdmin,
        isScout,
        isPlayer,
        isInternal,
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
