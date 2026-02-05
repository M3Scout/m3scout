/**
 * Live Match Event Queue
 * 
 * Implements resilient event recording for Live Match:
 * - Optimistic UI updates (immediate visual feedback)
 * - Event queue with states: pending → sent → confirmed / failed
 * - LocalStorage persistence for offline/network failures
 * - Automatic retry with exponential backoff
 * - Idempotent writes using client_event_id
 * 
 * @see .memory/architecture/live-match-event-only-display-policy
 */

import { supabase } from "@/integrations/supabase/client";
import { logLiveMatchEvent, type LiveMatchLogEvent } from "@/lib/liveMatchTelemetry";

// ============ TYPES ============

export type QueuedEventStatus = "pending" | "sending" | "confirmed" | "failed";

export interface QueuedEvent {
  /** Unique client-generated ID for idempotency */
  clientEventId: string;
  /** Match this event belongs to */
  matchId: string;
  /** Player ID */
  playerId: string;
  /** Event type (goal, assist, etc.) */
  eventType: string;
  /** Half (1 or 2) */
  half: number | null;
  /** Forced time in seconds (optional) */
  forceTimeSeconds: number | null;
  /** Optional notes */
  notes: string | null;
  /** Display minute string */
  displayMinute: string | null;
  /** Queue status */
  status: QueuedEventStatus;
  /** Number of retry attempts */
  retryCount: number;
  /** Timestamp when queued */
  queuedAt: number;
  /** Last attempt timestamp */
  lastAttemptAt: number | null;
  /** Error message if failed */
  errorMessage: string | null;
  /** HTTP status code from last error */
  errorCode: number | null;
  /** Server-assigned event ID after confirmation */
  serverEventId: string | null;
}

export interface QueueState {
  events: QueuedEvent[];
  lastProcessedAt: number | null;
}

// ============ CONFIGURATION ============

const STORAGE_KEY_PREFIX = "m3_live_match_queue_";
const MAX_RETRY_COUNT = 3;
const RETRY_BACKOFF_MS = [1000, 2000, 4000]; // 1s, 2s, 4s
const QUEUE_PROCESS_INTERVAL_MS = 2000; // Process queue every 2s
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24h - purge old events

// ============ MODULE STATE ============

let activeQueueProcessors: Map<string, ReturnType<typeof setInterval>> = new Map();
let queueListeners: Map<string, Set<(state: QueueState) => void>> = new Map();

// ============ STORAGE ============

function getStorageKey(matchId: string): string {
  return `${STORAGE_KEY_PREFIX}${matchId}`;
}

export function loadQueue(matchId: string): QueueState {
  try {
    const raw = localStorage.getItem(getStorageKey(matchId));
    if (!raw) return { events: [], lastProcessedAt: null };
    
    const parsed = JSON.parse(raw) as QueueState;
    
    // Filter out stale events (older than 24h)
    const now = Date.now();
    parsed.events = parsed.events.filter(
      e => now - e.queuedAt < MAX_QUEUE_AGE_MS
    );
    
    return parsed;
  } catch {
    return { events: [], lastProcessedAt: null };
  }
}

function saveQueue(matchId: string, state: QueueState): void {
  try {
    localStorage.setItem(getStorageKey(matchId), JSON.stringify(state));
    notifyListeners(matchId, state);
  } catch {
    console.warn("[EventQueue] Failed to save queue to localStorage");
  }
}

// ============ QUEUE OPERATIONS ============

/**
 * Generate a unique client event ID
 */
export function generateClientEventId(): string {
  return crypto.randomUUID();
}

/**
 * Enqueue a new event (optimistic - returns immediately)
 */
export function enqueueEvent(params: {
  matchId: string;
  playerId: string;
  eventType: string;
  half?: number | null;
  forceTimeSeconds?: number | null;
  notes?: string | null;
  displayMinute?: string | null;
}): QueuedEvent {
  const clientEventId = generateClientEventId();
  const now = Date.now();
  
  const event: QueuedEvent = {
    clientEventId,
    matchId: params.matchId,
    playerId: params.playerId,
    eventType: params.eventType,
    half: params.half ?? null,
    forceTimeSeconds: params.forceTimeSeconds ?? null,
    notes: params.notes ?? null,
    displayMinute: params.displayMinute ?? null,
    status: "pending",
    retryCount: 0,
    queuedAt: now,
    lastAttemptAt: null,
    errorMessage: null,
    errorCode: null,
    serverEventId: null,
  };
  
  const state = loadQueue(params.matchId);
  state.events.push(event);
  saveQueue(params.matchId, state);
  
  logLiveMatchEvent("enqueue", {
    matchId: params.matchId,
    clientEventId,
    eventType: params.eventType,
  });
  
  // Ensure queue processor is running
  startQueueProcessor(params.matchId);
  
  return event;
}

