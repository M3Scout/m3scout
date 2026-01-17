import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Types
export type MatchStatus = "draft" | "live" | "finished" | "applied";
export type PositionTemplate = "outfield" | "goalkeeper";

export type MatchEventType =
  // Outfield
  | "goal" | "assist" | "shot" | "shot_on_target"
  | "key_pass" | "chance_created"
  | "dribble_success" | "dribble_attempt"
  | "tackle" | "interception" | "recovery" | "clearance"
  | "duel_won" | "duel_total" | "aerial_duel_won"
  | "yellow" | "red" | "foul_committed" | "foul_suffered"
  | "pass_success" | "pass_total" | "possession_lost"
  // Goalkeeper
  | "save" | "goal_conceded" | "clean_sheet"
  | "penalty_saved" | "error_led_to_goal"
  | "box_save" | "punch" | "high_claim" | "sweeper_action"
  // Player presence events
  | "player_on" | "player_off";

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
        .single();

      if (error) throw error;
      return data as Match;
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

  // Filtered players (exclude removed, optionally only on field)
  const filteredPlayers = useMemo(() => {
    const activePlayers = matchPlayers.filter((mp) => !mp.is_removed);
    if (!onlyOnField) return activePlayers;
    return activePlayers.filter((mp) => mp.is_on_field);
  }, [matchPlayers, onlyOnField]);

  // Compute event counts per player (only counting official events)
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
        .single();

      if (error) throw error;
      return data;
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

  // Add event using RPC - handles draft vs official status automatically
  const addEvent = useMutation({
    mutationFn: async (params: {
      playerId: string;
      eventType: MatchEventType;
      minute?: number;
      value?: number;
      half?: 1 | 2;
      displayMinute?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_live_event", {
        p_game_id: matchId,
        p_player_id: params.playerId,
        p_type: params.eventType,
        p_notes: null,
        p_force_time_seconds: params.minute ? params.minute * 60 : null,
        p_half: params.half || null,
        p_display_minute: params.displayMinute || null,
      });

      if (error) throw error;
      return data as { event_status?: string; event_id?: string } | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      
      // Show different toast based on event status
      if (data?.event_status === "draft") {
        toast.info("Evento registrado (pendente)", {
          description: "Será oficializado quando o jogo iniciar",
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar evento");
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

  // Undo last event for a player
  const undoLastEvent = useCallback(async (playerId: string) => {
    const playerEvents = matchEvents
      .filter((e) => e.player_id === playerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (playerEvents.length === 0) {
      toast.info("Nenhum evento para desfazer");
      return;
    }

    await deleteEvent.mutateAsync(playerEvents[0].id);
    toast.success("Último evento desfeito");
  }, [matchEvents, deleteEvent]);

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
      toast.success("1º tempo encerrado! Todos os atletas saíram de campo.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao encerrar 1º tempo");
    },
  });

  // Start second half using RPC V3 - does NOT auto-enter players
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
      toast.success("2º tempo iniciado! Marque os atletas que entram em campo.");
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

  // Void event using RPC (instead of delete)
  const voidEvent = useMutation({
    mutationFn: async (params: { eventId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("void_live_event", {
        p_event_id: params.eventId,
        p_reason: params.reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      toast.success("Evento anulado");
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
      toast.success("Tempo do evento atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao editar tempo do evento");
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

  return {
    // Data
    match,
    matchPlayers,
    matchEvents,
    filteredPlayers,
    playerEventCounts,
    pendingEventsCount,
    
    // Loading states
    isLoading: matchLoading || playersLoading || eventsLoading,
    matchLoading,
    playersLoading,
    eventsLoading,
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
    updateMatchStatus,
    startGame,
    playerEnterField,
    playerExitField,
    substitutePlayer,
    // Timer V2 mutations
    playPauseClock,
    resetClock,
    endFirstHalf,
    startSecondHalf,
    updateAddedTime,
    finishGame,

    // Local draft
    checkLocalDraft,
    clearLocalDraft,
  };
}
