/**
 * Player Rating Calculation System (0-5 scale with 0.5 increments)
 * 
 * Components:
 * A) CompetitionLevelScore (30%)
 * B) ProductionScore (35%)
 * C) DefensiveActionsScore (20%)
 * D) DisciplineScore (10%)
 * E) AgePotentialScore (5%)
 */

import { AggregatedStats } from "./playerStats";

// ==================== CONFIGURATION (adjustable by admin later) ====================

export const RATING_WEIGHTS = {
  competitionLevel: 0.30,
  production: 0.35,
  defensiveActions: 0.20,
  discipline: 0.10,
  agePotential: 0.05,
};

// Competition coefficient range for normalization
export const COMPETITION_COEF_RANGE = {
  min: 0.55,
  max: 1.25,
};

// Position groups for different scoring emphasis
export type PositionGroup = 'forward' | 'midfielder' | 'defender' | 'goalkeeper';

export const POSITION_TO_GROUP: Record<string, PositionGroup> = {
  // Forwards
  'Atacante': 'forward',
  'Centroavante': 'forward',
  'Ponta Direita': 'forward',
  'Ponta Esquerda': 'forward',
  'Segundo Atacante': 'forward',
  // Midfielders
  'Meia': 'midfielder',
  'Meia Atacante': 'midfielder',
  'Meia Central': 'midfielder',
  'Volante': 'midfielder',
  'Meio-Campo': 'midfielder',
  // Defenders
  'Zagueiro': 'defender',
  'Lateral Direito': 'defender',
  'Lateral Esquerdo': 'defender',
  'Ala Direito': 'defender',
  'Ala Esquerdo': 'defender',
  // Goalkeeper
  'Goleiro': 'goalkeeper',
};

// Production score thresholds by position (goals per 90 mins)
export const GOALS_90_THRESHOLDS = {
  forward: [0, 0.3, 0.6, 0.9, 1.2], // [0→0, 0.3→40, 0.6→70, 0.9→90, 1.2→100]
  midfielder: [0, 0.15, 0.3, 0.45, 0.6],
  defender: [0, 0.05, 0.1, 0.15, 0.2],
  goalkeeper: [0, 0, 0, 0, 0], // Goalkeepers don't score
};

// Assists per 90 thresholds
export const ASSISTS_90_THRESHOLDS = {
  forward: [0, 0.15, 0.30, 0.45, 0.6],
  midfielder: [0, 0.20, 0.40, 0.60, 0.8],
  defender: [0, 0.10, 0.20, 0.30, 0.4],
  goalkeeper: [0, 0, 0, 0, 0],
};

// Production weights by position
export const PRODUCTION_WEIGHTS = {
  forward: { goals: 0.70, assists: 0.30 },
  midfielder: { goals: 0.40, assists: 0.60 },
  defender: { goals: 0.20, assists: 0.80 },
  goalkeeper: { goals: 0, assists: 0 },
};

// Defensive actions thresholds (per 90 mins)
export const DEFENSIVE_THRESHOLDS = {
  tackles: {
    forward: [0, 0.5, 1.0, 1.5, 2.0],
    midfielder: [0, 1.0, 2.0, 3.0, 4.0],
    defender: [0, 1.5, 3.0, 4.5, 6.0],
    goalkeeper: [0, 0, 0, 0, 0],
  },
  interceptions: {
    forward: [0, 0.3, 0.6, 0.9, 1.2],
    midfielder: [0, 0.8, 1.5, 2.2, 3.0],
    defender: [0, 1.0, 2.0, 3.0, 4.0],
    goalkeeper: [0, 0, 0, 0, 0],
  },
  recoveries: {
    forward: [0, 1.0, 2.0, 3.0, 4.0],
    midfielder: [0, 2.0, 4.0, 6.0, 8.0],
    defender: [0, 2.5, 5.0, 7.5, 10.0],
    goalkeeper: [0, 0, 0, 0, 0],
  },
};

// Defensive actions weights
export const DEFENSIVE_WEIGHTS = {
  tackles: 0.50,
  interceptions: 0.30,
  recoveries: 0.20,
};

// Cards per 90 thresholds (lower is better)
export const CARDS_90_THRESHOLDS = [
  { max: 0.10, score: 100 },
  { max: 0.20, score: 80 },
  { max: 0.30, score: 60 },
  { max: 0.45, score: 40 },
  { max: Infinity, score: 20 },
];

