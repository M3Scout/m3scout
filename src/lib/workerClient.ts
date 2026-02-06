/**
 * Worker Client - Safe wrapper for WebWorker communication
 * 
 * Features:
 * - Automatic fallback to main thread if Workers not supported
 * - Timeout handling (default 2s)
 * - Telemetry logging for duration/timeouts
 * - Type-safe request/response
 */

import type { WorkerTaskType, WorkerRequest, WorkerResponse } from "@/workers/statsWorker";

// ============ CONFIGURATION ============

const DEFAULT_TIMEOUT_MS = 2000;
const WORKER_PATH = new URL("@/workers/statsWorker.ts", import.meta.url);

// ============ SINGLETON WORKER ============

let worker: Worker | null = null;
let workerSupported = true;
let pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  startTime: number;
}>();

function getWorker(): Worker | null {
  if (!workerSupported) return null;
  
  if (worker) return worker;
  
  try {
    // Check if Workers are supported
    if (typeof Worker === "undefined") {
      workerSupported = false;
      return null;
    }
    
    // Create worker with Vite's worker import
    worker = new Worker(WORKER_PATH, { type: "module" });
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, success, result, error, duration_ms, type } = event.data;
      
      const pending = pendingRequests.get(id);
      if (!pending) return;
      
      clearTimeout(pending.timeout);
      pendingRequests.delete(id);
      
      // Log telemetry
      logWorkerTelemetry(type, "ok", duration_ms);
      
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error || "Worker error"));
      }
    };
    
    worker.onerror = (error) => {
      console.error("[Worker] Error:", error);
      workerSupported = false;
      worker = null;
      
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Worker crashed"));
      }
      pendingRequests.clear();
    };
    
    return worker;
    
  } catch (error) {
    console.warn("[Worker] Failed to create worker:", error);
    workerSupported = false;
    return null;
  }
}

// ============ TELEMETRY ============

interface WorkerTelemetryEntry {
  t: string;
  type: WorkerTaskType;
  status: "ok" | "timeout" | "fallback";
  duration_ms: number;
}

const TELEMETRY_KEY = "m3_worker_telemetry";
const MAX_TELEMETRY_ENTRIES = 100;

function logWorkerTelemetry(
  type: WorkerTaskType,
  status: "ok" | "timeout" | "fallback",
  duration_ms: number
): void {
  try {
    const entries: WorkerTelemetryEntry[] = JSON.parse(
      localStorage.getItem(TELEMETRY_KEY) || "[]"
    );
    
    entries.push({
      t: new Date().toISOString(),
      type,
      status,
      duration_ms,
    });
    
    // Keep only last N entries
    while (entries.length > MAX_TELEMETRY_ENTRIES) {
      entries.shift();
    }
    
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(entries));
    
    // Also log to console in dev
    if (import.meta.env.DEV) {
      const icon = status === "ok" ? "✓" : status === "timeout" ? "⏱" : "↓";
      console.log(`[Worker] ${icon} ${type} ${status} (${duration_ms}ms)`);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getWorkerTelemetry(): WorkerTelemetryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getWorkerStats(): {
  total: number;
  ok: number;
  timeout: number;
  fallback: number;
  avgDuration: number;
} {
  const entries = getWorkerTelemetry();
  const ok = entries.filter(e => e.status === "ok").length;
  const timeout = entries.filter(e => e.status === "timeout").length;
  const fallback = entries.filter(e => e.status === "fallback").length;
  const avgDuration = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.duration_ms, 0) / entries.length)
    : 0;
  
  return { total: entries.length, ok, timeout, fallback, avgDuration };
}

// ============ MAIN API ============

/**
 * Run a task in the WebWorker with timeout and fallback.
 * 
 * @param type - Task type (aggregate_stats, calculate_rating, etc.)
 * @param payload - Data to process
 * @param timeoutMs - Timeout in ms (default 2000)
 * @returns Promise with result
 */
export async function runWorkerTask<TPayload, TResult>(
  type: WorkerTaskType,
  payload: TPayload,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<TResult> {
  const worker = getWorker();
  const startTime = performance.now();
  
  // Fallback: run on main thread
  if (!worker) {
    const result = await runOnMainThread<TPayload, TResult>(type, payload);
    const duration = Math.round(performance.now() - startTime);
    logWorkerTelemetry(type, "fallback", duration);
    return result;
  }
  
  return new Promise<TResult>((resolve, reject) => {
    const id = crypto.randomUUID();
    
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      logWorkerTelemetry(type, "timeout", timeoutMs);
      
      // Fallback to main thread on timeout
      runOnMainThread<TPayload, TResult>(type, payload)
        .then(resolve)
        .catch(reject);
    }, timeoutMs);
    
    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
      startTime,
    });
    
    const request: WorkerRequest<TPayload> = { id, type, payload };
    worker.postMessage(request);
  });
}

