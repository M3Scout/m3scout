/**
 * Match Profile Engine - Perfil do Jogo
 * 
 * Camada de LEITURA QUALITATIVA que interpreta o desempenho do jogador
 * com base nas estatísticas do jogo.
 * 
 * NÃO altera a nota. NÃO é subjetivo. NÃO pode inflar o jogador.
 * Reflete IMPACTO, EFICIÊNCIA e RISCO.
 * 
 * Usa linguagem técnica de SCOUT profissional.
 */

import type { PlayerStatsInput } from "./matchRatingEngine";

// === PERFIS DISPONÍVEIS ===
export type MatchProfileKey =
  | "decisive_efficient"        // Decisivo e eficiente
  | "participative_impact"      // Participativo com impacto
  | "participative_no_impact"   // Participativo sem impacto
  | "efficient_low_volume"      // Eficiente sem volume
  | "unproductive_volume"       // Volume improdutivo
  | "defensive_dominant"        // Defensivamente dominante
  | "defensive_consistent"      // Defensivamente consistente
  | "high_defensive_risk"       // Alto risco defensivo
  | "low_general_impact";       // Baixo impacto geral

export interface MatchProfile {
  key: MatchProfileKey;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  priority: number; // Lower = higher priority
}

export interface MatchProfileResult {
  primary: MatchProfile;
  secondary: MatchProfile | null;
  summary: string;
}

// === PROFILE DEFINITIONS ===
const PROFILES: Record<MatchProfileKey, MatchProfile> = {
  decisive_efficient: {
    key: "decisive_efficient",
    label: "Decisivo e eficiente",
    description: "Jogador que fez a diferença com ações de alta efetividade",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/15 border-emerald-500/30",
    priority: 1,
  },
  participative_impact: {
    key: "participative_impact",
    label: "Participativo com impacto",
    description: "Alto volume de ações com contribuição efetiva no jogo",
    color: "text-green-500",
    bgColor: "bg-green-500/15 border-green-500/30",
    priority: 2,
  },
  defensive_dominant: {
    key: "defensive_dominant",
    label: "Defensivamente dominante",
    description: "Presença defensiva decisiva com alto volume de ações positivas",
    color: "text-blue-500",
    bgColor: "bg-blue-500/15 border-blue-500/30",
    priority: 3,
  },
  defensive_consistent: {
    key: "defensive_consistent",
    label: "Defensivamente consistente",
    description: "Desempenho defensivo sólido sem erros relevantes",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/15 border-cyan-500/30",
    priority: 4,
  },
  efficient_low_volume: {
    key: "efficient_low_volume",
    label: "Eficiente sem volume",
    description: "Poucas ações, mas com boa taxa de acerto",
    color: "text-amber-500",
    bgColor: "bg-amber-500/15 border-amber-500/30",
    priority: 5,
  },
  participative_no_impact: {
    key: "participative_no_impact",
    label: "Participativo sem impacto",
    description: "Alto volume de ações sem contribuição decisiva",
    color: "text-orange-500",
    bgColor: "bg-orange-500/15 border-orange-500/30",
    priority: 6,
  },
  unproductive_volume: {
    key: "unproductive_volume",
    label: "Volume improdutivo",
    description: "Muitas ações com baixa efetividade e erros frequentes",
    color: "text-red-400",
    bgColor: "bg-red-500/15 border-red-500/30",
    priority: 7,
  },
  high_defensive_risk: {
    key: "high_defensive_risk",
    label: "Alto risco defensivo",
    description: "Perdas de posse, dribles errados ou driblado com frequência",
    color: "text-red-500",
    bgColor: "bg-red-600/15 border-red-600/30",
    priority: 8,
  },
  low_general_impact: {
    key: "low_general_impact",
    label: "Baixo impacto geral",
    description: "Poucas ações no jogo, sem contribuição significativa",
    color: "text-zinc-500",
    bgColor: "bg-zinc-500/15 border-zinc-500/30",
    priority: 9,
  },
};

