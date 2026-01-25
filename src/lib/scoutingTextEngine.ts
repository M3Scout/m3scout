/**
 * Scouting Text Engine
 * 
 * Generates professional, position-adapted scouting texts combining:
 * - Match Profile (Perfil do Jogo)
 * - Match Efficiency (Eficiência no Jogo)
 * - Player Position
 * 
 * Uses technical, neutral language appropriate for professional club reports.
 * Does NOT inflate performance. Prioritizes efficiency over volume.
 */

import type { MatchProfileKey } from "./matchProfileEngine";
import type { EfficiencyLevel } from "./matchEfficiencyEngine";

// === POSITION GROUPS ===

export type PositionGroup = 
  | "goalkeeper"
  | "defender"
  | "fullback"
  | "midfielder"
  | "defensive_mid"
  | "attacker";

/**
 * Map raw position strings to position groups
 */
export function getPositionGroup(position: string): PositionGroup {
  const pos = position.toLowerCase().trim();
  
  // Goalkeeper
  if (pos.includes("goleiro") || pos.includes("gk") || pos === "g") {
    return "goalkeeper";
  }
  
  // Defender (center-back)
  if (pos.includes("zagueiro") || pos.includes("cb") || pos.includes("defensor central")) {
    return "defender";
  }
  
  // Fullback (lateral)
  if (pos.includes("lateral") || pos.includes("lb") || pos.includes("rb") || 
      pos.includes("ala") || pos.includes("wingback")) {
    return "fullback";
  }
  
  // Defensive midfielder (volante)
  if (pos.includes("volante") || pos.includes("cdm") || pos.includes("dm") || 
      pos.includes("primeiro volante") || pos.includes("segundo volante")) {
    return "defensive_mid";
  }
  
  // Midfielder
  if (pos.includes("meio") || pos.includes("meia") || pos.includes("cm") || 
      pos.includes("cam") || pos.includes("armador") || pos.includes("midfielder")) {
    return "midfielder";
  }
  
  // Attacker (forward, winger)
  if (pos.includes("atacante") || pos.includes("ponta") || pos.includes("centroavante") ||
      pos.includes("st") || pos.includes("cf") || pos.includes("lw") || pos.includes("rw") ||
      pos.includes("forward") || pos.includes("winger") || pos.includes("extremo")) {
    return "attacker";
  }
  
  // Default to midfielder if unknown
  return "midfielder";
}

/**
 * Get position label in Portuguese
 */
export function getPositionLabel(group: PositionGroup): string {
  const labels: Record<PositionGroup, string> = {
    goalkeeper: "Goleiro",
    defender: "Zagueiro",
    fullback: "Lateral",
    defensive_mid: "Volante",
    midfielder: "Meio-campista",
    attacker: "Atacante",
  };
  return labels[group];
}

// === PROFILE TEXTS BY POSITION ===

type ProfileTexts = Record<PositionGroup, string>;

