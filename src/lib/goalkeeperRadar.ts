/**
 * GOALKEEPER RADAR ENGINE v2
 * 
 * Computes 5 attribute scores for goalkeepers with PERCENTILE NORMALIZATION:
 * - DEF (Defesa): Shot stopping, saves, goals conceded
 * - ANT (Antecipação): Anticipation, sweeper actions, crosses stopped
 * - TAT (Tático): Discipline, errors management
 * - DIS (Distribuição): Passing, distribution quality
 * - AER (Aéreo): Aerial presence, claims, punches
 * 
 * Features:
 * - Percentile normalization comparing only GKs
 * - Competition tier segmentation
 * - Recency weighting (60/40)
 * - Minutes-based aggregation weights
 * - Automatic re-weighting for missing metrics
 */

import { isGoalkeeper } from "@/lib/positionUtils";

// ============================================================================
// TYPES
// ============================================================================

export interface GKStatRow {
  id?: string;
  player_id?: string;
  season_year?: number;
  competition_id?: string | null;
  matches: number;
  minutes: number;
  // Goalkeeper core stats
  saves: number;
  saves_inside_box?: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  // Extended GK stats
  shots_on_target_against?: number;
  penalty_faced?: number;
  claims?: number;
  punches?: number;
  high_claims?: number;
  crosses_faced?: number;
  crosses_stopped?: number;
  errors_leading_to_shot?: number;
  successful_runs_out?: number;
  total_runs_out?: number;
  // Distribution
  accurate_passes?: number;
  total_passes?: number;
  long_passes_accurate?: number;
  long_passes_total?: number;
  // Discipline
  yellow_cards?: number;
  red_cards?: number;
  fouls_committed?: number;
  // Competition info (for tier segmentation)
  competition_tier?: string;
  competition_coefficient?: number;
}

export interface GKRadarScores {
  DEF: number;  // Defesa (0-100)
  ANT: number;  // Antecipação (0-100)
  TAT: number;  // Tático (0-100)
  DIS: number;  // Distribuição (0-100)
  AER: number;  // Aéreo (0-100)
}

export interface GKRadarBreakdown {
  DEF: Record<string, number>;
  ANT: Record<string, number>;
  TAT: Record<string, number>;
  DIS: Record<string, number>;
  AER: Record<string, number>;
}

export type GKConfidenceLevel = "none" | "low" | "medium" | "high";

export interface GKRadarResult {
  scores: GKRadarScores | null;
  confidence: GKConfidenceLevel;
  minutes_used: number;
  breakdown: GKRadarBreakdown;
  percentile_context?: {
    total_gks_compared: number;
    tier_used: string | null;
  };
}

