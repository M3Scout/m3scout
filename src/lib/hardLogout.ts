import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SIGNOUT_TIMEOUT_MS = 1800;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function clearAuthStorage() {
  // Supabase stores tokens under keys like: sb-<project-ref>-auth-token
  // We never rely on these values for auth; this is only to avoid a stuck client on logout.
  const patterns: RegExp[] = [/^sb-.*-auth-token$/i, /^sb-.*-refresh-token$/i, /^supabase\.auth\./i];

  const clear = (storage: Storage) => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k) keys.push(k);
      }
      for (const k of keys) {
        if (patterns.some((re) => re.test(k))) storage.removeItem(k);
      }
    } catch {
      // ignore
    }
  };

  clear(window.localStorage);
  clear(window.sessionStorage);
}

/**
 * Logout resiliente:
 * - tenta encerrar sessão, mas nunca fica travado
 * - limpa tokens locais
 * - redirect hard para /app/auth
 */
export async function hardLogoutToAuth(timeoutMs = DEFAULT_SIGNOUT_TIMEOUT_MS) {
  try {
    await Promise.race([supabase.auth.signOut(), sleep(timeoutMs)]);
  } catch {
    // ignore
  } finally {
    clearAuthStorage();
    window.location.href = "/dashboard/auth";
  }
}
