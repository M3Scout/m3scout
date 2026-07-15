/**
 * useMarketScore Hook
 * 
 * React hook to fetch, compute, and manage Market Scores for athletes.
 * Integrates with existing usePlayerMatchStats and usePlayerMatchRatings hooks.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMergedSeasonTotals, getMergedSeasonByCompetition } from '@/lib/recalculatePlayerScores';
import { usePlayerMatchRatings } from './usePlayerMatchRatings';
import { 
  MarketScore, 
  MarketScoreBreakdown, 
  MarketScoreEvent,
  ActivePlayerData,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  MarketScoreWeights,
} from '@/types/marketScore';
import { 
  fetchMarketScoreForAthlete,
  fetchMarketScoreHistory,
  computeAndPersistActiveScore,
} from '@/lib/marketScoreService';
import { computeMarketScoreActive } from '@/lib/marketScoreEngine';

interface UseMarketScoreOptions {
  playerId: string;
  playerName?: string;
  position?: string;
  secondaryPositions?: string[];
  birthDate?: string | null;
  age?: number | null;
  seasonYear?: number;
  enabled?: boolean;
  weights?: MarketScoreWeights;
}

interface UseMarketScoreReturn {
  // Current persisted score (SINGLE SOURCE OF TRUTH)
  score: MarketScore | null;
  scoreLoading: boolean;
  scoreError: Error | null;
  
  // Computed breakdown for display (uses persisted score_total as reference)
  breakdown: MarketScoreBreakdown | null;
  breakdownLoading: boolean;
  
  // The AUTHORITATIVE score value - always from database
  displayScore: number | null;
  
  // Score history/audit log
  history: MarketScoreEvent[];
  historyLoading: boolean;
  
  // Actions
  recalculate: (reason?: string) => Promise<void>;
  isRecalculating: boolean;
  
  // Raw data availability
  hasEnoughData: boolean;
  dataConfidence: number;
}

export function useMarketScore({
  playerId,
  playerName = '',
  position = '',
  secondaryPositions = [],
  birthDate = null,
  age = null,
  seasonYear,
  enabled = true,
  weights = DEFAULT_MARKET_SCORE_WEIGHTS,
}: UseMarketScoreOptions): UseMarketScoreReturn {
  const queryClient = useQueryClient();
  const currentYear = seasonYear ?? new Date().getFullYear();
  
  // Fetch existing score from DB
  const {
    data: score,
    isLoading: scoreLoading,
    error: scoreError,
  } = useQuery({
    queryKey: ['market-score', playerId],
    queryFn: () => fetchMarketScoreForAthlete(playerId),
    enabled: enabled && !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch score history
  const {
    data: history = [],
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['market-score-history', score?.id],
    queryFn: () => score?.id ? fetchMarketScoreHistory(score.id) : [],
    enabled: enabled && !!score?.id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch season stats from the SAME merge pipeline that persists
  // player_attribute_scores (live match + player_stats, deliberately
  // excluding manual_player_stats — that table is documented as
  // "NOT used for rating calculations", games not tracked via Live Match).
  // This is the authoritative aggregation, not a parallel reimplementation.
  const {
    data: seasonStats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['market-score-season-totals', playerId, currentYear],
    queryFn: () => getMergedSeasonTotals(playerId, currentYear),
    enabled: enabled && !!playerId,
    staleTime: 30 * 1000,
  });

  // Fetch player ratings using existing hook (per-match granularity — needed
  // for rating variance/last-30-days activity, which manual season-total
  // rows can't provide since they have no individual match date).
  const {
    matches: matchesWithRatings,
    isLoading: ratingsLoading,
  } = usePlayerMatchRatings({
    playerId,
    playerPosition: position,
    seasonYear: currentYear,
    enabled: enabled && !!playerId,
  });

  // Fetch real competition coefficients (same field used for Targets) to
  // replace the previous hardcoded 1.0 used for every match's Contexto weight.
  const { data: competitionCoefficients = new Map<string, number>() } = useQuery({
    queryKey: ['competitions-coefficients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('competitions').select('id, final_coefficient');
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach(c => map.set(c.id, c.final_coefficient));
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Per-competition breakdown (live + manual merged, same pipeline as
  // seasonStats above) — Contexto needs this instead of matchRatings alone,
  // since a competition with only manual stats (no live match) never shows
  // up in matchRatings and would otherwise be invisible to this pillar.
  const { data: competitionRows = [] } = useQuery({
    queryKey: ['market-score-season-by-competition', playerId, currentYear],
    queryFn: () => getMergedSeasonByCompetition(playerId, currentYear),
    enabled: enabled && !!playerId,
    staleTime: 30 * 1000,
  });

  // Calculate matches in last 30 days
  const matchesLast30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return matchesWithRatings.filter(m => {
      const matchDate = new Date(m.match_date);
      return matchDate >= thirtyDaysAgo;
    }).length;
  }, [matchesWithRatings]);
  
  // Build ActivePlayerData from existing hooks
  const activePlayerData: ActivePlayerData | null = useMemo(() => {
    if (!playerId || !seasonStats) return null;
    
    return {
      playerId,
      fullName: playerName,
      position: position || 'Meia',
      secondaryPositions: secondaryPositions || [],
      birthDate,
      age,
      seasonStats: {
        matches: seasonStats.matches || 0,
        minutes: seasonStats.minutes || 0,
        goals: seasonStats.goals || 0,
        assists: seasonStats.assists || 0,
        keyPasses: seasonStats.key_passes || 0,
        chancesCreated: seasonStats.chances_created || 0,
        tackles: seasonStats.tackles || 0,
        interceptions: seasonStats.interceptions || 0,
        recoveries: seasonStats.recoveries || 0,
        clearances: seasonStats.clearances || 0,
        duelsWon: seasonStats.duels_won || 0,
        duelsTotal: seasonStats.duels_total || 0,
        aerialDuelsWon: seasonStats.aerial_duels_won || 0,
        aerialDuelsTotal: seasonStats.aerial_duels_total || 0,
        dribblesSuccess: seasonStats.dribbles_success || 0,
        dribblesTotal: seasonStats.dribbles_total || 0,
        passesCompleted: seasonStats.passes_completed || 0,
        passesTotal: seasonStats.passes_total || 0,
        crossesSuccess: seasonStats.crosses_success || 0,
        crossesFailed: seasonStats.crosses_failed || 0,
        shots: seasonStats.shots || 0,
        shotsOnTarget: seasonStats.shots_on_target || 0,
        steals: seasonStats.steals || 0,
        possessionLost: seasonStats.possession_lost || 0,
        wasDribbled: seasonStats.was_dribbled || 0,
        penaltiesWon: seasonStats.penalties_won || 0,
        groundDuelsWon: seasonStats.ground_duels_won || 0,
        groundDuelsTotal: seasonStats.ground_duels_total || 0,
      },
      matchRatings: matchesWithRatings.map(m => ({
        matchId: m.match_id,
        matchDate: m.match_date,
        rating: m.rating.rating ?? 0,
        competitionId: m.competition_id ?? null,
        competitionCoefficient: (m.competition_id && competitionCoefficients.get(m.competition_id)) || 1.0,
      })),
      matchesLast30Days,
      competitionBreakdown: competitionRows.map(row => ({
        competitionId: row.competition_id,
        minutes: row.stats.minutes,
        coefficient: (row.competition_id && competitionCoefficients.get(row.competition_id)) || 1.0,
      })),
    };
  }, [
    playerId, playerName, position, secondaryPositions, birthDate, age,
    seasonStats, matchesWithRatings, matchesLast30Days, competitionCoefficients, competitionRows
  ]);
  
  // Compute breakdown in real-time (not persisted until recalculate)
  const breakdown: MarketScoreBreakdown | null = useMemo(() => {
    if (!activePlayerData) return null;
    
    const previousScore = score?.score_total ?? null;
    return computeMarketScoreActive(activePlayerData, previousScore, weights);
  }, [activePlayerData, score?.score_total, weights]);
  
  // Recalculate and persist mutation
  const recalculateMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!activePlayerData) throw new Error('No player data available');
      const result = await computeAndPersistActiveScore(activePlayerData, reason, weights);
      // computeAndPersistActiveScore returns { error } instead of throwing on a
      // failed write (e.g. RLS denial) — without this check the mutation
      // reports success and invalidates queries even though nothing was
      // persisted, silently leaving the old score on screen.
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data across all views
      queryClient.invalidateQueries({ queryKey: ['market-score', playerId] });
      queryClient.invalidateQueries({ queryKey: ['market-score-history'] });
      // CRITICAL: Also invalidate the listing query for sync between profile and list
      queryClient.invalidateQueries({ queryKey: ['market-ativos'] });
    },
  });
  
  const recalculate = useCallback(async (reason: string = 'Recálculo manual') => {
    await recalculateMutation.mutateAsync(reason);
  }, [recalculateMutation]);
  
  // Determine if we have enough data for a meaningful score
  const hasEnoughData = useMemo(() => {
    if (!seasonStats) return false;
    return seasonStats.matches >= 1;
  }, [seasonStats]);
  
  const breakdownLoading = statsLoading || ratingsLoading;
  
  // SINGLE SOURCE OF TRUTH: Always use the persisted score from database
  const displayScore = score?.score_total ?? null;
  
  return {
    score: score ?? null,
    scoreLoading,
    scoreError: scoreError as Error | null,
    breakdown,
    breakdownLoading,
    // The AUTHORITATIVE display score - always from database, never computed
    displayScore,
    history,
    historyLoading,
    recalculate,
    isRecalculating: recalculateMutation.isPending,
    hasEnoughData,
    dataConfidence: score?.confidence_level ?? breakdown?.confidenceLevel ?? 0,
  };
}