export interface GKPercentileData {
  player_id: string;
  rates: Record<string, number | null>;
  minutes: number;
  tier: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Attribute weights (must sum to 1.0 for each attribute)
export const GK_WEIGHTS = {
  DEF: {
    save_pct: 0.35,
    saves_per90: 0.25,
    goals_conceded_per90: 0.25,
    clean_sheet_rate: 0.15,
  },
  ANT: {
    crosses_stopped_pct: 0.35,
    claims_per90: 0.25,
    errors_leading_to_shot_per90: 0.20,
    sweeper_actions_per90: 0.20,
  },
  TAT: {
    errors_leading_to_goal_per90: 0.40,
    fouls_per90: 0.20,
    cards_per90: 0.20,
    goals_conceded_per90: 0.20,
  },
  DIS: {
    pass_accuracy: 0.35,
    long_pass_accuracy: 0.25,
    passes_per90: 0.20,
    mispasses_per90: 0.20,
  },
  AER: {
    claims_per90: 0.30,
    crosses_stopped_pct: 0.35,
    punches_per90: 0.15,
    high_claims_per90: 0.20,
  },
};

// Metrics that are inverted (lower is better)
const INVERTED_METRICS = new Set([
  'goals_conceded_per90',
  'errors_leading_to_shot_per90',
  'errors_leading_to_goal_per90',
  'fouls_per90',
  'cards_per90',
  'mispasses_per90',
]);

// Fallback floor/target for when percentile data is insufficient
const METRIC_FALLBACKS: Record<string, { floor: number; target: number; invert?: boolean }> = {
  save_pct: { floor: 0.50, target: 0.85 },
  saves_per90: { floor: 0, target: 5.0 },
  goals_conceded_per90: { floor: 2.5, target: 0.5, invert: true },
  clean_sheet_rate: { floor: 0, target: 0.50 },
  crosses_stopped_pct: { floor: 0, target: 0.50 },
  claims_per90: { floor: 0, target: 1.5 },
  errors_leading_to_shot_per90: { floor: 0.5, target: 0, invert: true },
  sweeper_actions_per90: { floor: 0, target: 1.0 },
  errors_leading_to_goal_per90: { floor: 0.3, target: 0, invert: true },
  cards_per90: { floor: 0.3, target: 0, invert: true },
  fouls_per90: { floor: 0.5, target: 0, invert: true },
  pass_accuracy: { floor: 0.55, target: 0.85 },
  long_pass_accuracy: { floor: 0.30, target: 0.65 },
  passes_per90: { floor: 10, target: 35 },
  mispasses_per90: { floor: 8, target: 2, invert: true },
  punches_per90: { floor: 0, target: 0.8 },
  high_claims_per90: { floor: 0, target: 1.5 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function per90(stat: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return (stat / minutes) * 90;
}

function ratio(numerator: number, denominator: number, fallback = 0): number {
  if (denominator <= 0) return fallback;
  return numerator / denominator;
}

function getConfidenceLevel(minutes: number): GKConfidenceLevel {
  if (minutes < 180) return "none";
  if (minutes < 450) return "low";
  if (minutes < 900) return "medium";
  return "high";
}

function applyShrinkage(rawScore: number, minutes: number): number {
  const alpha = clamp(minutes / 900, 0.3, 1.0);
  return 50 + (rawScore - 50) * alpha;
}

/**
 * Calculate percentile of a value within an array of values
 * @param value - The value to calculate percentile for
 * @param allValues - Array of all values to compare against
 * @param invert - If true, lower values get higher percentiles
 * @returns Percentile as 0-100
 */
function calculatePercentile(
  value: number,
  allValues: number[],
  invert = false
): number {
  if (allValues.length === 0) return 50;
  
  const sorted = [...allValues].sort((a, b) => a - b);
  let rank = 0;
  
  for (const v of sorted) {
    if (v < value) rank++;
    else break;
  }
  
  // Percentile = (rank / total) * 100
  let percentile = (rank / sorted.length) * 100;
  
  if (invert) {
    percentile = 100 - percentile;
  }
  
  return clamp(percentile, 0, 100);
}

/**
 * Normalize using fallback floor/target when not enough GKs for percentile
 */
function normalizeWithFallback(value: number, metric: string): number {
  const config = METRIC_FALLBACKS[metric];
  if (!config) return clamp(value * 20, 0, 100);
  
  const { floor, target, invert } = config;
  
  if (invert) {
    if (value <= target) return 100;
    if (value >= floor) return 0;
    return 100 * (1 - (value - target) / (floor - target));
  } else {
    if (value <= floor) return 0;
    if (value >= target) return 100;
    return 100 * ((value - floor) / (target - floor));
  }
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Aggregate stats with minute-based weighting per competition
 */
export function aggregateGKStatsWithMinuteWeight(
  statsRows: GKStatRow[]
): GKStatRow {
  if (statsRows.length === 0) {
    return createEmptyGKStats();
  }

  const totalMinutes = statsRows.reduce((sum, row) => sum + (row.minutes || 0), 0);
  if (totalMinutes === 0) {
    return createEmptyGKStats();
  }

  const agg = createEmptyGKStats();

  for (const row of statsRows) {
    const weight = (row.minutes || 0) / totalMinutes;
    
    agg.matches += (row.matches || 0) * weight;
    agg.minutes += row.minutes || 0; // Don't weight minutes, sum them
    agg.saves += (row.saves || 0) * weight;
    agg.saves_inside_box = (agg.saves_inside_box || 0) + (row.saves_inside_box || 0) * weight;
    agg.goals_conceded += (row.goals_conceded || 0) * weight;
    agg.clean_sheets += (row.clean_sheets || 0) * weight;
    agg.penalties_saved += (row.penalties_saved || 0) * weight;
    agg.errors_leading_to_goal += (row.errors_leading_to_goal || 0) * weight;
    agg.shots_on_target_against = (agg.shots_on_target_against || 0) + (row.shots_on_target_against || 0) * weight;
    agg.penalty_faced = (agg.penalty_faced || 0) + (row.penalty_faced || 0) * weight;
    agg.claims = (agg.claims || 0) + (row.claims || 0) * weight;
    agg.punches = (agg.punches || 0) + (row.punches || 0) * weight;
    agg.high_claims = (agg.high_claims || 0) + (row.high_claims || 0) * weight;
    agg.crosses_faced = (agg.crosses_faced || 0) + (row.crosses_faced || 0) * weight;
    agg.crosses_stopped = (agg.crosses_stopped || 0) + (row.crosses_stopped || 0) * weight;
    agg.errors_leading_to_shot = (agg.errors_leading_to_shot || 0) + (row.errors_leading_to_shot || 0) * weight;
    agg.successful_runs_out = (agg.successful_runs_out || 0) + (row.successful_runs_out || 0) * weight;
    agg.total_runs_out = (agg.total_runs_out || 0) + (row.total_runs_out || 0) * weight;
    agg.accurate_passes = (agg.accurate_passes || 0) + (row.accurate_passes || 0) * weight;
    agg.total_passes = (agg.total_passes || 0) + (row.total_passes || 0) * weight;
    agg.long_passes_accurate = (agg.long_passes_accurate || 0) + (row.long_passes_accurate || 0) * weight;
    agg.long_passes_total = (agg.long_passes_total || 0) + (row.long_passes_total || 0) * weight;
    agg.yellow_cards = (agg.yellow_cards || 0) + (row.yellow_cards || 0) * weight;
    agg.red_cards = (agg.red_cards || 0) + (row.red_cards || 0) * weight;
    agg.fouls_committed = (agg.fouls_committed || 0) + (row.fouls_committed || 0) * weight;
  }

  return agg;
}

/**
 * Aggregate with recency weighting (60% current year, 40% previous)
 */
export function aggregateGKStatsWithRecency(
  statsRows: GKStatRow[]
): GKStatRow {
  if (statsRows.length === 0) {
    return createEmptyGKStats();
  }

  // Group by season year
  const byYear = new Map<number, GKStatRow[]>();
  for (const row of statsRows) {
    const year = row.season_year || new Date().getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(row);
  }

  // Sort years descending
  const sortedYears = [...byYear.keys()].sort((a, b) => b - a);
  
  // Recency weights
  const yearWeights: number[] = [];
  if (sortedYears.length === 1) {
    yearWeights.push(1.0);
  } else if (sortedYears.length === 2) {
    yearWeights.push(0.60, 0.40);
  } else {
    yearWeights.push(0.60, 0.25, 0.15);
  }

  // Aggregate each year with minute weighting, then apply recency
  const yearAggregates: { agg: GKStatRow; weight: number }[] = [];
  
  for (let i = 0; i < Math.min(sortedYears.length, 3); i++) {
    const year = sortedYears[i];
    const yearRows = byYear.get(year)!;
    const yearAgg = aggregateGKStatsWithMinuteWeight(yearRows);
    yearAggregates.push({ agg: yearAgg, weight: yearWeights[i] });
  }

  // Combine with recency weights
  const final = createEmptyGKStats();
  let totalMinutes = 0;

  for (const { agg, weight } of yearAggregates) {
    final.matches += agg.matches * weight;
    final.minutes += agg.minutes; // Sum minutes, don't weight
    totalMinutes += agg.minutes;
    final.saves += agg.saves * weight;
    final.saves_inside_box = (final.saves_inside_box || 0) + (agg.saves_inside_box || 0) * weight;
    final.goals_conceded += agg.goals_conceded * weight;
    final.clean_sheets += agg.clean_sheets * weight;
    final.penalties_saved += agg.penalties_saved * weight;
    final.errors_leading_to_goal += agg.errors_leading_to_goal * weight;
    final.shots_on_target_against = (final.shots_on_target_against || 0) + (agg.shots_on_target_against || 0) * weight;
    final.penalty_faced = (final.penalty_faced || 0) + (agg.penalty_faced || 0) * weight;
    final.claims = (final.claims || 0) + (agg.claims || 0) * weight;
    final.punches = (final.punches || 0) + (agg.punches || 0) * weight;
    final.high_claims = (final.high_claims || 0) + (agg.high_claims || 0) * weight;
    final.crosses_faced = (final.crosses_faced || 0) + (agg.crosses_faced || 0) * weight;
    final.crosses_stopped = (final.crosses_stopped || 0) + (agg.crosses_stopped || 0) * weight;
    final.errors_leading_to_shot = (final.errors_leading_to_shot || 0) + (agg.errors_leading_to_shot || 0) * weight;
    final.successful_runs_out = (final.successful_runs_out || 0) + (agg.successful_runs_out || 0) * weight;
    final.total_runs_out = (final.total_runs_out || 0) + (agg.total_runs_out || 0) * weight;
    final.accurate_passes = (final.accurate_passes || 0) + (agg.accurate_passes || 0) * weight;
    final.total_passes = (final.total_passes || 0) + (agg.total_passes || 0) * weight;
    final.long_passes_accurate = (final.long_passes_accurate || 0) + (agg.long_passes_accurate || 0) * weight;
    final.long_passes_total = (final.long_passes_total || 0) + (agg.long_passes_total || 0) * weight;
    final.yellow_cards = (final.yellow_cards || 0) + (agg.yellow_cards || 0) * weight;
    final.red_cards = (final.red_cards || 0) + (agg.red_cards || 0) * weight;
    final.fouls_committed = (final.fouls_committed || 0) + (agg.fouls_committed || 0) * weight;
  }

  return final;
}

function createEmptyGKStats(): GKStatRow {
  return {
    matches: 0,
    minutes: 0,
    saves: 0,
    saves_inside_box: 0,
    goals_conceded: 0,
    clean_sheets: 0,
    penalties_saved: 0,
    errors_leading_to_goal: 0,
    shots_on_target_against: 0,
    penalty_faced: 0,
    claims: 0,
    punches: 0,
    high_claims: 0,
    crosses_faced: 0,
    crosses_stopped: 0,
    errors_leading_to_shot: 0,
    successful_runs_out: 0,
    total_runs_out: 0,
    accurate_passes: 0,
    total_passes: 0,
    long_passes_accurate: 0,
    long_passes_total: 0,
    yellow_cards: 0,
    red_cards: 0,
    fouls_committed: 0,
  };
}

// ============================================================================
// RATE CALCULATION
// ============================================================================

export function calculateGKRates(stats: GKStatRow): Record<string, number | null> {
  const { matches, minutes } = stats;
  
  // Per-90 rates
  const saves_per90 = per90(stats.saves, minutes);
  const goals_conceded_per90 = per90(stats.goals_conceded, minutes);
  const claims_per90 = per90(stats.claims || 0, minutes);
  const punches_per90 = per90(stats.punches || 0, minutes);
  const high_claims_per90 = per90(stats.high_claims || 0, minutes);
  const errors_leading_to_goal_per90 = per90(stats.errors_leading_to_goal, minutes);
  const errors_leading_to_shot_per90 = per90(stats.errors_leading_to_shot || 0, minutes);
  const sweeper_actions_per90 = per90(stats.successful_runs_out || 0, minutes);
  const cards_per90 = per90((stats.yellow_cards || 0) + (stats.red_cards || 0) * 2, minutes);
  const fouls_per90 = per90(stats.fouls_committed || 0, minutes);
  const passes_per90 = per90(stats.total_passes || 0, minutes);
  const mispasses_per90 = per90((stats.total_passes || 0) - (stats.accurate_passes || 0), minutes);
  
  // Percentage rates
  const save_pct = stats.shots_on_target_against && stats.shots_on_target_against > 0
    ? ratio(stats.saves, stats.shots_on_target_against)
    : (stats.saves + stats.goals_conceded > 0 
        ? ratio(stats.saves, stats.saves + stats.goals_conceded) 
        : null);
  
  const clean_sheet_rate = matches > 0 ? ratio(stats.clean_sheets, matches) : null;
  
  const crosses_stopped_pct = stats.crosses_faced && stats.crosses_faced > 0
    ? ratio(stats.crosses_stopped || 0, stats.crosses_faced)
    : null;
  
  const pass_accuracy = stats.total_passes && stats.total_passes > 0
    ? ratio(stats.accurate_passes || 0, stats.total_passes)
    : null;
  
  const long_pass_accuracy = stats.long_passes_total && stats.long_passes_total > 0
    ? ratio(stats.long_passes_accurate || 0, stats.long_passes_total)
    : null;
  
  return {
    save_pct,
    saves_per90,
    goals_conceded_per90,
    clean_sheet_rate,
    crosses_stopped_pct,
    claims_per90,
    errors_leading_to_shot_per90,
    sweeper_actions_per90,
    errors_leading_to_goal_per90,
    cards_per90,
    fouls_per90,
    pass_accuracy,
    long_pass_accuracy,
    passes_per90,
    mispasses_per90,
    punches_per90,
    high_claims_per90,
  };
}

// ============================================================================
// PERCENTILE NORMALIZATION
// ============================================================================

/**
 * Normalize a GK's rates using percentile comparison against all GKs
 * 
 * @param playerRates - The target GK's calculated rates
 * @param allGKsRates - Array of all GKs' rates for comparison
 * @param playerTier - The target GK's competition tier (optional)
 * @returns Normalized scores (0-100) for each metric
 */
export function normalizeWithPercentile(
  playerRates: Record<string, number | null>,
  allGKsRates: GKPercentileData[],
  playerTier?: string | null
): { scores: Record<string, number | null>; gksCompared: number; tierUsed: string | null } {
  const scores: Record<string, number | null> = {};
  
  // Try to use same-tier GKs first (minimum 5 GKs needed)
  let comparePool = allGKsRates;
  let tierUsed: string | null = null;
  
  if (playerTier) {
    const sameTierGKs = allGKsRates.filter(gk => gk.tier === playerTier);
    if (sameTierGKs.length >= 5) {
      comparePool = sameTierGKs;
      tierUsed = playerTier;
    }
  }
  
  // Need at least 3 GKs for meaningful percentile
  const usePercentile = comparePool.length >= 3;
  
  for (const [metric, value] of Object.entries(playerRates)) {
    if (value === null) {
      scores[metric] = null;
      continue;
    }
    
    if (usePercentile) {
      // Collect all values for this metric from the compare pool
      const allValues: number[] = [];
      for (const gk of comparePool) {
        const gkValue = gk.rates[metric];
        if (gkValue !== null && gkValue !== undefined && !isNaN(gkValue)) {
          allValues.push(gkValue);
        }
      }
      
      if (allValues.length >= 3) {
        const isInverted = INVERTED_METRICS.has(metric);
        scores[metric] = calculatePercentile(value, allValues, isInverted);
      } else {
        // Fallback to floor/target normalization
        scores[metric] = normalizeWithFallback(value, metric);
      }
    } else {
      // Fallback to floor/target normalization
      scores[metric] = normalizeWithFallback(value, metric);
    }
  }
  
  return { 
    scores, 
    gksCompared: comparePool.length,
    tierUsed 
  };
}

// ============================================================================
// WEIGHTED ATTRIBUTE CALCULATION
// ============================================================================

function calculateWeightedAttribute(
  metricScores: Record<string, number | null>,
  weights: Record<string, number>
): { score: number; breakdown: Record<string, number> } {
  let total = 0;
  let weightSum = 0;
  const breakdown: Record<string, number> = {};
  
  for (const [metric, weight] of Object.entries(weights)) {
    const score = metricScores[metric];
    if (score !== null && score !== undefined && !isNaN(score)) {
      total += score * weight;
      weightSum += weight;
      breakdown[metric] = Math.round(score);
    }
  }
  
  // Re-weight if some metrics are missing
  if (weightSum <= 0) return { score: 50, breakdown };
  
  const normalizedScore = total / weightSum;
  return { score: normalizedScore, breakdown };
}

// ============================================================================
// MAIN CALCULATION FUNCTIONS
// ============================================================================

/**
 * Compute GK radar using percentile normalization against all GKs
 * 
 * @param playerStats - The target GK's stats
 * @param allGKsData - Pre-computed percentile data for all GKs
 * @param playerTier - The target GK's primary competition tier
 * @returns GKRadarResult with scores, confidence, and breakdown
 */
export function computeGKRadarWithPercentile(
  playerStats: GKStatRow[],
  allGKsData: GKPercentileData[],
  playerTier?: string | null
): GKRadarResult {
  // Aggregate player stats with recency weighting
  const aggregated = aggregateGKStatsWithRecency(playerStats);
  const { minutes } = aggregated;
  
  // Calculate player's rates
  const playerRates = calculateGKRates(aggregated);
  
  // Normalize using percentile comparison
  const { scores: normalizedScores, gksCompared, tierUsed } = normalizeWithPercentile(
    playerRates,
    allGKsData,
    playerTier
  );
  
  // Calculate attribute scores
  const defResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.DEF);
  const antResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.ANT);
  const tatResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.TAT);
  const disResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.DIS);
  const aerResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.AER);
  
  // Get confidence level
  const confidence = getConfidenceLevel(minutes);
  
  // Apply shrinkage
  const rawScores: GKRadarScores = {
    DEF: defResult.score,
    ANT: antResult.score,
    TAT: tatResult.score,
    DIS: disResult.score,
    AER: aerResult.score,
  };
  
  const finalScores: GKRadarScores = {
    DEF: Math.round(clamp(applyShrinkage(rawScores.DEF, minutes), 0, 100)),
    ANT: Math.round(clamp(applyShrinkage(rawScores.ANT, minutes), 0, 100)),
    TAT: Math.round(clamp(applyShrinkage(rawScores.TAT, minutes), 0, 100)),
    DIS: Math.round(clamp(applyShrinkage(rawScores.DIS, minutes), 0, 100)),
    AER: Math.round(clamp(applyShrinkage(rawScores.AER, minutes), 0, 100)),
  };
  
  const breakdown: GKRadarBreakdown = {
    DEF: defResult.breakdown,
    ANT: antResult.breakdown,
    TAT: tatResult.breakdown,
    DIS: disResult.breakdown,
    AER: aerResult.breakdown,
  };
  
  // Return null scores if insufficient data
  if (confidence === "none") {
    return {
      scores: null,
      confidence,
      minutes_used: minutes,
      breakdown,
      percentile_context: {
        total_gks_compared: gksCompared,
        tier_used: tierUsed,
      },
    };
  }
  
  return {
    scores: finalScores,
    confidence,
    minutes_used: minutes,
    breakdown,
    percentile_context: {
      total_gks_compared: gksCompared,
      tier_used: tierUsed,
    },
  };
}

