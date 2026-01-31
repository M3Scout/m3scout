/**
 * Unified Fetch Logger for Dashboard data fetching.
 * 
 * Provides consistent, detailed logging for all Supabase queries.
 * Stops logging "Object" and instead shows: endpoint, status, error details.
 */

import { PostgrestError } from "@supabase/supabase-js";

export interface FetchLogContext {
  /** Name of the endpoint/view/RPC being called */
  endpoint: string;
  /** Optional context like playerId, seasonYear, etc. */
  context?: Record<string, unknown>;
}

export interface FetchErrorDetails {
  endpoint: string;
  status?: number;
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Check if an error is an AbortError (from cancelled requests)
 */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  return e.name === "AbortError" || (e.message?.toLowerCase().includes("aborted") ?? false);
}

/**
 * Extract detailed error info from a Supabase/Postgrest error
 */
export function extractErrorDetails(
  err: unknown,
  ctx: FetchLogContext
): FetchErrorDetails {
  const details: FetchErrorDetails = {
    endpoint: ctx.endpoint,
    context: ctx.context,
  };

  if (!err) return details;

  // Handle Supabase PostgrestError
  if (typeof err === "object" && err !== null) {
    const pgErr = err as Partial<PostgrestError> & { 
      status?: number; 
      statusCode?: number;
      stack?: string;
    };
    
    details.code = pgErr.code ?? undefined;
    details.message = pgErr.message ?? String(err);
    details.details = pgErr.details ?? undefined;
    details.hint = pgErr.hint ?? undefined;
    details.status = pgErr.status ?? pgErr.statusCode ?? undefined;
    details.stack = pgErr.stack ?? (err instanceof Error ? err.stack : undefined);
  } else if (typeof err === "string") {
    details.message = err;
  }

  return details;
}

/**
 * Log a fetch success
 */
export function logFetchSuccess(ctx: FetchLogContext, durationMs?: number): void {
  if (import.meta.env.DEV) {
    console.log(`[FETCH OK] ${ctx.endpoint}`, {
      ...(ctx.context || {}),
      ...(durationMs ? { duration: `${Math.round(durationMs)}ms` } : {}),
    });
  }
}

/**
 * Log a fetch error - NOT for AbortError (those are silent)
 */
export function logFetchError(err: unknown, ctx: FetchLogContext): void {
  // Skip AbortError completely
  if (isAbortError(err)) {
    if (import.meta.env.DEV) {
      console.log(`[FETCH ABORT] ${ctx.endpoint} - request cancelled (not an error)`);
    }
    return;
  }

  const details = extractErrorDetails(err, ctx);
  
  console.error(`[FETCH ERROR] ${ctx.endpoint}`, {
    status: details.status ?? "N/A",
    code: details.code ?? "N/A",
    message: details.message ?? "Unknown error",
    details: details.details ?? undefined,
    hint: details.hint ?? undefined,
    context: details.context,
  });

  // In DEV, also log stack trace
  if (import.meta.env.DEV && details.stack) {
    console.debug("[STACK]", details.stack);
  }
}

/**
 * Log when a fetch is skipped due to missing guards
 */
export function logFetchSkipped(
  endpoint: string, 
  reason: string,
  context?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.log(`[FETCH SKIP] ${endpoint} - ${reason}`, context || {});
  }
}

/**
 * Determine if an error is a permission denial (401/403)
 */
export function isPermissionDenied(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number; code?: string };
  const status = e.status ?? e.statusCode;
  if (status === 401 || status === 403) return true;
  if (e.code === "PGRST301" || e.code === "42501") return true;
  return false;
}

/**
 * Determine if an error is a bad request (400)
 */
export function isBadRequest(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number };
  const status = e.status ?? e.statusCode;
  return status === 400;
}

/**
 * Determine if an error is a server error (500+)
 */
export function isServerError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number };
  const status = e.status ?? e.statusCode;
  return status !== undefined && status >= 500;
}
