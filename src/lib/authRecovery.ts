/**
 * Auth Recovery Service
 * 
 * Implements "big site" behavior:
 * - SWR (Stale-While-Revalidate) cache pattern
 * - Automatic recovery on tab focus/visibility
 * - Silent token refresh when expiring
 * - Login redirect ONLY as last resort
 * 
 * @see .memory/architecture/auth/performance-resilience-standard
 */

import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { retryWithBackoff } from "@/lib/retry";

// ============ TYPES ============
export interface RbacPayload {
  userId: string;
  roles: string[];
  isAdmin: boolean;
  isPlayer: boolean;
  isOwner: boolean;
  linkedPlayerId: string | null;
  userStatus: "active" | "suspended" | null;
  permissions: Record<string, boolean> | null;
  fetchedAt: number;
  expiresAt: number;
}

export type RecoveryReason = 
  | "focus" 
  | "visible" 
  | "manual-retry" 
  | "init" 
  | "token-refresh"
  | "error-recovery";

export type RecoveryResult = 
  | { success: true; payload: RbacPayload }
  | { success: false; reason: string; shouldLogout: boolean };

// ============ CONFIGURATION ============
const RBAC_CACHE_KEY = "m3_rbac_v3";
const RBAC_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refresh if expires in < 5 min
const FETCH_TIMEOUT_MS = 10000; // 10s timeout
const RETRY_BACKOFF = [0, 800, 2000]; // 3 attempts with backoff
const BACKGROUND_RETRY_INTERVAL_MS = 30 * 1000; // 30s between background retries

// ============ MODULE STATE (SINGLETON) ============
let inFlightPromise: Promise<RbacPayload | null> | null = null;
let inFlightAbortController: AbortController | null = null;
let memoryCache: RbacPayload | null = null;
let backgroundRetryTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryListenersActive = false;

// ============ STORAGE CACHE ============

