/**
 * Zone Deviation Insight Text Generator
 * 
 * Generates contextual, technical, neutral text insights based on zone deviation data.
 * 
 * SAFETY RULES:
 * - NO recalculation of any data
 * - NO database writes
 * - Uses ONLY the existing deviation output
 * - Returns null if no deviation exists
 * - Text is technical, neutral, and short (1-2 sentences max)
 * - NO numbers in the output text
 */

import { type ZoneDeviationResult, type ZoneDeviation } from "./zoneDeviationEngine";

// ============================================
// TYPES
// ============================================

export interface ZoneDeviationInsight {
  /** Icon to display (↑ / ↓ / ≠) */
  icon: "↑" | "↓" | "≠";
  /** The generated insight text (1-2 sentences) */
  text: string;
  /** Primary zone that drives the insight */
  primaryZone: "ATAQUE" | "MEIO" | "DEFESA";
  /** Direction of the primary deviation */
  direction: "up" | "down";
}

// ============================================
// TEMPLATE TEXTS
// ============================================

const INSIGHT_TEMPLATES: Record<string, Record<"up" | "down", string>> = {
  ATAQUE: {
    up: "Atuação mais ofensiva que o padrão da temporada.",
    down: "Menor presença ofensiva em relação ao padrão do atleta.",
  },
  MEIO: {
    up: "Maior participação na construção do jogo em comparação à média.",
    down: "Menor envolvimento na zona central do campo.",
  },
  DEFESA: {
    up: "Atuação com maior presença defensiva que o habitual.",
    down: "Participação defensiva abaixo do padrão da temporada.",
  },
};

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

/**
 * Generate contextual insight text from zone deviation result
 * Returns null if no deviation exists or data is insufficient
 */
export function generateZoneDeviationInsight(
  result: ZoneDeviationResult
): ZoneDeviationInsight | null {
  // Guard: No deviation or insufficient data
  if (!result.hasDeviation || !result.hasEnoughData || result.deviations.length === 0) {
    return null;
  }

  // Get the most significant deviation (already sorted by diff in engine)
  const primaryDeviation = result.deviations[0];
  
  // Get the template text for this zone and direction
  const zoneTemplates = INSIGHT_TEMPLATES[primaryDeviation.zone];
  if (!zoneTemplates) {
    return null;
  }

  const text = zoneTemplates[primaryDeviation.direction];
  const icon = primaryDeviation.direction === "up" ? "↑" : "↓";

  return {
    icon,
    text,
    primaryZone: primaryDeviation.zone,
    direction: primaryDeviation.direction,
  };
}

/**
 * Generate combined insight text for multiple deviations (max 2 sentences)
 * Used when there are 2 significant deviations that should be mentioned
 */
export function generateCombinedInsight(
  result: ZoneDeviationResult
): ZoneDeviationInsight | null {
  // Guard: No deviation or insufficient data
  if (!result.hasDeviation || !result.hasEnoughData || result.deviations.length === 0) {
    return null;
  }

  // If only one deviation, use simple generator
  if (result.deviations.length === 1) {
    return generateZoneDeviationInsight(result);
  }

  // Get top 2 deviations
  const [primary, secondary] = result.deviations.slice(0, 2);
  
  // Build combined text (2 sentences max)
  const primaryText = INSIGHT_TEMPLATES[primary.zone]?.[primary.direction];
  const secondaryText = INSIGHT_TEMPLATES[secondary.zone]?.[secondary.direction];

  if (!primaryText) {
    return null;
  }

  // If secondary is a strong deviation too, combine
  const combinedText = secondary && secondaryText && secondary.isStrong
    ? `${primaryText} ${secondaryText}`
    : primaryText;

  const icon = primary.direction === "up" ? "↑" : "↓";

  return {
    icon,
    text: combinedText,
    primaryZone: primary.zone,
    direction: primary.direction,
  };
}
