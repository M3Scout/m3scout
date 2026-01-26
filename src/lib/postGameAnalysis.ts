/**
 * Post-Game Analysis Engine
 * 
 * Generates derived insights for finished matches:
 * 1. Zone Heatmap - player field zone distribution based on position + actions
 * 2. Quick Indicators - micro-insights from match stats
 * 3. Strengths / Areas to Improve - automatic text generation
 * 
 * Rules:
 * - All data is DERIVED from existing stats (no new DB columns)
 * - Does NOT affect player rating
 * - Only shown when match is finished/applied
 */

import { getPositionGroup, type PositionGroup } from "./scoutingTextEngine";

// ============================================
// TYPES
// ============================================

export type FieldZone = "defense" | "midfield" | "attack";

export interface ZoneDistribution {
  defense: number;
  midfield: number;
  attack: number;
}

export interface ZoneHeatmapResult {
  zones: ZoneDistribution;
  percentages: ZoneDistribution;
  primaryZone: FieldZone;
  intensities: Record<FieldZone, "low" | "medium" | "high">;
}

export interface QuickIndicator {
  id: string;
  label: string;
  value: string | number;
  type: "positive" | "neutral" | "negative";
  icon: string;
}

export interface StrengthsImprovements {
  strengths: string[];
  improvements: string[];
  summary: string;
}

// Stats input (matches match_player_stats structure)
export interface MatchStatsInput {
  goals?: number;
  assists?: number;
  shots?: number;
  shots_on_target?: number;
  key_passes?: number;
  chances_created?: number;
  passes_completed?: number;
  passes_total?: number;
  dribbles_success?: number;
  dribbles_total?: number;
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  recoveries?: number;
  duels_won?: number;
  duels_total?: number;
  aerial_duels_won?: number;
  aerial_duels_total?: number;
  fouls_committed?: number;
  fouls_suffered?: number;
  yellow_cards?: number;
  red_cards?: number;
  possession_lost?: number;
  saves?: number;
  goals_conceded?: number;
  blocked_shots?: number;
  was_dribbled?: number;
  ball_actions?: number;
  crosses_success?: number;
  crosses_failed?: number;
  offsides?: number;
  shots_blocked?: number;
}

// ============================================
// 1. ZONE HEATMAP ENGINE
// ============================================

/**
 * Base zone weights by position category
 */
const POSITION_BASE_ZONES: Record<PositionGroup, ZoneDistribution> = {
  goalkeeper: { defense: 10, midfield: 1, attack: 0 },
  defender: { defense: 7, midfield: 2, attack: 1 },
  fullback: { defense: 4, midfield: 4, attack: 2 },
  defensive_mid: { defense: 3, midfield: 6, attack: 1 },
  midfielder: { defense: 2, midfield: 5, attack: 3 },
  attacker: { defense: 1, midfield: 3, attack: 6 },
};

/**
 * Calculate zone distribution based on position + actions
 */
