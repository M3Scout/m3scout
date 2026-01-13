/**
 * GOALKEEPER RADAR ENGINE
 * 
 * Computes 5 attribute scores for goalkeepers:
 * - DEF (Defesa): Shot stopping, saves, goals conceded
 * - ANT (Antecipação): Anticipation, sweeper actions, crosses stopped
 * - TAT (Tático): Discipline, errors management
 * - DIS (Distribuição): Passing, distribution quality
 * - AER (Aéreo): Aerial presence, claims, punches
 * 
 * All values normalized to 0-100 scale.
 * Uses per-90 rates with recency weighting (60/40).
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
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Per-90 normalization targets (floor → target maps to 0 → 100)
const METRIC_CONFIGS: Record<string, { floor: number; target: number; invert?: boolean }> = {
  // DEF metrics
  save_pct: { floor: 0.50, target: 0.85 },
  saves_per90: { floor: 0, target: 5.0 },
  goals_conceded_per90: { floor: 2.5, target: 0.5, invert: true },
  clean_sheet_rate: { floor: 0, target: 0.50 },
  
  // ANT metrics
  crosses_stopped_pct: { floor: 0, target: 0.50 },
  claims_per90: { floor: 0, target: 1.5 },
  errors_leading_to_shot_per90: { floor: 0.5, target: 0, invert: true },
  sweeper_actions_per90: { floor: 0, target: 1.0 },
  
  // TAT metrics
  errors_leading_to_goal_per90: { floor: 0.3, target: 0, invert: true },
  cards_per90: { floor: 0.3, target: 0, invert: true },
  fouls_per90: { floor: 0.5, target: 0, invert: true },
  
  // DIS metrics
  pass_accuracy: { floor: 0.55, target: 0.85 },
  long_pass_accuracy: { floor: 0.30, target: 0.65 },
  passes_per90: { floor: 10, target: 35 },
  mispasses_per90: { floor: 8, target: 2, invert: true },
  
  // AER metrics
  punches_per90: { floor: 0, target: 0.8 },
  high_claims_per90: { floor: 0, target: 1.5 },
};

// Attribute weights (must sum to 1.0 for each attribute)
const GK_WEIGHTS = {
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

function normalizeMetric(value: number, config: { floor: number; target: number; invert?: boolean }): number {
  const { floor, target, invert } = config;
  
  if (invert) {
    // Lower is better (e.g., goals_conceded_per90)
    if (value <= target) return 100;
    if (value >= floor) return 0;
    return 100 * (1 - (value - target) / (floor - target));
  } else {
    // Higher is better
    if (value <= floor) return 0;
    if (value >= target) return 100;
    return 100 * ((value - floor) / (target - floor));
  }
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

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Aggregate multiple stat rows with optional recency weighting
 */
export function aggregateGKStats(
  statsRows: GKStatRow[],
  useRecencyWeighting = true
): GKStatRow {
  if (statsRows.length === 0) {
    return createEmptyGKStats();
  }

  // Group by season year for recency weighting
  const byYear = new Map<number, GKStatRow[]>();
  for (const row of statsRows) {
    const year = row.season_year || 2024;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(row);
  }

  // Sort years descending
  const sortedYears = [...byYear.keys()].sort((a, b) => b - a);
  
  // Apply recency weights: 60% current, 40% previous (or 60/25/15 for 3 years)
  const yearWeights: number[] = [];
  if (sortedYears.length === 1) {
    yearWeights.push(1.0);
  } else if (sortedYears.length === 2) {
    yearWeights.push(0.60, 0.40);
  } else {
    yearWeights.push(0.60, 0.25, 0.15);
  }

  const agg = createEmptyGKStats();
  let totalWeight = 0;

  for (let i = 0; i < Math.min(sortedYears.length, 3); i++) {
    const year = sortedYears[i];
    const yearRows = byYear.get(year)!;
    const weight = useRecencyWeighting ? yearWeights[i] : 1;
    
    // Aggregate year rows
    const yearAgg = aggregateRawStats(yearRows);
    
    // Apply weight
    agg.matches += yearAgg.matches * weight;
    agg.minutes += yearAgg.minutes * weight;
    agg.saves += yearAgg.saves * weight;
    agg.saves_inside_box = (agg.saves_inside_box || 0) + (yearAgg.saves_inside_box || 0) * weight;
    agg.goals_conceded += yearAgg.goals_conceded * weight;
    agg.clean_sheets += yearAgg.clean_sheets * weight;
    agg.penalties_saved += yearAgg.penalties_saved * weight;
    agg.errors_leading_to_goal += yearAgg.errors_leading_to_goal * weight;
    agg.shots_on_target_against = (agg.shots_on_target_against || 0) + (yearAgg.shots_on_target_against || 0) * weight;
    agg.penalty_faced = (agg.penalty_faced || 0) + (yearAgg.penalty_faced || 0) * weight;
    agg.claims = (agg.claims || 0) + (yearAgg.claims || 0) * weight;
    agg.punches = (agg.punches || 0) + (yearAgg.punches || 0) * weight;
    agg.high_claims = (agg.high_claims || 0) + (yearAgg.high_claims || 0) * weight;
    agg.crosses_faced = (agg.crosses_faced || 0) + (yearAgg.crosses_faced || 0) * weight;
    agg.crosses_stopped = (agg.crosses_stopped || 0) + (yearAgg.crosses_stopped || 0) * weight;
    agg.errors_leading_to_shot = (agg.errors_leading_to_shot || 0) + (yearAgg.errors_leading_to_shot || 0) * weight;
    agg.successful_runs_out = (agg.successful_runs_out || 0) + (yearAgg.successful_runs_out || 0) * weight;
    agg.total_runs_out = (agg.total_runs_out || 0) + (yearAgg.total_runs_out || 0) * weight;
    agg.accurate_passes = (agg.accurate_passes || 0) + (yearAgg.accurate_passes || 0) * weight;
    agg.total_passes = (agg.total_passes || 0) + (yearAgg.total_passes || 0) * weight;
    agg.long_passes_accurate = (agg.long_passes_accurate || 0) + (yearAgg.long_passes_accurate || 0) * weight;
    agg.long_passes_total = (agg.long_passes_total || 0) + (yearAgg.long_passes_total || 0) * weight;
    agg.yellow_cards = (agg.yellow_cards || 0) + (yearAgg.yellow_cards || 0) * weight;
    agg.red_cards = (agg.red_cards || 0) + (yearAgg.red_cards || 0) * weight;
    agg.fouls_committed = (agg.fouls_committed || 0) + (yearAgg.fouls_committed || 0) * weight;
    
    totalWeight += weight;
  }

  // Normalize by total weight (already done via weights summing to 1)
  return agg;
}

