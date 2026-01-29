import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { rebuildSingleMatchRatings } from "@/lib/rebuildMatchRatings";

// Types
export type MatchStatus = "draft" | "live" | "finished" | "applied";
export type PositionTemplate = "outfield" | "goalkeeper";

export type MatchEventType =
  // Outfield - Attack
  | "goal" | "assist" | "shot" | "shot_on_target"
  | "shot_blocked" | "offside"
  // Outfield - Passing
  | "key_pass" | "chance_created"
  | "pass_success" | "pass_total"
  | "cross_success" | "cross_failed"
  // Outfield - Dribbles/Possession
  | "dribble_success" | "dribble_attempt"
  | "ball_action" | "foul_suffered" | "possession_lost"
  // Outfield - Defense
  | "tackle" | "interception" | "recovery" | "clearance"
  | "blocked_shot" | "was_dribbled"
  | "duel_won" | "duel_total" | "aerial_duel_won" | "aerial_duel_total"
  | "ground_duel_won" | "ground_duel_total"
  | "yellow" | "red" | "foul_committed"
  // Goalkeeper
  | "save" | "goal_conceded" | "clean_sheet"
  | "penalty_saved" | "error_led_to_goal"
  | "box_save" | "punch" | "high_claim" | "sweeper_action"
  // Player presence events
  | "player_on" | "player_off"
  // Substitution event
  | "substitution";

export type ClockStatus = "stopped" | "running" | "paused";

export interface Match {
  id: string;
  created_by: string;
  competition_id: string | null;
  season_year: number;
  opponent_name: string;
  match_date: string;
  venue: string | null;
  status: MatchStatus;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Timer V2 fields
  half: number;
  clock_status: ClockStatus;
  half_start_time: string | null;
  elapsed_seconds_in_half: number;
  added_time_first_half: number;
  added_time_second_half: number;
  match_start_time: string | null;
  // Team customization fields
  team_name_display: string | null;
  team_logo_url: string | null;
  opponent_logo_url: string | null;
  competition?: {
    id: string;
    name: string;
    display_name: string | null;
  };
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  position_template: PositionTemplate;
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played: number | null;
  is_on_field: boolean;
  notes: string | null;
  is_removed: boolean;
  removed_at: string | null;
  removed_by: string | null;
  created_at: string;
  updated_at: string;
  player?: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string;
  };
}

export interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  player_in_id: string | null; // For substitution events
  minute: number | null;
  event_type: MatchEventType | "substitution";
  value: number;
  created_at: string;
  half: number | null;
  display_minute: string | null;
  // New fields for event status tracking
  event_status: "draft" | "official" | "voided";
  count_in_stats: boolean;
  game_time_seconds: number | null;
  void_reason: string | null;
  period: number;
}

// Persisted rating breakdown from SQL rebuild (matches the JSON structure from DB)
export interface PersistedRatingBreakdown {
  baseRating: number;
  minutesPlayed: number;
  minutesFactor: number;
  rawImpact: number;
  isGoalkeeper: boolean;
  hasImpact: boolean;
  offensiveCapped: number;
  categories: {
    attack: { value: number; label: string };
    creation: { value: number; label: string };
    passing: { value: number; label: string };
    defense: { value: number; label: string };
    discipline: { value: number; label: string };
    goalkeeper: { value: number; label: string };
  };
  computedAt: string;
}

// Helper to safely parse rating_breakdown from JSON
export function parseRatingBreakdown(raw: unknown): PersistedRatingBreakdown | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  
  // Validate required fields
  if (typeof obj.baseRating !== 'number' || 
      typeof obj.minutesPlayed !== 'number' ||
      typeof obj.rawImpact !== 'number') {
    return null;
  }
  
  return obj as unknown as PersistedRatingBreakdown;
}

