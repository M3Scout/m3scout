/**
 * M3 Market Score Service
 * 
 * Service functions to compute, persist, and log Market Scores.
 * Integrates with existing hooks (usePlayerMatchStats, usePlayerMatchRatings)
 * and persists to Supabase.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  MarketScoreBreakdown, 
  MarketScore, 
  MarketScoreEvent,
  ActivePlayerData,
  TargetPlayerData,
  DEFAULT_MARKET_SCORE_WEIGHTS,
  MarketScoreWeights,
} from '@/types/marketScore';
import { computeMarketScoreActive, computeMarketScoreTarget } from './marketScoreEngine';

// =====================================================
// FETCH EXISTING SCORE
// =====================================================

export async function fetchMarketScoreForAthlete(
  athleteId: string
): Promise<MarketScore | null> {
  const { data, error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('type', 'ACTIVE')
    .limit(1);
  
  if (error) {
    console.error('[MarketScoreService] Error fetching athlete score:', error);
    return null;
  }
  
  return (data && data.length > 0) ? data[0] as unknown as MarketScore : null;
}

export async function fetchMarketScoreForTarget(
  targetId: string
): Promise<MarketScore | null> {
  const { data, error } = await supabase
    .from('market_scores')
    .select('*')
    .eq('target_id', targetId)
    .eq('type', 'TARGET')
    .limit(1);
  
  if (error) {
    console.error('[MarketScoreService] Error fetching target score:', error);
    return null;
  }
  
  return (data && data.length > 0) ? data[0] as unknown as MarketScore : null;
}

// =====================================================
// PERSIST SCORE
// =====================================================

export async function persistMarketScore(
  breakdown: MarketScoreBreakdown,
  type: 'ACTIVE' | 'TARGET',
  athleteId?: string,
  targetId?: string,
  reason: string = 'Cálculo inicial'
): Promise<{ score: MarketScore | null; event: MarketScoreEvent | null; error: Error | null }> {
  try {
    // Check for existing score
    let existingScore: MarketScore | null = null;
    if (type === 'ACTIVE' && athleteId) {
      existingScore = await fetchMarketScoreForAthlete(athleteId);
    } else if (type === 'TARGET' && targetId) {
      existingScore = await fetchMarketScoreForTarget(targetId);
    }
    
    const scoreData: Record<string, unknown> = {
      athlete_id: type === 'ACTIVE' ? athleteId : null,
      target_id: type === 'TARGET' ? targetId : null,
      type,
      score_total: breakdown.scoreTotal,
      score_age_window: breakdown.scoreAgeWindow,
      score_performance_impact: breakdown.scorePerformanceImpact,
      score_competitive_context: breakdown.scoreCompetitiveContext,
      score_consistency_reliability: breakdown.scoreConsistencyReliability,
      score_market_profile: breakdown.scoreMarketProfile,
      confidence_level: breakdown.confidenceLevel,
      trend_30d: breakdown.trend30d,
      last_calculated_at: new Date().toISOString(),
      calculated_from_range: breakdown.calculatedFromRange,
      calculation_details: JSON.parse(JSON.stringify(breakdown)),
      updated_at: new Date().toISOString(),
    };
    
    let savedScore: MarketScore;
    
    if (existingScore) {
      // Update existing
      const { data, error } = await supabase
        .from('market_scores')
        .update(scoreData)
        .eq('id', existingScore.id)
        .select()
        .single();
      
      if (error) throw error;
      savedScore = data as unknown as MarketScore;
      
      // Log the update event
      const delta = breakdown.scoreTotal - existingScore.score_total;
      if (Math.abs(delta) >= 0.5) { // Only log if meaningful change
        await logMarketScoreEvent(
          savedScore.id,
          reason,
          existingScore.score_total,
          breakdown.scoreTotal
        );
      }
    } else {
      // Insert new
      const insertData: Record<string, unknown> = {
        ...scoreData,
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('market_scores')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      savedScore = data as unknown as MarketScore;
      
      // Log initial creation
      await logMarketScoreEvent(
        savedScore.id,
        'Score inicial calculado',
        null,
        breakdown.scoreTotal
      );
    }
    
    return { score: savedScore, event: null, error: null };
  } catch (err) {
    console.error('[MarketScoreService] Error persisting score:', err);
    return { score: null, event: null, error: err as Error };
  }
}

// =====================================================
// LOG SCORE EVENT (AUDIT)
// =====================================================

export async function logMarketScoreEvent(
  marketScoreId: string,
  reason: string,
  previousScore: number | null,
  newScore: number,
  details?: Record<string, unknown>
): Promise<MarketScoreEvent | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const eventData = {
      market_score_id: marketScoreId,
      reason,
      previous_score_total: previousScore,
      new_score_total: newScore,
      delta: previousScore !== null ? newScore - previousScore : 0,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      created_by: userData?.user?.id ?? null,
    };
    
    const { data, error } = await supabase
      .from('market_score_events')
      .insert(eventData)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as MarketScoreEvent;
  } catch (err) {
    console.error('[MarketScoreService] Error logging event:', err);
    return null;
  }
}

// =====================================================
// FETCH SCORE HISTORY
// =====================================================

export async function fetchMarketScoreHistory(
  marketScoreId: string,
  limit: number = 20
): Promise<MarketScoreEvent[]> {
  const { data, error } = await supabase
    .from('market_score_events')
    .select('*')
    .eq('market_score_id', marketScoreId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[MarketScoreService] Error fetching history:', error);
    return [];
  }
  
  return (data ?? []) as unknown as MarketScoreEvent[];
}

// =====================================================
// COMPUTE AND PERSIST FOR ACTIVE ATHLETE
// =====================================================

export async function computeAndPersistActiveScore(
  data: ActivePlayerData,
  reason: string = 'Atualização automática',
  weights: MarketScoreWeights = DEFAULT_MARKET_SCORE_WEIGHTS
): Promise<{ breakdown: MarketScoreBreakdown; score: MarketScore | null; error: Error | null; isNew: boolean }> {
  // Get previous score for trend calculation
  const existingScore = await fetchMarketScoreForAthlete(data.playerId);
  const previousTotal = existingScore?.score_total ?? null;
  const isNew = existingScore === null;
  
  // Compute the score
  const breakdown = computeMarketScoreActive(data, previousTotal, weights);
  
  // Persist
  const { score, error } = await persistMarketScore(
    breakdown,
    'ACTIVE',
    data.playerId,
    undefined,
    reason
  );
  
  return { breakdown, score, error, isNew };
}

// =====================================================
// COMPUTE AND PERSIST FOR TARGET
// =====================================================

export async function computeAndPersistTargetScore(
  data: TargetPlayerData,
  reason: string = 'Atualização de observações',
  weights: MarketScoreWeights = DEFAULT_MARKET_SCORE_WEIGHTS
): Promise<{ breakdown: MarketScoreBreakdown; score: MarketScore | null; error: Error | null }> {
  // Get previous score for trend calculation
  const existingScore = await fetchMarketScoreForTarget(data.targetId);
  const previousTotal = existingScore?.score_total ?? null;
  
  // Compute the score
  const breakdown = computeMarketScoreTarget(data, previousTotal, weights);
  
  // Persist
  const { score, error } = await persistMarketScore(
    breakdown,
    'TARGET',
    undefined,
    data.targetId,
    reason
  );
  
  return { breakdown, score, error };
}

// =====================================================
// BATCH RECALCULATE ALL ACTIVE ATHLETES
// =====================================================

export async function batchRecalculateActiveScores(
  athleteDataList: ActivePlayerData[],
  reason: string = 'Recálculo em lote'
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const data of athleteDataList) {
    const { error } = await computeAndPersistActiveScore(data, reason);
    if (error) {
      failed++;
      errors.push(`${data.fullName}: ${error.message}`);
    } else {
      success++;
    }
  }
  
  return { success, failed, errors };
}
