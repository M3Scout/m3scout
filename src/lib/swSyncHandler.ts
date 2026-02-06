/**
 * Service Worker Sync Handler Module
 * 
 * This module contains the flush logic that can be called from the Service Worker.
 * It's designed to work both in the main thread and in the SW context.
 * 
 * Since the SW doesn't have access to React Query or Supabase client from the app,
 * we use a direct fetch approach with the same RPC endpoint.
 */

import { SYNC_TAG } from "@/lib/backgroundSync";

// ============ TYPES ============

export interface PendingEvent {
  id: string;
  matchId: string;
  playerId: string;
  eventType: string;
  half: number | null;
  forceTimeSeconds: number | null;
  notes: string | null;
  displayMinute: string | null;
}

// ============ IDB ACCESS FOR SW ============

const DB_NAME = "m3_live_match_queue";
const DB_VERSION = 1;
const STORE_NAME = "events";

/**
 * Open IndexedDB connection (works in SW context)
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all pending events from IndexedDB
 */
export async function getPendingEventsFromIDB(): Promise<PendingEvent[]> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("status");
      
      // Get all pending events
      const pendingRequest = index.getAll("pending");
      
      pendingRequest.onsuccess = () => {
        const pending = pendingRequest.result || [];
        
        // Also get failed events that can be retried
        const failedRequest = index.getAll("failed");
        
        failedRequest.onsuccess = () => {
          const failed = (failedRequest.result || []).filter(
            (e: any) => e.retryCount < 3
          );
          
          const all = [...pending, ...failed].map((e: any) => ({
            id: e.id,
            matchId: e.matchId,
            playerId: e.playerId,
            eventType: e.eventType,
            half: e.half,
            forceTimeSeconds: e.forceTimeSeconds,
            notes: e.notes,
            displayMinute: e.displayMinute,
          }));
          
          resolve(all);
        };
        
        failedRequest.onerror = () => resolve(pending);
      };
      
      pendingRequest.onerror = () => reject(pendingRequest.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("[SW Sync] Failed to get pending events:", error);
    return [];
  }
}

/**
 * Update event status in IndexedDB
 */
export async function updateEventStatusInIDB(
  id: string,
  status: "confirmed" | "failed",
  serverEventId?: string
): Promise<void> {
  try {
    const db = await openDB();
    
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
        
        event.status = status;
        if (serverEventId) {
          event.serverEventId = serverEventId;
        }
        if (status === "failed") {
          event.retryCount = (event.retryCount || 0) + 1;
        }
        
        const putRequest = store.put(event);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("[SW Sync] Failed to update event:", error);
  }
}

/**
 * Delete confirmed events from IndexedDB
 */
export async function deleteConfirmedEventsFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("status");
      const request = index.getAllKeys("confirmed");
      
      request.onsuccess = () => {
        const keys = request.result || [];
        
        for (const key of keys) {
          store.delete(key);
        }
        
        resolve();
      };
      
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("[SW Sync] Failed to delete confirmed events:", error);
  }
}

// ============ DIRECT RPC CALL ============

/**
 * Send event directly via fetch (works in SW context without Supabase client)
 */
export async function sendEventDirectly(
  event: PendingEvent,
  supabaseUrl: string,
  supabaseKey: string,
  accessToken?: string
): Promise<{ success: boolean; eventId?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": accessToken 
        ? `Bearer ${accessToken}` 
        : `Bearer ${supabaseKey}`,
    };
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_live_event_v2`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_game_id: event.matchId,
        p_player_id: event.playerId,
        p_type: event.eventType,
        p_half: event.half,
        p_force_time_seconds: event.forceTimeSeconds,
        p_notes: event.notes,
        p_display_minute: event.displayMinute,
        p_client_event_id: event.id,
      }),
    });
    
    if (!response.ok) {
      return { success: false };
    }
    
    const data = await response.json();
    
    if (data?.success && data?.event_id) {
      return { success: true, eventId: data.event_id };
    }
    
    return { success: false };
  } catch (error) {
    console.error("[SW Sync] Send failed:", error);
    return { success: false };
  }
}

// ============ FLUSH QUEUE ============

/**
 * Flush all pending events in the queue.
 * This is the main function called by the Background Sync event.
 */
export async function flushLiveMatchQueue(
  supabaseUrl: string,
  supabaseKey: string,
  accessToken?: string
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const events = await getPendingEventsFromIDB();
  
  if (events.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  
  console.log(`[SW Sync] Flushing ${events.length} pending events`);
  
  let succeeded = 0;
  let failed = 0;
  
  for (const event of events) {
    const result = await sendEventDirectly(event, supabaseUrl, supabaseKey, accessToken);
    
    if (result.success) {
      await updateEventStatusInIDB(event.id, "confirmed", result.eventId);
      succeeded++;
    } else {
      await updateEventStatusInIDB(event.id, "failed");
      failed++;
    }
  }
  
  // Clean up confirmed events
  await deleteConfirmedEventsFromIDB();
  
  console.log(`[SW Sync] Flush complete: ${succeeded} succeeded, ${failed} failed`);
  
  return { processed: events.length, succeeded, failed };
}