// === THRESHOLDS ===
const THRESHOLDS = {
  // Impacto ofensivo
  hasGoalOrAssist: (s: PlayerStatsInput) => s.goals > 0 || s.assists > 0,
  
  // Criatividade com eficiência
  isCreativeEfficient: (s: PlayerStatsInput) => {
    const creativePasses = s.key_passes + s.chances_created;
    const passErrors = s.passes_total - s.passes_completed;
    return creativePasses >= 2 && passErrors <= 3;
  },
  
  // Volume de ações (total de ações relevantes)
  getTotalActions: (s: PlayerStatsInput) => {
    return s.goals + s.assists + s.shots + s.key_passes + s.chances_created +
           s.dribbles_total + s.passes_total + s.tackles + s.interceptions +
           s.clearances + s.recoveries + s.duels_total;
  },
  
  // Ações defensivas
  getDefensiveActions: (s: PlayerStatsInput) => {
    return s.tackles + s.interceptions + s.clearances + s.recoveries + (s.shots_blocked ?? 0);
  },
  
  // Ações defensivas negativas
  getDefensiveErrors: (s: PlayerStatsInput) => {
    const timesDB = s.times_dribbled_past ?? 0;
    const duelsLost = s.duels_total - s.duels_won;
    return timesDB + (duelsLost > 0 ? Math.floor(duelsLost / 2) : 0);
  },
  
  // Erros técnicos totais
  getTechnicalErrors: (s: PlayerStatsInput) => {
    const passErrors = s.passes_total - s.passes_completed;
    const dribbleErrors = s.dribbles_total - s.dribbles_success;
    return passErrors + dribbleErrors + s.possession_lost;
  },
  
  // Alta eficiência ofensiva
  isHighOffensiveEfficiency: (s: PlayerStatsInput) => {
    if (s.passes_total === 0 && s.dribbles_total === 0) return false;
    const passRate = s.passes_total > 0 ? s.passes_completed / s.passes_total : 0;
    const dribbleRate = s.dribbles_total > 0 ? s.dribbles_success / s.dribbles_total : 0;
    // Média ponderada: passes pesam mais
    const avgRate = s.passes_total > 0 && s.dribbles_total > 0
      ? (passRate * 0.7 + dribbleRate * 0.3)
      : s.passes_total > 0 ? passRate : dribbleRate;
    return avgRate >= 0.75;
  },
  
  // Duelos ganhos %
  getDuelWinRate: (s: PlayerStatsInput) => {
    if (s.duels_total === 0) return 0;
    return s.duels_won / s.duels_total;
  },
};

// === CLASSIFICATION LOGIC ===

export function classifyMatchProfile(
  stats: PlayerStatsInput,
  minutesPlayed: number
): MatchProfileResult {
  // Players with very few minutes can't be properly classified
  if (minutesPlayed < 10) {
    return {
      primary: PROFILES.low_general_impact,
      secondary: null,
      summary: "Tempo insuficiente para avaliação completa do desempenho.",
    };
  }
  
  const hasGoalOrAssist = THRESHOLDS.hasGoalOrAssist(stats);
  const isCreativeEfficient = THRESHOLDS.isCreativeEfficient(stats);
  const totalActions = THRESHOLDS.getTotalActions(stats);
  const defensiveActions = THRESHOLDS.getDefensiveActions(stats);
  const defensiveErrors = THRESHOLDS.getDefensiveErrors(stats);
  const technicalErrors = THRESHOLDS.getTechnicalErrors(stats);
  const isHighEfficiency = THRESHOLDS.isHighOffensiveEfficiency(stats);
  const duelWinRate = THRESHOLDS.getDuelWinRate(stats);
  
  // Normalize by minutes (per 90 equivalent)
  const per90Factor = 90 / Math.max(minutesPlayed, 1);
  const actionsPer90 = totalActions * per90Factor;
  const defActionsPer90 = defensiveActions * per90Factor;
  
  // === CLASSIFICATION RULES (order matters - first match wins) ===
  
  const matchedProfiles: MatchProfile[] = [];
  
  // 1. DECISIVO E EFICIENTE
  // Gol ou assistência + alta eficiência
  if (hasGoalOrAssist && isHighEfficiency) {
    matchedProfiles.push(PROFILES.decisive_efficient);
  }
  
  // 2. DEFENSIVAMENTE DOMINANTE
  // 5+ ações defensivas (per90 7+) com poucos erros
  if (defensiveActions >= 5 && defActionsPer90 >= 7 && defensiveErrors <= 2 && duelWinRate >= 0.55) {
    matchedProfiles.push(PROFILES.defensive_dominant);
  }
  
  // 3. PARTICIPATIVO COM IMPACTO
  // Alto volume + (gol/assist OU criativo eficiente)
  if (actionsPer90 >= 40 && (hasGoalOrAssist || isCreativeEfficient)) {
    matchedProfiles.push(PROFILES.participative_impact);
  }
  
  // 4. DEFENSIVAMENTE CONSISTENTE
  // 3+ ações defensivas, sem erros graves
  if (defensiveActions >= 3 && defensiveErrors <= 1 && duelWinRate >= 0.50) {
    matchedProfiles.push(PROFILES.defensive_consistent);
  }
  
  // 5. EFICIENTE SEM VOLUME
  // Poucas ações mas alta eficiência
  if (actionsPer90 < 35 && isHighEfficiency && technicalErrors <= 3) {
    matchedProfiles.push(PROFILES.efficient_low_volume);
  }
  
  // 6. ALTO RISCO DEFENSIVO
  // Muitas perdas de posse, dribles errados ou ser driblado
  const timesDB = stats.times_dribbled_past ?? 0;
  const highRiskCondition = timesDB >= 3 || 
    (stats.possession_lost >= 5 && stats.possession_lost > stats.recoveries) ||
    (stats.dribbles_total > 3 && stats.dribbles_success < stats.dribbles_total / 2);
  
  if (highRiskCondition) {
    matchedProfiles.push(PROFILES.high_defensive_risk);
  }
  
  // 7. VOLUME IMPRODUTIVO
  // Muitas ações + muitos erros + sem impacto decisivo
  if (actionsPer90 >= 45 && technicalErrors >= 8 && !hasGoalOrAssist) {
    matchedProfiles.push(PROFILES.unproductive_volume);
  }
  
  // 8. PARTICIPATIVO SEM IMPACTO
  // Alto volume sem gol/assist e sem ser criativo eficiente
  if (actionsPer90 >= 35 && !hasGoalOrAssist && !isCreativeEfficient) {
    matchedProfiles.push(PROFILES.participative_no_impact);
  }
  
  // 9. BAIXO IMPACTO GERAL (fallback)
  // Poucas ações no geral
  if (actionsPer90 < 25 || totalActions < 15) {
    matchedProfiles.push(PROFILES.low_general_impact);
  }
  
  // Sort by priority (lower is better)
  matchedProfiles.sort((a, b) => a.priority - b.priority);
  
  // Get primary and optional secondary
  const primary = matchedProfiles[0] || PROFILES.low_general_impact;
  
  // Secondary only if different category and not redundant
  let secondary: MatchProfile | null = null;
  if (matchedProfiles.length > 1) {
    const second = matchedProfiles[1];
    // Don't show secondary if it's in the same "family"
    const redundantPairs: [MatchProfileKey, MatchProfileKey][] = [
      ["decisive_efficient", "participative_impact"],
      ["defensive_dominant", "defensive_consistent"],
      ["participative_no_impact", "unproductive_volume"],
    ];
    const isRedundant = redundantPairs.some(
      ([a, b]) => (primary.key === a && second.key === b) || (primary.key === b && second.key === a)
    );
    if (!isRedundant) {
      secondary = second;
    }
  }
  
  // Generate summary sentence
  const summary = generateSummary(primary, secondary, stats);
  
  return { primary, secondary, summary };
}

