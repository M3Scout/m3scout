/**
 * App State Diagnostic Logger
 * 
 * Standardized logging for debugging black screen / loading issues.
 * All logs are prefixed and timestamped for easy filtering.
 * 
 * Timeline should follow: app_boot → getSession_ok → me_context_ok → ready
 */

export type AppStateEvent =
  // Boot sequence
  | "app_boot"
  | "getSession_start"
  | "getSession_ok"
  | "getSession_fail"
  | "getSession_timeout"
  | "me_context_start"
  | "me_context_ok"
  | "me_context_fail"
  | "boot_complete"
  | "boot_loading"
  // Auth recovery
  | "auth_recovery_start"
  | "auth_recovery_success"
  | "auth_recovery_fail"
  | "auth_watchdog_timeout"
  | "auth_watchdog_fallback_cache"
  | "auth_emergency_refresh"
  | "auth_401_refresh"
  | "auth_403_permission_denied"
  | "signout_due_to_auth_fail"
  // Chunk errors
  | "chunk_error_detected"
  | "chunk_recovery_run"
  | "chunk_recovery_skipped_already_ran"
  | "chunk_recovery_blocked_show_ui"
  | "appshell_timeout_reached";

interface LogContext {
  reason?: string;
  message?: string;
  url?: string;
  duration?: number;
  userId?: string;
  hasCache?: boolean;
  sbClientCount?: number;
  [key: string]: unknown;
}

const LOG_PREFIX = "[M3-Diag]";

/**
 * Log an app state event with optional context
 */
export function logAppState(event: AppStateEvent, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  
  // Always log to console with consistent format
  console.log(`${LOG_PREFIX} [${timestamp}] ${event}${contextStr}`);
  
  // Store recent events in sessionStorage for debugging
  try {
    const key = "m3_diag_log";
    const existing = sessionStorage.getItem(key);
    const logs: Array<{ t: string; e: string; c?: LogContext }> = existing 
      ? JSON.parse(existing) 
      : [];
    
    // Keep last 100 events (increased from 50)
    logs.push({ t: timestamp, e: event, c: context });
    if (logs.length > 100) {
      logs.shift();
    }
    
    sessionStorage.setItem(key, JSON.stringify(logs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get recent diagnostic logs (for debugging UI or export)
 */
export function getRecentDiagLogs(): Array<{ t: string; e: string; c?: LogContext }> {
  try {
    const raw = sessionStorage.getItem("m3_diag_log");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear diagnostic logs
 */
export function clearDiagLogs(): void {
  try {
    sessionStorage.removeItem("m3_diag_log");
  } catch {
    // Ignore
  }
}

/**
 * Get current Supabase client count (for singleton verification)
 */
export function getSbClientCount(): number {
  if (typeof window !== "undefined") {
    return window.__sbClientCount ?? 0;
  }
  return 0;
}
