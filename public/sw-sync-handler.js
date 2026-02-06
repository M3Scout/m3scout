/**
 * Service Worker Background Sync Handler
 * 
 * This script is loaded by the Workbox-generated SW to handle
 * the 'sync' event for the Live Match queue.
 * 
 * It uses IndexedDB directly since we can't import the app's modules.
 */

const SYNC_TAG = "m3-live-match-sync";
const DB_NAME = "m3_live_match_queue";
const DB_VERSION = 1;
const STORE_NAME = "events";

// ============ IDB HELPERS ============

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getPendingEvents() {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const all = request.result || [];
        // Filter to pending or retryable failed events
        const pending = all.filter(
          (e) => e.status === "pending" || (e.status === "failed" && e.retryCount < 3)
        );
        resolve(pending);
      };
      
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("[SW Sync] Failed to get pending events:", error);
    return [];
  }
}

async function updateEventStatus(id, status, serverEventId) {
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
        event.lastAttemptAt = Date.now();
        
        if (serverEventId) {
          event.serverEventId = serverEventId;
        }
        
        if (status === "failed") {
          event.retryCount = (event.retryCount || 0) + 1;
        }
        
        store.put(event);
      };
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("[SW Sync] Failed to update event:", error);
  }
}

async function deleteConfirmedEvents() {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const all = request.result || [];
        const confirmed = all.filter((e) => e.status === "confirmed");
        
        for (const event of confirmed) {
          store.delete(event.id);
        }
      };
      
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("[SW Sync] Failed to delete confirmed events:", error);
  }
}

// ============ SEND EVENT ============

async function sendEvent(event, supabaseUrl, supabaseKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_live_event_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation",
      },
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
      console.warn("[SW Sync] Request failed:", response.status);
      return { success: false };
    }
    
    const data = await response.json();
    
    if (data?.success && data?.event_id) {
      return { success: true, eventId: data.event_id };
    }
    
    return { success: false };
  } catch (error) {
    console.error("[SW Sync] Network error:", error);
    return { success: false };
  }
}

// ============ FLUSH QUEUE ============

async function flushQueue() {
  // Get Supabase config from env (injected during build)
  // Fallback to reading from indexedDB config store
  const supabaseUrl = self.__SUPABASE_URL__ || "https://httxbfcvzknyncprzcuy.supabase.co";
  const supabaseKey = self.__SUPABASE_KEY__ || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dHhiZmN2emtueW5jcHJ6Y3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE4ODgsImV4cCI6MjA4MzQ3Nzg4OH0.Vqz6mI_gX8iNYu4Z1Z-Wtr_AS4M1Mb-L500LHrQQAqE";
  
  const events = await getPendingEvents();
  
  if (events.length === 0) {
    console.log("[SW Sync] No pending events to flush");
    return;
  }
  
  console.log(`[SW Sync] Flushing ${events.length} pending events`);
  
  let succeeded = 0;
  let failed = 0;
  
  for (const event of events) {
    const result = await sendEvent(event, supabaseUrl, supabaseKey);
    
    if (result.success) {
      await updateEventStatus(event.id, "confirmed", result.eventId);
      succeeded++;
    } else {
      await updateEventStatus(event.id, "failed");
      failed++;
    }
  }
  
  // Clean up confirmed events
  await deleteConfirmedEvents();
  
  console.log(`[SW Sync] Flush complete: ${succeeded}/${events.length} succeeded`);
  
  // If any failed, throw to retry the sync
  if (failed > 0 && succeeded === 0) {
    throw new Error(`All ${failed} events failed`);
  }
}

// ============ EVENT LISTENERS ============

// Handle Background Sync event
self.addEventListener("sync", (event) => {
  console.log("[SW Sync] Sync event received:", event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data?.type === "FLUSH_LIVE_MATCH_QUEUE") {
    console.log("[SW Sync] Flush requested via message");
    flushQueue().catch((err) => {
      console.error("[SW Sync] Flush failed:", err);
    });
  }
});

console.log("[SW Sync] Background Sync handler loaded");
