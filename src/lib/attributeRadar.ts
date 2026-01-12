/**
 * Compute the 5 attribute scores (ATA, TÉC, TÁT, DEF, CRI) for the pentagon radar.
 * 
 * These are aggregated from player stats using position-aware formulas.
 * Returns values in 0-100 scale.
 */

import { PositionGroupV2 } from "@/lib/playerRatingV2";

interface StatBreakdownItem {
  stat: string;
  score: number;
  available: boolean;
}

export interface AttributeScores {
  ata: number;
  tec: number;
  tat: number;
  def: number;
  cri: number;
}

// Mapping of stats to each attribute category
const ATTRIBUTE_STAT_MAPPING = {
  ata: [
    "goals_per_90",
    "ga_per_90", // Goal Actions
    "shots",
    "shots_on_target",
    "offensive_involvement",
  ],
  tec: [
    "accurate_passes",
    "pass_accuracy",
    "successful_dribbles",
    "dribble_success",
    "long_pass_accuracy",
  ],
  tat: [
    "interceptions",
    "tackles",
    "recoveries",
    "positioning", // if available
    "aerial_duels",
  ],
  def: [
    "tackles",
    "interceptions",
    "duels_won",
    "recoveries",
    "clearances",
    "saves", // for GK
  ],
  cri: [
    "chances_created",
    "key_passes",
    "key_pass_accuracy",
    "assists_per_90",
    "successful_dribbles",
  ],
};

// Position-specific attribute weights (what matters more for each position)
const POSITION_ATTRIBUTE_WEIGHTS: Record<PositionGroupV2, Record<keyof AttributeScores, number>> = {
  goalkeeper: {
    ata: 0.05,
    tec: 0.25,
    tat: 0.20,
    def: 0.40,
    cri: 0.10,
  },
  center_back: {
    ata: 0.10,
    tec: 0.20,
    tat: 0.25,
    def: 0.35,
    cri: 0.10,
  },
  defensive_mid: {
    ata: 0.15,
    tec: 0.25,
    tat: 0.25,
    def: 0.25,
    cri: 0.10,
  },
  midfielder: {
    ata: 0.20,
    tec: 0.25,
    tat: 0.20,
    def: 0.15,
    cri: 0.20,
  },
  forward: {
    ata: 0.35,
    tec: 0.20,
    tat: 0.10,
    def: 0.10,
    cri: 0.25,
  },
};

/**
 * Compute attribute scores from stat breakdown items.
 * Returns null if insufficient data.
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

  // Calculate each attribute score
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
      // Fallback: use overall average if no specific stats available
      const allScores = availableStats.map(s => s.score);
      return allScores.length > 0 
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
        : 50;
    }

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const rawScores: AttributeScores = {
    ata: calculateAttributeScore("ata"),
    tec: calculateAttributeScore("tec"),
    tat: calculateAttributeScore("tat"),
    def: calculateAttributeScore("def"),
    cri: calculateAttributeScore("cri"),
  };

  // Apply position-specific weighting for emphasis (optional smoothing)
  const weights = POSITION_ATTRIBUTE_WEIGHTS[positionGroup];
  
  // For now, return raw scores (0-100)
  // Could apply weighting to emphasize position-relevant attributes
  const result: AttributeScores = {
    ata: clamp(rawScores.ata, 0, 100),
    tec: clamp(rawScores.tec, 0, 100),
    tat: clamp(rawScores.tat, 0, 100),
    def: clamp(rawScores.def, 0, 100),
    cri: clamp(rawScores.cri, 0, 100),
  };

  // Log for debugging
  if (import.meta.env.DEV) {
    console.log("[ATTRIBUTE_RADAR]", {
      positionGroup,
      availableStatsCount: availableStats.length,
      rawScores,
      weights,
      result,
    });
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
