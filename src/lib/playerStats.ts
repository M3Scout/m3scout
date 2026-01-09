import { supabase } from "@/integrations/supabase/client";

export interface PlayerStats {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerStatsInput {
  player_id: string;
  season_year: number;
  competition_id?: string | null;
  matches?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  tackles?: number;
  interceptions?: number;
  recoveries?: number;
}

export interface AggregatedStats {
  season_year: number;
  total_matches: number;
  total_minutes: number;
  total_goals: number;
  total_assists: number;
  total_yellow_cards: number;
  total_red_cards: number;
  total_tackles: number;
  total_interceptions: number;
  total_recoveries: number;
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
    // Validate non-negative values
    const numericFields = [
      'matches', 'minutes', 'goals', 'assists', 
      'yellow_cards', 'red_cards', 'tackles', 
      'interceptions', 'recoveries'
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
          matches: stats.matches ?? 0,
          minutes: stats.minutes ?? 0,
          goals: stats.goals ?? 0,
          assists: stats.assists ?? 0,
          yellow_cards: stats.yellow_cards ?? 0,
          red_cards: stats.red_cards ?? 0,
          tackles: stats.tackles ?? 0,
          interceptions: stats.interceptions ?? 0,
          recoveries: stats.recoveries ?? 0,
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
        data: {
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
          competitions_count: 0,
        }, 
        error: null 
      };
    }

    const aggregated: AggregatedStats = {
      season_year: seasonYear,
      total_matches: data.reduce((sum, s) => sum + (s.matches || 0), 0),
      total_minutes: data.reduce((sum, s) => sum + (s.minutes || 0), 0),
      total_goals: data.reduce((sum, s) => sum + (s.goals || 0), 0),
      total_assists: data.reduce((sum, s) => sum + (s.assists || 0), 0),
      total_yellow_cards: data.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
      total_red_cards: data.reduce((sum, s) => sum + (s.red_cards || 0), 0),
      total_tackles: data.reduce((sum, s) => sum + (s.tackles || 0), 0),
      total_interceptions: data.reduce((sum, s) => sum + (s.interceptions || 0), 0),
      total_recoveries: data.reduce((sum, s) => sum + (s.recoveries || 0), 0),
      competitions_count: data.length,
    };

    return { data: aggregated, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
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
          total_matches: stats.reduce((sum, s) => sum + (s.matches || 0), 0),
          total_minutes: stats.reduce((sum, s) => sum + (s.minutes || 0), 0),
          total_goals: stats.reduce((sum, s) => sum + (s.goals || 0), 0),
          total_assists: stats.reduce((sum, s) => sum + (s.assists || 0), 0),
          total_yellow_cards: stats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
          total_red_cards: stats.reduce((sum, s) => sum + (s.red_cards || 0), 0),
          total_tackles: stats.reduce((sum, s) => sum + (s.tackles || 0), 0),
          total_interceptions: stats.reduce((sum, s) => sum + (s.interceptions || 0), 0),
          total_recoveries: stats.reduce((sum, s) => sum + (s.recoveries || 0), 0),
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
