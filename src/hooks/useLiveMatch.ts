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

  // Filtered players (only on field if toggle active)
  const filteredPlayers = useMemo(() => {
    if (!onlyOnField) return matchPlayers;
    return matchPlayers.filter((mp) => mp.is_on_field);
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
      
      const { data, error } = await supabase
        .from("match_players")
        .insert({
          match_id: matchId,
          player_id: params.playerId,
          position_template: positionTemplate,
          started: params.started,
          entered_minute: params.started ? 0 : (params.enteredMinute ?? null),
          exited_minute: params.exitedMinute ?? null,
          is_on_field: params.started || (params.enteredMinute !== undefined && params.exitedMinute === undefined),
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

  // Add event (increment stat)
  const addEvent = useMutation({
    mutationFn: async (params: {
      playerId: string;
      eventType: MatchEventType;
      minute?: number;
      value?: number;
    }) => {
      const { data, error } = await supabase
        .from("match_events")
        .insert({
          match_id: matchId,
          player_id: params.playerId,
          event_type: params.eventType,
          minute: params.minute ?? null,
          value: params.value ?? 1,
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

    // Local draft
    checkLocalDraft,
    clearLocalDraft,
  };
}