// Age potential curve
export const AGE_POTENTIAL_CURVE: Record<string, number> = {
  '16-19': 90,
  '20-22': 95,
  '23-25': 85,
  '26-28': 75,
  '29-31': 65,
  '32+': 55,
};

// Reliability thresholds
export const RELIABILITY_THRESHOLDS = {
  low: { maxMinutes: 450, maxMatches: 5 },
  medium: { maxMinutes: 1200, maxMatches: 12 },
  // high: anything above medium
};

// ==================== TYPES ====================

export interface RatingBreakdown {
  competitionLevelScore: number;
  productionScore: number;
  defensiveActionsScore: number;
  disciplineScore: number;
  agePotentialScore: number;
  overall0_100: number;
  rating0_5: number;
  reliability: 'low' | 'medium' | 'high';
  positionGroup: PositionGroup;
}

export interface RatingInput {
  age: number | null;
  position: string;
  competitionCoefficient: number;
  stats: AggregatedStats;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a value to 0-100 using thresholds
 * thresholds = [0, t1, t2, t3, t4] maps to [0, 40, 70, 90, 100]
 */
function mapToScore(value: number, thresholds: number[]): number {
  const scores = [0, 40, 70, 90, 100];
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) {
      if (i === thresholds.length - 1) return scores[i];
      // Linear interpolation between thresholds
      const nextThreshold = thresholds[i + 1];
      const progress = (value - thresholds[i]) / (nextThreshold - thresholds[i]);
      return scores[i] + progress * (scores[i + 1] - scores[i]);
    }
  }
  return 0;
}

/**
 * Get position group from position string
 */
export function getPositionGroup(position: string): PositionGroup {
  return POSITION_TO_GROUP[position] || 'midfielder';
}

/**
 * Round to nearest 0.5
 */
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Get age bracket for potential score
 */
function getAgeBracket(age: number): string {
  if (age >= 16 && age <= 19) return '16-19';
  if (age >= 20 && age <= 22) return '20-22';
  if (age >= 23 && age <= 25) return '23-25';
  if (age >= 26 && age <= 28) return '26-28';
  if (age >= 29 && age <= 31) return '29-31';
  return '32+';
}

/**
 * Calculate reliability level based on minutes and matches
 */
function calculateReliability(minutes: number, matches: number): 'low' | 'medium' | 'high' {
  if (minutes < RELIABILITY_THRESHOLDS.low.maxMinutes || matches < RELIABILITY_THRESHOLDS.low.maxMatches) {
    return 'low';
  }
  if (minutes <= RELIABILITY_THRESHOLDS.medium.maxMinutes || matches <= RELIABILITY_THRESHOLDS.medium.maxMatches) {
    return 'medium';
  }
  return 'high';
}

// ==================== SCORE CALCULATIONS ====================

/**
 * A) Competition Level Score (0-100)
 */
function calculateCompetitionLevelScore(coefficient: number): number {
  const { min, max } = COMPETITION_COEF_RANGE;
  const normalized = (coefficient - min) / (max - min);
  return clamp(normalized * 100, 0, 100);
}

/**
 * B) Production Score (0-100) - Goals and Assists per 90
 */
function calculateProductionScore(
  stats: AggregatedStats,
  positionGroup: PositionGroup
): number {
  const minutes = stats.total_minutes;
  if (minutes === 0) return 0;

  const gamesPlayed = minutes / 90;
  const goals90 = stats.total_goals / gamesPlayed;
  const assists90 = stats.total_assists / gamesPlayed;

  const goalsThresholds = GOALS_90_THRESHOLDS[positionGroup];
  const assistsThresholds = ASSISTS_90_THRESHOLDS[positionGroup];
  const weights = PRODUCTION_WEIGHTS[positionGroup];

  const goalsScore = mapToScore(goals90, goalsThresholds);
  const assistsScore = mapToScore(assists90, assistsThresholds);

  return goalsScore * weights.goals + assistsScore * weights.assists;
}

/**
 * C) Defensive Actions Score (0-100)
 */