const PROFILE_TEXTS: Record<MatchProfileKey, ProfileTexts> = {
  decisive_efficient: {
    goalkeeper: "Goleiro seguro e decisivo nas intervenções realizadas",
    defender: "Zagueiro decisivo, com leitura defensiva precisa e intervenções eficazes",
    fullback: "Lateral decisivo, equilibrando apoio ofensivo e segurança defensiva",
    defensive_mid: "Volante decisivo, com equilíbrio entre cobertura e contribuição ofensiva",
    midfielder: "Meio-campista decisivo, com ações de impacto e alta efetividade",
    attacker: "Atacante decisivo, com aproveitamento eficiente das oportunidades",
  },
  participative_impact: {
    goalkeeper: "Goleiro participativo, com intervenções importantes na partida",
    defender: "Zagueiro participativo, com presença defensiva e contribuição efetiva",
    fullback: "Lateral participativo, com boa projeção e contribuição nas duas fases",
    defensive_mid: "Volante participativo, com circulação consistente e presença defensiva",
    midfielder: "Meio-campista participativo, com volume de ações e contribuição tática",
    attacker: "Atacante participativo, com presença ofensiva e envolvimento no jogo",
  },
  participative_no_impact: {
    goalkeeper: "Goleiro participativo na saída de bola, mas sem intervenções decisivas",
    defender: "Zagueiro participativo, porém sem ações defensivas de impacto",
    fullback: "Lateral participativo, mas sem contribuição decisiva nas duas fases",
    defensive_mid: "Volante com volume de ações, mas sem impacto significativo no jogo",
    midfielder: "Meio-campista participativo, porém sem ações determinantes",
    attacker: "Atacante presente no jogo, mas sem impacto decisivo nas finalizações",
  },
  efficient_low_volume: {
    goalkeeper: "Goleiro com poucas solicitações, mas seguro nas ações realizadas",
    defender: "Zagueiro com poucas intervenções, mas preciso quando acionado",
    fullback: "Lateral discreto, porém eficiente nas ações realizadas",
    defensive_mid: "Volante com atuação discreta, mas acertada nas ações",
    midfielder: "Meio-campista com baixo volume, mas eficiente nas participações",
    attacker: "Atacante com poucas ações, porém aproveitando bem as oportunidades",
  },
  unproductive_volume: {
    goalkeeper: "Goleiro com muitas saídas de bola, mas com erros técnicos frequentes",
    defender: "Zagueiro com alto volume, mas com erros que comprometeram a segurança",
    fullback: "Lateral com muita participação, porém improdutivo nas ações ofensivas",
    defensive_mid: "Volante com volume de ações, mas com muitos erros de circulação",
    midfielder: "Meio-campista com alto volume, porém improdutivo nas ações realizadas",
    attacker: "Atacante com muita movimentação, mas sem efetividade nas finalizações",
  },
  defensive_dominant: {
    goalkeeper: "Goleiro dominante na área, com segurança aérea e boas saídas",
    defender: "Zagueiro dominante nos duelos, com leitura defensiva acima da média",
    fullback: "Lateral com excelente recomposição e domínio defensivo",
    defensive_mid: "Volante dominante na cobertura, com alto volume de recuperações",
    midfielder: "Meio-campista com forte presença defensiva e domínio territorial",
    attacker: "Atacante com boa recomposição e contribuição defensiva relevante",
  },
  defensive_consistent: {
    goalkeeper: "Goleiro consistente, sem erros e com boa leitura de jogo",
    defender: "Zagueiro consistente, com poucos erros e boa organização defensiva",
    fullback: "Lateral equilibrado, com boa recomposição e sem falhas defensivas",
    defensive_mid: "Volante equilibrado, com cobertura consistente e poucos erros",
    midfielder: "Meio-campista com contribuição defensiva sólida e equilibrada",
    attacker: "Atacante com marcação consistente e apoio defensivo adequado",
  },
  high_defensive_risk: {
    goalkeeper: "Goleiro com erros de posicionamento e saídas mal calculadas",
    defender: "Zagueiro com vulnerabilidades defensivas e perdas de duelos importantes",
    fullback: "Lateral com risco defensivo, deixando espaços na recomposição",
    defensive_mid: "Volante com perdas de posse perigosas e falhas na cobertura",
    midfielder: "Meio-campista com risco defensivo, perdendo bolas em zonas críticas",
    attacker: "Atacante com perdas de posse frequentes e baixa contribuição defensiva",
  },
  low_general_impact: {
    goalkeeper: "Goleiro com baixa participação e poucas solicitações",
    defender: "Zagueiro com pouco envolvimento nas ações defensivas",
    fullback: "Lateral com baixa participação nas duas fases do jogo",
    defensive_mid: "Volante com baixo envolvimento no jogo e pouca presença",
    midfielder: "Meio-campista com baixa participação e pouco impacto tático",
    attacker: "Atacante apagado, com pouca participação nas ações ofensivas",
  },
};

// === EFFICIENCY TEXTS BY POSITION ===

