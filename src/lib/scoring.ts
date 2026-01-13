// Score calculation utilities for scouting reports

export const CATEGORY_WEIGHTS = {
  technical: 0.25,
  tactical: 0.25,
  physical: 0.20,
  mental: 0.20,
  impact: 0.10,
} as const;

export interface CategoryScores {
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
  impact: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  competitionCoefficient: number;
  adjustedScore: number;
  potentialBonus: number;
  consistencyModifier: number;
  finalScore: number;
  rating: number;
}

/**
 * Calculate the base score from category scores using weighted average
 */
export function calculateBaseScore(scores: CategoryScores): number {
  const baseScore =
    scores.technical * CATEGORY_WEIGHTS.technical +
    scores.tactical * CATEGORY_WEIGHTS.tactical +
    scores.physical * CATEGORY_WEIGHTS.physical +
    scores.mental * CATEGORY_WEIGHTS.mental +
    scores.impact * CATEGORY_WEIGHTS.impact;
  
  return Math.round(baseScore * 100) / 100;
}

/**
 * Calculate adjusted score by applying competition coefficient
 */
export function calculateAdjustedScore(baseScore: number, coefficient: number): number {
  const adjusted = baseScore * coefficient;
  return Math.min(100, Math.max(0, Math.round(adjusted * 100) / 100));
}

/**
 * Calculate final score with modifiers
 */
export function calculateFinalScore(
  adjustedScore: number,
  potentialBonus: number,
  consistencyModifier: number
): number {
  const final = adjustedScore + potentialBonus + consistencyModifier;
  return Math.min(100, Math.max(0, Math.round(final * 100) / 100));
}

/**
 * Convert score (0-100) to rating (1-5)
 */
export function scoreToRating(score: number): number {
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  return 1;
}

/**
 * Get rating label
 */
export function getRatingLabel(rating: number): string {
  switch (rating) {
    case 5: return "Elite";
    case 4: return "Muito Bom";
    case 3: return "Bom";
    case 2: return "Regular";
    default: return "Abaixo da Média";
  }
}

/**
 * Get color class for score display
 * Unified color classification:
 * - Alto (80+): Verde (emerald)
 * - Bom (60-79): Azul (blue)
 * - Médio (40-59): Amarelo (amber)
 * - Ruim (<40): Vermelho (red/destructive)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

/**
 * Get background color class for score bars
 */
export function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

/**
 * Get score level with label and description
 */
export function getScoreLevel(score: number): { label: string; description: string } {
  if (score >= 80) return { label: "Alto", description: "Desempenho excelente nesta métrica" };
  if (score >= 60) return { label: "Bom", description: "Desempenho acima da média" };
  if (score >= 40) return { label: "Médio", description: "Desempenho dentro da média" };
  return { label: "Ruim", description: "Área de melhoria identificada" };
}

/**
 * Get badge color classes for score display
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "border-emerald-500 text-emerald-500";
  if (score >= 60) return "border-blue-500 text-blue-500";
  if (score >= 40) return "border-amber-500 text-amber-500";
  return "border-red-500 text-red-500";
}

/**
 * Calculate full score breakdown
 */
export function calculateScoreBreakdown(
  scores: CategoryScores,
  competitionCoefficient: number,
  potentialBonus: number = 0,
  consistencyModifier: number = 0
): ScoreBreakdown {
  const baseScore = calculateBaseScore(scores);
  const adjustedScore = calculateAdjustedScore(baseScore, competitionCoefficient);
  const finalScore = calculateFinalScore(adjustedScore, potentialBonus, consistencyModifier);
  const rating = scoreToRating(finalScore);

  return {
    baseScore,
    competitionCoefficient,
    adjustedScore,
    potentialBonus,
    consistencyModifier,
    finalScore,
    rating,
  };
}
