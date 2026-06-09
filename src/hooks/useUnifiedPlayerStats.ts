/**
 * Unified Player Stats Hook
 * 
 * Fetches player statistics from the unified_player_season_stats view.
 * This view consolidates LIVE (match_player_stats) and MANUAL (player_stats) sources
 * with the following priority rules:
 * 
 * - For each (player_id, season_year, competition_id) combination:
 *   - If LIVE data exists -> use LIVE only
 *   - Otherwise -> use MANUAL
 * - NEVER sum LIVE + MANUAL for the same context
 * 
 * This ensures parity with the Player Profile's stats display.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UnifiedStats {
  player_id: string;
  season_year: number;
  competition_id: string | null;
  competition_name: string | null;
  data_source: "live" | "manual";
  
  // Volume
  matches: number;
  minutes: number;
  
  // Offensive
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  chances_created: number;
  key_passes: number;
  
  // Passing & Dribbling
  accurate_passes: number;
  total_passes: number;
  long_passes_accurate?: number;
  long_passes_total?: number;
  successful_dribbles: number;
  total_dribbles: number;
  
  // Defensive
  steals?: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  
  // Goalkeeper
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  
  // Discipline
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;
  penalties_won?: number;
}

export interface AggregatedUnifiedStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shots_on_target: number;
  chances_created: number;
  key_passes: number;
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
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  yellow_cards: number;
  red_cards: number;
  fouls_committed: number;
  fouls_drawn: number;
  clearances: number; // Derived from recoveries for compatibility
}

/**
 * Fetches unified stats for a player.
 * Returns raw rows with data_source indicator.
 */
export async function fetchUnifiedPlayerStats(
  playerId: string,
  seasonYear?: number,
  competitionId?: string
): Promise<UnifiedStats[]> {
  let query = supabase
    .from("unified_player_season_stats")
    .select("*")
    .eq("player_id", playerId);

  if (seasonYear) {
    query = query.eq("season_year", seasonYear);
  }

  if (competitionId) {
    query = query.eq("competition_id", competitionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[useUnifiedPlayerStats] Error fetching:", error);
    return [];
  }

  return (data || []).map((row): UnifiedStats => ({
    player_id: row.player_id || playerId,
    season_year: row.season_year || new Date().getFullYear(),
    competition_id: row.competition_id,
    competition_name: row.competition_name,
    data_source: row.data_source as "live" | "manual",
    matches: Number(row.matches) || 0,
    minutes: Number(row.minutes) || 0,
    goals: Number(row.goals) || 0,
    assists: Number(row.assists) || 0,
    shots: Number(row.shots) || 0,
    shots_on_target: Number(row.shots_on_target) || 0,
    chances_created: Number(row.chances_created) || 0,
    key_passes: Number(row.key_passes) || 0,
    accurate_passes: Number(row.accurate_passes) || 0,
    total_passes: Number(row.total_passes) || 0,
    successful_dribbles: Number(row.successful_dribbles) || 0,
    total_dribbles: Number(row.total_dribbles) || 0,
    tackles: Number(row.tackles) || 0,
    interceptions: Number(row.interceptions) || 0,
    recoveries: Number(row.recoveries) || 0,
    duels_won: Number(row.duels_won) || 0,
    total_duels: Number(row.total_duels) || 0,
    aerial_duels_won: Number(row.aerial_duels_won) || 0,
    aerial_duels_total: Number(row.aerial_duels_total) || 0,
    ground_duels_won: Number(row.ground_duels_won) || 0,
    ground_duels_total: Number(row.ground_duels_total) || 0,
    saves: Number(row.saves) || 0,
    goals_conceded: Number(row.goals_conceded) || 0,
    clean_sheets: Number(row.clean_sheets) || 0,
    penalties_saved: Number(row.penalties_saved) || 0,
    errors_leading_to_goal: Number(row.errors_leading_to_goal) || 0,
    yellow_cards: Number(row.yellow_cards) || 0,
    red_cards: Number(row.red_cards) || 0,
    fouls_committed: Number(row.fouls_committed) || 0,
    fouls_drawn: Number(row.fouls_drawn) || 0,
  }));
}

/**
 * Aggregates unified stats across all competitions/seasons.
 * The view already applies LIVE > MANUAL priority per context,
 * so we just sum all rows.
 */
export function aggregateUnifiedStats(stats: UnifiedStats[]): AggregatedUnifiedStats | null {
  if (stats.length === 0) return null;

  return stats.reduce(
    (acc, s) => ({
      matches: acc.matches + s.matches,
      minutes: acc.minutes + s.minutes,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
      shots: acc.shots + s.shots,
      shots_on_target: acc.shots_on_target + s.shots_on_target,
      chances_created: acc.chances_created + s.chances_created,
      key_passes: acc.key_passes + s.key_passes,
      accurate_passes: acc.accurate_passes + s.accurate_passes,
      total_passes: acc.total_passes + s.total_passes,
      successful_dribbles: acc.successful_dribbles + s.successful_dribbles,
      total_dribbles: acc.total_dribbles + s.total_dribbles,
      tackles: acc.tackles + s.tackles,
      interceptions: acc.interceptions + s.interceptions,
      recoveries: acc.recoveries + s.recoveries,
      duels_won: acc.duels_won + s.duels_won,
      total_duels: acc.total_duels + s.total_duels,
      aerial_duels_won: acc.aerial_duels_won + s.aerial_duels_won,
      aerial_duels_total: acc.aerial_duels_total + s.aerial_duels_total,
      ground_duels_won: acc.ground_duels_won + s.ground_duels_won,
      ground_duels_total: acc.ground_duels_total + s.ground_duels_total,
      saves: acc.saves + s.saves,
      goals_conceded: acc.goals_conceded + s.goals_conceded,
      clean_sheets: acc.clean_sheets + s.clean_sheets,
      penalties_saved: acc.penalties_saved + s.penalties_saved,
      errors_leading_to_goal: acc.errors_leading_to_goal + s.errors_leading_to_goal,
      yellow_cards: acc.yellow_cards + s.yellow_cards,
      red_cards: acc.red_cards + s.red_cards,
      fouls_committed: acc.fouls_committed + s.fouls_committed,
      fouls_drawn: acc.fouls_drawn + s.fouls_drawn,
      clearances: acc.clearances, // Keep accumulated (not in view, derived below)
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      shots_on_target: 0,
      chances_created: 0,
      key_passes: 0,
      accurate_passes: 0,
      total_passes: 0,
      successful_dribbles: 0,
      total_dribbles: 0,
      tackles: 0,
      interceptions: 0,
      recoveries: 0,
      duels_won: 0,
      total_duels: 0,
      aerial_duels_won: 0,
      aerial_duels_total: 0,
      ground_duels_won: 0,
      ground_duels_total: 0,
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      errors_leading_to_goal: 0,
      yellow_cards: 0,
      red_cards: 0,
      fouls_committed: 0,
      fouls_drawn: 0,
      clearances: 0,
    }
  );
}

/**
 * Get available years from stats
 */
export function getAvailableYears(stats: UnifiedStats[]): number[] {
  const yearsSet = new Set<number>();
  for (const s of stats) {
    yearsSet.add(s.season_year);
  }
  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Get available competitions from stats
 */
export function getAvailableCompetitions(stats: UnifiedStats[]): { id: string; name: string }[] {
  const compMap = new Map<string, string>();
  for (const s of stats) {
    if (s.competition_id && s.competition_name) {
      compMap.set(s.competition_id, s.competition_name);
    }
  }
  return Array.from(compMap.entries()).map(([id, name]) => ({ id, name }));
}