function calculateDefensiveActionsScore(
  stats: AggregatedStats,
  positionGroup: PositionGroup
): number {
  const minutes = stats.total_minutes;
  if (minutes === 0) return 0;

  const gamesPlayed = minutes / 90;
  const tackles90 = stats.total_tackles / gamesPlayed;
  const interceptions90 = stats.total_interceptions / gamesPlayed;
  const recoveries90 = stats.total_recoveries / gamesPlayed;

  const tacklesScore = mapToScore(tackles90, DEFENSIVE_THRESHOLDS.tackles[positionGroup]);
  const interceptionsScore = mapToScore(interceptions90, DEFENSIVE_THRESHOLDS.interceptions[positionGroup]);
  const recoveriesScore = mapToScore(recoveries90, DEFENSIVE_THRESHOLDS.recoveries[positionGroup]);

  return (
    tacklesScore * DEFENSIVE_WEIGHTS.tackles +
    interceptionsScore * DEFENSIVE_WEIGHTS.interceptions +
    recoveriesScore * DEFENSIVE_WEIGHTS.recoveries
  );
}

/**
 * D) Discipline Score (0-100) - Lower cards = higher score
 */
function calculateDisciplineScore(stats: AggregatedStats): number {
  const minutes = stats.total_minutes;
  if (minutes === 0) return 100; // No games = no cards = perfect discipline

  const gamesPlayed = minutes / 90;
  const yellowCards = stats.total_yellow_cards;
  const redCards = stats.total_red_cards;
  const cards90 = (yellowCards + 3 * redCards) / gamesPlayed;

  for (const threshold of CARDS_90_THRESHOLDS) {
    if (cards90 <= threshold.max) {
      return threshold.score;
    }
  }
  return 20;
}

/**
 * E) Age Potential Score (0-100)
 */
function calculateAgePotentialScore(age: number | null): number {
  if (age === null) return 75; // Default for unknown age
  const bracket = getAgeBracket(age);
  return AGE_POTENTIAL_CURVE[bracket] || 55;
}

// ==================== MAIN CALCULATION ====================

/**
 * Calculate the full player rating breakdown
 */
export function calculatePlayerRating(input: RatingInput): RatingBreakdown {
  const positionGroup = getPositionGroup(input.position);
  
  // Calculate individual components
  const competitionLevelScore = calculateCompetitionLevelScore(input.competitionCoefficient);
  const productionScore = calculateProductionScore(input.stats, positionGroup);
  const defensiveActionsScore = calculateDefensiveActionsScore(input.stats, positionGroup);
  const disciplineScore = calculateDisciplineScore(input.stats);
  const agePotentialScore = calculateAgePotentialScore(input.age);

  // Calculate overall (0-100)
  const overall0_100 =
    competitionLevelScore * RATING_WEIGHTS.competitionLevel +
    productionScore * RATING_WEIGHTS.production +
    defensiveActionsScore * RATING_WEIGHTS.defensiveActions +
    disciplineScore * RATING_WEIGHTS.discipline +
    agePotentialScore * RATING_WEIGHTS.agePotential;

  // Convert to 0-5 scale with 0.5 increments
  const rating0_5 = roundToHalf((overall0_100 / 100) * 5);

  // Calculate reliability
  const reliability = calculateReliability(
    input.stats.total_minutes,
    input.stats.total_matches
  );

  return {
    competitionLevelScore: Math.round(competitionLevelScore * 10) / 10,
    productionScore: Math.round(productionScore * 10) / 10,
    defensiveActionsScore: Math.round(defensiveActionsScore * 10) / 10,
    disciplineScore: Math.round(disciplineScore * 10) / 10,
    agePotentialScore: Math.round(agePotentialScore * 10) / 10,
    overall0_100: Math.round(overall0_100 * 10) / 10,
    rating0_5: clamp(rating0_5, 0, 5),
    reliability,
    positionGroup,
  };
}

/**
 * Get reliability label in Portuguese
 */
export function getReliabilityLabel(reliability: 'low' | 'medium' | 'high'): string {
  const labels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
  };
  return labels[reliability];
}

/**
 * Get reliability badge variant
 */
export function getReliabilityVariant(reliability: 'low' | 'medium' | 'high'): 'destructive' | 'secondary' | 'default' {
  const variants = {
    low: 'destructive' as const,
    medium: 'secondary' as const,
    high: 'default' as const,
  };
  return variants[reliability];
}
