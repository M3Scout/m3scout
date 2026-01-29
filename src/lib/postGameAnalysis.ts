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
  // CRITICAL FIX: If player has 0 minutes, return empty heatmap
  // This prevents false heatmaps for players who never entered the field
  if (minutesPlayed <= 0) {
    return {
      zones: { defense: 0, midfield: 0, attack: 0 },
      percentages: { defense: 0, midfield: 0, attack: 0 },
      primaryZone: "midfield" as FieldZone,
      intensities: { defense: "low", midfield: "low", attack: "low" },
    };
  }

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
// 2. QUICK INDICATORS ENGINE (v2 - Specific Format)
// ============================================

/**
 * Micro-indicator for compact display
 */
export interface MicroIndicator {
  id: string;
  label: string;
  /** Format: "16/20 (80%)" or "4/6" or "—" */
  value: string;
  numerator: number;
  denominator: number;
  percentage: number | null;
  type: "positive" | "neutral" | "negative";
  icon: string;
}

/**
 * Generate exactly 4 micro-indicators in the requested format
 * - Eficiência de passes: passes_certos / total → "16/20 (80%)"
 * - Eficiência no drible: dribles_certos / tentados → "4/6"
 * - Duelo físico: duelos_ganhos / total → "6/9"
 * - Segurança na posse: perdas / ações → "3/18"
 */
export function generateQuickIndicators(
  stats: MatchStatsInput,
  minutesPlayed: number,
  position: string
): QuickIndicator[] {
  const indicators: QuickIndicator[] = [];
  
  // 1. Eficiência de Passes: passes_certos / total
  // NOTE: Caller (PostGameInsightsCard) already normalizes data and passes
  // passes_total as the REAL total (completed + failed). Trust that value directly.
  const passesCompleted = stats.passes_completed ?? 0;
  const passesTotal = stats.passes_total ?? 0; // Already normalized to real total by caller
  
  if (passesTotal > 0) {
    // Safety: percentage can never exceed 100%
    const passPercentage = Math.min(100, Math.round((passesCompleted / passesTotal) * 100));
    indicators.push({
      id: "pass_efficiency",
      label: "Eficiência de Passes",
      value: `${passesCompleted}/${passesTotal} (${passPercentage}%)`,
      type: passPercentage >= 80 ? "positive" : passPercentage >= 65 ? "neutral" : "negative",
      icon: "📤",
    });
  } else {
    indicators.push({
      id: "pass_efficiency",
      label: "Eficiência de Passes",
      value: "—",
      type: "neutral",
      icon: "📤",
    });
  }
  
  // 2. Eficiência no Drible: dribles_certos / total
  // NOTE: Caller already normalizes data and passes dribbles_total as the REAL total
  const dribblesSuccess = stats.dribbles_success ?? 0;
  const dribblesTotal = stats.dribbles_total ?? 0; // Already normalized to real total by caller
  
  if (dribblesTotal > 0) {
    // Safety: percentage can never exceed 100%
    const dribblePercentage = Math.min(100, Math.round((dribblesSuccess / dribblesTotal) * 100));
    indicators.push({
      id: "dribble_efficiency",
      label: "Eficiência no Drible",
      value: `${dribblesSuccess}/${dribblesTotal}`,
      type: dribblePercentage >= 60 ? "positive" : dribblePercentage >= 40 ? "neutral" : "negative",
      icon: "👟",
    });
  } else {
    indicators.push({
      id: "dribble_efficiency",
      label: "Eficiência no Drible",
      value: "—",
      type: "neutral",
      icon: "👟",
    });
  }
  
  // 3. Duelo Físico: duelos_ganhos / total
  // NOTE: Caller already normalizes data and passes duels_total as the REAL total
  const duelsWon = stats.duels_won ?? 0;
  const duelsTotal = stats.duels_total ?? 0; // Already normalized to real total by caller
  const aerialWon = stats.aerial_duels_won ?? 0;
  const aerialTotal = stats.aerial_duels_total ?? 0; // Already normalized to real total by caller
  
  // Combine all duels
  const totalDuelsWon = duelsWon + aerialWon;
  const totalDuelsPlayed = duelsTotal + aerialTotal;
  
  if (totalDuelsPlayed > 0) {
    // Safety: percentage can never exceed 100%
    const duelPercentage = Math.min(100, Math.round((totalDuelsWon / totalDuelsPlayed) * 100));
    indicators.push({
      id: "duel_efficiency",
      label: "Duelo Físico",
      value: `${totalDuelsWon}/${totalDuelsPlayed}`,
      type: duelPercentage >= 55 ? "positive" : duelPercentage >= 40 ? "neutral" : "negative",
      icon: "💪",
    });
  } else {
    indicators.push({
      id: "duel_efficiency",
      label: "Duelo Físico",
      value: "—",
      type: "neutral",
      icon: "💪",
    });
  }
  
  // 4. Segurança na Posse: perdas_de_posse / ações_com_a_bola
  const possessionLost = stats.possession_lost ?? 0;
  const ballActions = stats.ball_actions ?? 0;
  
  // Fallback: perdas / (passes_total + dribles_total)
  let posseDenom = ballActions;
  if (posseDenom === 0) {
    posseDenom = passesTotal + dribblesTotal;
  }
  
  if (posseDenom > 0) {
    const lossRate = Math.round((possessionLost / posseDenom) * 100);
    indicators.push({
      id: "possession_security",
      label: "Segurança na Posse",
      value: `${possessionLost}/${posseDenom}`,
      // Lower loss rate = better
      type: lossRate <= 15 ? "positive" : lossRate <= 25 ? "neutral" : "negative",
      icon: "🔒",
    });
  } else {
    indicators.push({
      id: "possession_security",
      label: "Segurança na Posse",
      value: "—",
      type: "neutral",
      icon: "🔒",
    });
  }
  
  // Return exactly 4 indicators
  return indicators.slice(0, 4);
}

