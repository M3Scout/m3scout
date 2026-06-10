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
    
    const scoreData = {
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
// COMPUTE SCORE FOR ATHLETE BY ID (fetches all required data)
// =====================================================

export async function computeScoreForAthleteById(
  athleteId: string,
  athleteInfo: {
    fullName?: string;
    position: string;
    secondaryPositions?: string[];
    birthDate?: string | null;
    age?: number | null;
  },
  reason: string = 'Cálculo inicial'
): Promise<{ breakdown: MarketScoreBreakdown; score: MarketScore | null; error: Error | null; isNew: boolean }> {
  try {
    const currentYear = new Date().getFullYear();
    
    // Fetch match player stats for this athlete
    const { data: matchPlayerStats, error: statsError } = await supabase
      .from('match_player_stats')
      .select(`
        *,
        matches!inner(
          id,
          match_date,
          status,
          season_year,
          competition_id
        )
      `)
      .eq('player_id', athleteId)
      .eq('matches.season_year', currentYear)
      // Regra de Ouro: Market Score considera apenas jogos APLICADOS.
      .eq('matches.status', 'applied');
    
    if (statsError) {
      console.error('[MarketScoreService] Error fetching match stats:', statsError);
    }
    
    // Aggregate stats
    const stats = matchPlayerStats || [];
    const seasonStats = {
      matches: stats.length,
      minutes: stats.reduce((acc, s) => acc + (s.dribbles_total > 0 || s.passes_total > 0 ? 90 : 0), 0), // Approximate
      goals: stats.reduce((acc, s) => acc + (s.goals || 0), 0),
      assists: stats.reduce((acc, s) => acc + (s.assists || 0), 0),
      keyPasses: stats.reduce((acc, s) => acc + (s.key_passes || 0), 0),
      chancesCreated: stats.reduce((acc, s) => acc + (s.chances_created || 0), 0),
      tackles: stats.reduce((acc, s) => acc + (s.tackles || 0), 0),
      interceptions: stats.reduce((acc, s) => acc + (s.interceptions || 0), 0),
      recoveries: stats.reduce((acc, s) => acc + (s.recoveries || 0), 0),
      clearances: stats.reduce((acc, s) => acc + (s.clearances || 0), 0),
      duelsWon: stats.reduce((acc, s) => acc + (s.duels_won || 0), 0),
      duelsTotal: stats.reduce((acc, s) => acc + (s.duels_total || 0), 0),
      aerialDuelsWon: stats.reduce((acc, s) => acc + (s.aerial_duels_won || 0), 0),
      aerialDuelsTotal: stats.reduce((acc, s) => acc + (s.aerial_duels_total || 0), 0),
      dribblesSuccess: stats.reduce((acc, s) => acc + (s.dribbles_success || 0), 0),
      dribblesTotal: stats.reduce((acc, s) => acc + (s.dribbles_total || 0), 0),
      passesCompleted: stats.reduce((acc, s) => acc + (s.passes_completed || 0), 0),
      passesTotal: stats.reduce((acc, s) => acc + (s.passes_total || 0), 0),
      crossesSuccess: stats.reduce((acc, s) => acc + (s.crosses_success || 0), 0),
      crossesFailed: stats.reduce((acc, s) => acc + (s.crosses_failed || 0), 0),
    };
    
    // Calculate matches in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const matchesLast30Days = stats.filter(s => {
      const matchDate = new Date((s.matches as any)?.match_date);
      return matchDate >= thirtyDaysAgo;
    }).length;
    
    // Build match ratings (simplified - using default rating if not calculated)
    const matchRatings = stats.map(s => ({
      matchId: (s.matches as any)?.id || s.match_id,
      matchDate: (s.matches as any)?.match_date || new Date().toISOString(),
      rating: 6.5, // Default rating - the real rating would require full calculation
      competitionId: (s.matches as any)?.competition_id || null,
      competitionCoefficient: 1.0,
    }));
    
    // Build ActivePlayerData
    const activePlayerData: ActivePlayerData = {
      playerId: athleteId,
      fullName: athleteInfo.fullName || 'Atleta',
      position: athleteInfo.position || 'Meia',
      secondaryPositions: athleteInfo.secondaryPositions || [],
      birthDate: athleteInfo.birthDate || null,
      age: athleteInfo.age || null,
      seasonStats,
      matchRatings,
      matchesLast30Days,
    };
    
    // Get previous score for trend calculation
    const existingScore = await fetchMarketScoreForAthlete(athleteId);
    const previousTotal = existingScore?.score_total ?? null;
    const isNew = existingScore === null;
    
    // Compute the score
    const breakdown = computeMarketScoreActive(activePlayerData, previousTotal, DEFAULT_MARKET_SCORE_WEIGHTS);
    
    // Persist
    const { score, error } = await persistMarketScore(
      breakdown,
      'ACTIVE',
      athleteId,
      undefined,
      reason
    );
    
    return { breakdown, score, error, isNew };
  } catch (err) {
    console.error('[MarketScoreService] Error computing score for athlete:', err);
    return { 
      breakdown: null as any, 
      score: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      isNew: false 
    };
  }
}

// =====================================================
// BULK RECALCULATE ALL ACTIVE ATHLETES (uses unified view for accuracy)
// =====================================================

