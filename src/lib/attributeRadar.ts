/**
 * UNIFIED RADAR ATTRIBUTE ENGINE v2
 * 
 * Computes the 5 attribute scores (ATA, TÉC, TÁT, DEF, CRI) for the pentagon radar.
 * Works with raw player_stats data from the database.
 * 
 * All values normalized to 0-100 scale with floor/target caps.
 * Uses per-90 rates for most metrics.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PlayerStatRow {
  id?: string;
  player_id?: string;
  season_year?: number;
  competition_id?: string | null;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  aerial_duels_won: number;
  aerial_duels_total?: number;
  accurate_passes: number;
  total_passes: number;
  duels_won: number;
  total_duels: number;
  ground_duels_won?: number;
  ground_duels_total?: number;
  chances_created: number;
  key_passes: number;
  shots: number;
  shots_on_target: number;
  shots_blocked?: number;
  successful_dribbles?: number;
  total_dribbles?: number;
  fouls_committed?: number;
  fouls_drawn?: number;
  clearances?: number;
  offsides?: number;
  possession_lost?: number;
  saves_inside_box?: number;
  punches?: number;
  high_claims?: number;
  successful_runs_out?: number;
  total_runs_out?: number;
  long_passes_accurate?: number;
  long_passes_total?: number;
  times_dribbled_past?: number;
}

export interface AttributeScores {
  ata: number; // Ataque (0-100)
  tec: number; // Técnica (0-100)
  tat: number; // Tático (0-100)
  def: number; // Defesa (0-100)
  cri: number; // Criatividade (0-100)
}

export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export interface RadarDebug {
  totals: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
  };
  rates: Record<string, number>;
  metricScores: Record<string, number>;
  attributeScores: AttributeScores;
  confidence: ConfidenceLevel;
  alpha: number;
}

export interface RadarResult {
  ata: number | null;
  tec: number | null;
  tat: number | null;
  def: number | null;
  cri: number | null;
  confidence: ConfidenceLevel;
  debug: RadarDebug;
}

export interface RadarContext {
  logOnce?: boolean;
}

// ============================================================================
// NORMALIZATION CONFIG (V2 - Spec Aligned)
// ============================================================================

interface MetricConfig {
  floor: number;
  target: number;
  invert?: boolean; // Lower is better
}

// Per-90 caps for normalization to 0-100
const METRIC_CONFIGS: Record<string, MetricConfig> = {
  // ATA (Ataque) - gols, assists, shots, shots_on_target
  goals_p90: { floor: 0, target: 0.7 },
  assists_p90: { floor: 0, target: 0.4 },
  shots_p90: { floor: 0, target: 4.0 },
  shots_on_target_p90: { floor: 0, target: 2.0 },
  
  // CRI (Criatividade) - key_passes, chances_created, dribbles_completed
  key_passes_p90: { floor: 0, target: 2.5 },
  chances_created_p90: { floor: 0, target: 2.5 },
  dribble_success_rate: { floor: 0.20, target: 0.70 },
  
  // DEF (Defesa) - tackles, interceptions, recoveries, duels_won, clearances
  tackles_p90: { floor: 0, target: 5.0 },
  interceptions_p90: { floor: 0, target: 3.0 },
  recoveries_p90: { floor: 0, target: 8.0 },
  duels_win_rate: { floor: 0.30, target: 0.70 },
  clearances_p90: { floor: 0, target: 4.0 },
  
  // TÉC (Técnica) - passes_completed, pass_accuracy, ball_control
  pass_accuracy: { floor: 0.55, target: 0.90 },
  passes_p90: { floor: 10, target: 60 },
  ball_control: { floor: 0.20, target: 0.70 }, // dribbles_completed / dribbles_total
  
  // TÁT (Disciplina/Tática) - yellow_cards (inv), red_cards (inv), fouls_committed (inv), fouls_drawn, turnovers (inv)
  yellow_cards_p90: { floor: 0, target: 0.5, invert: true },
  red_cards_p90: { floor: 0, target: 0.15, invert: true },
  fouls_committed_p90: { floor: 0, target: 2.5, invert: true },
  fouls_drawn_p90: { floor: 0, target: 3.0 },
  possession_lost_p90: { floor: 0, target: 15, invert: true },
  
  // Goalkeeper specific
  saves_p90: { floor: 0, target: 5.0 },
  goals_conceded_p90: { floor: 0, target: 2.0, invert: true },
  clean_sheet_rate: { floor: 0, target: 0.50 },
  penalties_saved_rate: { floor: 0, target: 0.35 },
  errors_p90: { floor: 0, target: 0.2, invert: true },
  
  // Availability / Consistency
  minutes_per_match: { floor: 20, target: 85 },
  availability_rate: { floor: 0.30, target: 0.95 },
};

// ============================================================================
// ATTRIBUTE WEIGHT CONFIG (V2 - Spec Aligned)
// ============================================================================

// Standard outfield weights matching spec formula
const OUTFIELD_WEIGHTS = {
  ata: {
    goals_p90: 0.40,
    assists_p90: 0.25,
    shots_p90: 0.15,
    shots_on_target_p90: 0.20,
  },
  cri: {
    key_passes_p90: 0.40,
    chances_created_p90: 0.35,
    dribble_success_rate: 0.25,
  },
  tec: {
    pass_accuracy: 0.45,
    passes_p90: 0.25,
    ball_control: 0.30,
  },
  def: {
    tackles_p90: 0.25,
    interceptions_p90: 0.20,
    recoveries_p90: 0.20,
    duels_win_rate: 0.20,
    clearances_p90: 0.15,
  },
  tat: {
    yellow_cards_p90: 0.20,
    red_cards_p90: 0.20,
    fouls_committed_p90: 0.20,
    fouls_drawn_p90: 0.15,
    possession_lost_p90: 0.25,
  },
};

// Goalkeeper-specific weights
const GOALKEEPER_WEIGHTS = {
  ata: {
    assists_p90: 0.50,
    key_passes_p90: 0.50,
  },
  cri: {
    assists_p90: 0.40,
    key_passes_p90: 0.40,
    passes_p90: 0.20,
  },
  tec: {
    saves_p90: 0.40,
    pass_accuracy: 0.35,
    errors_p90: 0.25,
  },
  def: {
    goals_conceded_p90: 0.40,
    clean_sheet_rate: 0.35,
    penalties_saved_rate: 0.25,
  },
  tat: {
    minutes_per_match: 0.35,
    availability_rate: 0.35,
    yellow_cards_p90: 0.15,
    red_cards_p90: 0.15,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a raw metric value to 0-100 using floor/target config.
 * If invert=true, lower values produce higher scores.
 */
