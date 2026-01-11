/**
 * Player Rating System V2 (0-5 scale)
 * 
 * Position-aware, multi-competition, recency-weighted rating system.
 * 
 * CORE RULES:
 * 1. Competition difficulty: coefficient 0.75-1.30 → 0-100 score
 * 2. Recency weights: most recent=0.50, 2nd=0.30, others share 0.20
 * 3. Minutes factor: >=1800=1.0, 900-1799=0.8, 450-899=0.6, 1-449=0.35, 0=0
 * 4. Position-based stat weights with missing stats redistribution
 * 5. Score = (position_stats * 0.70) + (competition_level * 0.30)
 * 6. Final rating = sum(score * weight) / sum(weight), then /20 for 0-5
 */

// ==================== POSITION GROUPS ====================

export type PositionGroupV2 = 'goalkeeper' | 'center_back' | 'defensive_mid' | 'midfielder' | 'forward';

const POSITION_MAPPING: Record<string, PositionGroupV2> = {
  // Goalkeeper
  'Goleiro': 'goalkeeper',
  'GK': 'goalkeeper',
  // Center Back
  'Zagueiro': 'center_back',
  'Zagueiro Central': 'center_back',
  'CB': 'center_back',
  // Defensive Midfielders
  'Volante': 'defensive_mid',
  'Primeiro Volante': 'defensive_mid',
  'DM': 'defensive_mid',
  'CDM': 'defensive_mid',
  // Full-backs (treat as CB for defensive emphasis)
  'Lateral Direito': 'center_back',
  'Lateral Esquerdo': 'center_back',
  'Ala Direito': 'midfielder', // Wing-backs more attacking
  'Ala Esquerdo': 'midfielder',
  // Midfielders
  'Meia': 'midfielder',
  'Meia Atacante': 'midfielder',
  'Meia Central': 'midfielder',
  'Meio-Campo': 'midfielder',
  'Segundo Volante': 'defensive_mid',
  'CM': 'midfielder',
  'CAM': 'midfielder',
  'AM': 'midfielder',
  // Forwards
  'Atacante': 'forward',
  'Centroavante': 'forward',
  'Ponta Direita': 'forward',
  'Ponta Esquerda': 'forward',
  'Segundo Atacante': 'forward',
  'ST': 'forward',
  'CF': 'forward',
  'RW': 'forward',
  'LW': 'forward',
};

export function getPositionGroupV2(position: string): PositionGroupV2 {
  return POSITION_MAPPING[position] || 'midfielder';
}

// ==================== STAT DEFINITIONS BY POSITION ====================

interface StatWeight {
  key: string;
  label: string;
  weight: number;
  inverse?: boolean; // true = lower is better (cards, errors)
}

