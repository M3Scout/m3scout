/**
 * useLiveMatchQueue Hook
 * 
 * React hook for interacting with the Live Match event queue.
 * Provides:
 * - optimistic addEvent with queue
 * - queue state subscription
 * - pending/failed counts
 * - retry functionality
 */

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  enqueueEvent,
  subscribeToQueue,
  startQueueProcessor,
  stopQueueProcessor,
  getPendingCount,
  getFailedCount,
  retryFailedEvents,
  type QueueState,
  type QueuedEvent,
} from "@/lib/liveMatchEventQueue";
import type { MatchEventType } from "@/hooks/useLiveMatch";

export interface UseLiveMatchQueueOptions {
  matchId: string;
  /** Called when an event is successfully confirmed by server */
  onEventConfirmed?: (event: QueuedEvent) => void;
  /** Called when an event permanently fails */
  onEventFailed?: (event: QueuedEvent) => void;
}

export function useLiveMatchQueue({
  matchId,
  onEventConfirmed,
  onEventFailed,
}: UseLiveMatchQueueOptions) {
  const queryClient = useQueryClient();
  const [queueState, setQueueState] = useState<QueueState>({ events: [], lastProcessedAt: null });
  const [previousConfirmedIds, setPreviousConfirmedIds] = useState<Set<string>>(new Set());
  
  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = subscribeToQueue(matchId, (state) => {
      setQueueState(state);
      
      // Check for newly confirmed events
      const confirmedEvents = state.events.filter(e => e.status === "confirmed");
      for (const event of confirmedEvents) {
        if (!previousConfirmedIds.has(event.clientEventId)) {
          onEventConfirmed?.(event);
          // Invalidate queries to refresh UI with server data
          queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
          queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
        }
      }
      
      // Check for newly failed events
      const failedEvents = state.events.filter(
        e => e.status === "failed" && e.retryCount >= 3
      );
      for (const event of failedEvents) {
        if (!previousConfirmedIds.has(event.clientEventId)) {
          onEventFailed?.(event);
        }
      }
      
      // Update tracked IDs
      const allIds = new Set([
        ...confirmedEvents.map(e => e.clientEventId),
        ...failedEvents.map(e => e.clientEventId),
      ]);
      setPreviousConfirmedIds(allIds);
    });
    
    // Start queue processor
    startQueueProcessor(matchId);
    
    return () => {
      unsubscribe();
      stopQueueProcessor(matchId);
    };
  }, [matchId, queryClient, onEventConfirmed, onEventFailed, previousConfirmedIds]);
  
  /**
   * Add an event optimistically (queued)
   */
  const addEventOptimistic = useCallback((params: {
    playerId: string;
    eventType: MatchEventType;
    minute?: number;
    half?: 1 | 2;
    displayMinute?: string;
    notes?: string;
  }) => {
    const event = enqueueEvent({
      matchId,
      playerId: params.playerId,
      eventType: params.eventType,
      half: params.half ?? null,
      forceTimeSeconds: params.minute != null ? params.minute * 60 : null,
      notes: params.notes ?? null,
      displayMinute: params.displayMinute ?? null,
    });
    
    // Show optimistic toast
    toast.info("Evento registrado", {
      description: "Sincronizando...",
      duration: 1500,
    });
    
    return event;
  }, [matchId]);
  
  /**
   * Retry all failed events
   */
  const retryFailed = useCallback(() => {
    retryFailedEvents(matchId);
    toast.info("Tentando novamente...");
  }, [matchId]);
  
  // Computed values
  const pendingCount = queueState.events.filter(
    e => e.status === "pending" || e.status === "sending"
  ).length;
  
  const failedCount = queueState.events.filter(
    e => e.status === "failed"
  ).length;
  
  const hasPending = pendingCount > 0;
  const hasFailed = failedCount > 0;
  
  return {
    /** Queue state */
    queueState,
    /** Add event with optimistic UI */
    addEventOptimistic,
    /** Retry all failed events */
    retryFailed,
    /** Number of pending events */
    pendingCount,
    /** Number of failed events */
    failedCount,
    /** Whether there are pending events */
    hasPending,
    /** Whether there are failed events */
    hasFailed,
  };
}