// ============ MAIN THREAD FALLBACK ============

/**
 * Fallback: run computation on main thread when Worker not available
 */
async function runOnMainThread<TPayload, TResult>(
  type: WorkerTaskType,
  payload: TPayload
): Promise<TResult> {
  // Dynamic import to avoid bundling worker code in main bundle
  // when worker is available
  switch (type) {
    case "aggregate_stats":
      return aggregateStatsFallback(payload as unknown[]) as TResult;
      
    case "calculate_rating":
      return calculateRatingFallback(payload as unknown) as TResult;
      
    case "rank_players":
    case "sort_players":
      return sortPlayersFallback(payload as unknown) as TResult;
      
    case "generate_insights":
      return generateInsightsFallback(payload as unknown) as TResult;
      
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

// Minimal fallback implementations (simplified versions)
function aggregateStatsFallback(rows: unknown[]): unknown {
  return (rows as Array<Record<string, number>>).reduce(
    (acc, row) => ({
      total_matches: acc.total_matches + (row.matches || 0),
      total_minutes: acc.total_minutes + (row.minutes || 0),
      total_goals: acc.total_goals + (row.goals || 0),
      total_assists: acc.total_assists + (row.assists || 0),
      total_yellow_cards: acc.total_yellow_cards + (row.yellow_cards || 0),
      total_red_cards: acc.total_red_cards + (row.red_cards || 0),
      total_tackles: acc.total_tackles + (row.tackles || 0),
      total_interceptions: acc.total_interceptions + (row.interceptions || 0),
      total_recoveries: acc.total_recoveries + (row.recoveries || 0),
      total_saves: acc.total_saves + (row.saves || 0),
      total_goals_conceded: acc.total_goals_conceded + (row.goals_conceded || 0),
      total_clean_sheets: acc.total_clean_sheets + (row.clean_sheets || 0),
    }),
    {
      total_matches: 0, total_minutes: 0, total_goals: 0, total_assists: 0,
      total_yellow_cards: 0, total_red_cards: 0, total_tackles: 0,
      total_interceptions: 0, total_recoveries: 0, total_saves: 0,
      total_goals_conceded: 0, total_clean_sheets: 0,
    }
  );
}

function calculateRatingFallback(input: unknown): unknown {
  // Simple placeholder - real calculation is complex
  const data = input as { stats?: { total_goals?: number; total_matches?: number } };
  const matches = data.stats?.total_matches || 1;
  const goals = data.stats?.total_goals || 0;
  const score = Math.min(100, (goals / matches) * 20 + 50);
  return {
    overall0_100: Math.round(score),
    rating0_5: Math.round((score / 100) * 5 * 2) / 2,
    positionGroup: "midfielder",
  };
}

function sortPlayersFallback(input: unknown): unknown {
  const data = input as {
    players: Array<{ auto_rating?: number | null; [key: string]: unknown }>;
    sortBy: string;
    direction: string;
    limit?: number;
  };
  
  const sorted = [...data.players].sort((a, b) => {
    const aVal = (a.auto_rating ?? -Infinity) as number;
    const bVal = (b.auto_rating ?? -Infinity) as number;
    return data.direction === "asc" ? aVal - bVal : bVal - aVal;
  });
  
  return data.limit ? sorted.slice(0, data.limit) : sorted;
}

function generateInsightsFallback(input: unknown): unknown {
  const data = input as {
    players: Array<{ id: string; full_name: string; auto_rating: number | null }>;
  };
  
  const top = data.players
    .filter(p => p.auto_rating !== null)
    .sort((a, b) => (b.auto_rating ?? 0) - (a.auto_rating ?? 0))[0];
  
  if (!top) return [];
  
  return [{
    id: "rising-1",
    type: "rising",
    title: `${top.full_name.split(" ")[0]} em alta`,
    description: `Nota ${top.auto_rating?.toFixed(1)}`,
    playerId: top.id,
  }];
}

// ============ UTILITY ============

/**
 * Check if WebWorker is supported and working
 */
export function isWorkerSupported(): boolean {
  return workerSupported && typeof Worker !== "undefined";
}

/**
 * Terminate worker (useful for cleanup)
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingRequests.clear();
}
