/**
 * Hook to calculate match ratings for all players in a match.
 * 
 * Uses the matchRatingEngine to compute ratings based on:
 * - match_player_stats (single source of truth)
 * - Standardized minutes calculation
 * 
 * Ratings automatically update when stats or minutes change.
 */

import { useMemo } from "react";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import { 
  calculatePlayerMatchRating, 
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

interface UseMatchRatingsOptions {
  matchPlayers: MatchPlayer[];
  playerStatsMap: Record<string, MatchPlayerStats>;
}

/**
 * Calculate ratings for all players in a match
 */
export function useMatchRatings({ 
  matchPlayers, 
  playerStatsMap 
}: UseMatchRatingsOptions): Map<string, PlayerRatingData> {
  return useMemo(() => {
    const ratingsMap = new Map<string, PlayerRatingData>();
    
    for (const mp of matchPlayers) {
      if (!mp.player) continue;
      
      const stats = playerStatsMap[mp.player_id];
      
      const minutesInput: MatchPlayerMinutesInput = {
        started: mp.started,
        entered_minute: mp.entered_minute,
        exited_minute: mp.exited_minute,
        minutes_played: mp.minutes_played,
      };
      
      const minutesInfo = calculateMinutesPlayed(minutesInput);
      const rating = calculatePlayerMatchRating(stats, minutesInput);
      
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
  }, [matchPlayers, playerStatsMap]);
}

/**
 * Get a single player's rating data
 */
export function usePlayerMatchRating(
  playerId: string | undefined,
  matchPlayers: MatchPlayer[],
  playerStatsMap: Record<string, MatchPlayerStats>
): PlayerRatingData | null {
  const ratings = useMatchRatings({ matchPlayers, playerStatsMap });
  
  if (!playerId) return null;
  return ratings.get(playerId) ?? null;
}

/**
 * Get sorted players by rating (highest first)
 * Players without ratings (0 minutes) are placed at the end
 */
export function useSortedPlayersByRating(
  matchPlayers: MatchPlayer[],
  playerStatsMap: Record<string, MatchPlayerStats>
): PlayerRatingData[] {
  const ratings = useMatchRatings({ matchPlayers, playerStatsMap });
  
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
