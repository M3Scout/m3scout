/**
 * Manual Player Stats Hook
 * 
 * Manages statistics for games NOT tracked via Live Match (external games, historical data).
 * Uses the dedicated manual_player_stats table with UNIQUE constraint per player/season/competition.
 * 
 * IMPORTANT: Manual stats are NOT used for rating calculations - only Live Match data affects ratings.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManualPlayerStats {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  games: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  passes_completed: number;
  passes_failed: number;
  key_passes: number;
  chances_created: number;
  dribbles_success: number;
  dribbles_failed: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  duels_won: number;
  duels_lost: number;
  aerial_duels_won: number;
  aerial_duels_lost: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_suffered: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  competition?: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

export interface ManualStatsInput {
  player_id: string;
  season_year: number;
  competition_id: string | null;
  games: number;
  minutes: number;
  goals?: number;
  assists?: number;
  shots?: number;
  shots_on_target?: number;
  passes_completed?: number;
  passes_failed?: number;
  key_passes?: number;
  chances_created?: number;
  dribbles_success?: number;
  dribbles_failed?: number;
  tackles?: number;
  interceptions?: number;
  recoveries?: number;
  clearances?: number;
  duels_won?: number;
  duels_lost?: number;
  aerial_duels_won?: number;
  aerial_duels_lost?: number;
  yellow_cards?: number;
  red_cards?: number;
  fouls_committed?: number;
  fouls_suffered?: number;
  saves?: number;
  goals_conceded?: number;
  clean_sheets?: number;
  penalties_saved?: number;
  notes?: string;
}

interface UseManualPlayerStatsOptions {
  playerId: string;
  enabled?: boolean;
}

/**
 * Hook for fetching and managing manual player stats
 */