const POSITION_STAT_WEIGHTS: Record<PositionGroupV2, StatWeight[]> = {
  goalkeeper: [
    { key: 'minutes_games', label: 'Minutos/Jogos', weight: 20 },
    { key: 'saves', label: 'Defesas', weight: 18 },
    { key: 'goals_conceded', label: 'Gols Sofridos', weight: 14, inverse: true },
    { key: 'errors', label: 'Erros', weight: 16, inverse: true },
    { key: 'accurate_passes', label: 'Passes Certos', weight: 10 },
    { key: 'penalties_saved', label: 'Pênaltis Defendidos', weight: 8 },
    { key: 'aerial_duels', label: 'Duelos Aéreos', weight: 8 },
    { key: 'discipline', label: 'Disciplina', weight: 6, inverse: true },
  ],
  center_back: [
    { key: 'tackles', label: 'Desarmes', weight: 16 },
    { key: 'interceptions', label: 'Interceptações', weight: 16 },
    { key: 'minutes_games', label: 'Minutos/Jogos', weight: 14 },
    { key: 'duels_won', label: 'Duelos Vencidos', weight: 14 },
    { key: 'recoveries', label: 'Recuperações', weight: 12 },
    { key: 'accurate_passes', label: 'Passes Certos', weight: 8 },
    { key: 'discipline', label: 'Disciplina', weight: 8, inverse: true },
    { key: 'ga_per_90', label: 'G+A por 90', weight: 6 },
    { key: 'pass_accuracy', label: 'Precisão de Passes', weight: 6 },
  ],
  defensive_mid: [
    { key: 'minutes_games', label: 'Minutos/Jogos', weight: 20 },
    { key: 'tackles', label: 'Desarmes', weight: 18 },
    { key: 'recoveries', label: 'Recuperações', weight: 16 },
    { key: 'interceptions', label: 'Interceptações', weight: 14 },
    { key: 'accurate_passes', label: 'Passes Certos', weight: 10 },
    { key: 'ga_per_90', label: 'G+A por 90', weight: 8 },
    { key: 'pass_accuracy', label: 'Precisão de Passes', weight: 8 },
    { key: 'discipline', label: 'Disciplina', weight: 6, inverse: true },
  ],
  midfielder: [
    { key: 'ga_per_90', label: 'G+A por 90', weight: 22 },
    { key: 'chances_created', label: 'Chances Criadas', weight: 16 },
    { key: 'key_passes', label: 'Passes Decisivos', weight: 14 },
    { key: 'minutes_games', label: 'Minutos/Jogos', weight: 10 },
    { key: 'accurate_passes', label: 'Passes Certos', weight: 10 },
    { key: 'shots', label: 'Finalizações', weight: 8 },
    { key: 'key_pass_accuracy', label: 'Precisão Passes Decisivos', weight: 8 },
    { key: 'pass_accuracy', label: 'Precisão de Passes', weight: 8 },
    { key: 'discipline', label: 'Disciplina', weight: 4, inverse: true },
  ],
  forward: [
    { key: 'goals_per_90', label: 'Gols por 90', weight: 28 },
    { key: 'ga_per_90', label: 'G+A por 90', weight: 20 },
    { key: 'shots_on_target', label: 'Finalizações no Gol', weight: 16 },
    { key: 'shots', label: 'Finalizações', weight: 12 },
    { key: 'minutes_games', label: 'Minutos/Jogos', weight: 10 },
    { key: 'offensive_involvement', label: 'Envolvimento Ofensivo', weight: 10 },
    { key: 'discipline', label: 'Disciplina', weight: 4, inverse: true },
  ],
};

// ==================== COMPETITION STATS ====================

export interface CompetitionStats {
  competition_id: string;
  competition_name: string;
  final_coefficient: number;
  phase_name?: string | null;
  phase_weight?: number | null;
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  // Extended stats (may not all be available)
  saves?: number;
  goals_conceded?: number;
  errors?: number;
  accurate_passes?: number;
  aerial_duels?: number;
  duels_won?: number;
  key_passes?: number;
  chances_created?: number;
  shots?: number;
  shots_on_target?: number;
  pass_accuracy?: number;
}

export interface RatingInputV2 {
  age: number | null;
  position: string;
  competitions: CompetitionStats[];
}

// ==================== RATING BREAKDOWN ====================

export interface CompetitionBreakdown {
  competition_id: string;
  competition_name: string;
  season_year: number;
  final_coefficient: number;
  phase_name?: string | null;
  phase_weight?: number | null;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  // Calculated - V2 Year-based weighting
  year_weight: number;        // 0.60 or 0.40 (or 1.0 if single year)
  in_year_weight: number;     // minutes_i / total_minutes_in_year
  final_weight: number;       // year_weight * in_year_weight
  // Legacy fields for compatibility
  recency_weight: number;     // Same as year_weight for UI compatibility
  minutes_factor: number;     // Legacy, now represents in_year_weight
  combined_weight: number;    // Same as final_weight for UI compatibility
  competition_level_score: number;
  position_stats_score: number;
  stat_breakdown: Array<{
    stat: string;
    label: string;
    value: number;
    score: number;
    weight: number;
    adjusted_weight: number;
    available: boolean;
  }>;
  competition_score: number;
  weighted_contribution: number;
}