const EFFICIENCY_TEXTS: Record<EfficiencyLevel, ProfileTexts> = {
  high: {
    goalkeeper: "Alta eficiência nas intervenções, sem erros relevantes.",
    defender: "Alta eficiência defensiva, com segurança e poucos riscos.",
    fullback: "Alta eficiência no equilíbrio entre apoio e recomposição.",
    defensive_mid: "Alta eficiência na circulação e cobertura.",
    midfielder: "Alta eficiência técnica, com baixo índice de erros.",
    attacker: "Alta eficiência nas ações ofensivas e tomadas de decisão.",
  },
  medium: {
    goalkeeper: "Eficiência média nas intervenções realizadas.",
    defender: "Eficiência média, com oscilações na segurança defensiva.",
    fullback: "Eficiência média, com erros pontuais na fase defensiva.",
    defensive_mid: "Eficiência média, equilibrando acertos e erros.",
    midfielder: "Eficiência média nas ações técnicas realizadas.",
    attacker: "Eficiência média no aproveitamento das oportunidades.",
  },
  low: {
    goalkeeper: "Baixa eficiência, com erros que comprometeram a atuação.",
    defender: "Baixa eficiência defensiva, com erros frequentes nos duelos.",
    fullback: "Baixa eficiência, com vulnerabilidades na recomposição.",
    defensive_mid: "Baixa eficiência, com muitas perdas em zonas de risco.",
    midfielder: "Baixa eficiência técnica, com alto índice de erros.",
    attacker: "Baixa eficiência no aproveitamento e nas decisões ofensivas.",
  },
};

// === MAIN INTERFACE ===

export interface ScoutingTextResult {
  profileText: string;
  efficiencyText: string;
  combinedText: string;
  positionGroup: PositionGroup;
  positionLabel: string;
}

/**
 * Generate professional scouting text combining profile, efficiency, and position
 */
export function generateScoutingText(
  position: string,
  profileKey: MatchProfileKey,
  efficiencyLevel: EfficiencyLevel,
  isInsufficientTime: boolean = false
): ScoutingTextResult {
  const positionGroup = getPositionGroup(position);
  const positionLabel = getPositionLabel(positionGroup);
  
  const profileText = PROFILE_TEXTS[profileKey]?.[positionGroup] 
    ?? PROFILE_TEXTS[profileKey]?.midfielder 
    ?? "Atuação sem classificação definida.";
  
  // Handle insufficient time case
  let efficiencyText: string;
  if (isInsufficientTime) {
    efficiencyText = "Tempo insuficiente para avaliação de eficiência.";
  } else {
    efficiencyText = EFFICIENCY_TEXTS[efficiencyLevel]?.[positionGroup]
      ?? EFFICIENCY_TEXTS[efficiencyLevel]?.midfielder
      ?? "Eficiência não avaliada.";
  }
  
  // Combine texts: Profile sentence + Efficiency sentence
  const combinedText = `${profileText}. ${efficiencyText}`;
  
  return {
    profileText,
    efficiencyText,
    combinedText,
    positionGroup,
    positionLabel,
  };
}

/**
 * Generate a short one-line summary (for badges/tooltips)
 */
export function generateShortSummary(
  position: string,
  profileKey: MatchProfileKey,
  efficiencyLevel: EfficiencyLevel,
  isInsufficientTime: boolean = false
): string {
  const positionGroup = getPositionGroup(position);
  const positionLabel = getPositionLabel(positionGroup);
  
  // Create a condensed version
  const profileShort: Record<MatchProfileKey, string> = {
    decisive_efficient: "decisivo e eficiente",
    participative_impact: "participativo com impacto",
    participative_no_impact: "participativo sem impacto decisivo",
    efficient_low_volume: "discreto mas eficiente",
    unproductive_volume: "com volume improdutivo",
    defensive_dominant: "defensivamente dominante",
    defensive_consistent: "defensivamente consistente",
    high_defensive_risk: "com risco defensivo elevado",
    low_general_impact: "com baixo impacto geral",
  };
  
  const efficiencyShort: Record<EfficiencyLevel, string> = {
    high: "alta eficiência",
    medium: "eficiência média",
    low: "baixa eficiência",
  };
  
  const profile = profileShort[profileKey] ?? "sem classificação";
  const efficiency = isInsufficientTime ? "tempo insuficiente" : (efficiencyShort[efficiencyLevel] ?? "");
  
  if (isInsufficientTime) {
    return `${positionLabel} ${profile}. ${efficiency}.`;
  }
  
  return `${positionLabel} ${profile}, ${efficiency}.`;
}