export interface MatchPlayerStats {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  shots_blocked: number; // Offensive - shot blocked by defender
  offsides: number;
  key_passes: number;
  chances_created: number;
  passes_completed: number;
  passes_total: number;
  crosses_success: number;
  crosses_failed: number;
  ball_actions: number;
  dribbles_success: number;
  dribbles_total: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  blocked_shots: number; // Defensive - blocking opponent's shot
  was_dribbled: number;
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_suffered: number;
  possession_lost: number;
  saves: number;
  goals_conceded: number;
  created_at: string;
  updated_at: string;
  // Rating fields (persisted by rebuild_match_ratings SQL function)
  rating: number | null;
  rating_minutes_played: number | null;
  rating_minutes_factor: number | null;
  rating_computed_at: string | null;
  rating_engine_version: string;
  // Full breakdown JSON from SQL rebuild (raw JSON, needs parsing)
  rating_breakdown: unknown;
}

// Local storage key for offline draft
const getLocalStorageKey = (matchId: string) => `live-match-draft-${matchId}`;

// Determine position template from player position
export function getPositionTemplate(position: string): PositionTemplate {
  const gkPositions = ["GK", "Goleiro", "Goalkeeper"];
  return gkPositions.some(p => position.toLowerCase().includes(p.toLowerCase()))
    ? "goalkeeper"
    : "outfield";
}