function aggregateRawStats(rows: GKStatRow[]): GKStatRow {
  const agg = createEmptyGKStats();
  
  for (const row of rows) {
    agg.matches += row.matches || 0;
    agg.minutes += row.minutes || 0;
    agg.saves += row.saves || 0;
    agg.saves_inside_box = (agg.saves_inside_box || 0) + (row.saves_inside_box || 0);
    agg.goals_conceded += row.goals_conceded || 0;
    agg.clean_sheets += row.clean_sheets || 0;
    agg.penalties_saved += row.penalties_saved || 0;
    agg.errors_leading_to_goal += row.errors_leading_to_goal || 0;
    agg.shots_on_target_against = (agg.shots_on_target_against || 0) + (row.shots_on_target_against || 0);
    agg.penalty_faced = (agg.penalty_faced || 0) + (row.penalty_faced || 0);
    agg.claims = (agg.claims || 0) + (row.claims || 0);
    agg.punches = (agg.punches || 0) + (row.punches || 0);
    agg.high_claims = (agg.high_claims || 0) + (row.high_claims || 0);
    agg.crosses_faced = (agg.crosses_faced || 0) + (row.crosses_faced || 0);
    agg.crosses_stopped = (agg.crosses_stopped || 0) + (row.crosses_stopped || 0);
    agg.errors_leading_to_shot = (agg.errors_leading_to_shot || 0) + (row.errors_leading_to_shot || 0);
    agg.successful_runs_out = (agg.successful_runs_out || 0) + (row.successful_runs_out || 0);
    agg.total_runs_out = (agg.total_runs_out || 0) + (row.total_runs_out || 0);
    agg.accurate_passes = (agg.accurate_passes || 0) + (row.accurate_passes || 0);
    agg.total_passes = (agg.total_passes || 0) + (row.total_passes || 0);
    agg.long_passes_accurate = (agg.long_passes_accurate || 0) + (row.long_passes_accurate || 0);
    agg.long_passes_total = (agg.long_passes_total || 0) + (row.long_passes_total || 0);
    agg.yellow_cards = (agg.yellow_cards || 0) + (row.yellow_cards || 0);
    agg.red_cards = (agg.red_cards || 0) + (row.red_cards || 0);
    agg.fouls_committed = (agg.fouls_committed || 0) + (row.fouls_committed || 0);
  }
  
  return agg;
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

function calculateGKRates(stats: GKStatRow): Record<string, number | null> {
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
    : null; // Will use saves vs goals_conceded as fallback
  
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
  
  // Fallback save_pct calculation if shots_on_target_against not available
  const calculated_save_pct = save_pct !== null 
    ? save_pct 
    : (stats.saves + stats.goals_conceded > 0 
        ? ratio(stats.saves, stats.saves + stats.goals_conceded) 
        : null);
  
  return {
    // DEF
    save_pct: calculated_save_pct,
    saves_per90,
    goals_conceded_per90,
    clean_sheet_rate,
    // ANT
    crosses_stopped_pct,
    claims_per90,
    errors_leading_to_shot_per90,
    sweeper_actions_per90,
    // TAT
    errors_leading_to_goal_per90,
    cards_per90,
    fouls_per90,
    // DIS
    pass_accuracy,
    long_pass_accuracy,
    passes_per90,
    mispasses_per90,
    // AER
    punches_per90,
    high_claims_per90,
  };
}

// ============================================================================
// SCORE CALCULATION
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
// MAIN FUNCTION
// ============================================================================

/**
 * Compute goalkeeper radar scores from player stats.
 * 
 * @param statsRows - Array of GK stats rows
 * @param useRecencyWeighting - Apply 60/40 recency weighting (default: true)
 * @returns GKRadarResult with scores, confidence, and breakdown
 */
export function computeGKRadar(
  statsRows: GKStatRow[],
  useRecencyWeighting = true
): GKRadarResult {
  // Aggregate stats
  const aggregated = aggregateGKStats(statsRows, useRecencyWeighting);
  const { minutes } = aggregated;
  
  // Calculate rates
  const rates = calculateGKRates(aggregated);
  
  // Normalize to 0-100 scores
  const normalizedScores: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(rates)) {
    if (value === null) {
      normalizedScores[key] = null;
      continue;
    }
    const config = METRIC_CONFIGS[key];
    if (config) {
      normalizedScores[key] = normalizeMetric(value, config);
    } else {
      normalizedScores[key] = clamp(value * 20, 0, 100);
    }
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
    },
  };
}
