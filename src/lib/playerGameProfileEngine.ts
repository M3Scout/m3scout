/**
 * Player Game Profile Engine (Cluster Leve)
 * 
 * Classifies player's in-game profile based on zones and action types.
 * 
 * RULES:
 * - NO new stats created
 * - NO impact on rating
 * - Single profile per game
 * - Executes only after match is finished
 */

import { type ZoneDistribution } from "./postGameAnalysis";

// ============================================
// TYPES
// ============================================

export type GameProfileKey = 
  | "low_participation"    // Baixa Participação
  | "defensive_active"     // Defensivo Ativo
  | "offensive_direct"     // Ofensivo Direto
  | "builder"              // Construtor
  | "balanced";            // Equilibrado

export interface GameProfile {
  key: GameProfileKey;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface GameProfileResult {
  profile: GameProfile;
  /** Whether there's enough data to show the profile */
  hasData: boolean;
  /** Display text */
  displayText: string;
}

// ============================================
// PROFILE DEFINITIONS
// ============================================

export const GAME_PROFILES: Record<GameProfileKey, GameProfile> = {
  low_participation: {
    key: "low_participation",
    label: "Baixa Participação",
    description: "Poucas ações no jogo",
    icon: "⏸️",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/15 border-zinc-500/30",
  },
  defensive_active: {
    key: "defensive_active",
    label: "Defensivo Ativo",
    description: "Presença marcante na zona defensiva",
    icon: "🛡️",
    color: "text-sky-400",
    bgColor: "bg-sky-500/15 border-sky-500/30",
  },
  offensive_direct: {
    key: "offensive_direct",
    label: "Ofensivo Direto",
    description: "Foco em ações de finalização e progressão",
    icon: "⚡",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15 border-emerald-500/30",
  },
  builder: {
    key: "builder",
    label: "Construtor",
    description: "Articulador no meio-campo com bom passe",
    icon: "🎯",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15 border-amber-500/30",
  },
  balanced: {
    key: "balanced",
    label: "Equilibrado",
    description: "Atuação distribuída nas três zonas",
    icon: "⚖️",
    color: "text-violet-400",
    bgColor: "bg-violet-500/15 border-violet-500/30",
  },
};

// ============================================
// STATS INPUT
// ============================================

export interface GameProfileStatsInput {
  // Zone distribution
  zoneDistribution: ZoneDistribution;
  
  // Action counts
  passes_completed?: number;
  passes_total?: number;
  dribbles_success?: number;
  dribbles_total?: number;
  shots?: number;
  shots_on_target?: number;
  tackles?: number;
  interceptions?: number;
  clearances?: number;
  recoveries?: number;
  duels_won?: number;
  duels_total?: number;
  goals?: number;
  assists?: number;
  key_passes?: number;
  chances_created?: number;
}

// ============================================
// THRESHOLDS
// ============================================

const THRESHOLDS = {
  /** Minimum total actions to not be "low participation" */
  MIN_TOTAL_ACTIONS: 12,
  
  /** Zone percentage for dominant zone */
  ZONE_DOMINANT: 40,
  ZONE_STRONG: 45,
  
  /** Pass efficiency for builder profile */
  PASS_EFFICIENCY_MIN: 0.70,
  
  /** Relevant shots/dribbles for offensive direct */
  OFFENSIVE_ACTIONS_MIN: 3,
  
  /** Defensive actions for defensive active */
  DEFENSIVE_ACTIONS_MIN: 4,
};

// ============================================
// CLASSIFICATION LOGIC
// ============================================

export function classifyGameProfile(stats: GameProfileStatsInput): GameProfileResult {
  const { zoneDistribution } = stats;
  
  // Calculate total actions
  const totalPasses = stats.passes_total ?? 0;
  const totalDribbles = stats.dribbles_total ?? 0;
  const totalShots = stats.shots ?? 0;
  const totalDefensive = (stats.tackles ?? 0) + (stats.interceptions ?? 0) + 
                         (stats.clearances ?? 0) + (stats.recoveries ?? 0);
  const totalActions = totalPasses + totalDribbles + totalShots + totalDefensive;
  
  // Calculate efficiencies
  const passEfficiency = totalPasses > 0 
    ? (stats.passes_completed ?? 0) / totalPasses 
    : 0;
  
  // Offensive action count (shots + successful dribbles + goals + assists)
  const offensiveActions = totalShots + 
    (stats.dribbles_success ?? 0) + 
    (stats.goals ?? 0) + 
    (stats.assists ?? 0);
  
  // 1) Check for low participation
  if (totalActions < THRESHOLDS.MIN_TOTAL_ACTIONS) {
    return {
      profile: GAME_PROFILES.low_participation,
      hasData: false,
      displayText: `Perfil no jogo: ${GAME_PROFILES.low_participation.label}`,
    };
  }
  
  // 2) Defensive Active: DEF >= 40% and defensive actions dominant
  if (
    zoneDistribution.defense >= THRESHOLDS.ZONE_DOMINANT && 
    totalDefensive >= THRESHOLDS.DEFENSIVE_ACTIONS_MIN
  ) {
    return {
      profile: GAME_PROFILES.defensive_active,
      hasData: true,
      displayText: `Perfil no jogo: ${GAME_PROFILES.defensive_active.label}`,
    };
  }
  
  // 3) Offensive Direct: ATA >= 45% and relevant shots/dribbles
  if (
    zoneDistribution.attack >= THRESHOLDS.ZONE_STRONG && 
    offensiveActions >= THRESHOLDS.OFFENSIVE_ACTIONS_MIN
  ) {
    return {
      profile: GAME_PROFILES.offensive_direct,
      hasData: true,
      displayText: `Perfil no jogo: ${GAME_PROFILES.offensive_direct.label}`,
    };
  }
  
  // 4) Builder: MEI >= 45% and good pass efficiency
  if (
    zoneDistribution.midfield >= THRESHOLDS.ZONE_STRONG && 
    passEfficiency >= THRESHOLDS.PASS_EFFICIENCY_MIN &&
    totalPasses >= 8
  ) {
    return {
      profile: GAME_PROFILES.builder,
      hasData: true,
      displayText: `Perfil no jogo: ${GAME_PROFILES.builder.label}`,
    };
  }
  
  // 5) Default: Balanced
  return {
    profile: GAME_PROFILES.balanced,
    hasData: true,
    displayText: `Perfil no jogo: ${GAME_PROFILES.balanced.label}`,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

export function getGameProfile(key: GameProfileKey): GameProfile {
  return GAME_PROFILES[key];
}
