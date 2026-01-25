/**
 * Match Efficiency Engine - Professional Scouting Quality vs Risk Indicator
 * 
 * This module calculates a separate "Match Efficiency" score that measures
 * quality versus risk, independent of the player's match rating.
 * 
 * The efficiency score evaluates:
 * - Positive relevant actions (goals, assists, key passes, defensive actions, duels won)
 * - Risk actions (pass errors, dribble errors, possession lost, duels lost, fouls)
 * 
 * Classification:
 * - 🟢 Alta eficiência (High efficiency): ratio >= 2.0
 * - 🟡 Eficiência média (Medium efficiency): ratio >= 0.8 && < 2.0
 * - 🔴 Baixa eficiência (Low efficiency): ratio < 0.8
 * 
 * Volume does NOT mean efficiency - this is a quality/risk ratio.
 */

import type { PlayerStatsInput } from "./matchRatingEngine";

// Efficiency classification levels
export type EfficiencyLevel = "high" | "medium" | "low";

export interface MatchEfficiencyResult {
  level: EfficiencyLevel;
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
  borderColor: string;
  ratio: number;
  positiveActions: number;
  riskActions: number;
  description: string;
}

/**
 * Calculate positive relevant actions
 * These are actions that contribute positively to the team's performance
 */
function getPositiveActions(stats: PlayerStatsInput): number {
  const goals = stats.goals;
  const assists = stats.assists;
  const keyPasses = stats.key_passes;
  const chancesCreated = stats.chances_created;
  const tackles = stats.tackles;
  const interceptions = stats.interceptions;
  const clearances = stats.clearances;
  const shotsBlocked = stats.shots_blocked ?? 0;
  const dribblesSuccess = stats.dribbles_success;
  
  // Duels won (ground + aerial)
  const groundDuelsWon = stats.duels_won;
  const aerialDuelsWon = stats.aerial_duels_won;
  
  return (
    goals +
    assists +
    keyPasses +
    chancesCreated +
    tackles +
    interceptions +
    clearances +
    shotsBlocked +
    dribblesSuccess +
    groundDuelsWon +
    aerialDuelsWon
  );
}

/**
 * Calculate risk actions
 * These are actions that represent technical errors or defensive failures
 */
function getRiskActions(stats: PlayerStatsInput): number {
  // Pass errors (failed passes)
  const passErrors = Math.max(0, stats.passes_total - stats.passes_completed);
  
  // Dribble errors
  const dribbleErrors = Math.max(0, stats.dribbles_total - stats.dribbles_success);
  
  // Possession lost
  const possessionLost = stats.possession_lost;
  
  // Duels lost (ground + aerial)
  const groundDuelsLost = Math.max(0, stats.duels_total - stats.duels_won);
  const aerialDuelsLost = Math.max(0, stats.aerial_duels_total - stats.aerial_duels_won);
  
  // Dribbled past (defensive failure)
  const timesDribbledPast = stats.times_dribbled_past ?? 0;
  
  // Fouls committed
  const foulsCommitted = stats.fouls_committed;
  
  return (
    passErrors +
    dribbleErrors +
    possessionLost +
    groundDuelsLost +
    aerialDuelsLost +
    timesDribbledPast +
    foulsCommitted
  );
}

/**
 * Classify efficiency based on positive/risk ratio
 * 
 * Thresholds designed for professional scouting standards:
 * - High: positive actions are at least 2x the risk actions
 * - Medium: positive actions are at least 0.8x the risk actions
 * - Low: more risk than positive contribution
 */
function classifyEfficiency(ratio: number): EfficiencyLevel {
  if (ratio >= 2.0) return "high";
  if (ratio >= 0.8) return "medium";
  return "low";
}

/**
 * Generate description based on efficiency level and stats
 */
function generateDescription(
  level: EfficiencyLevel,
  positiveActions: number,
  riskActions: number
): string {
  switch (level) {
    case "high":
      return `Jogo seguro e de qualidade. ${positiveActions} ações positivas com apenas ${riskActions} de risco.`;
    case "medium":
      return `Participação equilibrada com risco moderado. ${positiveActions} contribuições contra ${riskActions} ações de risco.`;
    case "low":
      return `Alto volume de erros comparado às contribuições. ${riskActions} ações de risco versus ${positiveActions} positivas.`;
  }
}

