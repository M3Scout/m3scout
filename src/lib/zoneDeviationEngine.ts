/**
 * Zone Deviation Engine
 * 
 * Calculates the deviation between current game zone distribution vs season average.
 * 
 * SAFETY RULES:
 * - Read-only: NO new stats created
 * - NO database writes
 * - NO impact on player rating
 * - Only derived calculations from existing heatmap data
 * - Executes only after match is finished
 */

import { type ZoneDistribution } from "./postGameAnalysis";

// ============================================
// TYPES
// ============================================

export type DeviationDirection = "up" | "down";

export interface ZoneDeviation {
  zone: "ATAQUE" | "MEIO" | "DEFESA";
  direction: DeviationDirection;
  /** Absolute difference in percentage points */
  diff: number;
  /** Current game percentage */
  current: number;
  /** Season average percentage */
  seasonAvg: number;
  /** Whether this is a strong deviation (>= 15%) */
  isStrong: boolean;
}

export interface ZoneDeviationResult {
  /** Whether any relevant deviation was found */
  hasDeviation: boolean;
  /** List of deviations (only zones with >= 10% diff) */
  deviations: ZoneDeviation[];
  /** Season average for display */
  seasonAverage: ZoneDistribution | null;
  /** Number of previous games used for calculation */
  gamesUsed: number;
  /** Whether we have enough data to calculate (>= 3 games) */
  hasEnoughData: boolean;
}

export interface PreviousGameZone {
  matchId: string;
  matchDate: string;
  percentages: ZoneDistribution;
}

// ============================================
// CONSTANTS
// ============================================

/** Minimum previous games required for reliable average */
const MIN_GAMES_FOR_AVERAGE = 3;

/** Threshold for relevant deviation (percentage points) */
const RELEVANT_DEVIATION_THRESHOLD = 10;

/** Threshold for strong deviation (percentage points) */
const STRONG_DEVIATION_THRESHOLD = 15;

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate season average from previous games
 * Returns null if not enough data
 */
export function calculateSeasonAverage(
  previousGames: PreviousGameZone[]
): ZoneDistribution | null {
  if (previousGames.length < MIN_GAMES_FOR_AVERAGE) {
    return null;
  }

  const sum = previousGames.reduce(
    (acc, game) => ({
      defense: acc.defense + game.percentages.defense,
      midfield: acc.midfield + game.percentages.midfield,
      attack: acc.attack + game.percentages.attack,
    }),
    { defense: 0, midfield: 0, attack: 0 }
  );

  const count = previousGames.length;
  const average: ZoneDistribution = {
    defense: Math.round(sum.defense / count),
    midfield: Math.round(sum.midfield / count),
    attack: Math.round(sum.attack / count),
  };

  // Normalize to ensure sum ≈ 100%
  const total = average.defense + average.midfield + average.attack;
  if (total !== 100 && total > 0) {
    const diff = 100 - total;
    // Add difference to the highest zone
    const maxZone = Object.entries(average).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as keyof ZoneDistribution;
    average[maxZone] += diff;
  }

  return average;
}

/**
 * Calculate zone deviation between current game and season average
 */
export function calculateZoneDeviation(
  currentGame: ZoneDistribution,
  previousGames: PreviousGameZone[],
  currentMatchId: string
): ZoneDeviationResult {
  // Filter out current match from previous games
  const filteredGames = previousGames.filter(
    (game) => game.matchId !== currentMatchId
  );

  // Check if we have enough data
  if (filteredGames.length < MIN_GAMES_FOR_AVERAGE) {
    return {
      hasDeviation: false,
      deviations: [],
      seasonAverage: null,
      gamesUsed: filteredGames.length,
      hasEnoughData: false,
    };
  }

  // Calculate season average
  const seasonAverage = calculateSeasonAverage(filteredGames);
  if (!seasonAverage) {
    return {
      hasDeviation: false,
      deviations: [],
      seasonAverage: null,
      gamesUsed: filteredGames.length,
      hasEnoughData: false,
    };
  }

  const deviations: ZoneDeviation[] = [];

  // Check each zone for deviation
  const zones: Array<{
    key: keyof ZoneDistribution;
    label: "ATAQUE" | "MEIO" | "DEFESA";
  }> = [
    { key: "attack", label: "ATAQUE" },
    { key: "midfield", label: "MEIO" },
    { key: "defense", label: "DEFESA" },
  ];

  for (const { key, label } of zones) {
    const current = currentGame[key];
    const avg = seasonAverage[key];
    const diff = current - avg;
    const absDiff = Math.abs(diff);

    // Only include if deviation is >= 10%
    if (absDiff >= RELEVANT_DEVIATION_THRESHOLD) {
      deviations.push({
        zone: label,
        direction: diff > 0 ? "up" : "down",
        diff: absDiff,
        current,
        seasonAvg: avg,
        isStrong: absDiff >= STRONG_DEVIATION_THRESHOLD,
      });
    }
  }

  // Sort by absolute difference (highest first)
  deviations.sort((a, b) => b.diff - a.diff);

  return {
    hasDeviation: deviations.length > 0,
    deviations,
    seasonAverage,
    gamesUsed: filteredGames.length,
    hasEnoughData: true,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get human-readable description of a deviation
 */
export function getDeviationDescription(deviation: ZoneDeviation): string {
  const direction = deviation.direction === "up" ? "mais" : "menos";
  const intensity = deviation.isStrong ? "significativamente" : "";
  return `${intensity} ${direction} presente na ${deviation.zone.toLowerCase()}`.trim();
}

/**
 * Get a summary sentence for all deviations
 */
export function getDeviationSummary(result: ZoneDeviationResult): string | null {
  if (!result.hasDeviation || result.deviations.length === 0) {
    return null;
  }

  const parts = result.deviations.map((d) => {
    const emoji = d.direction === "up" ? "↑" : "↓";
    return `${d.zone} ${emoji}${d.diff}%`;
  });

  return `Desvio: ${parts.join(" · ")}`;
}
