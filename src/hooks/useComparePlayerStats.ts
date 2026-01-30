import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompareStatsSource = "live" | "manual";

export interface CompareStatRow {
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  source: CompareStatsSource;

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
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;

  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;

  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;

  clearances: number;
  ball_actions: number;
}

export interface CompareAggregatedStats extends Omit<CompareStatRow, "season_year" | "competition_id" | "competition_name" | "source"> {}

function safeInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function aggregate(rows: CompareStatRow[]): CompareAggregatedStats | null {
  if (rows.length === 0) return null;

  return rows.reduce<CompareAggregatedStats>(
    (acc, r) => ({
      matches: acc.matches + r.matches,
      minutes: acc.minutes + r.minutes,
      goals: acc.goals + r.goals,
      assists: acc.assists + r.assists,
      shots: acc.shots + r.shots,
      shots_on_target: acc.shots_on_target + r.shots_on_target,
      key_passes: acc.key_passes + r.key_passes,
      chances_created: acc.chances_created + r.chances_created,
      accurate_passes: acc.accurate_passes + r.accurate_passes,
      total_passes: acc.total_passes + r.total_passes,
      successful_dribbles: acc.successful_dribbles + r.successful_dribbles,
      total_dribbles: acc.total_dribbles + r.total_dribbles,
      tackles: acc.tackles + r.tackles,
      interceptions: acc.interceptions + r.interceptions,
      recoveries: acc.recoveries + r.recoveries,
      duels_won: acc.duels_won + r.duels_won,
      total_duels: acc.total_duels + r.total_duels,
      aerial_duels_won: acc.aerial_duels_won + r.aerial_duels_won,
      aerial_duels_total: acc.aerial_duels_total + r.aerial_duels_total,
      ground_duels_won: acc.ground_duels_won + r.ground_duels_won,
      ground_duels_total: acc.ground_duels_total + r.ground_duels_total,
      yellow_cards: acc.yellow_cards + r.yellow_cards,
      red_cards: acc.red_cards + r.red_cards,
      fouls_committed: acc.fouls_committed + r.fouls_committed,
      fouls_drawn: acc.fouls_drawn + r.fouls_drawn,
      saves: acc.saves + r.saves,
      goals_conceded: acc.goals_conceded + r.goals_conceded,
      clean_sheets: acc.clean_sheets + r.clean_sheets,
      penalties_saved: acc.penalties_saved + r.penalties_saved,
      errors_leading_to_goal: acc.errors_leading_to_goal + r.errors_leading_to_goal,
      clearances: acc.clearances + r.clearances,
      ball_actions: acc.ball_actions + r.ball_actions,
    }),
    {
      matches: 0, minutes: 0, goals: 0, assists: 0, shots: 0, shots_on_target: 0,
      key_passes: 0, chances_created: 0, accurate_passes: 0, total_passes: 0,
      successful_dribbles: 0, total_dribbles: 0, tackles: 0, interceptions: 0,
      recoveries: 0, duels_won: 0, total_duels: 0, aerial_duels_won: 0,
      aerial_duels_total: 0, ground_duels_won: 0, ground_duels_total: 0,
      yellow_cards: 0, red_cards: 0, fouls_committed: 0, fouls_drawn: 0,
      saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
      errors_leading_to_goal: 0, clearances: 0, ball_actions: 0,
    }
  );
}

/**
 * Hook that uses unified_player_season_stats view - same source as Player Profile
 * This ensures Compare page shows EXACT same stats as Profile
 */