export async function recalculateAllActiveMarketScores(
  onProgress?: (current: number, total: number, playerName: string, success: boolean) => void,
  reason: string = 'Recálculo em massa'
): Promise<{ success: number; failed: number; total: number }> {
  const currentYear = new Date().getFullYear();
  let successCount = 0;
  let failedCount = 0;

  // 1. Fetch all non-archived players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, full_name, position, secondary_positions, birth_date')
    .eq('is_archived', false)
    .order('full_name');

  if (playersError || !players?.length) return { success: 0, failed: 0, total: 0 };

  // 2. Fetch aggregated season stats for all players at once via the unified view
  const { data: allStats } = await supabase
    .from('unified_player_season_stats')
    .select('player_id,matches,minutes,goals,assists,key_passes,chances_created,tackles,interceptions,recoveries,aerial_duels_won,aerial_duels_total,duels_won,total_duels,dribbles_completed,dribbles_attempted,passes_completed,passes_attempted')
    .eq('season_year', currentYear);

  // Sum across competitions per player
  const statsMap: Record<string, {
    matches: number; minutes: number; goals: number; assists: number;
    key_passes: number; chances_created: number; tackles: number;
    interceptions: number; recoveries: number; aerial_duels_won: number;
    aerial_duels_total: number; duels_won: number; total_duels: number;
    dribbles_completed: number; dribbles_attempted: number;
    passes_completed: number; passes_attempted: number;
  }> = {};

  for (const row of allStats ?? []) {
    if (!statsMap[row.player_id]) {
      statsMap[row.player_id] = {
        matches: 0, minutes: 0, goals: 0, assists: 0, key_passes: 0,
        chances_created: 0, tackles: 0, interceptions: 0, recoveries: 0,
        aerial_duels_won: 0, aerial_duels_total: 0, duels_won: 0,
        total_duels: 0, dribbles_completed: 0, dribbles_attempted: 0,
        passes_completed: 0, passes_attempted: 0,
      };
    }
    const s = statsMap[row.player_id];
    s.matches        += Number(row.matches ?? 0);
    s.minutes        += Number(row.minutes ?? 0);
    s.goals          += Number(row.goals ?? 0);
    s.assists        += Number(row.assists ?? 0);
    s.key_passes     += Number(row.key_passes ?? 0);
    s.chances_created+= Number(row.chances_created ?? 0);
    s.tackles        += Number(row.tackles ?? 0);
    s.interceptions  += Number(row.interceptions ?? 0);
    s.recoveries     += Number(row.recoveries ?? 0);
    s.aerial_duels_won  += Number(row.aerial_duels_won ?? 0);
    s.aerial_duels_total+= Number(row.aerial_duels_total ?? 0);
    s.duels_won      += Number(row.duels_won ?? 0);
    s.total_duels    += Number(row.total_duels ?? 0);
    s.dribbles_completed += Number(row.dribbles_completed ?? 0);
    s.dribbles_attempted += Number(row.dribbles_attempted ?? 0);
    s.passes_completed   += Number(row.passes_completed ?? 0);
    s.passes_attempted   += Number(row.passes_attempted ?? 0);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 3. Process each player sequentially
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const ps = statsMap[player.id];

    if (!ps || ps.matches === 0) {
      onProgress?.(i + 1, players.length, player.full_name, true);
      continue;
    }

    try {
      // Per-match data: rating, clearances, dates, competition coefficient
      const { data: matchRows } = await supabase
        .from('match_player_stats')
        .select(`
          rating, clearances,
          matches!inner(
            id, match_date, competition_id, season_year, status,
            competitions(final_coefficient)
          )
        `)
        .eq('player_id', player.id)
        .eq('matches.season_year', currentYear)
        .eq('matches.status', 'applied');

      const matchRatings = (matchRows ?? []).map(m => {
        const match = (m as any).matches;
        return {
          matchId: match?.id ?? '',
          matchDate: match?.match_date ?? '',
          rating: m.rating ?? 0,
          competitionId: match?.competition_id ?? null,
          competitionCoefficient: match?.competitions?.final_coefficient ?? 1.0,
        };
      });

      const matchesLast30Days = matchRatings.filter(
        m => m.matchDate && new Date(m.matchDate) >= thirtyDaysAgo
      ).length;

      const totalClearances = (matchRows ?? []).reduce(
        (acc, m) => acc + ((m as any).clearances ?? 0), 0
      );

      const birthDate = player.birth_date ?? null;
      const age = birthDate
        ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      const activePlayerData: ActivePlayerData = {
        playerId: player.id,
        fullName: player.full_name,
        position: player.position ?? 'Meia',
        secondaryPositions: (player as any).secondary_positions ?? [],
        birthDate,
        age,
        seasonStats: {
          matches:         ps.matches,
          minutes:         ps.minutes,
          goals:           ps.goals,
          assists:         ps.assists,
          keyPasses:       ps.key_passes,
          chancesCreated:  ps.chances_created,
          tackles:         ps.tackles,
          interceptions:   ps.interceptions,
          recoveries:      ps.recoveries,
          clearances:      totalClearances,
          duelsWon:        ps.duels_won,
          duelsTotal:      ps.total_duels,
          aerialDuelsWon:  ps.aerial_duels_won,
          aerialDuelsTotal:ps.aerial_duels_total,
          dribblesSuccess: ps.dribbles_completed,
          dribblesTotal:   ps.dribbles_attempted,
          passesCompleted: ps.passes_completed,
          passesTotal:     ps.passes_attempted,
          crossesSuccess:  0,
          crossesFailed:   0,
        },
        matchRatings,
        matchesLast30Days,
      };

      const { error } = await computeAndPersistActiveScore(activePlayerData, reason);

      if (error) {
        failedCount++;
        onProgress?.(i + 1, players.length, player.full_name, false);
      } else {
        successCount++;
        onProgress?.(i + 1, players.length, player.full_name, true);
      }
    } catch {
      failedCount++;
      onProgress?.(i + 1, players.length, player.full_name, false);
    }
  }

  return { success: successCount, failed: failedCount, total: players.length };
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