function normalizeMetric(value: number, config: MetricConfig): number {
  const { floor, target, invert } = config;
  
  if (invert) {
    // For inverted metrics (lower is better)
    // At floor (low = good), score = 100
    // At target (high = bad), score = 0
    if (value <= floor) return 100;
    if (value >= target) return 0;
    return 100 * (1 - (value - floor) / (target - floor));
  } else {
    // For normal metrics (higher is better)
    // At floor (low), score ≈ 0
    // At target (high), score = 100
    if (value <= floor) return 0;
    if (value >= target) return 100;
    return 100 * ((value - floor) / (target - floor));
  }
}

/**
 * Calculate a per-90 rate.
 */
function per90(stat: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return (stat / minutes) * 90;
}

/**
 * Calculate a ratio, safely handling division by zero.
 */
function ratio(numerator: number, denominator: number, fallback = 0): number {
  if (denominator <= 0) return fallback;
  return numerator / denominator;
}

/**
 * Determine confidence level based on total minutes.
 */
function getConfidenceLevel(minutes: number): ConfidenceLevel {
  if (minutes < 180) return "none";
  if (minutes < 450) return "low";
  if (minutes < 900) return "medium";
  return "high";
}

/**
 * Apply shrinkage to raw score based on sample size.
 * Regresses toward 50 for small samples.
 */