export function calculateZoneHeatmap(
  position: string,
  stats: MatchStatsInput,
  minutesPlayed: number
): ZoneHeatmapResult {
  const positionGroup = getPositionGroup(position);
  
  // Start with base zone weights from position
  const zones: ZoneDistribution = { ...POSITION_BASE_ZONES[positionGroup] };
  
  // === DEFENSIVE ACTIONS (add to DEFENSE) ===
  const defensiveActions = [
    { value: stats.tackles ?? 0, weight: 1 },
    { value: stats.interceptions ?? 0, weight: 1 },
    { value: stats.clearances ?? 0, weight: 1 },
    { value: stats.recoveries ?? 0, weight: 0.8 },
    { value: stats.blocked_shots ?? 0, weight: 1 }, // Defensive blocked shot
    { value: stats.aerial_duels_won ?? 0, weight: 0.5 },
    // Negative actions still indicate defensive presence (lower weight)
    { value: stats.was_dribbled ?? 0, weight: 0.3 },
    { value: stats.fouls_committed ?? 0, weight: 0.3 },
  ];
  
  defensiveActions.forEach(({ value, weight }) => {
    zones.defense += value * weight;
  });
  
  // === CONSTRUCTION / MIDFIELD ACTIONS ===
  const midfieldActions = [
    { value: stats.passes_completed ?? 0, weight: 0.1 }, // Each pass adds a bit to midfield
    { value: stats.key_passes ?? 0, weight: 0.5 },
    { value: stats.chances_created ?? 0, weight: 0.5 },
    { value: stats.ball_actions ?? 0, weight: 0.3 },
    // Duels in general suggest midfield presence
    { value: stats.duels_won ?? 0, weight: 0.3 },
  ];
  
  midfieldActions.forEach(({ value, weight }) => {
    zones.midfield += value * weight;
    // Also add a small portion to base zone
    zones[getBaseZone(positionGroup)] += value * (weight * 0.3);
  });
  
  // === OFFENSIVE ACTIONS (add to ATTACK) ===
  const offensiveActions = [
    { value: stats.goals ?? 0, weight: 2 },
    { value: stats.assists ?? 0, weight: 1.5 },
    { value: stats.shots ?? 0, weight: 1 },
    { value: stats.shots_on_target ?? 0, weight: 1 },
    { value: stats.shots_blocked ?? 0, weight: 0.8 }, // Offensive shot blocked
    { value: stats.dribbles_success ?? 0, weight: 0.6 },
    { value: stats.dribbles_total ?? 0, weight: 0.3 },
    { value: stats.crosses_success ?? 0, weight: 0.7 },
    { value: stats.crosses_failed ?? 0, weight: 0.3 },
    { value: stats.offsides ?? 0, weight: 0.5 }, // Offsides indicate attacking presence
  ];
  
  offensiveActions.forEach(({ value, weight }) => {
    zones.attack += value * weight;
    // Also add to base zone for player position
    zones[getBaseZone(positionGroup)] += value * (weight * 0.3);
  });
  
  // === GOALKEEPER SPECIFIC ===
  if (positionGroup === "goalkeeper") {
    zones.defense += (stats.saves ?? 0) * 1.5;
    zones.defense += (stats.goals_conceded ?? 0) * 0.5;
  }
  
  // Calculate total and percentages
  const total = zones.defense + zones.midfield + zones.attack;
  const percentages: ZoneDistribution = {
    defense: total > 0 ? Math.round((zones.defense / total) * 100) : 0,
    midfield: total > 0 ? Math.round((zones.midfield / total) * 100) : 0,
    attack: total > 0 ? Math.round((zones.attack / total) * 100) : 0,
  };
  
  // Ensure percentages sum to 100
  const diff = 100 - (percentages.defense + percentages.midfield + percentages.attack);
  if (diff !== 0) {
    // Add difference to highest zone
    const maxZone = Object.entries(percentages)
      .sort((a, b) => b[1] - a[1])[0][0] as FieldZone;
    percentages[maxZone] += diff;
  }
  
  // Determine primary zone
  const primaryZone = Object.entries(zones)
    .sort((a, b) => b[1] - a[1])[0][0] as FieldZone;
  
  // Calculate intensities based on percentage thresholds
  const intensities: Record<FieldZone, "low" | "medium" | "high"> = {
    defense: getIntensity(percentages.defense),
    midfield: getIntensity(percentages.midfield),
    attack: getIntensity(percentages.attack),
  };
  
  return { zones, percentages, primaryZone, intensities };
}

function getBaseZone(positionGroup: PositionGroup): FieldZone {
  switch (positionGroup) {
    case "goalkeeper":
    case "defender":
      return "defense";
    case "fullback":
    case "defensive_mid":
    case "midfielder":
      return "midfield";
    case "attacker":
      return "attack";
    default:
      return "midfield";
  }
}

function getIntensity(percentage: number): "low" | "medium" | "high" {
  if (percentage >= 45) return "high";
  if (percentage >= 25) return "medium";
  return "low";
}

// ============================================
// 2. QUICK INDICATORS ENGINE
// ============================================

/**
 * Generate quick micro-insights from stats
 */
