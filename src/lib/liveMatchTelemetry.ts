/**
 * Live Match Telemetry
 * 
 * Ring buffer logging for mobile diagnostics (no DevTools available).
 * Stores last 200 events in localStorage for admin debug pages.
 * 
 * Events tracked:
 * - app_boot, sb_client_created
 * - live_match_open, live_click
 * - enqueue, send_start, send_success, send_fail, retry_scheduled
 * - auth_error, network_error
 */

// ============ TYPES ============

export type LiveMatchLogEvent = 
  | "app_boot"
  | "sb_client_created"
  | "live_match_open"
  | "live_match_close"
  | "live_click"
  | "enqueue"
  | "send_start"
  | "send_success"
  | "send_fail"
  | "retry_scheduled"
  | "queue_start"
  | "queue_stop"
  | "auth_error"
  | "network_error"
  | "rpc_call"
  | "rpc_success"
  | "rpc_error"
  | "migrate_to_indexeddb"
  | "indexeddb_init"
  | "indexeddb_error"
  | "sync_status_change";

export interface TelemetryEntry {
  /** ISO timestamp */
  t: string;
  /** Event type */
  e: LiveMatchLogEvent;
  /** Optional context data */
  c?: Record<string, unknown>;
}

// ============ CONFIGURATION ============

const STORAGE_KEY = "m3_live_match_telemetry";
const MAX_ENTRIES = 200;

// ============ RING BUFFER ============

/**
 * Log a live match telemetry event
 */
export function logLiveMatchEvent(
  event: LiveMatchLogEvent,
  context?: Record<string, unknown>
): void {
  try {
    const entries = getLogEntries();
    
    entries.push({
      t: new Date().toISOString(),
      e: event,
      c: context,
    });
    
    // Keep only last MAX_ENTRIES
    while (entries.length > MAX_ENTRIES) {
      entries.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    
    // Also log to console in dev
    if (import.meta.env.DEV) {
      console.log(`[LiveMatch] ${event}`, context ?? "");
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get all log entries
 */
export function getLogEntries(): TelemetryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TelemetryEntry[];
  } catch {
    return [];
  }
}

/**
 * Clear all log entries
 */
export function clearLogEntries(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get entries filtered by event type
 */
export function getEntriesByType(type: LiveMatchLogEvent): TelemetryEntry[] {
  return getLogEntries().filter(e => e.e === type);
}

/**
 * Get entries for a specific match
 */
export function getEntriesForMatch(matchId: string): TelemetryEntry[] {
  return getLogEntries().filter(
    e => e.c && (e.c as any).matchId === matchId
  );
}

/**
 * Get summary statistics
 */
export function getLogStats(): {
  total: number;
  byEvent: Record<string, number>;
  errors: number;
  lastEntry: TelemetryEntry | null;
} {
  const entries = getLogEntries();
  const byEvent: Record<string, number> = {};
  let errors = 0;
  
  for (const entry of entries) {
    byEvent[entry.e] = (byEvent[entry.e] || 0) + 1;
    if (entry.e === "send_fail" || entry.e === "auth_error" || entry.e === "network_error" || entry.e === "rpc_error") {
      errors++;
    }
  }
  
  return {
    total: entries.length,
    byEvent,
    errors,
    lastEntry: entries.length > 0 ? entries[entries.length - 1] : null,
  };
}

// ============ GLOBAL INIT ============

// Log app boot on module load (runs once)
if (typeof window !== "undefined") {
  // Check if we already logged boot this session
  const bootKey = "m3_boot_logged";
  if (!sessionStorage.getItem(bootKey)) {
    sessionStorage.setItem(bootKey, "1");
    logLiveMatchEvent("app_boot", {
      url: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 100),
    });
  }
}