/**
 * Update an event's status in the queue
 */
function updateEventStatus(
  matchId: string, 
  clientEventId: string, 
  updates: Partial<QueuedEvent>
): void {
  const state = loadQueue(matchId);
  const idx = state.events.findIndex(e => e.clientEventId === clientEventId);
  
  if (idx === -1) return;
  
  state.events[idx] = { ...state.events[idx], ...updates };
  saveQueue(matchId, state);
}

/**
 * Remove confirmed events from queue
 */
function removeConfirmedEvents(matchId: string): void {
  const state = loadQueue(matchId);
  state.events = state.events.filter(e => e.status !== "confirmed");
  state.lastProcessedAt = Date.now();
  saveQueue(matchId, state);
}

// ============ SEND LOGIC ============

/**
 * Send a single event to the server
 */
async function sendEvent(event: QueuedEvent): Promise<{
  success: boolean;
  serverEventId?: string;
  errorCode?: number;
  errorMessage?: string;
}> {
  logLiveMatchEvent("send_start", {
    matchId: event.matchId,
    clientEventId: event.clientEventId,
    eventType: event.eventType,
    retryCount: event.retryCount,
  });
  
  try {
    const { data, error } = await (supabase.rpc as Function)("create_live_event_v2", {
      p_game_id: event.matchId,
      p_player_id: event.playerId,
      p_type: event.eventType,
      p_half: event.half,
      p_force_time_seconds: event.forceTimeSeconds,
      p_notes: event.notes,
      p_display_minute: event.displayMinute,
      // NEW: Pass client_event_id for idempotency
      p_client_event_id: event.clientEventId,
    });
    
    if (error) {
      const status = (error as any).code === "PGRST301" || (error as any).code === "42501" 
        ? 403 
        : ((error as any).status ?? 500);
      
      logLiveMatchEvent("send_fail", {
        matchId: event.matchId,
        clientEventId: event.clientEventId,
        errorCode: status,
        errorMessage: error.message,
      });
      
      return {
        success: false,
        errorCode: status,
        errorMessage: error.message,
      };
    }
    
    const result = data as { 
      success: boolean; 
      event_id?: string;
      message?: string;
    } | null;
    
    if (!result?.success) {
      logLiveMatchEvent("send_fail", {
        matchId: event.matchId,
        clientEventId: event.clientEventId,
        errorCode: 400,
        errorMessage: result?.message ?? "Unknown error",
      });
      
      return {
        success: false,
        errorCode: 400,
        errorMessage: result?.message ?? "Server rejected event",
      };
    }
    
    logLiveMatchEvent("send_success", {
      matchId: event.matchId,
      clientEventId: event.clientEventId,
      serverEventId: result.event_id,
    });
    
    return {
      success: true,
      serverEventId: result.event_id,
    };
  } catch (err: any) {
    const status = err?.status ?? 500;
    const message = err?.message ?? "Network error";
    
    logLiveMatchEvent("send_fail", {
      matchId: event.matchId,
      clientEventId: event.clientEventId,
      errorCode: status,
      errorMessage: message,
    });
    
    return {
      success: false,
      errorCode: status,
      errorMessage: message,
    };
  }
}

/**
 * Determine if we should retry based on error code
 */
function shouldRetry(errorCode: number | null): boolean {
  // Don't retry 401/403 (auth/permission issues) or 400 (bad request)
  if (errorCode === 401 || errorCode === 403 || errorCode === 400) {
    return false;
  }
  // Retry network errors, timeouts, 5xx
  return true;
}

// ============ QUEUE PROCESSOR ============

/**
 * Process pending events in the queue
 */