export function useLiveMatch(matchId: string) {
  const queryClient = useQueryClient();
  const [onlyOnField, setOnlyOnField] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch match data
  const { data: match, isLoading: matchLoading, error: matchError } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          competition:competitions(id, name, display_name)
        `)
        .eq("id", matchId)
        .limit(1);

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) throw new Error("Match not found");
      return row as Match;
    },
  });

  // Real-time subscription for multi-device sync
  useEffect(() => {
    // Subscribe to match changes
    const channel = supabase
      .channel(`live-match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["match", matchId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
          queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_players',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_player_stats',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, queryClient]);

  // Fetch match players
  const { data: matchPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ["match-players", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select(`
          *,
          player:players(id, full_name, photo_url, position)
        `)
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MatchPlayer[];
    },
  });

  // Fetch match events
  const { data: matchEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["match-events", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MatchEvent[];
    },
  });

  // Fetch match player stats (from the new match_player_stats table)
  const { data: matchPlayerStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["match-player-stats", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_player_stats")
        .select("*")
        .eq("match_id", matchId);

      if (error) throw error;
      return data as MatchPlayerStats[];
    },
    staleTime: 0, // Always refetch when invalidated
    refetchOnMount: true,
  });

  // Convert matchPlayerStats to a map by player_id for easy lookup
  const playerStatsMap = useMemo(() => {
    const map: Record<string, MatchPlayerStats> = {};
    matchPlayerStats.forEach((stats) => {
      map[stats.player_id] = stats;
    });
    return map;
  }, [matchPlayerStats]);

  // Filtered players (exclude removed, optionally only on field)
  const filteredPlayers = useMemo(() => {
    const activePlayers = matchPlayers.filter((mp) => !mp.is_removed);
    if (!onlyOnField) return activePlayers;
    return activePlayers.filter((mp) => mp.is_on_field);
  }, [matchPlayers, onlyOnField]);

  // Compute event counts per player (only counting official events)
  // CRITICAL: Also calculates derived ball_action count from eligible events
  const playerEventCounts = useMemo(() => {
    const counts: Record<string, Record<MatchEventType, number>> = {};
    
    matchEvents.forEach((event) => {
      // Only count official events that are marked to count in stats
      if (event.event_status !== "official" || !event.count_in_stats) return;
      
      if (!counts[event.player_id]) {
        counts[event.player_id] = {} as Record<MatchEventType, number>;
      }
      const current = counts[event.player_id][event.event_type] || 0;
      counts[event.player_id][event.event_type] = current + event.value;
    });

    // DERIVED STAT: Calculate ball_action for each player from eligible events
    // Uses the same list as derivedBallActions.ts for consistency with post-game summary
    const BALL_ACTION_EVENTS: MatchEventType[] = [
      // Attack
      "goal", "shot_on_target", "shot", "shot_blocked", "assist", "key_pass", "chance_created",
      // Passing
      "pass_success", "pass_total", "cross_success", "cross_failed",
      // Dribbles
      "dribble_success", "dribble_attempt", "possession_lost",
      // Defense with possession
      "recovery",
    ];
    
    Object.keys(counts).forEach((playerId) => {
      let ballActions = 0;
      BALL_ACTION_EVENTS.forEach((eventType) => {
        ballActions += counts[playerId][eventType] || 0;
      });
      counts[playerId]["ball_action" as MatchEventType] = ballActions;
    });

    return counts;
  }, [matchEvents]);

  // Get pending (draft) events count
  const pendingEventsCount = useMemo(() => {
    return matchEvents.filter(e => e.event_status === "draft").length;
  }, [matchEvents]);

  // Add player to match
  // In pre-game (draft), we set is_on_field = false for everyone
  // When game starts (startGame mutation), starters are set to is_on_field = true
  const addPlayer = useMutation({
    mutationFn: async (params: {
      playerId: string;
      playerPosition: string;
      started: boolean;
      enteredMinute?: number;
      exitedMinute?: number;
      autoMinutes?: boolean;
    }) => {
      const positionTemplate = getPositionTemplate(params.playerPosition);
      
      // In pre-game, don't set any minutes or is_on_field
      // These will be set when the game starts
      const { data, error } = await supabase
        .from("match_players")
        .insert({
          match_id: matchId,
          player_id: params.playerId,
          position_template: positionTemplate,
          started: params.started,
          entered_minute: null, // Will be set when game starts (0 for starters)
          exited_minute: null,
          is_on_field: false, // Will be set to true for starters when game starts
        })
        .select()
        .limit(1);

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Jogador adicionado");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Jogador já está no jogo");
      } else {
        toast.error("Erro ao adicionar jogador");
      }
    },
  });

  // Remove player from match
  const removePlayer = useMutation({
    mutationFn: async (matchPlayerId: string) => {
      const { error } = await supabase
        .from("match_players")
        .delete()
        .eq("id", matchPlayerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      toast.success("Jogador removido");
    },
    onError: () => {
      toast.error("Erro ao remover jogador");
    },
  });

  // Update player (substitution, etc.)
  const updatePlayer = useMutation({
    mutationFn: async (params: {
      matchPlayerId: string;
      updates: Partial<Omit<MatchPlayer, "id" | "match_id" | "player_id" | "created_at" | "updated_at" | "player">>;
    }) => {
      const { error } = await supabase
        .from("match_players")
        .update(params.updates)
        .eq("id", params.matchPlayerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
    },
    onError: () => {
      toast.error("Erro ao atualizar jogador");
    },
  });

  // Add event using RPC v2 - handles draft vs official status automatically
  // Now also updates match_player_stats atomically with proper stat chaining
  // Add event using RPC V2 (single overload)
  // Function signature: create_live_event_v2(p_game_id, p_player_id, p_type, p_half, p_force_time_seconds, p_notes, p_display_minute)
  const addEvent = useMutation({
    mutationFn: async (params: {
      playerId: string;
      eventType: MatchEventType;
      minute?: number;
      value?: number;
      half?: 1 | 2;
      displayMinute?: string;
      notes?: string;
    }) => {
      // Call RPC with all parameters in correct order to avoid ambiguity
      const { data, error } = await (supabase.rpc as Function)("create_live_event_v2", {
        p_game_id: matchId,
        p_player_id: params.playerId,
        p_type: params.eventType,
        p_half: params.half ?? null,
        p_force_time_seconds: params.minute != null ? params.minute * 60 : null,
        p_notes: params.notes ?? null,
        p_display_minute: params.displayMinute ?? null,
      });

      if (error) throw error;
      
      // Handle RPC response that returns success/error object
      const result = data as { 
        success: boolean; 
        error?: string; 
        message?: string;
        event_id?: string; 
        event_status?: string; 
        stats_applied?: boolean;
      } | null;
      
      if (result && !result.success) {
        throw new Error(result.message || "Erro ao registrar evento");
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Force immediate refetch of both events and stats
      queryClient.invalidateQueries({ 
        queryKey: ["match-events", matchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: ["match-player-stats", matchId],
        refetchType: 'active',
      });
      // Also invalidate player-match-stats cache for profile consistency
      // This ensures the Player Profile shows the same ratings as the Match Review
      // Using refetchType: 'all' to force complete cache invalidation
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "player-match-stats" || 
          query.queryKey[0] === "player-match-stats-by-season-comp",
        refetchType: 'all',
      });
      
      // Additional aggressive invalidation: clear ALL player stats cache to ensure profile refresh
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] === "player-match-stats",
      });
      
      // Show different toast based on event status
      if (data?.event_status === "draft") {
        toast.info("Evento registrado (pendente)", {
          description: "Será oficializado quando o jogo iniciar",
        });
      }
    },
    onError: (error: any) => {
      const status = typeof error?.status === "number" ? error.status : undefined;
      const message = error?.message || "Erro ao registrar evento";
      toast.error(status ? `Erro (${status})` : "Erro", {
        description: message,
      });
    },
  });

  // Delete event (undo)
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("match_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
    },
    onError: () => {
      toast.error("Erro ao remover evento");
    },
  });

  // Undo last event for a player (generic - removes the most recent event of any type)
  const undoLastEvent = useCallback(async (playerId: string) => {
    const playerEvents = matchEvents
      .filter((e) => e.player_id === playerId && e.event_status !== "voided")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (playerEvents.length === 0) {
      toast.info("Nenhum evento para desfazer");
      return;
    }

    await deleteEvent.mutateAsync(playerEvents[0].id);
    toast.success("Último evento desfeito");
  }, [matchEvents, deleteEvent]);

  // Void last event of a specific type for a player using RPC
  // This properly decrements stats (including derived stats for goals)
  const voidLastEventByType = useMutation({
    mutationFn: async (params: { playerId: string; eventType: MatchEventType }) => {
      const { data, error } = await (supabase.rpc as Function)("delete_last_live_event", {
        p_game_id: matchId,
        p_player_id: params.playerId,
        p_event_type: params.eventType,
      });

      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        message?: string;
        event_id?: string;
        event_type?: string;
      } | null;
      
      if (result && !result.success) {
        throw new Error(result.message || "Erro ao remover evento");
      }
      
      return result;
    },
    onSuccess: () => {
      // Force immediate refetch of both events and stats
      queryClient.invalidateQueries({ 
        queryKey: ["match-events", matchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ 
        queryKey: ["match-player-stats", matchId],
        refetchType: 'active',
      });
      // Invalidate player profile stats for consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "player-match-stats" || 
          query.queryKey[0] === "player-match-stats-by-season-comp",
        refetchType: 'all',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover evento");
    },
  });

  // Update match status
  const updateMatchStatus = useMutation({
    mutationFn: async (status: MatchStatus) => {
      const { error } = await supabase
        .from("matches")
        .update({ status })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Start game using RPC V3 - DOES NOT require players on field
  const startGame = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("start_first_half", {
        p_game_id: matchId,
      });

      if (error) throw error;
      return data as { events_officialized?: number; starters_on_field?: number; success?: boolean } | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      
      const startersOnField = data?.starters_on_field || 0;
      const eventsOfficialized = data?.events_officialized || 0;
      
      if (startersOnField > 0 || eventsOfficialized > 0) {
        toast.success(`Jogo iniciado! ${startersOnField} atleta(s) em campo`);
      } else {
        toast.success("1º Tempo iniciado! Adicione atletas em campo quando quiser.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao iniciar jogo");
    },
  });

  // Play/Pause clock (Timer V2)
  const playPauseClock = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Match not found");

      if (match.clock_status === "running") {
        // Pause: accumulate elapsed time
        const now = Date.now();
        const start = match.half_start_time ? new Date(match.half_start_time).getTime() : now;
        const additionalSeconds = Math.floor((now - start) / 1000);
        const newElapsed = match.elapsed_seconds_in_half + additionalSeconds;

        const { error } = await supabase
          .from("matches")
          .update({
            clock_status: "paused" as ClockStatus,
            elapsed_seconds_in_half: newElapsed,
            half_start_time: null,
          })
          .eq("id", matchId);

        if (error) throw error;
      } else {
        // Resume: set half_start_time to now
        const { error } = await supabase
          .from("matches")
          .update({
            clock_status: "running" as ClockStatus,
            half_start_time: new Date().toISOString(),
          })
          .eq("id", matchId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: () => {
      toast.error("Erro ao atualizar relógio");
    },
  });

  // Reset clock (only in draft)
  const resetClock = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("matches")
        .update({
          half: 1,
          clock_status: "stopped" as ClockStatus,
          half_start_time: null,
          elapsed_seconds_in_half: 0,
          added_time_first_half: 0,
          added_time_second_half: 0,
        })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: () => {
      toast.error("Erro ao resetar relógio");
    },
  });

  // End first half using RPC V3
  const endFirstHalf = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("end_first_half_v2", {
        p_game_id: matchId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Intervalo! Jogadores permanecem em campo.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao encerrar 1º tempo");
    },
  });

  // Start second half using RPC V3 - preserves players on field
  const startSecondHalf = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("start_second_half_v2", {
        p_game_id: matchId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("2º tempo iniciado! Jogadores permanecem em campo.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao iniciar 2º tempo");
    },
  });

  // Update added time
  const updateAddedTime = useMutation({
    mutationFn: async (params: { half: 1 | 2; minutes: number }) => {
      const field = params.half === 1 ? "added_time_first_half" : "added_time_second_half";
      
      const { error } = await supabase
        .from("matches")
        .update({ [field]: params.minutes })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: () => {
      toast.error("Erro ao atualizar acréscimo");
    },
  });

  // Finish game using RPC V3
  const finishGame = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("end_game_v2", {
        p_game_id: matchId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Jogo finalizado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao finalizar jogo");
    },
  });

  // Force finish game - emergency button for buggy matches
  // Fixes matches stuck with status=applied/finished but clock_status=running
  const forceFinishGame = useMutation({
    mutationFn: async () => {
      // Force stop all clock-related fields and set to finished state
      const { error } = await supabase
        .from("matches")
        .update({
          status: "finished" as MatchStatus,
          clock_status: "stopped" as ClockStatus,
          half_start_time: null,
          // Cap elapsed seconds to maximum 45 minutes per half (2700 seconds)
          elapsed_seconds_in_half: Math.min(match?.elapsed_seconds_in_half ?? 2700, 2700),
        })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Partida encerrada forçadamente!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao forçar encerramento");
    },
  });

  // Void event using RPC (instead of delete) - now also reverts stats
  const voidEvent = useMutation({
    mutationFn: async (params: { eventId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("void_live_event", {
        p_event_id: params.eventId,
        p_reason: params.reason || null,
      });

      if (error) throw error;
      
      // CRITICAL: Check the success field from the RPC response
      const result = data as { success: boolean; message?: string; stats_reverted?: boolean; match_status?: string } | null;
      if (result && !result.success) {
        throw new Error(result.message || "Erro ao anular evento");
      }
      
      return result;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
      // Invalidate player profile stats for consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "player-match-stats" || 
          query.queryKey[0] === "player-match-stats-by-season-comp",
        refetchType: 'all',
      });
      
      // SINGLE SOURCE OF TRUTH: Rebuild ratings after stat change
      if (matchId) {
        await rebuildSingleMatchRatings(matchId);
      }
      
      toast.success(data?.stats_reverted ? "Evento anulado e estatísticas revertidas" : "Evento anulado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao anular evento");
    },
  });

  // Edit event time using RPC
  const editEventTime = useMutation({
    mutationFn: async (params: { eventId: string; gameTimeSeconds: number }) => {
      // Validate: time must be >= 0
      if (params.gameTimeSeconds < 0) {
        throw new Error("O tempo não pode ser negativo");
      }

      const { data, error } = await supabase.rpc("edit_live_event_time", {
        p_event_id: params.eventId,
        p_game_time_seconds: params.gameTimeSeconds,
      });

      if (error) throw error;
      
      // CRITICAL: Check the success field from the RPC response
      // The RPC returns { success: false, message: "..." } when blocked
      const result = data as { success: boolean; message?: string; game_time_seconds?: number } | null;
      if (!result?.success) {
        throw new Error(result?.message || "Erro ao editar minuto do evento");
      }
      
      return result;
    },
    onSuccess: async (data) => {
      // Invalidate all relevant queries - including match-players since
      // player_on/player_off events now sync to match_players.entered_minute/exited_minute
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
      // Invalidate player profile stats for consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "player-match-stats" || 
          query.queryKey[0] === "player-match-stats-by-season-comp",
        refetchType: 'all',
      });
      
      // SINGLE SOURCE OF TRUTH: Rebuild ratings after time change (affects minutes)
      if (matchId) {
        await rebuildSingleMatchRatings(matchId);
      }
      
      const displayMinute = data?.game_time_seconds != null 
        ? `${Math.floor(data.game_time_seconds / 60)}'` 
        : "";
      toast.success(`Minuto do evento atualizado ${displayMinute}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao editar minuto do evento");
    },
  });

  // Player enters field using RPC V4 (Agency Mode) - now creates event atomically
  const playerEnterField = useMutation({
    mutationFn: async (params: { matchPlayerId: string; minute?: number }) => {
      const { data, error } = await supabase.rpc("player_enter_field", {
        p_match_id: matchId,
        p_match_player_id: params.matchPlayerId,
        p_role: "substitute",
      });

      if (error) throw error;
      return data as { display_minute?: string; period?: number; event_id?: string } | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      const displayMin = data?.display_minute || "";
      toast.success(`Jogador entrou em campo ${displayMin}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar entrada");
    },
  });

  // Player exits field using RPC V4 (Agency Mode) - now creates event atomically
  const playerExitField = useMutation({
    mutationFn: async (params: { matchPlayerId: string; minute?: number }) => {
      const { data, error } = await supabase.rpc("player_exit_field", {
        p_match_id: matchId,
        p_match_player_id: params.matchPlayerId,
      });

      if (error) throw error;
      return data as { display_minute?: string; minutes_this_interval?: number; event_id?: string } | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      const displayMin = data?.display_minute || "";
      toast.success(`Jogador saiu de campo ${displayMin}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar saída");
    },
  });

  // Substitution (player out, player in)
  const substitutePlayer = useMutation({
    mutationFn: async (params: {
      playerOutId: string;
      playerInId: string;
      minute: number;
      half?: number;
      displayMinute?: string;
    }) => {
      const playerOut = matchPlayers.find((mp) => mp.player_id === params.playerOutId);
      const playerIn = matchPlayers.find((mp) => mp.player_id === params.playerInId);

      if (!playerOut || !playerIn) {
        throw new Error("Jogadores não encontrados");
      }

      // Update player out: set is_on_field = false, exited_minute = minute
      const { error: outError } = await supabase
        .from("match_players")
        .update({
          is_on_field: false,
          exited_minute: params.minute,
        })
        .eq("id", playerOut.id);

      if (outError) throw outError;

      // Update player in: set is_on_field = true, entered_minute = minute
      const { error: inError } = await supabase
        .from("match_players")
        .update({
          is_on_field: true,
          entered_minute: params.minute,
        })
        .eq("id", playerIn.id);

      if (inError) throw inError;

      // Create substitution event in the log
      // player_id = player going out, player_in_id = player coming in
      const { error: eventError } = await supabase
        .from("match_events")
        .insert({
          match_id: matchId,
          player_id: params.playerOutId,
          player_in_id: params.playerInId,
          event_type: "substitution",
          minute: params.minute,
          half: params.half ?? (match?.half || 1),
          display_minute: params.displayMinute ?? `${params.minute}'`,
          value: 1,
        });

      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      toast.success("Substituição realizada");
    },
    onError: (error) => {
      console.error("Substitution error:", error);
      toast.error("Erro na substituição");
    },
  });

  // Auto-save to localStorage
  useEffect(() => {
    if (!match || matchPlayers.length === 0) return;
    
    const draftData = {
      matchId,
      savedAt: new Date().toISOString(),
      playerIds: matchPlayers.map(mp => mp.player_id),
      eventCount: matchEvents.length,
    };

    localStorage.setItem(getLocalStorageKey(matchId), JSON.stringify(draftData));
  }, [matchId, match, matchPlayers, matchEvents]);

  // Check for local draft
  const checkLocalDraft = useCallback(() => {
    const saved = localStorage.getItem(getLocalStorageKey(matchId));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }, [matchId]);

  const clearLocalDraft = useCallback(() => {
    localStorage.removeItem(getLocalStorageKey(matchId));
  }, [matchId]);

  // Regenerate match summary - recalculates all player stats from events
  const regenerateSummary = useMutation({
    mutationFn: async () => {
      // Get all official events that count in stats
      const { data: events, error: eventsError } = await supabase
        .from("match_events")
        .select("*")
        .eq("match_id", matchId)
        .eq("event_status", "official")
        .eq("count_in_stats", true);

      if (eventsError) throw eventsError;

      // Get all players in match
      const { data: players, error: playersError } = await supabase
        .from("match_players")
        .select("player_id")
        .eq("match_id", matchId)
        .eq("is_removed", false);

      if (playersError) throw playersError;

      // For each player, recalculate stats from events
      for (const player of players || []) {
        const playerEvents = events?.filter(e => e.player_id === player.player_id) || [];
        
        // Aggregate events by type
        const stats: Record<string, number> = {};
        for (const event of playerEvents) {
          const key = event.event_type;
          stats[key] = (stats[key] || 0) + event.value;
        }

        // Map event types to match_player_stats columns
        const statsUpdate = {
          goals: stats["goal"] || 0,
          assists: stats["assist"] || 0,
          shots: (stats["shot"] || 0) + (stats["shot_on_target"] || 0) + (stats["goal"] || 0),
          shots_on_target: (stats["shot_on_target"] || 0) + (stats["goal"] || 0),
          key_passes: stats["key_pass"] || 0,
          chances_created: stats["chance_created"] || 0,
          passes_completed: stats["pass_success"] || 0,
          // passes_total = passes certos + passes errados (igual lógica de shots)
          passes_total: (stats["pass_success"] || 0) + (stats["pass_total"] || 0),
          dribbles_success: stats["dribble_success"] || 0,
          dribbles_total: (stats["dribble_success"] || 0) + (stats["dribble_attempt"] || 0),
          tackles: stats["tackle"] || 0,
          interceptions: stats["interception"] || 0,
          recoveries: stats["recovery"] || 0,
          clearances: stats["clearance"] || 0,
          duels_won: (stats["duel_won"] || 0) + (stats["ground_duel_won"] || 0) + (stats["aerial_duel_won"] || 0),
          duels_total: (stats["duel_total"] || 0) + (stats["ground_duel_total"] || 0) + (stats["aerial_duel_total"] || 0),
          aerial_duels_won: stats["aerial_duel_won"] || 0,
          aerial_duels_total: stats["aerial_duel_total"] || 0,
          yellow_cards: stats["yellow"] || 0,
          red_cards: stats["red"] || 0,
          fouls_committed: stats["foul_committed"] || 0,
          fouls_suffered: stats["foul_suffered"] || 0,
          possession_lost: stats["possession_lost"] || 0,
          saves: stats["save"] || 0,
          goals_conceded: stats["goal_conceded"] || 0,
        };

        // Upsert stats
        const { error: upsertError } = await supabase
          .from("match_player_stats")
          .upsert({
            match_id: matchId,
            player_id: player.player_id,
            ...statsUpdate,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "match_id,player_id",
          });

        if (upsertError) {
          console.error("Error upserting stats for player:", player.player_id, upsertError);
        }
      }

      return { success: true, playersProcessed: players?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-player-stats", matchId] });
      // Invalidate player profile stats for consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "player-match-stats" || 
          query.queryKey[0] === "player-match-stats-by-season-comp",
        refetchType: 'all',
      });
      toast.success(`Resumo regenerado! ${data.playersProcessed} jogadores processados.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao regenerar resumo");
    },
  });

  return {
    // Data
    match,
    matchPlayers,
    matchEvents,
    filteredPlayers,
    playerEventCounts,
    pendingEventsCount,
    matchPlayerStats,
    playerStatsMap,
    
    // Loading states
    isLoading: matchLoading || playersLoading || eventsLoading || statsLoading,
    matchLoading,
    playersLoading,
    eventsLoading,
    statsLoading,
    matchError,

    // Filters
    onlyOnField,
    setOnlyOnField,

    // Mutations
    addPlayer,
    removePlayer,
    updatePlayer,
    addEvent,
    deleteEvent,
    voidEvent,
    editEventTime,
    undoLastEvent,
    voidLastEventByType,
    updateMatchStatus,
    startGame,
    playerEnterField,
    playerExitField,
    substitutePlayer,
    regenerateSummary,
    // Timer V2 mutations
    playPauseClock,
    resetClock,
    endFirstHalf,
    startSecondHalf,
    updateAddedTime,
    finishGame,
    forceFinishGame,

    // Local draft
    checkLocalDraft,
    clearLocalDraft,
  };
}
