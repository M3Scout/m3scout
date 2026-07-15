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
import { getMergedSeasonTotals, getMergedSeasonByCompetition } from './recalculatePlayerScores';

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

    // Same merge pipeline as useMarketScore.ts / recalculateAllActiveMarketScores
    // (live + player_stats, real ratings, real competition coefficients) — this
    // used to build its own live-only aggregate with a hardcoded 6.5 rating for
    // every match and competitionCoefficient always 1.0.
    const [seasonStatsRaw, competitionRows, { data: matchRows }, { data: competitionsData }] = await Promise.all([
      getMergedSeasonTotals(athleteId, currentYear),
      getMergedSeasonByCompetition(athleteId, currentYear),
      supabase
        .from('match_player_stats')
        .select(`
          rating,
          matches!inner(id, match_date, competition_id, season_year, status)
        `)
        .eq('player_id', athleteId)
        .eq('matches.season_year', currentYear)
        // Regra de Ouro: Market Score considera apenas jogos APLICADOS.
        .eq('matches.status', 'applied'),
      supabase.from('competitions').select('id, final_coefficient'),
    ]);

    const coefficientMap = new Map<string, number>();
    (competitionsData || []).forEach(c => coefficientMap.set(c.id, c.final_coefficient));

    const seasonStats = {
      matches:          seasonStatsRaw.matches,
      minutes:          seasonStatsRaw.minutes,
      goals:            seasonStatsRaw.goals,
      assists:          seasonStatsRaw.assists,
      keyPasses:        seasonStatsRaw.key_passes,
      chancesCreated:   seasonStatsRaw.chances_created,
      tackles:          seasonStatsRaw.tackles,
      interceptions:    seasonStatsRaw.interceptions,
      recoveries:       seasonStatsRaw.recoveries,
      clearances:       seasonStatsRaw.clearances,
      duelsWon:         seasonStatsRaw.duels_won,
      duelsTotal:       seasonStatsRaw.duels_total,
      aerialDuelsWon:   seasonStatsRaw.aerial_duels_won,
      aerialDuelsTotal: seasonStatsRaw.aerial_duels_total,
      dribblesSuccess:  seasonStatsRaw.dribbles_success,
      dribblesTotal:    seasonStatsRaw.dribbles_total,
      passesCompleted:  seasonStatsRaw.passes_completed,
      passesTotal:      seasonStatsRaw.passes_total,
      crossesSuccess:   seasonStatsRaw.crosses_success,
      crossesFailed:    seasonStatsRaw.crosses_failed,
      shots:            seasonStatsRaw.shots,
      shotsOnTarget:    seasonStatsRaw.shots_on_target,
      steals:           seasonStatsRaw.steals,
      possessionLost:   seasonStatsRaw.possession_lost,
      wasDribbled:      seasonStatsRaw.was_dribbled,
      penaltiesWon:     seasonStatsRaw.penalties_won,
      groundDuelsWon:   seasonStatsRaw.ground_duels_won,
      groundDuelsTotal: seasonStatsRaw.ground_duels_total,
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matchRatings = (matchRows ?? []).map(m => {
      const match = (m as any).matches;
      return {
        matchId: match?.id ?? '',
        matchDate: match?.match_date ?? '',
        rating: m.rating ?? 0,
        competitionId: match?.competition_id ?? null,
        competitionCoefficient: (match?.competition_id && coefficientMap.get(match.competition_id)) || 1.0,
      };
    });

    const matchesLast30Days = matchRatings.filter(
      m => m.matchDate && new Date(m.matchDate) >= thirtyDaysAgo
    ).length;

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
      competitionBreakdown: competitionRows.map(row => ({
        competitionId: row.competition_id,
        minutes: row.stats.minutes,
        coefficient: (row.competition_id && coefficientMap.get(row.competition_id)) || 1.0,
      })),
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
// BULK RECALCULATE ALL ACTIVE ATHLETES
// =====================================================
//
// Uses the EXACT same merge pipeline as useMarketScore.ts (per-player call
// to getMergedSeasonTotals/getMergedSeasonByCompetition) instead of a
// separate, independently-built aggregation — this used to read from a
// different view (unified_player_season_stats) with different column names
// and no per-competition coefficient breakdown, so a bulk recalculation
// would silently diverge from — or in the current schema, outright crash
// relative to — a single-player recalculation.

export async function recalculateAllActiveMarketScores(
  onProgress?: (current: number, total: number, playerName: string, success: boolean) => void,
  reason: string = 'Recálculo em massa'
): Promise<{ success: number; failed: number; total: number }> {
  const currentYear = new Date().getFullYear();
  let successCount = 0;
  let failedCount = 0;

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, full_name, position, secondary_positions, birth_date')
    .eq('is_archived', false)
    .order('full_name');

  if (playersError || !players?.length) return { success: 0, failed: 0, total: 0 };

  const { data: competitionsData } = await supabase.from('competitions').select('id, final_coefficient');
  const coefficientMap = new Map<string, number>();
  (competitionsData || []).forEach(c => coefficientMap.set(c.id, c.final_coefficient));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (let i = 0; i < players.length; i++) {
    const player = players[i];

    try {
      const [seasonStats, competitionRows, { data: matchRows }] = await Promise.all([
        getMergedSeasonTotals(player.id, currentYear),
        getMergedSeasonByCompetition(player.id, currentYear),
        supabase
          .from('match_player_stats')
          .select(`
            rating,
            matches!inner(id, match_date, competition_id, season_year, status)
          `)
          .eq('player_id', player.id)
          .eq('matches.season_year', currentYear)
          .eq('matches.status', 'applied'),
      ]);

      if (seasonStats.matches === 0) {
        onProgress?.(i + 1, players.length, player.full_name, true);
        continue;
      }

      const matchRatings = (matchRows ?? []).map(m => {
        const match = (m as any).matches;
        return {
          matchId: match?.id ?? '',
          matchDate: match?.match_date ?? '',
          rating: m.rating ?? 0,
          competitionId: match?.competition_id ?? null,
          competitionCoefficient: (match?.competition_id && coefficientMap.get(match.competition_id)) || 1.0,
        };
      });

      const matchesLast30Days = matchRatings.filter(
        m => m.matchDate && new Date(m.matchDate) >= thirtyDaysAgo
      ).length;

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
          matches:          seasonStats.matches,
          minutes:          seasonStats.minutes,
          goals:            seasonStats.goals,
          assists:          seasonStats.assists,
          keyPasses:        seasonStats.key_passes,
          chancesCreated:   seasonStats.chances_created,
          tackles:          seasonStats.tackles,
          interceptions:    seasonStats.interceptions,
          recoveries:       seasonStats.recoveries,
          clearances:       seasonStats.clearances,
          duelsWon:         seasonStats.duels_won,
          duelsTotal:       seasonStats.duels_total,
          aerialDuelsWon:   seasonStats.aerial_duels_won,
          aerialDuelsTotal: seasonStats.aerial_duels_total,
          dribblesSuccess:  seasonStats.dribbles_success,
          dribblesTotal:    seasonStats.dribbles_total,
          passesCompleted:  seasonStats.passes_completed,
          passesTotal:      seasonStats.passes_total,
          crossesSuccess:   seasonStats.crosses_success,
          crossesFailed:    seasonStats.crosses_failed,
          shots:            seasonStats.shots,
          shotsOnTarget:    seasonStats.shots_on_target,
          steals:           seasonStats.steals,
          possessionLost:   seasonStats.possession_lost,
          wasDribbled:      seasonStats.was_dribbled,
          penaltiesWon:     seasonStats.penalties_won,
          groundDuelsWon:   seasonStats.ground_duels_won,
          groundDuelsTotal: seasonStats.ground_duels_total,
        },
        matchRatings,
        matchesLast30Days,
        competitionBreakdown: competitionRows.map(row => ({
          competitionId: row.competition_id,
          minutes: row.stats.minutes,
          coefficient: (row.competition_id && coefficientMap.get(row.competition_id)) || 1.0,
        })),
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