export function generateQuickIndicators(
  stats: MatchStatsInput,
  minutesPlayed: number,
  position: string
): QuickIndicator[] {
  const indicators: QuickIndicator[] = [];
  const positionGroup = getPositionGroup(position);
  const isGK = positionGroup === "goalkeeper";
  
  // === OFFENSIVE INDICATORS ===
  
  // Goal involvement (G+A)
  const goalInvolvement = (stats.goals ?? 0) + (stats.assists ?? 0);
  if (goalInvolvement > 0) {
    indicators.push({
      id: "goal_involvement",
      label: "Participação em Gols",
      value: goalInvolvement,
      type: "positive",
      icon: "⚽",
    });
  }
  
  // Shot efficiency
  const shots = stats.shots ?? 0;
  const shotsOnTarget = stats.shots_on_target ?? 0;
  const goals = stats.goals ?? 0;
  if (shots > 0) {
    const accuracy = Math.round((shotsOnTarget / shots) * 100);
    indicators.push({
      id: "shot_accuracy",
      label: "Precisão de Finalizações",
      value: `${accuracy}%`,
      type: accuracy >= 50 ? "positive" : accuracy >= 25 ? "neutral" : "negative",
      icon: "🎯",
    });
  }
  
  // Conversion rate (goals / shots)
  if (shots >= 3 && goals > 0) {
    const conversion = Math.round((goals / shots) * 100);
    indicators.push({
      id: "conversion",
      label: "Taxa de Conversão",
      value: `${conversion}%`,
      type: conversion >= 25 ? "positive" : "neutral",
      icon: "📊",
    });
  }
  
  // === PASSING INDICATORS ===
  
  const passesCompleted = stats.passes_completed ?? 0;
  const passesTotal = stats.passes_total ?? 0;
  if (passesTotal > 0) {
    const passAccuracy = Math.round((passesCompleted / passesTotal) * 100);
    indicators.push({
      id: "pass_accuracy",
      label: "Precisão de Passes",
      value: `${passAccuracy}%`,
      type: passAccuracy >= 85 ? "positive" : passAccuracy >= 70 ? "neutral" : "negative",
      icon: "📤",
    });
  }
  
  // Key passes + chances created
  const creativity = (stats.key_passes ?? 0) + (stats.chances_created ?? 0);
  if (creativity >= 2) {
    indicators.push({
      id: "creativity",
      label: "Ações Criativas",
      value: creativity,
      type: "positive",
      icon: "💡",
    });
  }
  
  // === DRIBBLING INDICATORS ===
  
  const dribblesSuccess = stats.dribbles_success ?? 0;
  const dribblesTotal = stats.dribbles_total ?? 0;
  if (dribblesTotal >= 2) {
    const dribbleRate = Math.round((dribblesSuccess / dribblesTotal) * 100);
    indicators.push({
      id: "dribble_success",
      label: "Eficiência em Dribles",
      value: `${dribbleRate}%`,
      type: dribbleRate >= 60 ? "positive" : dribbleRate >= 40 ? "neutral" : "negative",
      icon: "👟",
    });
  }
  
  // === DEFENSIVE INDICATORS ===
  
  const defensiveActions = 
    (stats.tackles ?? 0) + 
    (stats.interceptions ?? 0) + 
    (stats.clearances ?? 0) + 
    (stats.recoveries ?? 0) +
    (stats.blocked_shots ?? 0);
  
  if (defensiveActions >= 3) {
    indicators.push({
      id: "defensive_actions",
      label: "Ações Defensivas",
      value: defensiveActions,
      type: "positive",
      icon: "🛡️",
    });
  }
  
  // Duel success rate
  const duelsWon = stats.duels_won ?? 0;
  const duelsTotal = stats.duels_total ?? 0;
  if (duelsTotal >= 3) {
    const duelRate = Math.round((duelsWon / duelsTotal) * 100);
    indicators.push({
      id: "duel_rate",
      label: "Duelos Ganhos",
      value: `${duelRate}%`,
      type: duelRate >= 55 ? "positive" : duelRate >= 40 ? "neutral" : "negative",
      icon: "💪",
    });
  }
  
  // === RISK INDICATORS ===
  
  const possessionLost = stats.possession_lost ?? 0;
  if (possessionLost >= 4) {
    indicators.push({
      id: "possession_lost",
      label: "Perdas de Posse",
      value: possessionLost,
      type: possessionLost >= 7 ? "negative" : "neutral",
      icon: "⚠️",
    });
  }
  
  const wasDribbled = stats.was_dribbled ?? 0;
  if (wasDribbled >= 2) {
    indicators.push({
      id: "was_dribbled",
      label: "Vezes Driblado",
      value: wasDribbled,
      type: wasDribbled >= 4 ? "negative" : "neutral",
      icon: "💨",
    });
  }
  
  // === GOALKEEPER INDICATORS ===
  
  if (isGK) {
    const saves = stats.saves ?? 0;
    const goalsConceded = stats.goals_conceded ?? 0;
    
    if (saves > 0 || goalsConceded > 0) {
      const saveRate = saves + goalsConceded > 0 
        ? Math.round((saves / (saves + goalsConceded)) * 100)
        : 0;
      indicators.push({
        id: "save_rate",
        label: "Taxa de Defesas",
        value: `${saveRate}%`,
        type: saveRate >= 70 ? "positive" : saveRate >= 50 ? "neutral" : "negative",
        icon: "🧤",
      });
    }
    
    if (goalsConceded === 0 && minutesPlayed >= 45) {
      indicators.push({
        id: "clean_sheet",
        label: "Clean Sheet",
        value: "✓",
        type: "positive",
        icon: "🏆",
      });
    }
  }
  
  // === DISCIPLINE ===
  
  const yellows = stats.yellow_cards ?? 0;
  const reds = stats.red_cards ?? 0;
  if (yellows > 0 || reds > 0) {
    indicators.push({
      id: "discipline",
      label: "Cartões",
      value: reds > 0 ? `🟥 ${reds}` : `🟨 ${yellows}`,
      type: reds > 0 ? "negative" : "neutral",
      icon: reds > 0 ? "🟥" : "🟨",
    });
  }
  
  // Limit to top 6 indicators
  return indicators.slice(0, 6);
}