// ============================================
// 3. STRENGTHS / IMPROVEMENTS ENGINE (v2 - Professional)
// ============================================

/**
 * Generate professional, neutral bullet points for strengths and improvements
 * - 2-3 bullets max per section
 * - Technical language, no emotional tones
 * - Based on thresholds and context
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
  const isDefender = positionGroup === "defender" || positionGroup === "fullback";
  const isAttacker = positionGroup === "attacker";
  
  // Min minutes for reliable analysis
  if (minutesPlayed < 15) {
    return {
      strengths: [],
      improvements: [],
      summary: "Tempo de jogo insuficiente para análise completa.",
    };
  }
  
  // === CALCULATED METRICS ===
  // NOTE: Caller (PostGameInsightsCard) already normalizes data:
  // - passes_total is already the REAL total (completed + failed)
  // - dribbles_total is already the REAL total (success + failed)
  // - duels_total is already the REAL total (won + lost)
  const passesCompleted = stats.passes_completed ?? 0;
  const passesTotal = stats.passes_total ?? 0; // Already normalized
  const passAccuracy = passesTotal > 0 ? Math.min(100, (passesCompleted / passesTotal) * 100) : 0;
  
  const dribblesSuccess = stats.dribbles_success ?? 0;
  const dribblesTotal = stats.dribbles_total ?? 0; // Already normalized
  const dribbleAccuracy = dribblesTotal > 0 ? Math.min(100, (dribblesSuccess / dribblesTotal) * 100) : 0;
  
  const defensiveActions = 
    (stats.tackles ?? 0) + 
    (stats.interceptions ?? 0) + 
    (stats.recoveries ?? 0) +
    (stats.blocked_shots ?? 0);
  
  const offensiveActions =
    (stats.shots ?? 0) +
    (stats.chances_created ?? 0) +
    (stats.key_passes ?? 0) +
    (stats.crosses_success ?? 0);
    
  const crossesSuccess = stats.crosses_success ?? 0;
  const crossesFailed = stats.crosses_failed ?? 0;
  const crossesTotal = crossesSuccess + crossesFailed;
  const crossAccuracy = crossesTotal > 0 ? Math.min(100, (crossesSuccess / crossesTotal) * 100) : 0;
  
  // Duels: already normalized to real totals
  const duelsWon = stats.duels_won ?? 0;
  const duelsTotal = stats.duels_total ?? 0; // Already normalized
  const aerialDuelsWon = stats.aerial_duels_won ?? 0;
  const aerialDuelsTotal = stats.aerial_duels_total ?? 0; // Already normalized
  const totalDuelsWon = duelsWon + aerialDuelsWon;
  const totalDuelsPlayed = duelsTotal + aerialDuelsTotal;
  const duelRate = totalDuelsPlayed > 0 ? Math.min(100, (totalDuelsWon / totalDuelsPlayed) * 100) : 0;
  
  const possessionLost = stats.possession_lost ?? 0;
  const ballActions = stats.ball_actions ?? 0;
  const lossRate = ballActions > 0 ? (possessionLost / ballActions) * 100 : 0;
  
  // === STRENGTHS ANALYSIS (max 3) ===
  
  // Goal involvement
  const goals = stats.goals ?? 0;
  const assists = stats.assists ?? 0;
  if (goals >= 1 && assists >= 1) {
    strengths.push("Participação decisiva: gol e assistência na partida");
  } else if (goals >= 1) {
    strengths.push("Contribuição ofensiva direta com gol marcado");
  } else if (assists >= 1) {
    strengths.push("Visão de jogo: criou gol com assistência");
  }
  
  // High pass accuracy (>= 80% with volume)
  if (passesTotal >= 15 && passAccuracy >= 80) {
    strengths.push("Alta precisão nos passes, circulação segura de bola");
  }
  
  // Strong defensive presence (for defenders/mids)
  if (defensiveActions >= 5 && (isDefender || positionGroup === "defensive_mid")) {
    strengths.push("Sólida presença defensiva com ações de recuperação");
  } else if (defensiveActions >= 7) {
    strengths.push("Contribuição defensiva relevante para a posição");
  }
  
  // Good dribbling (>= 60% with attempts)
  if (dribblesTotal >= 3 && dribbleAccuracy >= 60) {
    strengths.push("Eficiência nos dribles, progressão individual de qualidade");
  }
  
  // Creative output
  const creativity = (stats.key_passes ?? 0) + (stats.chances_created ?? 0);
  if (creativity >= 3) {
    strengths.push("Capacidade criativa: gerou múltiplas oportunidades de gol");
  }
  
  // Duel dominance
  if (totalDuelsPlayed >= 5 && duelRate >= 60) {
    strengths.push("Domínio nos duelos, impôs superioridade física");
  }
  
  // GK specific
  if (isGK) {
    const saves = stats.saves ?? 0;
    const goalsConceded = stats.goals_conceded ?? 0;
    if (goalsConceded === 0 && minutesPlayed >= 45) {
      strengths.push("Meta mantida sem sofrer gols (clean sheet)");
    } else if (saves >= 4) {
      strengths.push("Boas defesas, participação ativa na proteção do gol");
    }
  }
  
  // Crossing efficiency (for fullbacks/wingers)
  if ((positionGroup === "fullback" || isAttacker) && crossesTotal >= 3 && crossAccuracy >= 50) {
    strengths.push("Cruzamentos com boa taxa de acerto");
  }
  
  // === IMPROVEMENTS ANALYSIS (max 3) ===
  
  // Low pass accuracy (< 70% with volume)
  if (passesTotal >= 10 && passAccuracy < 70) {
    improvements.push("Precisão nos passes abaixo do esperado para o volume");
  }
  
  // High possession loss
  if (possessionLost >= 5 || (ballActions > 0 && lossRate > 25)) {
    improvements.push("Perdas de posse frequentes, maior cuidado na transição");
  }
  
  // Poor dribbling efficiency
  if (dribblesTotal >= 3 && dribbleAccuracy < 40) {
    improvements.push("Tentativas de drible com baixa taxa de sucesso");
  }
  
  // Lost duels
  if (totalDuelsPlayed >= 4 && duelRate < 40) {
    improvements.push("Dificuldade nos duelos, melhorar posicionamento/timing");
  }
  
  // Poor crossing (for fullbacks/wingers)
  if ((positionGroup === "fullback" || isAttacker) && crossesTotal >= 3 && crossAccuracy < 35) {
    improvements.push("Cruzamentos com baixa precisão, ajustar qualidade");
  }
  
  // Being dribbled past (for defenders)
  const wasDribbled = stats.was_dribbled ?? 0;
  if (isDefender && wasDribbled >= 3) {
    improvements.push("Superado em dribles, atenção ao posicionamento defensivo");
  }
  
  // Too many fouls
  const foulsCommitted = stats.fouls_committed ?? 0;
  if (foulsCommitted >= 3) {
    improvements.push("Número de faltas acima do ideal, controle nas disputas");
  }
  
  // Cards
  const yellows = stats.yellow_cards ?? 0;
  const reds = stats.red_cards ?? 0;
  if (reds > 0) {
    improvements.push("Expulsão comprometeu a equipe, controle emocional necessário");
  } else if (yellows >= 1 && improvements.length < 3) {
    improvements.push("Cartão amarelo recebido, atenção à disciplina");
  }
  
  // Poor finishing (for attackers)
  const shots = stats.shots ?? 0;
  const shotsOnTarget = stats.shots_on_target ?? 0;
  if (isAttacker && shots >= 3 && (shotsOnTarget / shots) < 0.33) {
    improvements.push("Finalizações sem direção ao gol, calibrar pontaria");
  }
  
  // Low offensive presence (context-sensitive)
  if (isAttacker && offensiveActions <= 2 && minutesPlayed >= 30) {
    improvements.push("Pouca participação ofensiva para a posição");
  }
  
  // GK specific
  if (isGK) {
    const goalsConceded = stats.goals_conceded ?? 0;
    if (goalsConceded >= 3) {
      improvements.push("Múltiplos gols sofridos, revisar posicionamento");
    }
  }
  
  // === GENERATE SUMMARY ===
  
  let summary = "";
  
  if (strengths.length >= 2 && improvements.length === 0) {
    summary = "Desempenho consistente sem pontos negativos relevantes.";
  } else if (strengths.length === 0 && improvements.length >= 2) {
    summary = "Atuação abaixo do esperado, com aspectos a desenvolver.";
  } else if (strengths.length > 0 && improvements.length > 0) {
    summary = "Atuação mista: pontos positivos e áreas de melhoria identificadas.";
  } else if (strengths.length === 0 && improvements.length === 0) {
    summary = "Participação discreta, sem destaques significativos.";
  } else {
    summary = "Análise parcial baseada nos dados disponíveis.";
  }
  
  return {
    strengths: strengths.slice(0, 3), // Max 3 strengths
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