/**
 * Simple GK radar computation without percentile (for single GK or when comparison data unavailable)
 */
export function computeGKRadar(
  statsRows: GKStatRow[],
  useRecencyWeighting = true
): GKRadarResult {
  // Aggregate stats
  const aggregated = useRecencyWeighting 
    ? aggregateGKStatsWithRecency(statsRows)
    : aggregateGKStatsWithMinuteWeight(statsRows);
  const { minutes } = aggregated;
  
  // Calculate rates
  const rates = calculateGKRates(aggregated);
  
  // Normalize to 0-100 scores using fallback
  const normalizedScores: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(rates)) {
    if (value === null) {
      normalizedScores[key] = null;
      continue;
    }
    normalizedScores[key] = normalizeWithFallback(value, key);
  }
  
  // Calculate attribute scores
  const defResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.DEF);
  const antResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.ANT);
  const tatResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.TAT);
  const disResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.DIS);
  const aerResult = calculateWeightedAttribute(normalizedScores, GK_WEIGHTS.AER);
  
  // Get confidence level
  const confidence = getConfidenceLevel(minutes);
  
  // Apply shrinkage
  const rawScores: GKRadarScores = {
    DEF: defResult.score,
    ANT: antResult.score,
    TAT: tatResult.score,
    DIS: disResult.score,
    AER: aerResult.score,
  };
  
  const finalScores: GKRadarScores = {
    DEF: Math.round(clamp(applyShrinkage(rawScores.DEF, minutes), 0, 100)),
    ANT: Math.round(clamp(applyShrinkage(rawScores.ANT, minutes), 0, 100)),
    TAT: Math.round(clamp(applyShrinkage(rawScores.TAT, minutes), 0, 100)),
    DIS: Math.round(clamp(applyShrinkage(rawScores.DIS, minutes), 0, 100)),
    AER: Math.round(clamp(applyShrinkage(rawScores.AER, minutes), 0, 100)),
  };
  
  const breakdown: GKRadarBreakdown = {
    DEF: defResult.breakdown,
    ANT: antResult.breakdown,
    TAT: tatResult.breakdown,
    DIS: disResult.breakdown,
    AER: aerResult.breakdown,
  };
  
  // Log in development
  if (import.meta.env.DEV) {
    console.log("[GK_RADAR] Calculation Result:", {
      minutes,
      confidence,
      rates: Object.fromEntries(
        Object.entries(rates).map(([k, v]) => [k, v?.toFixed(3)])
      ),
      normalizedScores: Object.fromEntries(
        Object.entries(normalizedScores).map(([k, v]) => [k, v?.toFixed(1)])
      ),
      rawScores,
      finalScores,
      breakdown,
    });
  }
  
  // Return null scores if insufficient data
  if (confidence === "none") {
    return {
      scores: null,
      confidence,
      minutes_used: minutes,
      breakdown,
    };
  }
  
  return {
    scores: finalScores,
    confidence,
    minutes_used: minutes,
    breakdown,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if player position is goalkeeper
 */
export function isGKPosition(position: string | null | undefined): boolean {
  return isGoalkeeper(position);
}

/**
 * GK Radar attribute labels (for UI)
 */
export const GK_RADAR_LABELS = {
  DEF: { key: "DEF", label: "Defesa", description: "Capacidade de defesa, reflexos e posicionamento" },
  ANT: { key: "ANT", label: "Antecipação", description: "Leitura de jogo, saídas e interceptações" },
  TAT: { key: "TAT", label: "Tático", description: "Disciplina e minimização de erros" },
  DIS: { key: "DIS", label: "Distribuição", description: "Passe curto e longo, reposição de bola" },
  AER: { key: "AER", label: "Aéreo", description: "Domínio aéreo, cruzamentos e socos" },
};

/**
 * Convert GK radar result to auto_rating_details format
 */
export function gkRadarToDetails(result: GKRadarResult): Record<string, unknown> {
  if (!result.scores) {
    return {
      gk_radar: null,
    };
  }
  
  return {
    gk_radar: {
      DEF: result.scores.DEF,
      ANT: result.scores.ANT,
      TAT: result.scores.TAT,
      DIS: result.scores.DIS,
      AER: result.scores.AER,
      confidence: result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1),
      minutes_used: Math.round(result.minutes_used),
      breakdown: result.breakdown,
      percentile_context: result.percentile_context,
    },
  };
}
