/**
 * Live Match IndexedDB Queue
 * 
 * Provides offline-first persistence for Live Match events using IndexedDB.
 * Benefits over localStorage:
 * - Larger storage capacity (50MB+ vs 5MB)
 * - Better performance for frequent writes
 * - Non-blocking async operations
 * - Works in Service Workers
 * 
 * Falls back to localStorage if IndexedDB is unavailable.
 * 
 * @see .memory/technical/live-match/resilience-and-telemetry-v2
 */

import { logLiveMatchEvent } from "@/lib/liveMatchTelemetry";

// ============ TYPES ============

export type QueuedEventStatus = "pending" | "sending" | "confirmed" | "failed";

export interface IndexedDBQueuedEvent {
  /** Unique client-generated ID for idempotency */
  id: string;
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
  createdAt: number;
  /** Last attempt timestamp */
  lastAttemptAt: number | null;
  /** Error message if failed */
  errorMessage: string | null;
  /** HTTP status code from last error */
  errorCode: number | null;
  /** Server-assigned event ID after confirmation */
  serverEventId: string | null;
}

// ============ CONSTANTS ============

const DB_NAME = "m3_live_match_queue";
const DB_VERSION = 1;
const STORE_NAME = "events";
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============ DATABASE SINGLETON ============

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Get or initialize the IndexedDB database
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.warn("[IndexedDB] Failed to open database:", request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        
        // Handle connection closed unexpectedly
        dbInstance.onclose = () => {
          dbInstance = null;
          dbInitPromise = null;
        };
        
        resolve(dbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create events store with indexes
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("matchId", "matchId", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("matchId_status", ["matchId", "status"], { unique: false });
        }
      };
    } catch (error) {
      console.warn("[IndexedDB] Not available:", error);
      reject(error);
    }
  });
  
  return dbInitPromise;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

// ============ CRUD OPERATIONS ============

/**
 * Add an event to the queue
 */
export async function addEventToQueue(event: IndexedDBQueuedEvent): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(event);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("[IndexedDB] Failed to add event, using localStorage fallback:", error);
    addEventToLocalStorage(event);
  }
}

/**
 * Update an event in the queue
 */
export async function updateEventInQueue(
  id: string, 
  updates: Partial<IndexedDBQueuedEvent>
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (!event) {
          resolve();
          return;
        }
        
        const updated = { ...event, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.warn("[IndexedDB] Failed to update event:", error);
  }
}

/**
 * Get all events for a match
 */
export async function getEventsForMatch(matchId: string): Promise<IndexedDBQueuedEvent[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("matchId");
      const request = index.getAll(matchId);
      
      request.onsuccess = () => {
        const events = request.result || [];
        // Filter out stale events
        const now = Date.now();
        const fresh = events.filter(e => now - e.createdAt < MAX_QUEUE_AGE_MS);
        resolve(fresh);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("[IndexedDB] Failed to get events, using localStorage fallback:", error);
    return getEventsFromLocalStorage(matchId);
  }
}

/**
 * Get pending events for a match (pending or failed)
 */
export async function getPendingEventsForMatch(matchId: string): Promise<IndexedDBQueuedEvent[]> {
  const events = await getEventsForMatch(matchId);
  return events.filter(e => e.status === "pending" || e.status === "sending" || e.status === "failed");
}

/**
 * Delete an event from the queue
 */
export async function deleteEventFromQueue(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("[IndexedDB] Failed to delete event:", error);
  }
}

/**
 * Delete confirmed events older than threshold
 */
export async function cleanupConfirmedEvents(matchId: string): Promise<void> {
  try {
    const events = await getEventsForMatch(matchId);
    const confirmed = events.filter(e => e.status === "confirmed");
    
    for (const event of confirmed) {
      await deleteEventFromQueue(event.id);
    }
  } catch (error) {
    console.warn("[IndexedDB] Cleanup failed:", error);
  }
}

/**
 * Clear all events for a match
 */
export async function clearMatchQueue(matchId: string): Promise<void> {
  try {
    const events = await getEventsForMatch(matchId);
    for (const event of events) {
      await deleteEventFromQueue(event.id);
    }
  } catch (error) {
    console.warn("[IndexedDB] Failed to clear queue:", error);
  }
}

// ============ LOCALSTORAGE FALLBACK ============

const LS_KEY_PREFIX = "m3_live_match_queue_";

function addEventToLocalStorage(event: IndexedDBQueuedEvent): void {
  try {
    const key = `${LS_KEY_PREFIX}${event.matchId}`;
    const raw = localStorage.getItem(key);
    const events: IndexedDBQueuedEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    localStorage.setItem(key, JSON.stringify(events));
  } catch {
    // Ignore localStorage errors
  }
}

function getEventsFromLocalStorage(matchId: string): IndexedDBQueuedEvent[] {
  try {
    const key = `${LS_KEY_PREFIX}${matchId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    
    const events: IndexedDBQueuedEvent[] = JSON.parse(raw);
    const now = Date.now();
    return events.filter(e => now - e.createdAt < MAX_QUEUE_AGE_MS);
  } catch {
    return [];
  }
}

// ============ MIGRATION ============

/**
 * Migrate events from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage(matchId: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  
  try {
    const events = getEventsFromLocalStorage(matchId);
    if (events.length === 0) return;
    
    for (const event of events) {
      await addEventToQueue(event);
    }
    
    // Clear localStorage after successful migration
    localStorage.removeItem(`${LS_KEY_PREFIX}${matchId}`);
    
    logLiveMatchEvent("migrate_to_indexeddb", {
      matchId,
      eventCount: events.length,
    });
  } catch (error) {
    console.warn("[IndexedDB] Migration failed:", error);
  }
}