// ============================================
// 3. STRENGTHS / IMPROVEMENTS ENGINE
// ============================================

/**
 * Generate automatic strengths and areas to improve
 */
export function generateStrengthsImprovements(
  stats: MatchStatsInput,
  minutesPlayed: number,
  position: string
): StrengthsImprovements {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const positionGroup = getPositionGroup(position);
  const isGK = positionGroup === "goalkeeper";
  
  // Min minutes for reliable analysis
  if (minutesPlayed < 15) {
    return {
      strengths: [],
      improvements: [],
      summary: "Tempo de jogo insuficiente para análise completa.",
    };
  }
  
  // === STRENGTHS ANALYSIS ===
  
  // Goal scorer
  if ((stats.goals ?? 0) >= 1) {
    strengths.push("Finalizador decisivo, marcou gol na partida");
  }
  
  // Playmaker
  if ((stats.assists ?? 0) >= 1) {
    strengths.push("Criou jogadas de gol com assistência(s)");
  }
  
  // High pass accuracy
  const passesTotal = stats.passes_total ?? 0;
  const passesCompleted = stats.passes_completed ?? 0;
  if (passesTotal >= 15 && passesCompleted / passesTotal >= 0.85) {
    strengths.push("Alta precisão nos passes, circulação segura");
  }
  
  // Creative player
  const creativity = (stats.key_passes ?? 0) + (stats.chances_created ?? 0);
  if (creativity >= 3) {
    strengths.push("Criatividade acima da média, gerou oportunidades");
  }
  
  // Good dribbler
  const dribblesSuccess = stats.dribbles_success ?? 0;
  const dribblesTotal = stats.dribbles_total ?? 0;
  if (dribblesTotal >= 3 && dribblesSuccess / dribblesTotal >= 0.6) {
    strengths.push("Eficiente nos dribles, progressão com bola");
  }
  
  // Defensive presence
  const defensiveActions = 
    (stats.tackles ?? 0) + 
    (stats.interceptions ?? 0) + 
    (stats.recoveries ?? 0);
  if (defensiveActions >= 5) {
    strengths.push("Forte presença defensiva, recuperações importantes");
  }
  
  // Aerial dominance
  const aerialWon = stats.aerial_duels_won ?? 0;
  const aerialTotal = stats.aerial_duels_total ?? 0;
  if (aerialTotal >= 3 && aerialWon / aerialTotal >= 0.6) {
    strengths.push("Dominante no jogo aéreo");
  }
  
  // Duel winner
  const duelsWon = stats.duels_won ?? 0;
  const duelsTotal = stats.duels_total ?? 0;
  if (duelsTotal >= 5 && duelsWon / duelsTotal >= 0.6) {
    strengths.push("Alta taxa de sucesso em duelos");
  }
  
  // Clean tackler
  if ((stats.tackles ?? 0) >= 3 && (stats.fouls_committed ?? 0) <= 1) {
    strengths.push("Desarmes limpos, sem cometer faltas");
  }
  
  // GK: Good saves
  if (isGK && (stats.saves ?? 0) >= 3) {
    strengths.push("Bom número de defesas, seguro embaixo das traves");
  }
  
  // GK: Clean sheet
  if (isGK && (stats.goals_conceded ?? 0) === 0 && minutesPlayed >= 45) {
    strengths.push("Manteve a meta sem sofrer gols");
  }
  
  // === IMPROVEMENTS ANALYSIS ===
  
  // Low pass accuracy
  if (passesTotal >= 10 && passesCompleted / passesTotal < 0.70) {
    improvements.push("Melhorar precisão nos passes");
  }
  
  // Poor dribbling
  if (dribblesTotal >= 3 && dribblesSuccess / dribblesTotal < 0.4) {
    improvements.push("Reduzir tentativas de dribles mal sucedidas");
  }
  
  // Too many fouls
  if ((stats.fouls_committed ?? 0) >= 3) {
    improvements.push("Evitar faltas desnecessárias");
  }
  
  // Lost duels
  if (duelsTotal >= 4 && duelsWon / duelsTotal < 0.4) {
    improvements.push("Melhorar desempenho em duelos");
  }
  
  // High possession loss
  if ((stats.possession_lost ?? 0) >= 5) {
    improvements.push("Reduzir perdas de posse de bola");
  }
  
  // Being dribbled past
  if ((stats.was_dribbled ?? 0) >= 3) {
    improvements.push("Melhorar posicionamento defensivo, evitar ser driblado");
  }
  
  // Poor shot accuracy
  const shots = stats.shots ?? 0;
  const shotsOnTarget = stats.shots_on_target ?? 0;
  if (shots >= 3 && shotsOnTarget / shots < 0.33) {
    improvements.push("Melhorar direção das finalizações");
  }
  
  // Cards
  if ((stats.yellow_cards ?? 0) >= 1 || (stats.red_cards ?? 0) >= 1) {
    improvements.push("Controlar agressividade, evitar cartões");
  }
  
  // GK: Conceded goals
  if (isGK && (stats.goals_conceded ?? 0) >= 2) {
    improvements.push("Revisar posicionamento nos gols sofridos");
  }
  
  // === GENERATE SUMMARY ===
  
  let summary = "";
  
  if (strengths.length > 0 && improvements.length === 0) {
    summary = "Atuação sólida sem pontos negativos relevantes.";
  } else if (strengths.length === 0 && improvements.length > 0) {
    summary = "Jogo abaixo do esperado, com pontos a desenvolver.";
  } else if (strengths.length > 0 && improvements.length > 0) {
    summary = "Desempenho com pontos fortes e aspectos a melhorar.";
  } else {
    summary = "Participação discreta, sem destaques significativos.";
  }
  
  return {
    strengths: strengths.slice(0, 4), // Max 4 strengths
    improvements: improvements.slice(0, 3), // Max 3 improvements
    summary,
  };
}

// ============================================
// COMBINED ANALYSIS
// ============================================

export interface PostGameAnalysis {
  zoneHeatmap: ZoneHeatmapResult;
  quickIndicators: QuickIndicator[];
  strengthsImprovements: StrengthsImprovements;
}

/**
 * Generate complete post-game analysis for a player
 */
export function generatePostGameAnalysis(
  position: string,
  stats: MatchStatsInput,
  minutesPlayed: number
): PostGameAnalysis {
  return {
    zoneHeatmap: calculateZoneHeatmap(position, stats, minutesPlayed),
    quickIndicators: generateQuickIndicators(stats, minutesPlayed, position),
    strengthsImprovements: generateStrengthsImprovements(stats, minutesPlayed, position),
  };
}