export interface RatingBreakdownV2 {
  calculated_at: string;
  position: string;
  position_group: PositionGroupV2;
  position_group_label: string;
  age: number | null;
  // Aggregated
  total_matches: number;
  total_minutes: number;
  total_competitions: number;
  // Per-competition
  competitions: CompetitionBreakdown[];
  // Summary scores
  final_score_100: number;
  final_rating_0_5: number;
  reliability: 'low' | 'medium' | 'high';
  // For display
  stat_weights: StatWeight[];
}

// ==================== UTILITY FUNCTIONS ====================

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Calculate competition level score (0-100)
 * Aligned with new tier thresholds:
 * - coefficient 0.50 → 0 (minimum expected)
 * - coefficient 2.00 → 100 (Tier S territory)
 */
function calculateCompetitionLevelScore(coefficient: number): number {
  const minCoef = 0.50;
  const maxCoef = 2.00;
  const normalized = (coefficient - minCoef) / (maxCoef - minCoef);
  return clamp(normalized * 100, 0, 100);
}

/**
 * Calculate minutes factor
 */
function calculateMinutesFactor(minutes: number): number {
  if (minutes >= 1800) return 1.0;
  if (minutes >= 900) return 0.8;
  if (minutes >= 450) return 0.6;
  if (minutes >= 1) return 0.35;
  return 0;
}

/**
 * Calculate recency weights for sorted competitions (newest first)
 */
function calculateRecencyWeights(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [1.0];
  if (count === 2) return [0.50, 0.50];
  
  // Most recent: 0.50, second: 0.30, others share 0.20
  const weights: number[] = [0.50, 0.30];
  const remaining = count - 2;
  const remainingWeight = 0.20 / remaining;
  
  for (let i = 0; i < remaining; i++) {
    weights.push(remainingWeight);
  }
  
  return weights;
}

/**
 * Calculate reliability based on total minutes and matches
 */
function calculateReliability(totalMinutes: number, totalMatches: number): 'low' | 'medium' | 'high' {
  if (totalMinutes < 450 || totalMatches < 5) return 'low';
  if (totalMinutes < 1200 || totalMatches < 12) return 'medium';
  return 'high';
}

function getPositionGroupLabel(group: PositionGroupV2): string {
  const labels: Record<PositionGroupV2, string> = {
    goalkeeper: 'Goleiro',
    center_back: 'Defensor',
    defensive_mid: 'Volante',
    midfielder: 'Meio-Campo',
    forward: 'Atacante',
  };
  return labels[group];
}

// ==================== STAT SCORE CALCULATION ====================

interface StatValues {
  minutes: number;
  matches: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  saves?: number;
  goals_conceded?: number;
  errors?: number;
  accurate_passes?: number;
  aerial_duels?: number;
  duels_won?: number;
  key_passes?: number;
  chances_created?: number;
  shots?: number;
  shots_on_target?: number;
  pass_accuracy?: number;
}

/**
 * Get the raw value for a stat key
 */
function getStatValue(key: string, stats: StatValues): number | null {
  const minutes90 = stats.minutes / 90;
  
  switch (key) {
    case 'minutes_games':
      // Score based on minutes (1800+ = 100)
      return clamp((stats.minutes / 1800) * 100, 0, 100);
    case 'goals_per_90':
      return minutes90 > 0 ? stats.goals / minutes90 : null;
    case 'ga_per_90':
      return minutes90 > 0 ? (stats.goals + stats.assists) / minutes90 : null;
    case 'tackles':
      return minutes90 > 0 ? stats.tackles / minutes90 : null;
    case 'interceptions':
      return minutes90 > 0 ? stats.interceptions / minutes90 : null;
    case 'recoveries':
      return minutes90 > 0 ? stats.recoveries / minutes90 : null;
    case 'discipline':
      // Cards per 90 (red = 3x yellow)
      return minutes90 > 0 ? (stats.yellow_cards + stats.red_cards * 3) / minutes90 : 0;
    case 'saves':
      return stats.saves ?? null;
    case 'goals_conceded':
      return stats.goals_conceded ?? null;
    case 'errors':
      return stats.errors ?? null;
    case 'accurate_passes':
      return stats.accurate_passes ?? null;
    case 'aerial_duels':
      return stats.aerial_duels ?? null;
    case 'duels_won':
      return stats.duels_won ?? null;
    case 'key_passes':
      return stats.key_passes ?? null;
    case 'chances_created':
      return stats.chances_created ?? null;
    case 'shots':
      return minutes90 > 0 ? (stats.shots ?? 0) / minutes90 : null;
    case 'shots_on_target':
      return minutes90 > 0 ? (stats.shots_on_target ?? 0) / minutes90 : null;
    case 'pass_accuracy':
      return stats.pass_accuracy ?? null;
    case 'penalties_saved':
      return 50; // Default baseline if not available
    case 'offensive_involvement':
      // Approximation based on goals + assists + shots
      return minutes90 > 0 ? ((stats.goals + stats.assists) * 10 + (stats.shots ?? 0) * 2) / minutes90 : null;
    default:
      return null;
  }
}

