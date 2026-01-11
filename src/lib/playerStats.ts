import { supabase } from "@/integrations/supabase/client";

/**
 * Player Stats Interface
 * 
 * Includes all stats for field players AND goalkeepers.
 * Goalkeeper-specific stats: saves, goals_conceded, clean_sheets, penalties_saved, errors_leading_to_goal
 */
export interface PlayerStats {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  // General stats
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  // Defensive stats
  tackles: number;
  interceptions: number;
  recoveries: number;
  // Goalkeeper-specific stats
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  // Additional stats
  aerial_duels_won: number;
  accurate_passes: number;
  total_passes: number;
  duels_won: number;
  total_duels: number;
  chances_created: number;
  key_passes: number;
  shots: number;
  shots_on_target: number;
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface PlayerStatsInput {
  player_id: string;
  season_year: number;
  competition_id?: string | null;
  // General stats
  matches?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  // Defensive stats
  tackles?: number;
  interceptions?: number;
  recoveries?: number;
  // Goalkeeper-specific stats
  saves?: number;
  goals_conceded?: number;
  clean_sheets?: number;
  penalties_saved?: number;
  errors_leading_to_goal?: number;
  // Additional stats
  aerial_duels_won?: number;
  accurate_passes?: number;
  total_passes?: number;
  duels_won?: number;
  total_duels?: number;
  chances_created?: number;
  key_passes?: number;
  shots?: number;
  shots_on_target?: number;
}

export interface AggregatedStats {
  season_year: number;
  // General stats
  total_matches: number;
  total_minutes: number;
  total_goals: number;
  total_assists: number;
  total_yellow_cards: number;
  total_red_cards: number;
  // Defensive stats
  total_tackles: number;
  total_interceptions: number;
  total_recoveries: number;
  // Goalkeeper-specific stats
  total_saves: number;
  total_goals_conceded: number;
  total_clean_sheets: number;
  total_penalties_saved: number;
  total_errors_leading_to_goal: number;
  // Additional stats
  total_aerial_duels_won: number;
  total_accurate_passes: number;
  total_passes: number;
  total_duels_won: number;
  total_duels: number;
  total_chances_created: number;
  total_key_passes: number;
  total_shots: number;
  total_shots_on_target: number;
  // Metadata
  competitions_count: number;
}

/**
 * Upsert player stats for a specific season and competition.
 * Uses the unique constraint (player_id, season_year, competition_id) for upsert.
 */
export async function upsertPlayerStats(
  stats: PlayerStatsInput
): Promise<{ data: PlayerStats | null; error: Error | null }> {
  try {
    // Validate non-negative values for all numeric fields
    const numericFields = [
      'matches', 'minutes', 'goals', 'assists', 
      'yellow_cards', 'red_cards', 'tackles', 
      'interceptions', 'recoveries',
      // Goalkeeper-specific
      'saves', 'goals_conceded', 'clean_sheets',
      'penalties_saved', 'errors_leading_to_goal',
      // Additional
      'aerial_duels_won', 'accurate_passes', 'total_passes',
      'duels_won', 'total_duels', 'chances_created',
      'key_passes', 'shots', 'shots_on_target'
    ] as const;

    for (const field of numericFields) {
      const value = stats[field];
      if (value !== undefined && value < 0) {
        return { data: null, error: new Error(`${field} cannot be negative`) };
      }
    }

    const { data, error } = await supabase
      .from('player_stats')
      .upsert(
        {
          player_id: stats.player_id,
          season_year: stats.season_year,
          competition_id: stats.competition_id || null,
          // General stats
          matches: stats.matches ?? 0,
          minutes: stats.minutes ?? 0,
          goals: stats.goals ?? 0,
          assists: stats.assists ?? 0,
          yellow_cards: stats.yellow_cards ?? 0,
          red_cards: stats.red_cards ?? 0,
          // Defensive stats
          tackles: stats.tackles ?? 0,
          interceptions: stats.interceptions ?? 0,
          recoveries: stats.recoveries ?? 0,
          // Goalkeeper-specific stats
          saves: stats.saves ?? 0,
          goals_conceded: stats.goals_conceded ?? 0,
          clean_sheets: stats.clean_sheets ?? 0,
          penalties_saved: stats.penalties_saved ?? 0,
          errors_leading_to_goal: stats.errors_leading_to_goal ?? 0,
          // Additional stats
          aerial_duels_won: stats.aerial_duels_won ?? 0,
          accurate_passes: stats.accurate_passes ?? 0,
          total_passes: stats.total_passes ?? 0,
          duels_won: stats.duels_won ?? 0,
          total_duels: stats.total_duels ?? 0,
          chances_created: stats.chances_created ?? 0,
          key_passes: stats.key_passes ?? 0,
          shots: stats.shots ?? 0,
          shots_on_target: stats.shots_on_target ?? 0,
        },
        {
          onConflict: 'player_id,season_year,competition_id',
        }
      )
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as PlayerStats, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get all stats for a player in a specific season.
 */
export async function getPlayerStatsBySeason(
  playerId: string,
  seasonYear: number
): Promise<{ data: PlayerStats[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*, competitions(name, computed_coefficient)')
      .eq('player_id', playerId)
      .eq('season_year', seasonYear)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as PlayerStats[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get aggregated stats for a player across all competitions in a season.
 */
export async function getAggregatedPlayerStats(
  playerId: string,
  seasonYear: number
): Promise<{ data: AggregatedStats | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .eq('season_year', seasonYear);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { 
        data: createEmptyAggregatedStats(seasonYear), 
        error: null 
      };
    }

    const aggregated: AggregatedStats = {
      season_year: seasonYear,
      // General stats
      total_matches: data.reduce((sum, s) => sum + (s.matches || 0), 0),
      total_minutes: data.reduce((sum, s) => sum + (s.minutes || 0), 0),
      total_goals: data.reduce((sum, s) => sum + (s.goals || 0), 0),
      total_assists: data.reduce((sum, s) => sum + (s.assists || 0), 0),
      total_yellow_cards: data.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
      total_red_cards: data.reduce((sum, s) => sum + (s.red_cards || 0), 0),
      // Defensive stats
      total_tackles: data.reduce((sum, s) => sum + (s.tackles || 0), 0),
      total_interceptions: data.reduce((sum, s) => sum + (s.interceptions || 0), 0),
      total_recoveries: data.reduce((sum, s) => sum + (s.recoveries || 0), 0),
      // Goalkeeper-specific stats
      total_saves: data.reduce((sum, s) => sum + (s.saves || 0), 0),
      total_goals_conceded: data.reduce((sum, s) => sum + (s.goals_conceded || 0), 0),
      total_clean_sheets: data.reduce((sum, s) => sum + (s.clean_sheets || 0), 0),
      total_penalties_saved: data.reduce((sum, s) => sum + (s.penalties_saved || 0), 0),
      total_errors_leading_to_goal: data.reduce((sum, s) => sum + (s.errors_leading_to_goal || 0), 0),
      // Additional stats
      total_aerial_duels_won: data.reduce((sum, s) => sum + (s.aerial_duels_won || 0), 0),
      total_accurate_passes: data.reduce((sum, s) => sum + (s.accurate_passes || 0), 0),
      total_passes: data.reduce((sum, s) => sum + (s.total_passes || 0), 0),
      total_duels_won: data.reduce((sum, s) => sum + (s.duels_won || 0), 0),
      total_duels: data.reduce((sum, s) => sum + (s.total_duels || 0), 0),
      total_chances_created: data.reduce((sum, s) => sum + (s.chances_created || 0), 0),
      total_key_passes: data.reduce((sum, s) => sum + (s.key_passes || 0), 0),
      total_shots: data.reduce((sum, s) => sum + (s.shots || 0), 0),
      total_shots_on_target: data.reduce((sum, s) => sum + (s.shots_on_target || 0), 0),
      // Metadata
      competitions_count: data.length,
    };

    return { data: aggregated, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Helper function to create empty aggregated stats
 */
function createEmptyAggregatedStats(seasonYear: number): AggregatedStats {
  return {
    season_year: seasonYear,
    total_matches: 0,
    total_minutes: 0,
    total_goals: 0,
    total_assists: 0,
    total_yellow_cards: 0,
    total_red_cards: 0,
    total_tackles: 0,
    total_interceptions: 0,
    total_recoveries: 0,
    total_saves: 0,
    total_goals_conceded: 0,
    total_clean_sheets: 0,
    total_penalties_saved: 0,
    total_errors_leading_to_goal: 0,
    total_aerial_duels_won: 0,
    total_accurate_passes: 0,
    total_passes: 0,
    total_duels_won: 0,
    total_duels: 0,
    total_chances_created: 0,
    total_key_passes: 0,
    total_shots: 0,
    total_shots_on_target: 0,
    competitions_count: 0,
  };
}

/**
 * Get all stats for a player across all seasons.
 */
export async function getAllPlayerStats(
  playerId: string
): Promise<{ data: PlayerStats[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*, competitions(name, computed_coefficient)')
      .eq('player_id', playerId)
      .order('season_year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as PlayerStats[], error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Get aggregated stats for a player across all seasons.
 */
export async function getCareerAggregatedStats(
  playerId: string
): Promise<{ data: Map<number, AggregatedStats> | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .order('season_year', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const statsByYear = new Map<number, AggregatedStats>();

    if (data) {
      // Group by season_year
      const grouped = data.reduce((acc, stat) => {
        const year = stat.season_year;
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(stat);
        return acc;
      }, {} as Record<number, typeof data>);

      // Calculate aggregates for each year
      for (const [year, stats] of Object.entries(grouped)) {
        const seasonYear = parseInt(year);
        statsByYear.set(seasonYear, {
          season_year: seasonYear,
          // General stats
          total_matches: stats.reduce((sum, s) => sum + (s.matches || 0), 0),
          total_minutes: stats.reduce((sum, s) => sum + (s.minutes || 0), 0),
          total_goals: stats.reduce((sum, s) => sum + (s.goals || 0), 0),
          total_assists: stats.reduce((sum, s) => sum + (s.assists || 0), 0),
          total_yellow_cards: stats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
          total_red_cards: stats.reduce((sum, s) => sum + (s.red_cards || 0), 0),
          // Defensive stats
          total_tackles: stats.reduce((sum, s) => sum + (s.tackles || 0), 0),
          total_interceptions: stats.reduce((sum, s) => sum + (s.interceptions || 0), 0),
          total_recoveries: stats.reduce((sum, s) => sum + (s.recoveries || 0), 0),
          // Goalkeeper-specific stats
          total_saves: stats.reduce((sum, s) => sum + (s.saves || 0), 0),
          total_goals_conceded: stats.reduce((sum, s) => sum + (s.goals_conceded || 0), 0),
          total_clean_sheets: stats.reduce((sum, s) => sum + (s.clean_sheets || 0), 0),
          total_penalties_saved: stats.reduce((sum, s) => sum + (s.penalties_saved || 0), 0),
          total_errors_leading_to_goal: stats.reduce((sum, s) => sum + (s.errors_leading_to_goal || 0), 0),
          // Additional stats
          total_aerial_duels_won: stats.reduce((sum, s) => sum + (s.aerial_duels_won || 0), 0),
          total_accurate_passes: stats.reduce((sum, s) => sum + (s.accurate_passes || 0), 0),
          total_passes: stats.reduce((sum, s) => sum + (s.total_passes || 0), 0),
          total_duels_won: stats.reduce((sum, s) => sum + (s.duels_won || 0), 0),
          total_duels: stats.reduce((sum, s) => sum + (s.total_duels || 0), 0),
          total_chances_created: stats.reduce((sum, s) => sum + (s.chances_created || 0), 0),
          total_key_passes: stats.reduce((sum, s) => sum + (s.key_passes || 0), 0),
          total_shots: stats.reduce((sum, s) => sum + (s.shots || 0), 0),
          total_shots_on_target: stats.reduce((sum, s) => sum + (s.shots_on_target || 0), 0),
          // Metadata
          competitions_count: stats.length,
        });
      }
    }

    return { data: statsByYear, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Delete player stats by ID.
 */
export async function deletePlayerStats(
  statsId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('player_stats')
      .delete()
      .eq('id', statsId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}
