/**
 * Hook to fetch player's previous match zone distributions for deviation calculation
 * 
 * SAFETY RULES:
 * - Read-only: fetches data only
 * - Uses existing match_player_stats data
 * - Calculates zone heatmap in-memory (no DB writes)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateZoneHeatmap, type MatchStatsInput } from "@/lib/postGameAnalysis";
import { type PreviousGameZone } from "@/lib/zoneDeviationEngine";

interface UsePlayerZoneHistoryOptions {
  playerId: string;
  seasonYear: number;
  currentMatchId: string;
  playerPosition: string;
  enabled?: boolean;
}

interface MatchPlayerWithStats {
  id: string;
  match_id: string;
  player_id: string;
  started: boolean;
  minutes_played: number | null;
  match: {
    id: string;
    match_date: string;
    status: string;
    season_year: number;
    duration_minutes: number;
  } | null;
}

interface MatchPlayerStats {
  match_id: string;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  passes_completed: number;
  passes_total: number;
  dribbles_success: number;
  dribbles_total: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  recoveries: number;
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  fouls_committed: number;
  fouls_suffered: number;
  possession_lost: number;
  saves: number;
  goals_conceded: number;
  blocked_shots: number;
  was_dribbled: number;
  ball_actions: number;
  crosses_success: number;
  crosses_failed: number;
  offsides: number;
  shots_blocked: number;
}

/**
 * Fetches previous finished matches for a player in the current season
 * and calculates zone distributions for each
 */
export function usePlayerZoneHistory({
  playerId,
  seasonYear,
  currentMatchId,
  playerPosition,
  enabled = true,
}: UsePlayerZoneHistoryOptions) {
  return useQuery({
    queryKey: ["player-zone-history", playerId, seasonYear, currentMatchId],
    queryFn: async (): Promise<PreviousGameZone[]> => {
      // 1. Fetch player's finished matches in this season (excluding current)
      const { data: matchPlayers, error: matchError } = await supabase
        .from("match_players")
        .select(`
          id,
          match_id,
          player_id,
          started,
          minutes_played,
          match:matches!inner (
            id,
            match_date,
            status,
            season_year,
            duration_minutes
          )
        `)
        .eq("player_id", playerId)
        .neq("match_id", currentMatchId)
        .in("match.status", ["finished", "applied"])
        .eq("match.season_year", seasonYear);

      if (matchError) {
        console.error("[ZoneHistory] Error fetching matches:", matchError);
        return [];
      }

      if (!matchPlayers || matchPlayers.length === 0) {
        return [];
      }

      // Filter out matches where match is null (type safety)
      const validMatches = (matchPlayers as MatchPlayerWithStats[]).filter(
        (mp) => mp.match !== null
      );

      // 2. Fetch stats for all these matches
      const matchIds = validMatches.map((mp) => mp.match_id);
      const { data: allStats, error: statsError } = await supabase
        .from("match_player_stats")
        .select("*")
        .eq("player_id", playerId)
        .in("match_id", matchIds);

      if (statsError) {
        console.error("[ZoneHistory] Error fetching stats:", statsError);
        return [];
      }

      // Create stats lookup map
      const statsMap = new Map<string, MatchPlayerStats>();
      (allStats || []).forEach((stat) => {
        statsMap.set(stat.match_id, stat as MatchPlayerStats);
      });

      // 3. Calculate zone distribution for each match
      const previousGames: PreviousGameZone[] = [];

      for (const mp of validMatches) {
        const match = mp.match!;
        const stats = statsMap.get(mp.match_id);
        const minutesPlayed = mp.minutes_played ?? match.duration_minutes;

        // Convert to MatchStatsInput format
        const matchStats: MatchStatsInput = stats
          ? {
              goals: stats.goals,
              assists: stats.assists,
              shots: stats.shots,
              shots_on_target: stats.shots_on_target,
              key_passes: stats.key_passes,
              chances_created: stats.chances_created,
              passes_completed: stats.passes_completed,
              passes_total: stats.passes_total,
              dribbles_success: stats.dribbles_success,
              dribbles_total: stats.dribbles_total,
              tackles: stats.tackles,
              interceptions: stats.interceptions,
              clearances: stats.clearances,
              recoveries: stats.recoveries,
              duels_won: stats.duels_won,
              duels_total: stats.duels_total,
              aerial_duels_won: stats.aerial_duels_won,
              aerial_duels_total: stats.aerial_duels_total,
              fouls_committed: stats.fouls_committed,
              fouls_suffered: stats.fouls_suffered,
              possession_lost: stats.possession_lost,
              saves: stats.saves,
              goals_conceded: stats.goals_conceded,
              blocked_shots: stats.blocked_shots,
              was_dribbled: stats.was_dribbled,
              ball_actions: stats.ball_actions,
              crosses_success: stats.crosses_success,
              crosses_failed: stats.crosses_failed,
              offsides: stats.offsides,
              shots_blocked: stats.shots_blocked,
            }
          : {};

        // Calculate zone heatmap using existing engine
        const heatmap = calculateZoneHeatmap(
          playerPosition,
          matchStats,
          minutesPlayed
        );

        previousGames.push({
          matchId: match.id,
          matchDate: match.match_date,
          percentages: heatmap.percentages,
        });
      }

      return previousGames;
    },
    enabled: enabled && !!playerId && !!seasonYear && !!currentMatchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