// === SUMMARY GENERATION ===

function generateSummary(
  primary: MatchProfile,
  secondary: MatchProfile | null,
  stats: PlayerStatsInput
): string {
  // Build a technical, non-emotional summary
  const parts: string[] = [];
  
  switch (primary.key) {
    case "decisive_efficient":
      if (stats.goals > 0 && stats.assists > 0) {
        parts.push(`Jogador decisivo com ${stats.goals} gol(s) e ${stats.assists} assistência(s).`);
      } else if (stats.goals > 0) {
        parts.push(`Jogador decisivo com ${stats.goals} gol(s) e alta eficiência técnica.`);
      } else {
        parts.push(`Jogador decisivo com ${stats.assists} assistência(s) e alta eficiência técnica.`);
      }
      break;
      
    case "participative_impact":
      parts.push("Jogador participativo com alto volume de ações e contribuição efetiva no resultado.");
      break;
      
    case "participative_no_impact":
      parts.push("Jogador participativo, com bom volume de ações, mas sem impacto decisivo no jogo.");
      break;
      
    case "efficient_low_volume":
      parts.push("Atuação discreta, mas com boa taxa de acerto nas ações realizadas.");
      break;
      
    case "unproductive_volume":
      parts.push("Alto volume de ações com baixa efetividade. Muitos erros técnicos registrados.");
      break;
      
    case "defensive_dominant":
      parts.push(`Presença defensiva dominante com ${stats.tackles + stats.interceptions} ações de recuperação.`);
      break;
      
    case "defensive_consistent":
      parts.push("Desempenho defensivo sólido, sem erros graves e com bom posicionamento.");
      break;
      
    case "high_defensive_risk":
      const riskDetails: string[] = [];
      if ((stats.times_dribbled_past ?? 0) >= 2) riskDetails.push("driblado com frequência");
      if (stats.possession_lost >= 4) riskDetails.push("perdas de posse elevadas");
      if (stats.dribbles_total > 2 && stats.dribbles_success < stats.dribbles_total / 2) {
        riskDetails.push("dribles mal sucedidos");
      }
      parts.push(`Alto risco defensivo: ${riskDetails.join(", ") || "erros frequentes"}.`);
      break;
      
    case "low_general_impact":
    default:
      parts.push("Baixa participação no jogo. Poucas ações registradas.");
      break;
  }
  
  // Add secondary context if exists
  if (secondary) {
    switch (secondary.key) {
      case "defensive_consistent":
        parts.push("Contribuiu defensivamente quando necessário.");
        break;
      case "high_defensive_risk":
        parts.push("Apresentou vulnerabilidades defensivas.");
        break;
      case "efficient_low_volume":
        parts.push("Aproveitou bem as poucas oportunidades de ação.");
        break;
    }
  }
  
  return parts.join(" ");
}

// === EXPORTS ===

export { PROFILES };

/**
 * Get profile by key
 */
export function getProfile(key: MatchProfileKey): MatchProfile {
  return PROFILES[key];
}

/**
 * Get all available profiles (sorted by priority)
 */
export function getAllProfiles(): MatchProfile[] {
  return Object.values(PROFILES).sort((a, b) => a.priority - b.priority);
}
