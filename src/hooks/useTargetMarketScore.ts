/**
 * useTargetMarketScore Hook
 * 
 * React hook to fetch, compute, and manage Market Scores for TARGET players
 * (external athletes being monitored for potential recruitment).
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  MarketScore, 
  MarketScoreBreakdown, 
  MarketScoreEvent,
  TargetPlayerData,
  Target,
  TargetObservation,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  MarketScoreWeights,
} from '@/types/marketScore';
import { 
  fetchMarketScoreForTarget,
  fetchMarketScoreHistory,
  computeAndPersistTargetScore,
} from '@/lib/marketScoreService';
import { computeMarketScoreTarget } from '@/lib/marketScoreEngine';

interface UseTargetMarketScoreOptions {
  targetId: string;
  enabled?: boolean;
  weights?: MarketScoreWeights;
}

interface UseTargetMarketScoreReturn {
  // Target data
  target: Target | null;
  observations: TargetObservation[];
  targetLoading: boolean;
  
  // Current persisted score
  score: MarketScore | null;
  scoreLoading: boolean;
  scoreError: Error | null;
  
  // Computed breakdown
  breakdown: MarketScoreBreakdown | null;
  breakdownLoading: boolean;
  
  // Score history/audit log
  history: MarketScoreEvent[];
  historyLoading: boolean;
  
  // Actions
  recalculate: (reason?: string) => Promise<void>;
  isRecalculating: boolean;
  
  // Data availability
  hasEnoughData: boolean;
  dataConfidence: number;
}

export function useTargetMarketScore({
  targetId,
  enabled = true,
  weights = DEFAULT_MARKET_SCORE_WEIGHTS,
}: UseTargetMarketScoreOptions): UseTargetMarketScoreReturn {
  const queryClient = useQueryClient();
  
  // Fetch target data
  const {
    data: target,
    isLoading: targetLoading,
  } = useQuery({
    queryKey: ['target', targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('id', targetId)
        .limit(1);
      
      if (error) throw error;
      return (data && data.length > 0) ? data[0] as unknown as Target : null;
    },
    enabled: enabled && !!targetId,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch observations
  const {
    data: observations = [],
    isLoading: observationsLoading,
  } = useQuery({
    queryKey: ['target-observations', targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('target_observations')
        .select('*')
        .eq('target_id', targetId)
        .order('observation_date', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as unknown as TargetObservation[];
    },
    enabled: enabled && !!targetId,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch competition stats (joined to the real competitions table for coefficient/tier)
  const {
    data: competitionStats = [],
    isLoading: competitionStatsLoading,
  } = useQuery({
    queryKey: ['target-competition-stats-score-signals', targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('target_competition_stats')
        .select('*, competitions(final_coefficient, tier)')
        .eq('target_id', targetId);

      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        competition_id: string;
        matches_played: number | null;
        minutes_played: number | null;
        goals: number | null;
        assists: number | null;
        competitions: { final_coefficient: number | null; tier: string | null } | null;
      }>;
    },
    enabled: enabled && !!targetId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch existing score from DB
  const {
    data: score,
    isLoading: scoreLoading,
    error: scoreError,
  } = useQuery({
    queryKey: ['market-score-target', targetId],
    queryFn: () => fetchMarketScoreForTarget(targetId),
    enabled: enabled && !!targetId,
    staleTime: 5 * 60 * 1000,
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
  
  // Build TargetPlayerData
  const targetPlayerData: TargetPlayerData | null = useMemo(() => {
    if (!targetId || !target) return null;
    
    return {
      targetId,
      name: target.name,
      position: target.position || 'Meia',
      birthDate: target.birth_date,
      ageEstimate: target.age_estimate,
      currentClub: target.current_club,
      leagueCompetition: target.league_competition,
      observations: observations.map(o => ({
        date: o.observation_date,
        minutesObserved: o.minutes_observed,
        performanceRating: o.performance_rating,
        competition: o.competition,
      })),
      competitionStats: competitionStats.map(c => ({
        competitionId: c.competition_id,
        matchesPlayed: c.matches_played,
        minutesPlayed: c.minutes_played,
        goals: c.goals,
        assists: c.assists,
        finalCoefficient: c.competitions?.final_coefficient ?? null,
        tier: c.competitions?.tier ?? null,
      })),
      evaluationMatrix: {
        physical:  (target as any).score_physical  ?? null,
        technical: (target as any).score_technical ?? null,
        tactical:  (target as any).score_tactical  ?? null,
        mental:    (target as any).score_mental    ?? null,
      },
      secondaryPosition: (target as any).secondary_position ?? null,
      tacticalFunction:  (target as any).tactical_function  ?? null,
      height: target.height ?? null,
      weight: target.weight ? Number(target.weight) : null,
    };
  }, [targetId, target, observations, competitionStats]);
  
  // Compute breakdown in real-time
  const breakdown: MarketScoreBreakdown | null = useMemo(() => {
    if (!targetPlayerData) return null;
    
    const previousScore = score?.score_total ?? null;
    return computeMarketScoreTarget(targetPlayerData, previousScore, weights);
  }, [targetPlayerData, score?.score_total, weights]);
  
  // Recalculate and persist mutation
  const recalculateMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!targetPlayerData) throw new Error('No target data available');
      return computeAndPersistTargetScore(targetPlayerData, reason, weights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-score-target', targetId] });
      queryClient.invalidateQueries({ queryKey: ['market-score-history'] });
    },
  });
  
  const recalculate = useCallback(async (reason: string = 'Recálculo manual') => {
    await recalculateMutation.mutateAsync(reason);
  }, [recalculateMutation]);
  
  // Determine if we have enough data
  const hasEnoughData = useMemo(() => {
    if (!target) return false;
    return !!target.position && (!!target.birth_date || !!target.age_estimate);
  }, [target]);
  
  const breakdownLoading = targetLoading || observationsLoading || competitionStatsLoading;
  
  return {
    target: target ?? null,
    observations,
    targetLoading,
    score: score ?? null,
    scoreLoading,
    scoreError: scoreError as Error | null,
    breakdown,
    breakdownLoading,
    history,
    historyLoading,
    recalculate,
    isRecalculating: recalculateMutation.isPending,
    hasEnoughData,
    dataConfidence: breakdown?.confidenceLevel ?? 0,
  };
}