async function processQueue(matchId: string): Promise<void> {
  const state = loadQueue(matchId);
  const pendingEvents = state.events.filter(
    e => e.status === "pending" || e.status === "failed"
  );
  
  if (pendingEvents.length === 0) return;
  
  for (const event of pendingEvents) {
    // Check if we've exceeded retry limit
    if (event.retryCount >= MAX_RETRY_COUNT) {
      // Mark as permanently failed
      updateEventStatus(matchId, event.clientEventId, {
        status: "failed",
        errorMessage: "Max retries exceeded",
      });
      continue;
    }
    
    // Check if we should wait before retrying (backoff)
    if (event.lastAttemptAt) {
      const backoffMs = RETRY_BACKOFF_MS[Math.min(event.retryCount, RETRY_BACKOFF_MS.length - 1)];
      const timeSinceLastAttempt = Date.now() - event.lastAttemptAt;
      if (timeSinceLastAttempt < backoffMs) {
        continue; // Not ready to retry yet
      }
    }
    
    // Mark as sending
    updateEventStatus(matchId, event.clientEventId, {
      status: "sending",
      lastAttemptAt: Date.now(),
    });
    
    // Send the event
    const result = await sendEvent(event);
    
    if (result.success) {
      updateEventStatus(matchId, event.clientEventId, {
        status: "confirmed",
        serverEventId: result.serverEventId ?? null,
        errorMessage: null,
        errorCode: null,
      });
    } else {
      const newRetryCount = event.retryCount + 1;
      const shouldRetryEvent = shouldRetry(result.errorCode ?? null) && newRetryCount < MAX_RETRY_COUNT;
      
      updateEventStatus(matchId, event.clientEventId, {
        status: shouldRetryEvent ? "pending" : "failed",
        retryCount: newRetryCount,
        errorMessage: result.errorMessage ?? null,
        errorCode: result.errorCode ?? null,
      });
      
      if (shouldRetryEvent) {
        logLiveMatchEvent("retry_scheduled", {
          matchId,
          clientEventId: event.clientEventId,
          retryCount: newRetryCount,
        });
      }
    }
  }
  
  // Clean up confirmed events
  removeConfirmedEvents(matchId);
}

/**
 * Start the queue processor for a match
 */
export function startQueueProcessor(matchId: string): void {
  if (activeQueueProcessors.has(matchId)) return;
  
  // Process immediately
  processQueue(matchId);
  
  // Then periodically
  const interval = setInterval(() => {
    processQueue(matchId);
  }, QUEUE_PROCESS_INTERVAL_MS);
  
  activeQueueProcessors.set(matchId, interval);
}

/**
 * Stop the queue processor for a match
 */
export function stopQueueProcessor(matchId: string): void {
  const interval = activeQueueProcessors.get(matchId);
  if (interval) {
    clearInterval(interval);
    activeQueueProcessors.delete(matchId);
  }
}

/**
 * Stop all queue processors
 */
export function stopAllQueueProcessors(): void {
  activeQueueProcessors.forEach((interval) => clearInterval(interval));
  activeQueueProcessors.clear();
}

// ============ LISTENERS ============

/**
 * Subscribe to queue state changes
 */
export function subscribeToQueue(
  matchId: string, 
  callback: (state: QueueState) => void
): () => void {
  if (!queueListeners.has(matchId)) {
    queueListeners.set(matchId, new Set());
  }
  
  queueListeners.get(matchId)!.add(callback);
  
  // Initial state
  callback(loadQueue(matchId));
  
  return () => {
    queueListeners.get(matchId)?.delete(callback);
  };
}

function notifyListeners(matchId: string, state: QueueState): void {
  queueListeners.get(matchId)?.forEach(cb => cb(state));
}

// ============ UTILITIES ============

/**
 * Get count of pending/failed events
 */
export function getPendingCount(matchId: string): number {
  const state = loadQueue(matchId);
  return state.events.filter(e => e.status === "pending" || e.status === "sending").length;
}

/**
 * Get count of failed events
 */
export function getFailedCount(matchId: string): number {
  const state = loadQueue(matchId);
  return state.events.filter(e => e.status === "failed").length;
}

/**
 * Retry all failed events
 */
export function retryFailedEvents(matchId: string): void {
  const state = loadQueue(matchId);
  state.events = state.events.map(e => 
    e.status === "failed" 
      ? { ...e, status: "pending" as const, retryCount: 0 }
      : e
  );
  saveQueue(matchId, state);
  processQueue(matchId);
}

/**
 * Clear all events for a match (use with caution)
 */
export function clearQueue(matchId: string): void {
  try {
    localStorage.removeItem(getStorageKey(matchId));
    notifyListeners(matchId, { events: [], lastProcessedAt: null });
  } catch {
    // Ignore
  }
}