export function useManualPlayerStats({ playerId, enabled = true }: UseManualPlayerStatsOptions) {
  const queryClient = useQueryClient();
  const queryKey = ["manual-player-stats", playerId];

  // Fetch all manual stats for this player
  const { 
    data: manualStats = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<ManualPlayerStats[]> => {
      const { data, error } = await supabase
        .from("manual_player_stats")
        .select(`
          *,
          competition:competitions(id, name, display_name)
        `)
        .eq("player_id", playerId)
        .order("season_year", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ManualPlayerStats[];
    },
    enabled: enabled && !!playerId,
    staleTime: 30_000,
  });

  // Group by season/competition for easy lookup
  const manualStatsByKey = new Map<string, ManualPlayerStats>();
  manualStats.forEach(ms => {
    const key = `${ms.season_year}_${ms.competition_id || 'none'}`;
    manualStatsByKey.set(key, ms);
  });

  /**
   * Check if all stats fields are zero (cleanup trigger)
   */
  const isAllFieldsZero = (input: ManualStatsInput): boolean => {
    return (
      input.games === 0 &&
      input.minutes === 0 &&
      (input.goals ?? 0) === 0 &&
      (input.assists ?? 0) === 0 &&
      (input.shots ?? 0) === 0 &&
      (input.shots_on_target ?? 0) === 0 &&
      (input.passes_completed ?? 0) === 0 &&
      (input.passes_failed ?? 0) === 0 &&
      (input.key_passes ?? 0) === 0 &&
      (input.chances_created ?? 0) === 0 &&
      (input.dribbles_success ?? 0) === 0 &&
      (input.dribbles_failed ?? 0) === 0 &&
      (input.tackles ?? 0) === 0 &&
      (input.interceptions ?? 0) === 0 &&
      (input.recoveries ?? 0) === 0 &&
      (input.clearances ?? 0) === 0 &&
      (input.duels_won ?? 0) === 0 &&
      (input.duels_lost ?? 0) === 0 &&
      (input.aerial_duels_won ?? 0) === 0 &&
      (input.aerial_duels_lost ?? 0) === 0 &&
      (input.yellow_cards ?? 0) === 0 &&
      (input.red_cards ?? 0) === 0 &&
      (input.fouls_committed ?? 0) === 0 &&
      (input.fouls_suffered ?? 0) === 0 &&
      (input.saves ?? 0) === 0 &&
      (input.goals_conceded ?? 0) === 0 &&
      (input.clean_sheets ?? 0) === 0 &&
      (input.penalties_saved ?? 0) === 0
    );
  };

  // Upsert mutation (uses UNIQUE constraint)
  // CLEANUP RULE: If all fields are zero, DELETE the record instead
  const upsertMutation = useMutation({
    mutationFn: async (input: ManualStatsInput) => {
      // CLEANUP: If games=0 AND all fields=0, DELETE the record
      if (isAllFieldsZero(input)) {
        // Find existing record to delete
        const existing = manualStats.find(
          ms => 
            ms.player_id === input.player_id &&
            ms.season_year === input.season_year &&
            ms.competition_id === input.competition_id
        );
        
        if (existing) {
          const { error } = await supabase
            .from("manual_player_stats")
            .delete()
            .eq("id", existing.id);

          if (error) throw error;
          
          return { deleted: true, id: existing.id };
        }
        
        // No existing record and all zeros = no-op
        return { deleted: false, noOp: true };
      }

      // UPSERT: if exists, update; if not, insert
      const { data, error } = await supabase
        .from("manual_player_stats")
        .upsert(
          {
            player_id: input.player_id,
            season_year: input.season_year,
            competition_id: input.competition_id,
            games: input.games,
            minutes: input.minutes,
            goals: input.goals ?? 0,
            assists: input.assists ?? 0,
            shots: input.shots ?? 0,
            shots_on_target: input.shots_on_target ?? 0,
            passes_completed: input.passes_completed ?? 0,
            passes_failed: input.passes_failed ?? 0,
            key_passes: input.key_passes ?? 0,
            chances_created: input.chances_created ?? 0,
            dribbles_success: input.dribbles_success ?? 0,
            dribbles_failed: input.dribbles_failed ?? 0,
            tackles: input.tackles ?? 0,
            interceptions: input.interceptions ?? 0,
            recoveries: input.recoveries ?? 0,
            clearances: input.clearances ?? 0,
            duels_won: input.duels_won ?? 0,
            duels_lost: input.duels_lost ?? 0,
            aerial_duels_won: input.aerial_duels_won ?? 0,
            aerial_duels_lost: input.aerial_duels_lost ?? 0,
            yellow_cards: input.yellow_cards ?? 0,
            red_cards: input.red_cards ?? 0,
            fouls_committed: input.fouls_committed ?? 0,
            fouls_suffered: input.fouls_suffered ?? 0,
            saves: input.saves ?? 0,
            goals_conceded: input.goals_conceded ?? 0,
            clean_sheets: input.clean_sheets ?? 0,
            penalties_saved: input.penalties_saved ?? 0,
            notes: input.notes ?? null,
          },
          {
            onConflict: "player_id,season_year,competition_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manual_player_stats")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    manualStats,
    manualStatsByKey,
    isLoading,
    error,
    refetch,
    upsertManualStats: upsertMutation.mutateAsync,
    deleteManualStats: deleteMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Check for potential duplication between manual and live stats
 */
export function checkDuplicationWarning(
  manualGames: number,
  liveGames: number,
  manualGoals: number,
  liveGoals: number,
  manualAssists: number,
  liveAssists: number
): { isDuplicate: boolean; similarity: number; message: string | null } {
  // If manual is empty, no warning
  if (manualGames === 0) {
    return { isDuplicate: false, similarity: 0, message: null };
  }

  // Check for exact match on games
  if (manualGames === liveGames && liveGames > 0) {
    return {
      isDuplicate: true,
      similarity: 100,
      message: `Manual tem o mesmo número de jogos que o Live (${liveGames}). Isso parece duplicação. Manual deve ser apenas jogos EXTERNOS não registrados no Live Match.`,
    };
  }

  // Check for very high similarity (>95%)
  const totalGames = liveGames + manualGames;
  const matchMetrics = [
    { manual: manualGames, live: liveGames },
    { manual: manualGoals, live: liveGoals },
    { manual: manualAssists, live: liveAssists },
  ];

  let matchCount = 0;
  let checkCount = 0;

  matchMetrics.forEach(({ manual, live }) => {
    if (live > 0 || manual > 0) {
      checkCount++;
      if (manual === live) matchCount++;
    }
  });

  const similarity = checkCount > 0 ? (matchCount / checkCount) * 100 : 0;

  if (similarity >= 95 && manualGames > 0) {
    return {
      isDuplicate: true,
      similarity,
      message: `Os valores manuais parecem duplicar os dados do Live Match (${similarity.toFixed(0)}% iguais). Manual deve conter apenas jogos não registrados via Live Match.`,
    };
  }

  return { isDuplicate: false, similarity, message: null };
}