export function readRbacCache(userId: string): RbacPayload | null {
  try {
    // First check memory cache (fastest)
    if (memoryCache && memoryCache.userId === userId) {
      if (Date.now() < memoryCache.expiresAt) {
        return memoryCache;
      }
      memoryCache = null;
    }

    // Then check localStorage
    const raw = localStorage.getItem(RBAC_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RbacPayload;

    // Validate schema
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(RBAC_CACHE_KEY);
      return null;
    }

    if (!parsed.userId || !parsed.expiresAt || !Array.isArray(parsed.roles)) {
      localStorage.removeItem(RBAC_CACHE_KEY);
      return null;
    }

    // Validate user match
    if (parsed.userId !== userId) {
      localStorage.removeItem(RBAC_CACHE_KEY);
      return null;
    }

    // Check expiration
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(RBAC_CACHE_KEY);
      return null;
    }

    // Update memory cache
    memoryCache = parsed;
    return parsed;
  } catch {
    try {
      localStorage.removeItem(RBAC_CACHE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function writeRbacCache(payload: RbacPayload): void {
  try {
    memoryCache = payload;
    localStorage.setItem(RBAC_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore write failures
  }
}

export function clearRbacCache(): void {
  memoryCache = null;
  try {
    localStorage.removeItem(RBAC_CACHE_KEY);
  } catch {
    // Ignore
  }
}

// ============ DEDUPE CLEANUP ============

/**
 * CRITICAL: Reset inflight state to prevent stuck promises.
 * Called on any error/timeout/abort to ensure future fetches aren't blocked.
 */
export function resetInflightState(): void {
  if (inFlightAbortController) {
    try {
      inFlightAbortController.abort();
    } catch {
      // Ignore
    }
  }
  inFlightPromise = null;
  inFlightAbortController = null;
  
  if (import.meta.env.DEV) {
    console.log("[AuthRecovery] Inflight state reset");
  }
}

// ============ TOKEN UTILITIES ============

function isTokenExpiringSoon(session: Session): boolean {
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  const expiresAtMs = expiresAt * 1000;
  return expiresAtMs - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  return e.name === "AbortError" || (e.message?.toLowerCase().includes("aborted") ?? false);
}

function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number; code?: string };
  const status = e.status ?? e.statusCode;
  if (status === 401 || status === 403) return true;
  if (e.code === "PGRST301" || e.code === "42501") return true;
  return false;
}

// ============ RAW RBAC FETCH ============

async function fetchRbacRaw(
  userId: string,
  signal?: AbortSignal
): Promise<RbacPayload | null> {
  const startTime = Date.now();

  const { data, error } = await supabase.rpc("get_user_rbac", { p_user_id: userId });

  const duration = Date.now() - startTime;

  if (error) {
    console.error("[AuthRecovery] RPC error", { 
      code: error.code, 
      message: error.message,
      details: error.details,
      hint: error.hint,
      duration: `${duration}ms` 
    });
    throw error;
  }

  if (!data) {
    console.warn("[AuthRecovery] RPC returned no data");
    return null;
  }

  const rbacData = data as unknown as {
    userId: string;
    roles: string[];
    isAdmin: boolean;
    isPlayer: boolean;
    isOwner: boolean;
    linkedPlayerId: string | null;
    userStatus: string | null;
    permissions: Record<string, boolean> | null;
    fetchedAt: number;
    ttlSeconds: number;
  };

  const payload: RbacPayload = {
    userId: rbacData.userId,
    roles: rbacData.roles || [],
    isAdmin: rbacData.isAdmin,
    isPlayer: rbacData.isPlayer,
    isOwner: rbacData.isOwner,
    linkedPlayerId: rbacData.linkedPlayerId,
    userStatus: (rbacData.userStatus as "active" | "suspended") ?? null,
    permissions: rbacData.permissions,
    fetchedAt: rbacData.fetchedAt,
    expiresAt: rbacData.fetchedAt + Math.min(rbacData.ttlSeconds * 1000, RBAC_CACHE_TTL_MS),
  };

  if (import.meta.env.DEV) {
    console.log("[AuthRecovery] RBAC fetch success", {
      userId: payload.userId,
      roles: payload.roles,
      isAdmin: payload.isAdmin,
      duration: `${duration}ms`,
    });
  }

  return payload;
}

// ============ FETCH WITH TIMEOUT + RETRY ============

async function fetchRbacWithRetry(
  userId: string,
  opts?: { signal?: AbortSignal }
): Promise<RbacPayload | null> {
  return retryWithBackoff(
    async () => {
      // Create timeout race
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        // Abort if parent signal is aborted
        if (opts?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const result = await fetchRbacRaw(userId, controller.signal);
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    },
    { backoffMs: RETRY_BACKOFF, nonRetryableStatuses: [401, 403, 400] }
  );
}

// ============ MAIN RECOVERY FUNCTION ============

/**
 * UNIFIED recovery function for auth + RBAC.
 * Used by:
 * - focus/visibility listeners
 * - Manual Retry button
 * - Token refresh events
 * 
 * Implements "big site" behavior:
 * 1. Check session validity, refresh if expiring
 * 2. Clear stuck dedupe state
 * 3. Fetch RBAC with retry + backoff
 * 4. On success: persist cache and return payload
 * 5. On failure: only redirect to login as LAST resort
 */
export async function recoverAuthAndRbac(
  reason: RecoveryReason,
  callbacks?: {
    onRecovering?: () => void;
    onSuccess?: (payload: RbacPayload) => void;
    onError?: (error: string) => void;
  }
): Promise<RecoveryResult> {
  console.log("[AuthRecovery] recover start", { reason });
  callbacks?.onRecovering?.();

  try {
    // (A) Get current session
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("[AuthRecovery] getSession error", sessionError);
      // Session error but might recover - don't logout yet
      return { success: false, reason: "session-error", shouldLogout: false };
    }

    // (B) No session = definitely need login
    if (!currentSession?.user) {
      console.log("[AuthRecovery] no session - redirect to login");
      return { success: false, reason: "no-session", shouldLogout: true };
    }

    let session = currentSession;

    // (C) Refresh token if expiring soon
    if (isTokenExpiringSoon(session)) {
      console.log("[AuthRecovery] token expiring soon, refreshing...", {
        expiresAt: session.expires_at,
        expiresIn: session.expires_at ? `${Math.round((session.expires_at * 1000 - Date.now()) / 1000)}s` : "unknown",
      });

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error("[AuthRecovery] refresh failed", refreshError);
        // Refresh failed - check if we still have valid session
        const { data: { session: checkSession } } = await supabase.auth.getSession();
        if (!checkSession?.user) {
          return { success: false, reason: "refresh-failed-no-session", shouldLogout: true };
        }
        session = checkSession;
      } else if (refreshData.session) {
        console.log("[AuthRecovery] token refreshed successfully");
        session = refreshData.session;
      }
    }

    // (D) CRITICAL: Reset dedupe state to prevent stuck promises
    resetInflightState();

    // Check if we have valid cache - if so, use SWR approach
    const cached = readRbacCache(session.user.id);
    const hasValidCache = cached !== null;

    if (hasValidCache && reason !== "manual-retry") {
      // SWR: Return cached immediately, revalidate in background
      console.log("[AuthRecovery] SWR mode - using cache, revalidating in background", {
        cacheAge: `${Math.round((Date.now() - cached.fetchedAt) / 1000)}s`,
      });
      
      // Schedule background revalidation
      scheduleBackgroundRevalidation(session.user.id);
      
      callbacks?.onSuccess?.(cached);
      return { success: true, payload: cached };
    }

    // (E) Fetch RBAC with timeout + retries
    const controller = new AbortController();
    inFlightAbortController = controller;

    const promise = fetchRbacWithRetry(session.user.id, { signal: controller.signal });
    inFlightPromise = promise;

    const payload = await promise;

    // (F) Handle result
    if (!payload) {
      console.warn("[AuthRecovery] RBAC returned null");
      
      // If we have cache, use it
      if (hasValidCache) {
        callbacks?.onSuccess?.(cached);
        return { success: true, payload: cached };
      }
      
      return { success: false, reason: "rbac-no-data", shouldLogout: false };
    }

    // (G) Persist cache and return success
    writeRbacCache(payload);
    callbacks?.onSuccess?.(payload);

    console.log("[AuthRecovery] recover success");
    return { success: true, payload };

  } catch (err: unknown) {
    console.error("[AuthRecovery] recover error", err);

    // AbortError is not a real error
    if (isAbortError(err)) {
      console.log("[AuthRecovery] aborted - not an error");
      return { success: false, reason: "aborted", shouldLogout: false };
    }

    // Permission denied = invalid session/permissions
    if (isPermissionDenied(err)) {
      console.log("[AuthRecovery] permission denied - redirect to login");
      return { success: false, reason: "rbac-401-403", shouldLogout: true };
    }

    // Check if we have valid cache as fallback
    const currentUserId = (await supabase.auth.getSession()).data.session?.user?.id;
    if (currentUserId) {
      const cached = readRbacCache(currentUserId);
      if (cached) {
        console.log("[AuthRecovery] using cached RBAC as fallback");
        callbacks?.onSuccess?.(cached);
        
        // Schedule background retry
        scheduleBackgroundRevalidation(currentUserId);
        
        return { success: true, payload: cached };
      }
    }

    // No cache, failed after retries = last resort
    console.warn("[AuthRecovery] no cache and fetch failed - should logout");
    callbacks?.onError?.((err as Error)?.message ?? "Unknown error");
    return { success: false, reason: "rbac-timeout-no-cache", shouldLogout: true };

  } finally {
    inFlightPromise = null;
    inFlightAbortController = null;
  }
}

// ============ BACKGROUND REVALIDATION ============

function scheduleBackgroundRevalidation(userId: string): void {
  // Clear any existing timer
  if (backgroundRetryTimer) {
    clearTimeout(backgroundRetryTimer);
  }

  backgroundRetryTimer = setTimeout(async () => {
    console.log("[AuthRecovery] background revalidation triggered");
    
    try {
      const payload = await fetchRbacWithRetry(userId);
      if (payload) {
        writeRbacCache(payload);
        console.log("[AuthRecovery] background revalidation success");
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.warn("[AuthRecovery] background revalidation failed", err);
        // Schedule another retry
        scheduleBackgroundRevalidation(userId);
      }
    }
  }, BACKGROUND_RETRY_INTERVAL_MS);
}

// ============ VISIBILITY/FOCUS LISTENERS ============

let onRecoveryCallback: ((reason: RecoveryReason) => void) | null = null;

/**
 * Initialize visibility/focus listeners for automatic recovery.
 * Call this once from the AuthProvider.
 */
export function initRecoveryListeners(
  onRecover: (reason: RecoveryReason) => void
): () => void {
  if (recoveryListenersActive) {
    console.warn("[AuthRecovery] listeners already active");
    return () => {};
  }

  onRecoveryCallback = onRecover;
  recoveryListenersActive = true;

  const handleFocus = () => {
    console.log("[AuthRecovery] window focus - checking recovery");
    onRecoveryCallback?.("focus");
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      console.log("[AuthRecovery] tab visible - checking recovery");
      onRecoveryCallback?.("visible");
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  console.log("[AuthRecovery] listeners initialized");

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
    onRecoveryCallback = null;
    recoveryListenersActive = false;
    
    if (backgroundRetryTimer) {
      clearTimeout(backgroundRetryTimer);
      backgroundRetryTimer = null;
    }
    
    console.log("[AuthRecovery] listeners cleaned up");
  };
}

/**
 * Check if we should trigger recovery based on cache state.
 * Used by visibility/focus handlers to decide if recovery is needed.
 */
export function shouldTriggerRecovery(userId: string | null): boolean {
  if (!userId) return false;
  
  const cached = readRbacCache(userId);
  
  // If no cache, definitely need recovery
  if (!cached) return true;
  
  // If cache is older than 5 minutes, do background revalidation
  const cacheAge = Date.now() - cached.fetchedAt;
  return cacheAge > 5 * 60 * 1000;
}

// ============ CLEANUP LEGACY CACHES ============

export function cleanupLegacyCaches(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith("m3_rbac_v1") ||
        key.startsWith("m3_rbac_v2") ||
        key === "m3_rbac_v2_persistent"
      )) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      console.log("[AuthRecovery] Removed legacy cache:", key);
    }
  } catch {
    // Ignore
  }
}