/**
 * Convert a stat value to a 0-100 score with thresholds by stat type
 */
function statValueToScore(key: string, value: number, inverse: boolean, positionGroup: PositionGroupV2): number {
  // Thresholds for different stat types [0→0, t1→40, t2→70, t3→90, t4→100]
  const thresholds: Record<string, number[]> = {
    // Per 90 stats
    goals_per_90: positionGroup === 'forward' ? [0, 0.3, 0.6, 0.9, 1.2] :
                  positionGroup === 'midfielder' ? [0, 0.15, 0.3, 0.45, 0.6] :
                  [0, 0.05, 0.1, 0.15, 0.2],
    ga_per_90: positionGroup === 'forward' ? [0, 0.4, 0.7, 1.0, 1.3] :
               positionGroup === 'midfielder' ? [0, 0.25, 0.5, 0.75, 1.0] :
               [0, 0.1, 0.2, 0.3, 0.4],
    tackles: positionGroup === 'forward' ? [0, 0.5, 1.0, 1.5, 2.0] :
             positionGroup === 'midfielder' ? [0, 1.0, 2.0, 3.0, 4.0] :
             [0, 1.5, 3.0, 4.5, 6.0],
    interceptions: positionGroup === 'forward' ? [0, 0.3, 0.6, 0.9, 1.2] :
                   positionGroup === 'midfielder' ? [0, 0.8, 1.5, 2.2, 3.0] :
                   [0, 1.0, 2.0, 3.0, 4.0],
    recoveries: positionGroup === 'forward' ? [0, 1.0, 2.0, 3.0, 4.0] :
                positionGroup === 'midfielder' ? [0, 2.0, 4.0, 6.0, 8.0] :
                [0, 2.5, 5.0, 7.5, 10.0],
    discipline: [0, 0.1, 0.2, 0.3, 0.45], // Lower is better
    shots: [0, 1.0, 2.0, 3.0, 4.0],
    shots_on_target: [0, 0.5, 1.0, 1.5, 2.0],
    // Direct percentages
    minutes_games: [0, 25, 50, 75, 100],
    pass_accuracy: [0, 70, 80, 88, 95],
  };

  const defaultThresholds = [0, 25, 50, 75, 100];
  const statThresholds = thresholds[key] || defaultThresholds;
  
  let score = 0;
  const scores = [0, 40, 70, 90, 100];
  
  for (let i = statThresholds.length - 1; i >= 0; i--) {
    if (value >= statThresholds[i]) {
      if (i === statThresholds.length - 1) {
        score = scores[i];
      } else {
        const nextThreshold = statThresholds[i + 1];
        const progress = (value - statThresholds[i]) / (nextThreshold - statThresholds[i]);
        score = scores[i] + progress * (scores[i + 1] - scores[i]);
      }
      break;
    }
  }
  
  // For inverse stats (lower is better), flip the score
  if (inverse) {
    score = 100 - score;
  }
  
  return clamp(score, 0, 100);
}

/**
 * Calculate position-based stats score with missing stat weight redistribution
 */
