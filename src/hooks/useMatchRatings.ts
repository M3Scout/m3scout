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
import type { MatchPlayerStats, PersistedRatingBreakdown } from "@/hooks/useLiveMatch";
import { parseRatingBreakdown } from "@/hooks/useLiveMatch";
import { 
  calculatePlayerMatchRating, 
  getRatingColor,
  getRatingBgColor,
  type MatchRatingResult,
  type DetailedBreakdown,
  type CategoryBreakdown 
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

// MatchPlayerStats now includes rating fields directly (rating, rating_minutes_played, rating_minutes_factor)
// No need for extended type

interface UseMatchRatingsOptions {
  matchPlayers: MatchPlayer[];
  playerStatsMap: Record<string, MatchPlayerStats>;
  usePersistedRating?: boolean; // If true, prefer persisted rating
}

/**
 * Convert persisted breakdown from SQL to DetailedBreakdown format for UI
 * 
 * IMPORTANT: Persisted breakdowns only contain category aggregates, not individual items.
 * We generate synthetic "summary" items to explain where the score came from,
 * ensuring consistency between the category score and the expanded details.
 */
function convertPersistedBreakdown(persisted: PersistedRatingBreakdown): DetailedBreakdown {
  // Helper to create a synthetic summary item for a category
  // This prevents the "score exists but no events" contradiction
  const createSummaryItem = (
    categoryKey: string,
    label: string,
    value: number,
    minutesFactor: number
  ): import("@/lib/matchRatingEngine").BreakdownItem | null => {
    if (value === 0) return null;
    return {
      stat: `${categoryKey}_aggregated`,
      label: `${label} (agregado)`,
      count: 1,
      weight: value,
      rawDelta: value,
      afterMinutes: value * minutesFactor,
      capped: false,
    };
  };

  const categories: CategoryBreakdown[] = [
    {
      key: "attack" as const,
      label: persisted.categories.attack.label,
      raw: persisted.categories.attack.value,
      afterMinutes: persisted.categories.attack.value * persisted.minutesFactor,
      items: persisted.categories.attack.value !== 0 
        ? [createSummaryItem("attack", persisted.categories.attack.label, persisted.categories.attack.value, persisted.minutesFactor)!]
        : []
    },
    {
      key: "creation" as const,
      label: persisted.categories.creation.label,
      raw: persisted.categories.creation.value,
      afterMinutes: persisted.categories.creation.value * persisted.minutesFactor,
      items: persisted.categories.creation.value !== 0
        ? [createSummaryItem("creation", persisted.categories.creation.label, persisted.categories.creation.value, persisted.minutesFactor)!]
        : []
    },
    {
      key: "passing" as const,
      label: persisted.categories.passing.label,
      raw: persisted.categories.passing.value,
      afterMinutes: persisted.categories.passing.value * persisted.minutesFactor,
      items: persisted.categories.passing.value !== 0
        ? [createSummaryItem("passing", persisted.categories.passing.label, persisted.categories.passing.value, persisted.minutesFactor)!]
        : []
    },
    {
      key: "defense" as const,
      label: persisted.categories.defense.label,
      raw: persisted.categories.defense.value,
      afterMinutes: persisted.categories.defense.value * persisted.minutesFactor,
      items: persisted.categories.defense.value !== 0
        ? [createSummaryItem("defense", persisted.categories.defense.label, persisted.categories.defense.value, persisted.minutesFactor)!]
        : []
    },
    {
      key: "discipline" as const,
      label: persisted.categories.discipline.label,
      raw: persisted.categories.discipline.value,
      afterMinutes: persisted.categories.discipline.value * persisted.minutesFactor,
      items: persisted.categories.discipline.value !== 0
        ? [createSummaryItem("discipline", persisted.categories.discipline.label, persisted.categories.discipline.value, persisted.minutesFactor)!]
        : []
    },
    {
      key: "goalkeeper" as const,
      label: persisted.categories.goalkeeper.label,
      raw: persisted.categories.goalkeeper.value,
      afterMinutes: persisted.categories.goalkeeper.value * persisted.minutesFactor,
      items: persisted.categories.goalkeeper.value !== 0
        ? [createSummaryItem("goalkeeper", persisted.categories.goalkeeper.label, persisted.categories.goalkeeper.value, persisted.minutesFactor)!]
        : []
    }
  ].filter(cat => cat.raw !== 0 || cat.key === "attack" || cat.key === "defense");

  // Mark this breakdown as coming from persisted/aggregated data
  return {
    categories,
    items: [],
    capsApplied: [],
    antiInflationApplied: !persisted.hasImpact && persisted.rawImpact > 0.9,
    hasImpactfulAction: persisted.hasImpact,
    isPersistedBreakdown: true // Flag to indicate this is from persisted data
  };
}

/**
 * Convert persisted rating to MatchRatingResult format (for display)
 * Now includes breakdown conversion from SQL-persisted JSON
 */
function persistedRatingToResult(
  rating: number,
  minutesPlayed: number,
  minutesFactor: number | null,
  rawBreakdown: unknown
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

  // Parse and convert the breakdown
  const parsedBreakdown = parseRatingBreakdown(rawBreakdown);
  const detailedBreakdown = parsedBreakdown ? convertPersistedBreakdown(parsedBreakdown) : null;
  
  // If we have parsed breakdown, use its rawImpact for accuracy
  const rawImpact = parsedBreakdown?.rawImpact ?? (rating - 6.0);

  return {
    hasRating: true,
    rating,
    baseRating: 6.0,
    rawImpact,
    impactAfterMinutes: rawImpact * (minutesFactor ?? 1.0),
    minutesFactor: minutesFactor ?? 1.0,
    minutesPlayed,
    breakdown: parsedBreakdown ? {
      attack: parsedBreakdown.categories.attack.value,
      creation: parsedBreakdown.categories.creation.value,
      passing: parsedBreakdown.categories.passing.value,
      defense: parsedBreakdown.categories.defense.value,
      discipline: parsedBreakdown.categories.discipline.value,
      goalkeeper: parsedBreakdown.categories.goalkeeper.value
    } : null,
    detailedBreakdown,
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
          stats?.rating_minutes_factor ?? null,
          stats?.rating_breakdown ?? null
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
  playerStatsMap: Record<string, MatchPlayerStats>,
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
  playerStatsMap: Record<string, MatchPlayerStats>,
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
