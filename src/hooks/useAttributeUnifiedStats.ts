/**
 * Unified Attribute Stats Hook
 * 
 * Aggregates LIVE (match_player_stats) + MANUAL (player_stats) data for the attribute radar.
 * This is a SEPARATE aggregator from the Compare page to avoid breaking that feature.
 * 
 * Priority Rule: SUM live + manual (since they represent different games).
 * If the same game somehow existed in both, the view would handle dedup, but
 * in practice live matches are NOT duplicated in player_stats.
 * 
 * Debug: Add ?debugAttributes=1 to URL to see aggregation breakdown.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRegulationGameMinute } from "@/lib/formatters";
import type { PlayerStatRow } from "@/lib/attributeRadar";

interface UseAttributeUnifiedStatsOptions {
  playerId: string;
  seasonYear?: number;
  competitionId?: string;
  enabled?: boolean;
}

interface LiveStatsTotals {
  matches: number;
  minutes: number;
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
  recoveries: number;
  clearances: number;
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
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
}

interface ManualStatsTotals {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  accurate_passes: number;
  total_passes: number;
  successful_dribbles: number;
  total_dribbles: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;
  possession_lost: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
}

interface UnifiedAttributeStatsResult {
  stats: PlayerStatRow[];
  isLoading: boolean;
  error: Error | null;
  debugInfo: {
    liveTotals: LiveStatsTotals | null;
    manualTotals: ManualStatsTotals | null;
    mergedTotals: PlayerStatRow | null;
    seasonYear?: number;
    competitionId?: string;
  };
}

/**
 * Hook to fetch unified stats for the attribute radar.
 * Combines LIVE match data + MANUAL stats table data.
 */