function calculatePositionStatsScore(
  stats: StatValues,
  positionGroup: PositionGroupV2
): { score: number; breakdown: CompetitionBreakdown['stat_breakdown'] } {
  const weights = POSITION_STAT_WEIGHTS[positionGroup];
  const breakdown: CompetitionBreakdown['stat_breakdown'] = [];
  
  // First pass: identify available stats and their weights
  let availableWeight = 0;
  let unavailableWeight = 0;
  
  for (const w of weights) {
    const value = getStatValue(w.key, stats);
    if (value !== null) {
      availableWeight += w.weight;
    } else {
      unavailableWeight += w.weight;
    }
  }
  
  // Calculate redistribution factor
  const redistributionFactor = availableWeight > 0 ? (availableWeight + unavailableWeight) / availableWeight : 0;
  
  // Second pass: calculate scores with redistributed weights
  let totalScore = 0;
  let totalAdjustedWeight = 0;
  
  for (const w of weights) {
    const rawValue = getStatValue(w.key, stats);
    const available = rawValue !== null;
    const value = rawValue ?? 50; // Default to 50 for display but don't count
    const score = available ? statValueToScore(w.key, value, w.inverse || false, positionGroup) : 50;
    const adjustedWeight = available ? w.weight * redistributionFactor : 0;
    
    breakdown.push({
      stat: w.key,
      label: w.label,
      value,
      score,
      weight: w.weight,
      adjusted_weight: adjustedWeight,
      available,
    });
    
    if (available) {
      totalScore += score * adjustedWeight;
      totalAdjustedWeight += adjustedWeight;
    }
  }
  
  const finalScore = totalAdjustedWeight > 0 ? totalScore / totalAdjustedWeight : 50;
  
  return { score: finalScore, breakdown };
}

// ==================== MAIN CALCULATION ====================