function applyShrinkage(rawScore: number, minutes: number): number {
  // Alpha ranges from 0.3 (very small sample) to 1.0 (large sample)
  const alpha = clamp(minutes / 900, 0.3, 1.0);
  return 50 + (rawScore - 50) * alpha;
}

/**
 * Check if position is goalkeeper.
 */
function isGoalkeeperPosition(position: string): boolean {
  const gkPositions = ["goleiro", "gk", "goalkeeper", "arquero", "portero"];
  return gkPositions.includes(position.toLowerCase().trim());
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Aggregate multiple stat rows into totals.
 */
function aggregateStats(statsRows: PlayerStatRow[]): PlayerStatRow {
  const agg: PlayerStatRow = {
    matches: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    tackles: 0,
    interceptions: 0,
    recoveries: 0,
    saves: 0,
    goals_conceded: 0,
    clean_sheets: 0,
    penalties_saved: 0,
    errors_leading_to_goal: 0,
    aerial_duels_won: 0,
    aerial_duels_total: 0,
    accurate_passes: 0,
    total_passes: 0,
    duels_won: 0,
    total_duels: 0,
    ground_duels_won: 0,
    ground_duels_total: 0,
    chances_created: 0,
    key_passes: 0,
    shots: 0,
    shots_on_target: 0,
    shots_blocked: 0,
    successful_dribbles: 0,
    total_dribbles: 0,
    fouls_committed: 0,
    fouls_drawn: 0,
    clearances: 0,
    offsides: 0,
    possession_lost: 0,
    saves_inside_box: 0,
    punches: 0,
    high_claims: 0,
    successful_runs_out: 0,
    total_runs_out: 0,
    long_passes_accurate: 0,
    long_passes_total: 0,
    times_dribbled_past: 0,
  };

  for (const row of statsRows) {
    agg.matches += row.matches || 0;
    agg.minutes += row.minutes || 0;
    agg.goals += row.goals || 0;
    agg.assists += row.assists || 0;
    agg.yellow_cards += row.yellow_cards || 0;
    agg.red_cards += row.red_cards || 0;
    agg.tackles += row.tackles || 0;
    agg.interceptions += row.interceptions || 0;
    agg.recoveries += row.recoveries || 0;
    agg.saves += row.saves || 0;
    agg.goals_conceded += row.goals_conceded || 0;
    agg.clean_sheets += row.clean_sheets || 0;
    agg.penalties_saved += row.penalties_saved || 0;
    agg.errors_leading_to_goal += row.errors_leading_to_goal || 0;
    agg.aerial_duels_won += row.aerial_duels_won || 0;
    agg.aerial_duels_total! += row.aerial_duels_total || 0;
    agg.accurate_passes += row.accurate_passes || 0;
    agg.total_passes += row.total_passes || 0;
    agg.duels_won += row.duels_won || 0;
    agg.total_duels += row.total_duels || 0;
    agg.ground_duels_won! += row.ground_duels_won || 0;
    agg.ground_duels_total! += row.ground_duels_total || 0;
    agg.chances_created += row.chances_created || 0;
    agg.key_passes += row.key_passes || 0;
    agg.shots += row.shots || 0;
    agg.shots_on_target += row.shots_on_target || 0;
    agg.shots_blocked! += row.shots_blocked || 0;
    agg.successful_dribbles! += row.successful_dribbles || 0;
    agg.total_dribbles! += row.total_dribbles || 0;
    agg.fouls_committed! += row.fouls_committed || 0;
    agg.fouls_drawn! += row.fouls_drawn || 0;
    agg.clearances! += row.clearances || 0;
    agg.offsides! += row.offsides || 0;
    agg.possession_lost! += row.possession_lost || 0;
    agg.saves_inside_box! += row.saves_inside_box || 0;
    agg.punches! += row.punches || 0;
    agg.high_claims! += row.high_claims || 0;
    agg.successful_runs_out! += row.successful_runs_out || 0;
    agg.total_runs_out! += row.total_runs_out || 0;
    agg.long_passes_accurate! += row.long_passes_accurate || 0;
    agg.long_passes_total! += row.long_passes_total || 0;
    agg.times_dribbled_past! += row.times_dribbled_past || 0;
  }

  return agg;
}

/**
 * Calculate all per-90 rates and ratios from aggregated stats.
 */
function calculateRates(stats: PlayerStatRow): Record<string, number> {
  const { matches, minutes } = stats;
  
  // Per-90 rates (ATA)
  const goals_p90 = per90(stats.goals, minutes);
  const assists_p90 = per90(stats.assists, minutes);
  const shots_p90 = per90(stats.shots, minutes);
  const shots_on_target_p90 = per90(stats.shots_on_target, minutes);
  
  // Per-90 rates (CRI)
  const key_passes_p90 = per90(stats.key_passes, minutes);
  const chances_created_p90 = per90(stats.chances_created, minutes);
  
  // Per-90 rates (DEF)
  const tackles_p90 = per90(stats.tackles, minutes);
  const interceptions_p90 = per90(stats.interceptions, minutes);
  const recoveries_p90 = per90(stats.recoveries, minutes);
  const clearances_p90 = per90(stats.clearances || 0, minutes);
  
  // Per-90 rates (TÁT)
  const yellow_cards_p90 = per90(stats.yellow_cards, minutes);
  const red_cards_p90 = per90(stats.red_cards, minutes);
  const fouls_committed_p90 = per90(stats.fouls_committed || 0, minutes);
  const fouls_drawn_p90 = per90(stats.fouls_drawn || 0, minutes);
  const possession_lost_p90 = per90(stats.possession_lost || 0, minutes);
  
  // Per-90 rates (TÉC & other)
  const passes_p90 = per90(stats.total_passes, minutes);
  
  // GK rates
  const saves_p90 = per90(stats.saves, minutes);
  const goals_conceded_p90 = per90(stats.goals_conceded, minutes);
  const errors_p90 = per90(stats.errors_leading_to_goal, minutes);
  
  // Ratios (CRI)
  const dribble_success_rate = ratio(stats.successful_dribbles || 0, stats.total_dribbles || 0, 0.5);
  
  // Ratios (DEF)
  const duels_win_rate = ratio(stats.duels_won, stats.total_duels, 0.5);
  
  // Ratios (TÉC)
  const pass_accuracy = ratio(stats.accurate_passes, stats.total_passes, 0.7);
  const ball_control = ratio(stats.successful_dribbles || 0, stats.total_dribbles || 0, 0.5);
  
  // GK ratios
  const clean_sheet_rate = ratio(stats.clean_sheets, matches, 0);
  const penalties_saved_rate = ratio(stats.penalties_saved, matches, 0);
  
  // Availability metrics
  const minutes_per_match = ratio(minutes, matches, 45);
  const availability_rate = clamp(ratio(minutes, matches * 90, 0.5), 0, 1);
  
  return {
    // ATA
    goals_p90,
    assists_p90,
    shots_p90,
    shots_on_target_p90,
    // CRI
    key_passes_p90,
    chances_created_p90,
    dribble_success_rate,
    // DEF
    tackles_p90,
    interceptions_p90,
    recoveries_p90,
    clearances_p90,
    duels_win_rate,
    // TÉC
    passes_p90,
    pass_accuracy,
    ball_control,
    // TÁT
    yellow_cards_p90,
    red_cards_p90,
    fouls_committed_p90,
    fouls_drawn_p90,
    possession_lost_p90,
    // GK
    saves_p90,
    goals_conceded_p90,
    errors_p90,
    clean_sheet_rate,
    penalties_saved_rate,
    // Availability
    minutes_per_match,
    availability_rate,
  };
}

/**
 * Normalize all rates to 0-100 metric scores.
 */
function normalizeAllRates(rates: Record<string, number>): Record<string, number> {
  const scores: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(rates)) {
    const config = METRIC_CONFIGS[key];
    if (config) {
      scores[key] = normalizeMetric(value, config);
    } else {
      // For metrics without config, use raw value clamped
      scores[key] = clamp(value * 100, 0, 100);
    }
  }
  
  // Special: discipline_score (inverse of cards)
  scores.discipline_score = scores.cards_p90 ?? 50;
  
  return scores;
}

