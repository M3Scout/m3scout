/**
 * Hook to get match ratings for all players in a match.
 * 
 * SINGLE SOURCE OF TRUTH: Ratings are read from the persisted 
 * match_player_stats.rating field. If not yet persisted, calculates
 * on-the-fly and should be persisted after match finishes.
 * 
 * The rating is stored by:
 * - Match Summary page (on game finish/apply)
 * - Match Review page (after any stat edit)
 * - rebuild_match_ratings() SQL function
 */

import { useMemo } from "react";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import { 
  calculatePlayerMatchRating, 
  getRatingColor,
  getRatingBgColor,
  type MatchRatingResult 
} from "@/lib/matchRatingEngine";
import { calculateMinutesPlayed, type MatchPlayerMinutesInput } from "@/lib/minutesPlayed";

export interface MatchPlayer {
  player_id: string;
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played: number | null;
  player?: {
    id: string;
    full_name: string;
    position: string;
    photo_url?: string | null;
  } | null;
}

export interface PlayerRatingData {
  playerId: string;
  playerName: string;
  position: string;
  photoUrl: string | null;
  rating: MatchRatingResult;
  minutesInfo: ReturnType<typeof calculateMinutesPlayed>;
}

// Extended stats type with persisted rating
interface MatchPlayerStatsWithRating extends MatchPlayerStats {
  rating?: number | null;
  rating_minutes_played?: number | null;
  rating_minutes_factor?: number | null;
}

interface UseMatchRatingsOptions {
  matchPlayers: MatchPlayer[];
  playerStatsMap: Record<string, MatchPlayerStatsWithRating>;
  usePersistedRating?: boolean; // If true, prefer persisted rating
}

/**
 * Convert persisted rating to MatchRatingResult format (for display)
 */
function persistedRatingToResult(
  rating: number,
  minutesPlayed: number,
  minutesFactor: number | null
): MatchRatingResult {
  // Get label based on rating value
  const getLabel = (r: number): string => {
    if (r >= 9.0) return "Excepcional";
    if (r >= 8.0) return "Excelente";
    if (r >= 7.0) return "Muito Bom";
    if (r >= 6.5) return "Bom";
    if (r >= 6.0) return "Regular";
    if (r >= 5.0) return "Fraco";
    return "Muito Fraco";
  };

  return {
    hasRating: true,
    rating,
    baseRating: 6.0,
    rawImpact: rating - 6.0,
    impactAfterMinutes: rating - 6.0,
    minutesFactor: minutesFactor ?? 1.0,
    minutesPlayed,
    breakdown: null,
    detailedBreakdown: null,
    color: getRatingColor(rating),
    bgColor: getRatingBgColor(rating),
    label: getLabel(rating),
  };
}

/**
 * Calculate ratings for all players in a match
 * 
 * @param usePersistedRating - If true, read from match_player_stats.rating
 *                            If false, calculate on-the-fly (for live matches)
 */
export function useMatchRatings({ 
  matchPlayers, 
  playerStatsMap,
  usePersistedRating = true 
}: UseMatchRatingsOptions): Map<string, PlayerRatingData> {
  return useMemo(() => {
    const ratingsMap = new Map<string, PlayerRatingData>();
    
    for (const mp of matchPlayers) {
      if (!mp.player) continue;
      
      const stats = playerStatsMap[mp.player_id];
      
      // Detect if player is a goalkeeper based on position
      const isGoalkeeper = mp.player.position?.toLowerCase() === 'gk' || 
                           mp.player.position?.toLowerCase() === 'goleiro' ||
                           mp.player.position?.toLowerCase() === 'goalkeeper';
      
      const minutesInput: MatchPlayerMinutesInput = {
        started: mp.started,
        entered_minute: mp.entered_minute,
        exited_minute: mp.exited_minute,
        minutes_played: mp.minutes_played,
      };
      
      const minutesInfo = calculateMinutesPlayed(minutesInput);
      
      let rating: MatchRatingResult;
      
      // Prefer persisted rating if available and requested
      const persistedRating = stats?.rating;
      if (usePersistedRating && persistedRating != null && minutesInfo.minutesPlayed > 0) {
        rating = persistedRatingToResult(
          persistedRating,
          minutesInfo.minutesPlayed,
          stats?.rating_minutes_factor ?? null
        );
        
        if (process.env.NODE_ENV === 'development') {
          console.debug('[RATING MATCH SUMMARY - PERSISTED]', {
            playerId: mp.player_id.slice(0, 8),
            rating: persistedRating,
            source: 'match_player_stats.rating'
          });
        }
      } else {
        // Calculate on-the-fly (for live matches or missing persisted rating)
        rating = calculatePlayerMatchRating(stats, minutesInput, isGoalkeeper);
        
        if (process.env.NODE_ENV === 'development' && rating.hasRating) {
          console.debug('[RATING MATCH SUMMARY - CALCULATED]', {
            playerId: mp.player_id.slice(0, 8),
            rating: rating.rating,
            source: 'on-the-fly calculation'
          });
        }
      }
      
      ratingsMap.set(mp.player_id, {
        playerId: mp.player_id,
        playerName: mp.player.full_name,
        position: mp.player.position,
        photoUrl: mp.player.photo_url ?? null,
        rating,
        minutesInfo,
      });
    }
    
    return ratingsMap;
  }, [matchPlayers, playerStatsMap, usePersistedRating]);
}

/**
 * Get a single player's rating data
 */
export function usePlayerMatchRating(
  playerId: string | undefined,
  matchPlayers: MatchPlayer[],
  playerStatsMap: Record<string, MatchPlayerStatsWithRating>,
  usePersistedRating = true
): PlayerRatingData | null {
  const ratings = useMatchRatings({ matchPlayers, playerStatsMap, usePersistedRating });
  
  if (!playerId) return null;
  return ratings.get(playerId) ?? null;
}

/**
 * Get sorted players by rating (highest first)
 * Players without ratings (0 minutes) are placed at the end
 */
export function useSortedPlayersByRating(
  matchPlayers: MatchPlayer[],
  playerStatsMap: Record<string, MatchPlayerStatsWithRating>,
  usePersistedRating = true
): PlayerRatingData[] {
  const ratings = useMatchRatings({ matchPlayers, playerStatsMap, usePersistedRating });
  
  return useMemo(() => {
    return Array.from(ratings.values())
      .sort((a, b) => {
        // Players without ratings go to the end
        if (!a.rating.hasRating && !b.rating.hasRating) return 0;
        if (!a.rating.hasRating) return 1;
        if (!b.rating.hasRating) return -1;
        // Sort by rating descending
        return (b.rating.rating ?? 0) - (a.rating.rating ?? 0);
      });
  }, [ratings]);
}