export function calculatePlayerRatingV2(input: RatingInputV2): RatingBreakdownV2 {
  const positionGroup = getPositionGroupV2(input.position);
  const statWeights = POSITION_STAT_WEIGHTS[positionGroup];
  
  if (input.competitions.length === 0) {
    return {
      calculated_at: new Date().toISOString(),
      position: input.position,
      position_group: positionGroup,
      position_group_label: getPositionGroupLabel(positionGroup),
      age: input.age,
      total_matches: 0,
      total_minutes: 0,
      total_competitions: 0,
      competitions: [],
      final_score_100: 50,
      final_rating_0_5: 2.5,
      reliability: 'low',
      stat_weights: statWeights,
    };
  }
  
  // ==================== V2 YEAR-BASED WEIGHTING ====================
  // 1. Get distinct years and sort descending
  const yearsSet = new Set(input.competitions.map(c => c.season_year));
  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
  
  // 2. Take only the 2 most recent years
  const year1 = sortedYears[0]; // Most recent
  const year2 = sortedYears.length > 1 ? sortedYears[1] : null;
  
  // 3. Calculate year base weights (60/40 or 100%)
  const year1Weight = year2 !== null ? 0.60 : 1.0;
  const year2Weight = year2 !== null ? 0.40 : 0;
  
  // 4. Group competitions by year and calculate total minutes per year
  const year1Comps = input.competitions.filter(c => c.season_year === year1);
  const year2Comps = year2 !== null ? input.competitions.filter(c => c.season_year === year2) : [];
  
  const year1TotalMinutes = year1Comps.reduce((sum, c) => sum + c.minutes, 0);
  const year2TotalMinutes = year2Comps.reduce((sum, c) => sum + c.minutes, 0);
  
  // 5. Create a map for each competition's weights
  const competitionWeights = new Map<string, { yearWeight: number; inYearWeight: number; finalWeight: number }>();
  
  for (const comp of year1Comps) {
    const inYearWeight = year1TotalMinutes > 0 ? comp.minutes / year1TotalMinutes : 1 / year1Comps.length;
    competitionWeights.set(comp.competition_id, {
      yearWeight: year1Weight,
      inYearWeight,
      finalWeight: year1Weight * inYearWeight,
    });
  }
  
  for (const comp of year2Comps) {
    const inYearWeight = year2TotalMinutes > 0 ? comp.minutes / year2TotalMinutes : 1 / year2Comps.length;
    competitionWeights.set(comp.competition_id, {
      yearWeight: year2Weight,
      inYearWeight,
      finalWeight: year2Weight * inYearWeight,
    });
  }
  
  // 6. Only include competitions from the 2 most recent years
  const relevantCompetitions = [...year1Comps, ...year2Comps];
  
  // Sort by year desc, then by minutes desc within year
  relevantCompetitions.sort((a, b) => {
    if (b.season_year !== a.season_year) return b.season_year - a.season_year;
    return b.minutes - a.minutes;
  });
  
  // Process each competition
  const competitionBreakdowns: CompetitionBreakdown[] = [];
  let totalMinutes = 0;
  let totalMatches = 0;
  
  for (const comp of relevantCompetitions) {
    const weights = competitionWeights.get(comp.competition_id)!;
    const yearWeight = weights.yearWeight;
    const inYearWeight = weights.inYearWeight;
    const finalWeight = weights.finalWeight;
    
    const competitionLevelScore = calculateCompetitionLevelScore(comp.final_coefficient);
    const { score: positionStatsScore, breakdown: statBreakdown } = calculatePositionStatsScore(comp, positionGroup);
    
    // Score for this competition: 70% position stats + 30% competition level
    const competitionScore = (positionStatsScore * 0.70) + (competitionLevelScore * 0.30);
    const weightedContribution = competitionScore * finalWeight;
    
    competitionBreakdowns.push({
      competition_id: comp.competition_id,
      competition_name: comp.competition_name,
      season_year: comp.season_year,
      final_coefficient: comp.final_coefficient,
      phase_name: comp.phase_name,
      phase_weight: comp.phase_weight,
      matches: comp.matches,
      minutes: comp.minutes,
      goals: comp.goals,
      assists: comp.assists,
      yellow_cards: comp.yellow_cards,
      red_cards: comp.red_cards,
      tackles: comp.tackles,
      interceptions: comp.interceptions,
      recoveries: comp.recoveries,
      // V2 Year-based weighting
      year_weight: yearWeight,
      in_year_weight: inYearWeight,
      final_weight: finalWeight,
      // Legacy fields for UI compatibility
      recency_weight: yearWeight,
      minutes_factor: inYearWeight,
      combined_weight: finalWeight,
      competition_level_score: competitionLevelScore,
      position_stats_score: positionStatsScore,
      stat_breakdown: statBreakdown,
      competition_score: competitionScore,
      weighted_contribution: weightedContribution,
    });
    
    totalMinutes += comp.minutes;
    totalMatches += comp.matches;
  }
  
  // Calculate final score
  const totalWeight = competitionBreakdowns.reduce((sum, c) => sum + c.final_weight, 0);
  const totalContribution = competitionBreakdowns.reduce((sum, c) => sum + c.weighted_contribution, 0);
  
  const finalScore100 = totalWeight > 0 ? totalContribution / totalWeight : 50;
  const finalRating05 = roundToHalf(finalScore100 / 20);
  
  const reliability = calculateReliability(totalMinutes, totalMatches);
  
  return {
    calculated_at: new Date().toISOString(),
    position: input.position,
    position_group: positionGroup,
    position_group_label: getPositionGroupLabel(positionGroup),
    age: input.age,
    total_matches: totalMatches,
    total_minutes: totalMinutes,
    total_competitions: relevantCompetitions.length,
    competitions: competitionBreakdowns,
    final_score_100: Math.round(finalScore100 * 10) / 10,
    final_rating_0_5: clamp(finalRating05, 0, 5),
    reliability,
    stat_weights: statWeights,
  };
}

// ==================== HELPER EXPORTS ====================

export function getReliabilityLabelV2(reliability: 'low' | 'medium' | 'high'): string {
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  };
  return labels[reliability];
}

export function getReliabilityVariantV2(reliability: 'low' | 'medium' | 'high'): 'destructive' | 'secondary' | 'default' {
  const variants = {
    low: 'destructive' as const,
    medium: 'secondary' as const,
    high: 'default' as const,
  };
  return variants[reliability];
}

export { POSITION_STAT_WEIGHTS };
