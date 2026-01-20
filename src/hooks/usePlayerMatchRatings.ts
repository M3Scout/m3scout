/**
 * Hook to fetch and calculate match ratings for a player's matches
 * Uses the match rating engine to compute ratings from match_player_stats
 */

import { useMemo } from "react";
import { usePlayerMatchStats, type MatchWithStats, type MatchDerivedStats } from "./usePlayerMatchStats";
import { calculateMatchRating, type MatchRatingResult, type PlayerStatsInput } from "@/lib/matchRatingEngine";

export interface MatchWithRating extends MatchWithStats {
  rating: MatchRatingResult;
}

interface UsePlayerMatchRatingsOptions {
  playerId: string;
  seasonYear?: number;
  competitionId?: string;
  enabled?: boolean;
}

/**
 * Convert MatchDerivedStats to PlayerStatsInput format for rating calculation
 */
function matchDerivedStatsToInput(stats: MatchDerivedStats): PlayerStatsInput {
  return {
    goals: stats.goals,
    assists: stats.assists,
    shots_on_target: stats.shots_on_target,
    shots: stats.shots,
    dribbles_success: stats.dribbles_success,
    dribbles_total: stats.dribbles_total,
    key_passes: stats.key_passes,
    chances_created: stats.chances_created,
    passes_completed: stats.passes_completed,
    passes_total: stats.passes_total,
    interceptions: stats.interceptions,
    recoveries: stats.recoveries,
    clearances: stats.clearances,
    tackles: stats.tackles,
    yellow_cards: stats.yellow_cards,
    red_cards: stats.red_cards,
  };
}

/**
 * Hook to fetch player matches with their calculated ratings
 */
export function usePlayerMatchRatings({
  playerId,
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
  } = usePlayerMatchStats({
    playerId,
    seasonYear,
    competitionId,
    enabled,
  });

  // Calculate ratings for each match
  const matchesWithRatings: MatchWithRating[] = useMemo(() => {
    return matches.map((match) => {
      const statsInput = matchDerivedStatsToInput(match.stats);
      const rating = calculateMatchRating(statsInput, match.minutes_played);
      return {
        ...match,
        rating,
      };
    });
  }, [matches]);

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