/**
 * Calculate weighted attribute score from metric scores.
 */
function calculateWeightedAttribute(
  metricScores: Record<string, number>,
  weights: Record<string, number>
): number {
  let total = 0;
  let weightSum = 0;
  
  for (const [metric, weight] of Object.entries(weights)) {
    const score = metricScores[metric];
    if (score !== undefined && !isNaN(score)) {
      total += score * weight;
      weightSum += weight;
    }
  }
  
  if (weightSum <= 0) return 50; // Default fallback
  return total / weightSum;
}

/**
 * MAIN FUNCTION: Compute radar attributes from player stats.
 * 
 * @param statsRows - Array of player_stats rows (can be filtered by competition/year)
 * @param playerPosition - Position string (e.g., "Goleiro", "Atacante", "Meia")
 * @param context - Optional context with logOnce flag
 * @returns RadarResult with scores, confidence, and debug info
 */
export function computeRadarAttributes(
  statsRows: PlayerStatRow[],
  playerPosition: string,
  context: RadarContext = {}
): RadarResult {
  // Aggregate all stat rows
  const aggregated = aggregateStats(statsRows);
  const { matches, minutes, goals, assists } = aggregated;
  
  // Calculate rates
  const rates = calculateRates(aggregated);
  
  // Normalize to 0-100 scores
  const metricScores = normalizeAllRates(rates);
  
  // Determine if goalkeeper
  const isGK = isGoalkeeperPosition(playerPosition);
  const weights = isGK ? GOALKEEPER_WEIGHTS : OUTFIELD_WEIGHTS;
  
  // Calculate raw attribute scores
  const rawAta = calculateWeightedAttribute(metricScores, weights.ata);
  const rawCri = calculateWeightedAttribute(metricScores, weights.cri);
  const rawTec = calculateWeightedAttribute(metricScores, weights.tec);
  const rawDef = calculateWeightedAttribute(metricScores, weights.def);
  const rawTat = calculateWeightedAttribute(metricScores, weights.tat);
  
  // Apply shrinkage for sample size
  const confidence = getConfidenceLevel(minutes);
  const alpha = clamp(minutes / 900, 0.3, 1.0);
  
  // Build raw scores object
  const rawScores: AttributeScores = {
    ata: rawAta,
    tec: rawTec,
    tat: rawTat,
    def: rawDef,
    cri: rawCri,
  };
  
  // Apply shrinkage and clamp
  const finalScores: AttributeScores = {
    ata: Math.round(clamp(applyShrinkage(rawAta, minutes), 0, 100)),
    tec: Math.round(clamp(applyShrinkage(rawTec, minutes), 0, 100)),
    tat: Math.round(clamp(applyShrinkage(rawTat, minutes), 0, 100)),
    def: Math.round(clamp(applyShrinkage(rawDef, minutes), 0, 100)),
    cri: Math.round(clamp(applyShrinkage(rawCri, minutes), 0, 100)),
  };
  
  // Build debug object
  const debug: RadarDebug = {
    totals: { matches, minutes, goals, assists },
    rates,
    metricScores,
    attributeScores: rawScores,
    confidence,
    alpha,
  };
  
  // Log once if requested (or in dev mode)
  if (context.logOnce || import.meta.env.DEV) {
    console.log("[RADAR] Calculation Result:", {
      position: playerPosition,
      isGK,
      totals: debug.totals,
      rates: {
        goals_p90: rates.goals_p90?.toFixed(3),
        assists_p90: rates.assists_p90?.toFixed(3),
        shots_p90: rates.shots_p90?.toFixed(3),
        key_passes_p90: rates.key_passes_p90?.toFixed(3),
        tackles_p90: rates.tackles_p90?.toFixed(3),
        cards_p90: rates.cards_p90?.toFixed(3),
        duels_win_rate: rates.duels_win_rate?.toFixed(3),
        shot_accuracy: rates.shot_accuracy?.toFixed(3),
        pass_accuracy: rates.pass_accuracy?.toFixed(3),
        minutes_per_match: rates.minutes_per_match?.toFixed(1),
      },
      metricScores: {
        goals_p90: metricScores.goals_p90?.toFixed(1),
        assists_p90: metricScores.assists_p90?.toFixed(1),
        shots_p90: metricScores.shots_p90?.toFixed(1),
        key_passes_p90: metricScores.key_passes_p90?.toFixed(1),
        tackles_p90: metricScores.tackles_p90?.toFixed(1),
        cards_p90: metricScores.cards_p90?.toFixed(1),
        duels_win_rate: metricScores.duels_win_rate?.toFixed(1),
      },
      rawAttributeScores: {
        ata: rawScores.ata.toFixed(1),
        cri: rawScores.cri.toFixed(1),
        tec: rawScores.tec.toFixed(1),
        def: rawScores.def.toFixed(1),
        tat: rawScores.tat.toFixed(1),
      },
      finalScores,
      confidence,
      alpha: alpha.toFixed(2),
    });
  }
  
  // Return null scores if no data
  if (confidence === "none") {
    return {
      ata: null,
      tec: null,
      tat: null,
      def: null,
      cri: null,
      confidence,
      debug,
    };
  }
  
  return {
    ata: finalScores.ata,
    tec: finalScores.tec,
    tat: finalScores.tat,
    def: finalScores.def,
    cri: finalScores.cri,
    confidence,
    debug,
  };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

import { PositionGroupV2 } from "@/lib/playerRatingV2";

interface StatBreakdownItem {
  stat: string;
  score: number;
  available: boolean;
}

/**
 * LEGACY: Compute attribute scores from stat breakdown items.
 * This is kept for backward compatibility with existing code.
 * New code should use computeRadarAttributes() instead.
 */
export function computeAttributeRadar(
  statBreakdown: StatBreakdownItem[],
  positionGroup: PositionGroupV2
): AttributeScores | null {
  const availableStats = statBreakdown.filter(s => s.available);
  
  if (availableStats.length < 3) {
    return null;
  }

  // Create a lookup map for quick stat access
  const statMap = new Map(availableStats.map(s => [s.stat, s.score]));

  // Mapping of stats to each attribute category
  const ATTRIBUTE_STAT_MAPPING = {
    ata: ["goals_per_90", "ga_per_90", "shots", "shots_on_target", "offensive_involvement"],
    tec: ["accurate_passes", "pass_accuracy", "successful_dribbles", "dribble_success", "long_pass_accuracy"],
    tat: ["interceptions", "tackles", "recoveries", "positioning", "aerial_duels"],
    def: ["tackles", "interceptions", "duels_won", "recoveries", "clearances", "saves"],
    cri: ["chances_created", "key_passes", "key_pass_accuracy", "assists_per_90", "successful_dribbles"],
  };

  const calculateAttributeScore = (attrKey: keyof typeof ATTRIBUTE_STAT_MAPPING): number => {
    const relevantStats = ATTRIBUTE_STAT_MAPPING[attrKey];
    const scores: number[] = [];

    for (const statKey of relevantStats) {
      const score = statMap.get(statKey);
      if (score !== undefined) {
        scores.push(score);
      }
    }

    if (scores.length === 0) {
      const allScores = availableStats.map(s => s.score);
      return allScores.length > 0 
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
        : 50;
    }

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const result: AttributeScores = {
    ata: Math.round(clamp(calculateAttributeScore("ata"), 0, 100)),
    tec: Math.round(clamp(calculateAttributeScore("tec"), 0, 100)),
    tat: Math.round(clamp(calculateAttributeScore("tat"), 0, 100)),
    def: Math.round(clamp(calculateAttributeScore("def"), 0, 100)),
    cri: Math.round(clamp(calculateAttributeScore("cri"), 0, 100)),
  };

  if (import.meta.env.DEV) {
    console.log("[ATTRIBUTE_RADAR] Legacy calculation:", {
      positionGroup,
      availableStatsCount: availableStats.length,
      result,
    });
  }

  return result;
}