/**
 * Get styling configuration for efficiency level
 */
function getEfficiencyStyle(level: EfficiencyLevel): {
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (level) {
    case "high":
      return {
        label: "Alta eficiência",
        labelShort: "Alta",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/15",
        borderColor: "border-emerald-500/30",
      };
    case "medium":
      return {
        label: "Eficiência média",
        labelShort: "Média",
        color: "text-amber-400",
        bgColor: "bg-amber-500/15",
        borderColor: "border-amber-500/30",
      };
    case "low":
      return {
        label: "Baixa eficiência",
        labelShort: "Baixa",
        color: "text-red-400",
        bgColor: "bg-red-500/15",
        borderColor: "border-red-500/30",
      };
  }
}

/**
 * Main function to calculate match efficiency
 * 
 * @param stats - Player stats from the match
 * @param minutesPlayed - Minutes played (used for minimum threshold)
 * @returns MatchEfficiencyResult with classification and details
 */
export function calculateMatchEfficiency(
  stats: PlayerStatsInput,
  minutesPlayed: number
): MatchEfficiencyResult {
  // Minimum minutes to have a valid efficiency score
  const MIN_MINUTES = 10;
  
  const positiveActions = getPositiveActions(stats);
  const riskActions = getRiskActions(stats);
  
  // Handle edge cases
  // If player didn't play enough, default to medium
  if (minutesPlayed < MIN_MINUTES) {
    return {
      level: "medium",
      label: "Tempo insuficiente",
      labelShort: "—",
      color: "text-zinc-400",
      bgColor: "bg-zinc-500/15",
      borderColor: "border-zinc-500/30",
      ratio: 0,
      positiveActions,
      riskActions,
      description: "Tempo de jogo insuficiente para avaliação de eficiência.",
    };
  }
  
  // If no risk actions, efficiency is high (perfect)
  if (riskActions === 0) {
    if (positiveActions === 0) {
      // No actions at all - low impact but no errors
      return {
        level: "medium",
        label: "Sem ações relevantes",
        labelShort: "—",
        color: "text-zinc-400",
        bgColor: "bg-zinc-500/15",
        borderColor: "border-zinc-500/30",
        ratio: 0,
        positiveActions: 0,
        riskActions: 0,
        description: "Jogador sem ações significativas registradas na partida.",
      };
    }
    // Perfect efficiency - only positive actions
    const style = getEfficiencyStyle("high");
    return {
      level: "high",
      ...style,
      ratio: Infinity,
      positiveActions,
      riskActions: 0,
      description: `Jogo impecável. ${positiveActions} ações positivas sem nenhum erro técnico.`,
    };
  }
  
  // Calculate ratio
  const ratio = positiveActions / riskActions;
  const level = classifyEfficiency(ratio);
  const style = getEfficiencyStyle(level);
  const description = generateDescription(level, positiveActions, riskActions);
  
  return {
    level,
    ...style,
    ratio: Math.round(ratio * 100) / 100,
    positiveActions,
    riskActions,
    description,
  };
}

/**
 * Get efficiency color for PDF rendering (hex codes)
 */
export function getEfficiencyColorHex(level: EfficiencyLevel): string {
  switch (level) {
    case "high":
      return "#34d399"; // emerald-400
    case "medium":
      return "#fbbf24"; // amber-400
    case "low":
      return "#f87171"; // red-400
    default:
      return "#a1a1aa"; // zinc-400
  }
}

/**
 * Get efficiency background color for PDF rendering (hex codes)
 */
export function getEfficiencyBgColorHex(level: EfficiencyLevel): string {
  switch (level) {
    case "high":
      return "#10b98126"; // emerald with alpha
    case "medium":
      return "#f59e0b26"; // amber with alpha
    case "low":
      return "#ef444426"; // red with alpha
    default:
      return "#71717a26"; // zinc with alpha
  }
}
