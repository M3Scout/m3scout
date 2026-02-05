import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SIGNOUT_TIMEOUT_MS = 1800;
const DEFAULT_REDIRECT_TO = "/login";

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function clearSupabaseAuthStorage() {
  // Supabase stores tokens under keys like: sb-<project-ref>-auth-token
  // We clear only auth-related keys to avoid wiping unrelated app state.
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

function isTimeoutishError(err: unknown): boolean {
  const msg = (err as any)?.message as string | undefined;
  if (!msg) return false;
  return msg.toLowerCase().includes("timeout");
}

/**
 * Hard reset auth state and redirect to login.
 * Designed for iOS/Safari cases where `getSession()` can hang indefinitely.
 */
export async function hardResetAuthToLogin(opts?: {
  redirectTo?: string;
  message?: string;
  reason?: string;
  timeoutMs?: number;
  error?: unknown;
}) {
  const redirectTo = opts?.redirectTo ?? DEFAULT_REDIRECT_TO;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_SIGNOUT_TIMEOUT_MS;

  // Persist a user-facing message for the login page.
  if (opts?.message) {
    try {
      sessionStorage.setItem("m3_auth_boot_message", opts.message);
    } catch {
      // ignore
    }
  }

  // Clear storage first (requested behavior) to prevent re-hydrating a bad session.
  clearSupabaseAuthStorage();

  try {
    // Local scope: never blocks on network.
    await Promise.race([supabase.auth.signOut({ scope: "local" }), sleep(timeoutMs)]);
  } catch {
    // ignore
  } finally {
    // Ensure no auth keys were re-written.
    clearSupabaseAuthStorage();

    // Add minimal reason markers for post-mortem.
    try {
      sessionStorage.setItem(
        "m3_auth_boot_reason",
        JSON.stringify({
          reason: opts?.reason ?? "unknown",
          timeoutish: isTimeoutishError(opts?.error),
          at: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }

    window.location.href = redirectTo;
  }
}
