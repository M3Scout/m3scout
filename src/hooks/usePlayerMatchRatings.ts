/**
 * Hook to fetch match ratings for a player's matches
 * 
 * SINGLE SOURCE OF TRUTH: Ratings are read from the persisted 
 * match_player_stats.rating field - NO on-the-fly calculation.
 * 
 * The rating is pre-calculated and stored by:
 * - Match Summary page (on game finish/apply)
 * - Match Review page (after any stat edit)
 * - rebuild_match_ratings() SQL function (for global rebuild)
 */

import { useMemo } from "react";
import { usePlayerMatchStats, type MatchWithStats, type MatchDerivedStats } from "./usePlayerMatchStats";
import { getRatingColor, getRatingBgColor, type MatchRatingResult } from "@/lib/matchRatingEngine";

export interface MatchWithRating extends MatchWithStats {
  rating: MatchRatingResult;
}

interface UsePlayerMatchRatingsOptions {
  playerId: string;
  playerPosition?: string; // To detect if goalkeeper
  seasonYear?: number;
  competitionId?: string;
  enabled?: boolean;
}

/**
 * Convert persisted rating to MatchRatingResult format
 */
function persistedRatingToResult(
  rating: number | null,
  minutesPlayed: number,
  minutesFactor: number | null
): MatchRatingResult {
  // No rating if no persisted value
  // Note: Players with minimal minutes CAN have a rating if calculated and persisted
  if (rating === null) {
    return {
      hasRating: false,
      rating: null,
      baseRating: 6.0,
      rawImpact: 0,
      impactAfterMinutes: 0,
      minutesFactor: 0,
      minutesPlayed: minutesPlayed,
      breakdown: null,
      detailedBreakdown: null,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Sem nota",
    };
  }

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
    rawImpact: rating - 6.0, // Approximation (actual impact not stored)
    impactAfterMinutes: rating - 6.0,
    minutesFactor: minutesFactor ?? 1.0,
    minutesPlayed,
    breakdown: null, // Not stored - recalculate if needed for breakdown modal
    detailedBreakdown: null,
    color: getRatingColor(rating),
    bgColor: getRatingBgColor(rating),
    label: getLabel(rating),
  };
}

/**
 * Hook to fetch player matches with their OFFICIAL ratings
 * 
 * READS FROM: match_player_stats.rating (persisted)
 * DOES NOT: calculate ratings on-the-fly
 */
export function usePlayerMatchRatings({
  playerId,
  playerPosition,
  seasonYear,
  competitionId,
  enabled = true,
}: UsePlayerMatchRatingsOptions) {
  const {
    matches,
    totals,
    bySeason,
    byCompetition,
    isLoading,
    error,
    refetch,
    rawStatsMap, // Now includes rating fields
  } = usePlayerMatchStats({
    playerId,
    seasonYear,
    competitionId,
    enabled,
  });

  // Detect if player is a goalkeeper based on position
  const isGoalkeeper = useMemo(() => {
    const pos = playerPosition?.toLowerCase() ?? '';
    return pos === 'gk' || pos === 'goleiro' || pos === 'goalkeeper';
  }, [playerPosition]);

  // Get ratings from persisted data (no calculation)
  const matchesWithRatings: MatchWithRating[] = useMemo(() => {
    return matches.map((match) => {
      const rawStats = rawStatsMap?.[match.match_id];
      
      // Read persisted rating from DB
      const persistedRating = rawStats?.rating ?? null;
      const persistedMinutesFactor = rawStats?.rating_minutes_factor ?? null;
      
      const rating = persistedRatingToResult(
        persistedRating,
        match.minutes_played,
        persistedMinutesFactor
      );
      
      // DEBUG: Log rating source for parity verification
      if (process.env.NODE_ENV === 'development' && rating.hasRating) {
        console.debug('[RATING OFFICIAL]', {
          matchId: match.match_id,
          opponent: match.opponent_name,
          officialRating: persistedRating,
          minutesPlayed: match.minutes_played,
          source: 'match_player_stats.rating (persisted)',
        });
      }
      
      return {
        ...match,
        rating,
      };
    });
  }, [matches, rawStatsMap]);

  // Get average rating (only from matches where player has a rating)
  const averageRating = useMemo(() => {
    const ratedMatches = matchesWithRatings.filter((m) => m.rating.hasRating);
    if (ratedMatches.length === 0) return null;
    const sum = ratedMatches.reduce((acc, m) => acc + (m.rating.rating ?? 0), 0);
    return Math.round((sum / ratedMatches.length) * 10) / 10;
  }, [matchesWithRatings]);

  // Get best and worst ratings
  const bestMatch = useMemo(() => {
    const ratedMatches = matchesWithRatings.filter((m) => m.rating.hasRating);
    if (ratedMatches.length === 0) return null;
    return ratedMatches.reduce((best, m) => 
      (m.rating.rating ?? 0) > (best.rating.rating ?? 0) ? m : best
    );
  }, [matchesWithRatings]);

  const worstMatch = useMemo(() => {
    const ratedMatches = matchesWithRatings.filter((m) => m.rating.hasRating);
    if (ratedMatches.length === 0) return null;
    return ratedMatches.reduce((worst, m) => 
      (m.rating.rating ?? 0) < (worst.rating.rating ?? 0) ? m : worst
    );
  }, [matchesWithRatings]);

  // Calculate ratings by season
  const ratingsBySeason = useMemo(() => {
    const seasonData: Record<number, { 
      matches: number; 
      averageRating: number; 
      ratings: number[];
    }> = {};

    matchesWithRatings.forEach((match) => {
      if (!match.rating.hasRating) return;
      
      const year = match.season_year;
      if (!seasonData[year]) {
        seasonData[year] = { matches: 0, averageRating: 0, ratings: [] };
      }
      seasonData[year].matches++;
      seasonData[year].ratings.push(match.rating.rating!);
    });

    // Calculate averages
    Object.keys(seasonData).forEach((year) => {
      const data = seasonData[Number(year)];
      data.averageRating = data.ratings.length > 0
        ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
        : 0;
    });

    return seasonData;
  }, [matchesWithRatings]);

  // Get rating trend (last 5 matches)
  const recentTrend = useMemo(() => {
    const ratedMatches = matchesWithRatings
      .filter((m) => m.rating.hasRating)
      .slice(0, 5);
    
    if (ratedMatches.length < 2) return "stable";
    
    const recentAvg = ratedMatches.slice(0, 3).reduce((a, m) => a + (m.rating.rating ?? 0), 0) / Math.min(3, ratedMatches.length);
    const olderAvg = ratedMatches.slice(-2).reduce((a, m) => a + (m.rating.rating ?? 0), 0) / Math.min(2, ratedMatches.length);
    
    if (recentAvg > olderAvg + 0.3) return "up";
    if (recentAvg < olderAvg - 0.3) return "down";
    return "stable";
  }, [matchesWithRatings]);

  return {
    // Matches with ratings
    matches: matchesWithRatings,
    
    // Aggregated data from parent hook
    totals,
    bySeason,
    byCompetition,
    
    // Rating aggregations
    averageRating,
    bestMatch,
    worstMatch,
    ratingsBySeason,
    recentTrend,
    
    // Loading state
    isLoading,
    error,
    refetch,
  };
}