export function useAttributeUnifiedStats({
  playerId,
  seasonYear,
  competitionId,
  enabled = true,
}: UseAttributeUnifiedStatsOptions): UnifiedAttributeStatsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["attribute-unified-stats", playerId, seasonYear, competitionId],
    queryFn: async () => {
      // 1. Fetch LIVE stats from match_player_stats via matches
      let liveQuery = supabase
        .from("match_players")
        .select(`
          id,
          match_id,
          player_id,
          started,
          entered_minute,
          exited_minute,
          minutes_played,
          match:matches!inner (
            id,
            match_date,
            competition_id,
            season_year,
            status
          )
        `)
        .eq("player_id", playerId)
        .neq("is_removed", true)
        .in("match.status", ["finished", "applied"]);

      if (seasonYear) {
        liveQuery = liveQuery.eq("match.season_year", seasonYear);
      }
      if (competitionId) {
        liveQuery = liveQuery.eq("match.competition_id", competitionId);
      }

      const { data: matchPlayers, error: mpError } = await liveQuery;
      if (mpError) throw mpError;

      const matchIds = [...new Set((matchPlayers || []).map((mp: any) => mp.match_id))];

      let liveStatsTotals: LiveStatsTotals = {
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        shots_on_target: 0,
        key_passes: 0,
        chances_created: 0,
        passes_completed: 0,
        passes_total: 0,
        dribbles_success: 0,
        dribbles_total: 0,
        tackles: 0,
        interceptions: 0,
        recoveries: 0,
        clearances: 0,
        duels_won: 0,
        duels_total: 0,
        aerial_duels_won: 0,
        aerial_duels_total: 0,
        yellow_cards: 0,
        red_cards: 0,
        fouls_committed: 0,
        fouls_suffered: 0,
        possession_lost: 0,
        saves: 0,
        goals_conceded: 0,
        clean_sheets: 0,
        penalties_saved: 0,
        errors_leading_to_goal: 0,
      };

      if (matchIds.length > 0) {
        // Fetch match_player_stats for these matches
        const { data: statsData, error: statsError } = await supabase
          .from("match_player_stats")
          .select("*")
          .eq("player_id", playerId)
          .in("match_id", matchIds);

        if (statsError) throw statsError;

        // Fetch minutes from presence or fallback
        const { data: presenceData } = await supabase
          .from("player_field_presence")
          .select("match_id, period, entered_at_seconds, exited_at_seconds")
          .eq("player_id", playerId)
          .in("match_id", matchIds);

        // Calculate presence minutes by match using regulation minutes (same as SubstitutionStatsCard)
        const END_OF_HALF_SECONDS = 45 * 60;
        const presenceMinutesByMatch: Record<string, number> = {};
        for (const p of presenceData || []) {
          const period = (p as any).period ?? 1;
          const entryMin = getRegulationGameMinute(p.entered_at_seconds ?? 0, period);
          const exitSeconds = Math.min(p.exited_at_seconds ?? END_OF_HALF_SECONDS, END_OF_HALF_SECONDS);
          const exitMin = getRegulationGameMinute(exitSeconds, period);
          const delta = Math.max(0, exitMin - entryMin);
          presenceMinutesByMatch[p.match_id] = (presenceMinutesByMatch[p.match_id] ?? 0) + delta;
        }
        for (const matchId of Object.keys(presenceMinutesByMatch)) {
          presenceMinutesByMatch[matchId] = Math.min(presenceMinutesByMatch[matchId], 90);
        }

        // Aggregate stats per match (dedup)
        const statsMap: Record<string, any> = {};
        for (const row of statsData || []) {
          const matchId = row.match_id;
          if (!statsMap[matchId]) {
            statsMap[matchId] = { ...row };
          } else {
            // Sum numeric fields
            Object.keys(row).forEach((k) => {
              if (typeof row[k] === "number" && typeof statsMap[matchId][k] === "number") {
                statsMap[matchId][k] += row[k];
              }
            });
          }
        }

        // Calculate unique matches with minutes > 0
        const uniqueMatchIds = new Set<string>();
        for (const mp of matchPlayers || []) {
          const matchId = mp.match_id;
          const presenceMin = presenceMinutesByMatch[matchId];
          const mpMin = typeof presenceMin === "number" ? presenceMin : Math.min(mp.minutes_played ?? 0, 90);
          if (mpMin > 0) {
            uniqueMatchIds.add(matchId);
          }
        }

        liveStatsTotals.matches = uniqueMatchIds.size;

        // Sum minutes from presence or match_players
        for (const matchId of uniqueMatchIds) {
          const presenceMin = presenceMinutesByMatch[matchId];
          if (typeof presenceMin === "number") {
            liveStatsTotals.minutes += presenceMin;
          } else {
            // Fallback to match_players
            const mp = (matchPlayers || []).find((m: any) => m.match_id === matchId);
            liveStatsTotals.minutes += Math.min(mp?.minutes_played ?? 0, 90);
          }

          const stats = statsMap[matchId];
          if (stats) {
            liveStatsTotals.goals += stats.goals ?? 0;
            liveStatsTotals.assists += stats.assists ?? 0;
            // shots in DB = off_target, total = off + on + blocked
            const shotsOff = stats.shots ?? 0;
            const shotsOn = stats.shots_on_target ?? 0;
            const shotsBlocked = stats.shots_blocked ?? 0;
            liveStatsTotals.shots += shotsOff + shotsOn + shotsBlocked;
            liveStatsTotals.shots_on_target += shotsOn;
            liveStatsTotals.key_passes += stats.key_passes ?? 0;
            liveStatsTotals.chances_created += stats.chances_created ?? 0;
            liveStatsTotals.passes_completed += stats.passes_completed ?? 0;
            liveStatsTotals.passes_total += (stats.passes_completed ?? 0) + (stats.passes_total ?? 0);
            liveStatsTotals.dribbles_success += stats.dribbles_success ?? 0;
            liveStatsTotals.dribbles_total += (stats.dribbles_success ?? 0) + (stats.dribbles_total ?? 0);
            liveStatsTotals.tackles += stats.tackles ?? 0;
            liveStatsTotals.interceptions += stats.interceptions ?? 0;
            liveStatsTotals.recoveries += stats.recoveries ?? 0;
            liveStatsTotals.clearances += stats.clearances ?? 0;
            liveStatsTotals.duels_won += stats.duels_won ?? 0;
            liveStatsTotals.duels_total += stats.duels_total ?? 0;
            liveStatsTotals.aerial_duels_won += stats.aerial_duels_won ?? 0;
            liveStatsTotals.aerial_duels_total += stats.aerial_duels_total ?? 0;
            liveStatsTotals.yellow_cards += stats.yellow_cards ?? 0;
            liveStatsTotals.red_cards += stats.red_cards ?? 0;
            liveStatsTotals.fouls_committed += stats.fouls_committed ?? 0;
            liveStatsTotals.fouls_suffered += stats.fouls_suffered ?? 0;
            liveStatsTotals.possession_lost += stats.possession_lost ?? 0;
            liveStatsTotals.saves += stats.saves ?? 0;
            liveStatsTotals.goals_conceded += stats.goals_conceded ?? 0;
          }
        }
      }

      // 2. Fetch MANUAL stats from player_stats table
      let manualQuery = supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .or("is_archived.is.null,is_archived.eq.false");

      if (seasonYear) {
        manualQuery = manualQuery.eq("season_year", seasonYear);
      }
      if (competitionId) {
        manualQuery = manualQuery.eq("competition_id", competitionId);
      }

      const { data: manualData, error: manualError } = await manualQuery;
      if (manualError) throw manualError;

      let manualStatsTotals: ManualStatsTotals = {
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        shots_on_target: 0,
        key_passes: 0,
        chances_created: 0,
        accurate_passes: 0,
        total_passes: 0,
        successful_dribbles: 0,
        total_dribbles: 0,
        tackles: 0,
        interceptions: 0,
        recoveries: 0,
        clearances: 0,
        duels_won: 0,
        total_duels: 0,
        aerial_duels_won: 0,
        aerial_duels_total: 0,
        yellow_cards: 0,
        red_cards: 0,
        fouls_committed: 0,
        fouls_drawn: 0,
        possession_lost: 0,
        saves: 0,
        goals_conceded: 0,
        clean_sheets: 0,
        penalties_saved: 0,
        errors_leading_to_goal: 0,
      };

      for (const row of manualData || []) {
        manualStatsTotals.matches += row.matches ?? 0;
        manualStatsTotals.minutes += row.minutes ?? 0;
        manualStatsTotals.goals += row.goals ?? 0;
        manualStatsTotals.assists += row.assists ?? 0;
        manualStatsTotals.shots += row.shots ?? 0;
        manualStatsTotals.shots_on_target += row.shots_on_target ?? 0;
        manualStatsTotals.key_passes += row.key_passes ?? 0;
        manualStatsTotals.chances_created += row.chances_created ?? 0;
        manualStatsTotals.accurate_passes += row.accurate_passes ?? 0;
        manualStatsTotals.total_passes += row.total_passes ?? 0;
        manualStatsTotals.successful_dribbles += row.successful_dribbles ?? 0;
        manualStatsTotals.total_dribbles += row.total_dribbles ?? 0;
        manualStatsTotals.tackles += row.tackles ?? 0;
        manualStatsTotals.interceptions += row.interceptions ?? 0;
        manualStatsTotals.recoveries += row.recoveries ?? 0;
        manualStatsTotals.clearances += row.clearances ?? 0;
        manualStatsTotals.duels_won += row.duels_won ?? 0;
        manualStatsTotals.total_duels += row.total_duels ?? 0;
        manualStatsTotals.aerial_duels_won += row.aerial_duels_won ?? 0;
        manualStatsTotals.aerial_duels_total += row.aerial_duels_total ?? 0;
        manualStatsTotals.yellow_cards += row.yellow_cards ?? 0;
        manualStatsTotals.red_cards += row.red_cards ?? 0;
        manualStatsTotals.fouls_committed += row.fouls_committed ?? 0;
        manualStatsTotals.fouls_drawn += row.fouls_drawn ?? 0;
        manualStatsTotals.possession_lost += row.possession_lost ?? 0;
        manualStatsTotals.saves += row.saves ?? 0;
        manualStatsTotals.goals_conceded += row.goals_conceded ?? 0;
        manualStatsTotals.clean_sheets += row.clean_sheets ?? 0;
        manualStatsTotals.penalties_saved += row.penalties_saved ?? 0;
        manualStatsTotals.errors_leading_to_goal += row.errors_leading_to_goal ?? 0;
      }

      // 3. MERGE: Sum live + manual (they represent DIFFERENT games)
      const mergedStats: PlayerStatRow = {
        matches: liveStatsTotals.matches + manualStatsTotals.matches,
        minutes: liveStatsTotals.minutes + manualStatsTotals.minutes,
        goals: liveStatsTotals.goals + manualStatsTotals.goals,
        assists: liveStatsTotals.assists + manualStatsTotals.assists,
        yellow_cards: liveStatsTotals.yellow_cards + manualStatsTotals.yellow_cards,
        red_cards: liveStatsTotals.red_cards + manualStatsTotals.red_cards,
        tackles: liveStatsTotals.tackles + manualStatsTotals.tackles,
        interceptions: liveStatsTotals.interceptions + manualStatsTotals.interceptions,
        recoveries: liveStatsTotals.recoveries + manualStatsTotals.recoveries,
        saves: liveStatsTotals.saves + manualStatsTotals.saves,
        goals_conceded: liveStatsTotals.goals_conceded + manualStatsTotals.goals_conceded,
        clean_sheets: liveStatsTotals.clean_sheets + manualStatsTotals.clean_sheets,
        penalties_saved: liveStatsTotals.penalties_saved + manualStatsTotals.penalties_saved,
        errors_leading_to_goal: liveStatsTotals.errors_leading_to_goal + manualStatsTotals.errors_leading_to_goal,
        aerial_duels_won: liveStatsTotals.aerial_duels_won + manualStatsTotals.aerial_duels_won,
        aerial_duels_total: liveStatsTotals.aerial_duels_total + manualStatsTotals.aerial_duels_total,
        // For passes: live uses passes_completed/passes_total, manual uses accurate_passes/total_passes
        accurate_passes: liveStatsTotals.passes_completed + manualStatsTotals.accurate_passes,
        total_passes: liveStatsTotals.passes_total + manualStatsTotals.total_passes,
        duels_won: liveStatsTotals.duels_won + manualStatsTotals.duels_won,
        total_duels: liveStatsTotals.duels_total + manualStatsTotals.total_duels,
        chances_created: liveStatsTotals.chances_created + manualStatsTotals.chances_created,
        key_passes: liveStatsTotals.key_passes + manualStatsTotals.key_passes,
        shots: liveStatsTotals.shots + manualStatsTotals.shots,
        shots_on_target: liveStatsTotals.shots_on_target + manualStatsTotals.shots_on_target,
        // Dribbles
        successful_dribbles: liveStatsTotals.dribbles_success + manualStatsTotals.successful_dribbles,
        total_dribbles: liveStatsTotals.dribbles_total + manualStatsTotals.total_dribbles,
        // Defense
        clearances: liveStatsTotals.clearances + manualStatsTotals.clearances,
        // Discipline
        fouls_committed: liveStatsTotals.fouls_committed + manualStatsTotals.fouls_committed,
        fouls_drawn: liveStatsTotals.fouls_suffered + manualStatsTotals.fouls_drawn,
        possession_lost: liveStatsTotals.possession_lost + manualStatsTotals.possession_lost,
      };

      return {
        liveStatsTotals,
        manualStatsTotals,
        mergedStats,
      };
    },
    enabled: enabled && !!playerId,
    staleTime: 30_000,
  });

  // Debug logging
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("debugAttributes") && data) {
      console.log("[ATTRIBUTE_UNIFIED_STATS]", {
        playerId,
        seasonYear,
        competitionId,
        liveTotals: data.liveStatsTotals,
        manualTotals: data.manualStatsTotals,
        mergedFinal: data.mergedStats,
      });
    }
  }

  // Return as array of PlayerStatRow (for computeRadarAttributes which expects an array)
  const stats: PlayerStatRow[] = data?.mergedStats ? [data.mergedStats] : [];

  return {
    stats,
    isLoading,
    error: error as Error | null,
    debugInfo: {
      liveTotals: data?.liveStatsTotals ?? null,
      manualTotals: data?.manualStatsTotals ?? null,
      mergedTotals: data?.mergedStats ?? null,
      seasonYear,
      competitionId,
    },
  };
}
