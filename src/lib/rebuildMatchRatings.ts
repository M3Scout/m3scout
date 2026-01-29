/**
 * Rebuild Match Ratings Utility
 * 
 * Calls the server-side function to recalculate and persist
 * official ratings for all players in a match.
 * 
 * SINGLE SOURCE OF TRUTH: After rebuild, all screens read from
 * match_player_stats.rating - no more on-the-fly calculations.
 */

import { supabase } from "@/integrations/supabase/client";

export interface RebuildResult {
  match_player_stats_id: string;
  player_id: string;
  match_id: string;
  old_rating: number | null;
  new_rating: number | null;
  minutes_played: number;
  minutes_factor: number;
}

/**
 * Rebuild ratings for a specific match (or all matches if matchId is null)
 * 
 * @param matchId - UUID of the match, or null to rebuild ALL matches
 * @returns Array of rebuild results showing old/new ratings
 */
export async function rebuildMatchRatings(matchId: string | null = null): Promise<{
  success: boolean;
  results: RebuildResult[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('rebuild_match_ratings', {
      p_match_id: matchId
    });

    if (error) {
      console.error('[REBUILD RATINGS] Error:', error);
      return {
        success: false,
        results: [],
        error: error.message
      };
    }

    const results = (data || []) as RebuildResult[];
    
    console.log('[REBUILD RATINGS] Complete', {
      matchId: matchId ?? 'ALL',
      playersUpdated: results.length,
      sample: results.slice(0, 3).map(r => ({
        player: r.player_id.slice(0, 8),
        old: r.old_rating,
        new: r.new_rating,
        minutes: r.minutes_played
      }))
    });

    return {
      success: true,
      results
    };
  } catch (err) {
    console.error('[REBUILD RATINGS] Exception:', err);
    return {
      success: false,
      results: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Rebuild ratings for a single match after stats edit
 * Use this in the Match Review page after any stat modification
 */
export async function rebuildSingleMatchRatings(matchId: string): Promise<boolean> {
  const { success, error } = await rebuildMatchRatings(matchId);
  
  if (!success) {
    console.error('[REBUILD SINGLE] Failed for match', matchId, error);
  }
  
  return success;
}