export function useComparePlayerStats(params: {
  playerId: string | null;
  seasonFilter: string;
  competitionFilter: string;
}) {
  const { playerId, seasonFilter, competitionFilter } = params;

  const unifiedQuery = useQuery({
    queryKey: ["compare-unified-stats", playerId],
    enabled: !!playerId,
    queryFn: async () => {
      if (!playerId) return [];
      const { data, error } = await supabase
        .from("unified_player_season_stats")
        .select("*")
        .eq("player_id", playerId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const mergedRows = useMemo((): CompareStatRow[] => {
    if (!playerId || !unifiedQuery.data) return [];

    // Debug: log raw DB rows to confirm field availability
    const debugStats = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugStats') === '1';

    return (unifiedQuery.data || []).map((row: any): CompareStatRow => {
      // Log raw row fields if debug mode
      if (debugStats) {
        console.log('[COMPARE_STATS_DB_ROW]', JSON.stringify({
          player_id: row.player_id,
          season_year: row.season_year,
          competition_name: row.competition_name,
          data_source: row.data_source,
          raw_fields: {
            matches: row.matches,
            minutes: row.minutes,
            goals: row.goals,
            assists: row.assists,
            shots: row.shots,
            shots_on_target: row.shots_on_target,
            shots_blocked: row.shots_blocked, // May be undefined if not in view
            accurate_passes: row.accurate_passes,
            total_passes: row.total_passes,
            successful_dribbles: row.successful_dribbles,
            total_dribbles: row.total_dribbles,
          },
        }, null, 2));
      }

      return {
        season_year: row.season_year,
        competition_id: row.competition_id,
        competition_name: row.competition_name,
        source: row.data_source === "live" ? "live" : "manual",
        matches: safeInt(row.matches),
        minutes: safeInt(row.minutes),
        goals: safeInt(row.goals),
        assists: safeInt(row.assists),
        // SHOTS: unified view provides total shots (shots + shots_on_target + shots_blocked)
        shots: safeInt(row.shots),
        shots_on_target: safeInt(row.shots_on_target),
        key_passes: safeInt(row.key_passes),
        chances_created: safeInt(row.chances_created),
        // PASSES: use new semantic fields (passes_completed, passes_attempted)
        accurate_passes: safeInt(row.passes_completed),
        total_passes: safeInt(row.passes_attempted),
        // DRIBBLES: use new semantic fields (dribbles_completed, dribbles_attempted)
        successful_dribbles: safeInt(row.dribbles_completed),
        total_dribbles: safeInt(row.dribbles_attempted),
        tackles: safeInt(row.tackles),
        interceptions: safeInt(row.interceptions),
        recoveries: safeInt(row.recoveries),
        duels_won: safeInt(row.duels_won),
        total_duels: safeInt(row.total_duels),
        aerial_duels_won: safeInt(row.aerial_duels_won),
        aerial_duels_total: safeInt(row.aerial_duels_total),
        ground_duels_won: safeInt(row.ground_duels_won),
        ground_duels_total: safeInt(row.ground_duels_total),
        yellow_cards: safeInt(row.yellow_cards),
        red_cards: safeInt(row.red_cards),
        fouls_committed: safeInt(row.fouls_committed),
        fouls_drawn: safeInt(row.fouls_drawn),
        saves: safeInt(row.saves),
        goals_conceded: safeInt(row.goals_conceded),
        clean_sheets: safeInt(row.clean_sheets),
        penalties_saved: safeInt(row.penalties_saved),
        errors_leading_to_goal: safeInt(row.errors_leading_to_goal),
        clearances: 0,
        ball_actions: 0,
      };
    }).sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year;
      return (a.competition_name || "").localeCompare(b.competition_name || "");
    });
  }, [playerId, unifiedQuery.data]);

  const filteredRows = useMemo(() => {
    let out = mergedRows;
    if (seasonFilter !== "all") {
      const y = Number(seasonFilter);
      out = out.filter((r) => r.season_year === y);
    }
    if (competitionFilter !== "all") {
      out = out.filter((r) => r.competition_id === competitionFilter);
    }
    return out;
  }, [mergedRows, seasonFilter, competitionFilter]);

  const aggregatedStats = useMemo(() => aggregate(filteredRows), [filteredRows]);

  return {
    rows: mergedRows,
    filteredRows,
    aggregatedStats,
    isLoading: unifiedQuery.isLoading,
    error: unifiedQuery.error,
  };
}
