import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  | "box_save" | "punch" | "high_claim" | "sweeper_action";

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
  minute: number | null;
  event_type: MatchEventType;
  value: number;
  created_at: string;
  half: number | null;
  display_minute: string | null;
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

  // Compute event counts per player
  const playerEventCounts = useMemo(() => {
    const counts: Record<string, Record<MatchEventType, number>> = {};
    
    matchEvents.forEach((event) => {
      if (!counts[event.player_id]) {
        counts[event.player_id] = {} as Record<MatchEventType, number>;
      }
      const current = counts[event.player_id][event.event_type] || 0;
      counts[event.player_id][event.event_type] = current + event.value;
    });

    return counts;
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

  // Add event (increment stat) - with half and display_minute
  const addEvent = useMutation({
    mutationFn: async (params: {
      playerId: string;
      eventType: MatchEventType;
      minute?: number;
      value?: number;
      half?: 1 | 2;
      displayMinute?: string;
    }) => {
      // Get current match state for half info
      const currentHalf = match?.half || 1;
      const halfDuration = (match?.duration_minutes || 90) / 2;
      const minuteInHalf = params.minute ? (currentHalf === 2 ? params.minute - halfDuration : params.minute) : 0;
      
      // Calculate display minute string
      let displayMinute = params.displayMinute;
      if (!displayMinute && params.minute !== undefined) {
        if (currentHalf === 1) {
          if (minuteInHalf <= halfDuration) {
            displayMinute = `${params.minute}'`;
          } else {
            displayMinute = `45+${Math.floor(minuteInHalf - halfDuration + 1)}'`;
          }
        } else {
          if (minuteInHalf <= halfDuration) {
            displayMinute = `${params.minute}'`;
          } else {
            displayMinute = `90+${Math.floor(minuteInHalf - halfDuration + 1)}'`;
          }
        }
      }

      const { data, error } = await supabase
        .from("match_events")
        .insert({
          match_id: matchId,
          player_id: params.playerId,
          event_type: params.eventType,
          minute: params.minute ?? null,
          value: params.value ?? 1,
          half: params.half ?? currentHalf,
          display_minute: displayMinute ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] });
    },
    onError: () => {
      toast.error("Erro ao registrar evento");
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

  // Start game - set status to live and update starters (Timer V2)
  const startGame = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      
      // Update match: status to live, initialize timer
      const { error: statusError } = await supabase
        .from("matches")
        .update({ 
          status: "live" as MatchStatus,
          half: 1,
          clock_status: "running" as ClockStatus,
          match_start_time: now,
          half_start_time: now,
          elapsed_seconds_in_half: 0,
        })
        .eq("id", matchId);

      if (statusError) throw statusError;

      // Get all starters and set them on field with entered_minute = 0
      const starters = matchPlayers.filter((mp) => mp.started);
      
      for (const starter of starters) {
        const { error } = await supabase
          .from("match_players")
          .update({
            is_on_field: true,
            entered_minute: 0,
          })
          .eq("id", starter.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Jogo iniciado!");
    },
    onError: () => {
      toast.error("Erro ao iniciar jogo");
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

  // End first half
  const endFirstHalf = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Match not found");

      // Accumulate remaining time and stop
      const now = Date.now();
      const start = match.half_start_time ? new Date(match.half_start_time).getTime() : now;
      const additionalSeconds = match.clock_status === "running" 
        ? Math.floor((now - start) / 1000) 
        : 0;
      const newElapsed = match.elapsed_seconds_in_half + additionalSeconds;

      const { error } = await supabase
        .from("matches")
        .update({
          clock_status: "stopped" as ClockStatus,
          elapsed_seconds_in_half: newElapsed,
          half_start_time: null,
        })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.success("1º tempo encerrado!");
    },
    onError: () => {
      toast.error("Erro ao encerrar 1º tempo");
    },
  });

  // Start second half
  const startSecondHalf = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("matches")
        .update({
          half: 2,
          clock_status: "running" as ClockStatus,
          half_start_time: new Date().toISOString(),
          elapsed_seconds_in_half: 0,
        })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.success("2º tempo iniciado!");
    },
    onError: () => {
      toast.error("Erro ao iniciar 2º tempo");
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

  // Finish game (only available in 2nd half)
  const finishGame = useMutation({
    mutationFn: async () => {
      if (!match) throw new Error("Match not found");

      // Accumulate remaining time and stop
      const now = Date.now();
      const start = match.half_start_time ? new Date(match.half_start_time).getTime() : now;
      const additionalSeconds = match.clock_status === "running" 
        ? Math.floor((now - start) / 1000) 
        : 0;
      const newElapsed = match.elapsed_seconds_in_half + additionalSeconds;

      const { error } = await supabase
        .from("matches")
        .update({
          status: "finished" as MatchStatus,
          clock_status: "stopped" as ClockStatus,
          elapsed_seconds_in_half: newElapsed,
          half_start_time: null,
        })
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.success("Jogo finalizado!");
    },
    onError: () => {
      toast.error("Erro ao finalizar jogo");
    },
  });

  // Player enters field (for substitutes during live game)
  const playerEnterField = useMutation({
    mutationFn: async (params: { matchPlayerId: string; minute: number }) => {
      const { error } = await supabase
        .from("match_players")
        .update({
          is_on_field: true,
          entered_minute: params.minute,
        })
        .eq("id", params.matchPlayerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Jogador entrou em campo");
    },
    onError: () => {
      toast.error("Erro ao registrar entrada");
    },
  });

  // Player exits field
  const playerExitField = useMutation({
    mutationFn: async (params: { matchPlayerId: string; minute: number }) => {
      const { error } = await supabase
        .from("match_players")
        .update({
          is_on_field: false,
          exited_minute: params.minute,
        })
        .eq("id", params.matchPlayerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
      toast.success("Jogador saiu de campo");
    },
    onError: () => {
      toast.error("Erro ao registrar saída");
    },
  });

  // Substitution (player out, player in)
  const substitutePlayer = useMutation({
    mutationFn: async (params: {
      playerOutId: string;
      playerInId: string;
      minute: number;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-players", matchId] });
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
