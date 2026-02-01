/**
 * Match Rating Engine v2.0 - Professional Scouting Model
 * 
 * Sistema de avaliação de jogador estilo CLUBE PROFISSIONAL.
 * Rígido, realista, não-inflacionado. Valoriza IMPACTO e EFICIÊNCIA.
 * 
 * FILOSOFIA:
 * - Erro é punido mais do que volume é premiado
 * - Sem gol, assistência ou ação defensiva relevante → max 6.9
 * - Contribuições ofensivas têm teto de +1.0
 * - Defesa NÃO tem teto positivo
 * 
 * BASE: 6.0
 * FATOR DE MINUTOS:
 * - 0-29 min → ×0.6
 * - 30-59 min → ×0.8
 * - 60-79 min → ×0.9
 * - 80+ min → ×1.0
 */

import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import type { MatchPlayerMinutesInput } from "./minutesPlayed";
import { calculateMinutesPlayed } from "./minutesPlayed";

// === PROFESSIONAL SCOUTING WEIGHTS (v2.0) ===

/**
 * Context for dynamic goal weight calculation
 * Based on player participation in the match
 */
export interface GoalWeightContext {
  minutesPlayed: number;
  actionsWithBall: number;
  totalPassesAttempted: number;
}

/**
 * Compute dynamic goal weight (0.80 to 1.00) based on participation
 * 
 * Base = 0.80
 * Bonus (up to +0.20):
 * - +0.05 if mins >= 60
 * - +0.05 if actionsWithBall >= 15
 * - +0.05 if actionsWithBall >= 25
 * - +0.05 if passesAttempted >= 20
 * 
 * Fallback: Returns 0.80 if no participation data available (legacy matches)
 */
export function computeGoalWeight(ctx: GoalWeightContext): number {
  const { minutesPlayed = 0, actionsWithBall = 0, totalPassesAttempted = 0 } = ctx;
  
  const base = 0.80;
  
  // Legacy fallback: no participation data available
  if (actionsWithBall === 0 && totalPassesAttempted === 0) {
    return 0.80;
  }
  
  let bonus = 0.0;
  
  if (minutesPlayed >= 60) bonus += 0.05;
  if (actionsWithBall >= 15) bonus += 0.05;
  if (actionsWithBall >= 25) bonus += 0.05;
  if (totalPassesAttempted >= 20) bonus += 0.05;
  
  // Clamp bonus to max 0.20
  bonus = Math.min(Math.max(bonus, 0.0), 0.20);
  
  // Clamp total to 0.80–1.00
  return Math.min(Math.max(base + bonus, 0.80), 1.00);
}

export const WEIGHTS = {
  // ==================
  // 🟥 ATAQUE
  // ==================
  // NOTE: goal.weight is the BASE weight (0.80). Use computeGoalWeight() for dynamic weight.
  goal: { weight: 0.80, label: "Gol", category: "attack" as const },
  shot_on_target: { weight: 0.08, label: "Finalização no alvo", category: "attack" as const, maxImpact: 0.40 },
  shot_off_target: { weight: 0.00, label: "Finalização para fora", category: "attack" as const }, // NÃO pontuar
  // Impedimento: NÃO pontuar (não temos tracking)
  
  // ==================
  // 🟨 PASSES / CRIAÇÃO
  // ==================
  assist: { weight: 0.60, label: "Assistência", category: "creation" as const },
  key_pass: { weight: 0.12, label: "Passe decisivo", category: "creation" as const },
  chance_created: { weight: 0.10, label: "Chance criada", category: "creation" as const },
  pass_completed: { weight: 0.005, label: "Passe certo", category: "passing" as const, maxImpact: 0.20 },
  pass_failed: { weight: -0.03, label: "Passe errado", category: "passing" as const },
  cross_success: { weight: 0.06, label: "Cruzamento certo", category: "creation" as const },
  cross_failed: { weight: -0.04, label: "Cruzamento errado", category: "creation" as const },
  
  // ==================
  // 🟦 DRIBLES / POSSE
  // ==================
  dribble_success: { weight: 0.06, label: "Drible certo", category: "creation" as const, maxImpact: 0.30 },
  dribble_failed: { weight: -0.07, label: "Drible errado", category: "creation" as const },
  foul_suffered: { weight: 0.04, label: "Falta sofrida", category: "creation" as const },
  possession_lost: { weight: -0.05, label: "Perda de posse", category: "creation" as const },
  
  // ==================
  // 🟩 DEFESA (sem teto)
  // ==================
  tackle: { weight: 0.12, label: "Desarme", category: "defense" as const },
  interception: { weight: 0.10, label: "Interceptação", category: "defense" as const },
  clearance: { weight: 0.08, label: "Corte", category: "defense" as const },
  shot_blocked: { weight: 0.10, label: "Chute bloqueado", category: "defense" as const },
  recovery: { weight: 0.05, label: "Recuperação", category: "defense" as const },
  ground_duel_won: { weight: 0.06, label: "Duelo no chão ganho", category: "defense" as const },
  ground_duel_lost: { weight: -0.06, label: "Duelo no chão perdido", category: "defense" as const },
  aerial_duel_won: { weight: 0.07, label: "Duelo aéreo ganho", category: "defense" as const },
  aerial_duel_lost: { weight: -0.07, label: "Duelo aéreo perdido", category: "defense" as const },
  foul_committed: { weight: -0.04, label: "Falta cometida", category: "defense" as const },
  dribbled_past: { weight: -0.10, label: "Driblado", category: "defense" as const },
  
  // ==================
  // DISCIPLINA
  // ==================
  yellow_card: { weight: -0.20, label: "Cartão amarelo", category: "discipline" as const },
  red_card: { weight: -0.80, label: "Cartão vermelho", category: "discipline" as const },
} as const;

// === GOALKEEPER-SPECIFIC WEIGHTS ===
export const GK_WEIGHTS = {
  // GOALKEEPER - Primary actions
  save: { weight: 0.18, label: "Defesa", category: "goalkeeper" as const },
  save_inside_box: { weight: 0.25, label: "Defesa dentro da área", category: "goalkeeper" as const },
  penalty_saved: { weight: 0.80, label: "Pênalti defendido", category: "goalkeeper" as const },
  clean_sheet: { weight: 0.40, label: "Gol não sofrido (clean sheet)", category: "goalkeeper" as const },
  
  // GOALKEEPER - Aerial dominance
  high_claim: { weight: 0.15, label: "Saída alta", category: "goalkeeper" as const },
  punch: { weight: 0.08, label: "Soco", category: "goalkeeper" as const },
  
  // GOALKEEPER - Sweeping
  sweeper_action: { weight: 0.12, label: "Ação de líbero", category: "goalkeeper" as const },
  
  // GOALKEEPER - Negative actions
  goal_conceded: { weight: -0.35, label: "Gol sofrido", category: "goalkeeper" as const },
  error_led_to_goal: { weight: -0.60, label: "Erro que gerou gol", category: "goalkeeper" as const },
  
  // Passes (GK uses same weights)
  pass_completed: { weight: 0.005, label: "Passe certo", category: "passing" as const, maxImpact: 0.20 },
  pass_failed: { weight: -0.03, label: "Passe errado", category: "passing" as const },
  
  // Discipline (same for all)
  yellow_card: { weight: -0.20, label: "Cartão amarelo", category: "discipline" as const },
  red_card: { weight: -0.80, label: "Cartão vermelho", category: "discipline" as const },
} as const;

// === ANTI-INFLATION RULES ===
// Soma máxima de contribuições ofensivas (Ataque + Passes + Dribles)
const OFFENSIVE_CAP = 1.0;
// Sem gol, assistência ou ação defensiva relevante → max 6.9
const MAX_RATING_WITHOUT_IMPACT = 6.9;
// GK cap
const GK_SAVES_CAP = 1.50;

// Base rating
const BASE_RATING = 6.0;

// === TYPES ===

export type CategoryKey = "attack" | "creation" | "passing" | "defense" | "discipline" | "goalkeeper";

export interface BreakdownItem {
  stat: string;
  label: string;
  count: number;
  weight: number;
  rawDelta: number;
  afterMinutes: number;
  capped?: boolean;
  originalDelta?: number;
}

export interface CategoryBreakdown {
  key: CategoryKey;
  label: string;
  raw: number;
  afterMinutes: number;
  items: BreakdownItem[];
}

export interface CapApplied {
  key: string;
  label: string;
  before: number;
  after: number;
}

export interface DetailedBreakdown {
  categories: CategoryBreakdown[];
  items: BreakdownItem[];
  capsApplied: CapApplied[];
  antiInflationApplied: boolean;
  hasImpactfulAction: boolean;
  /** True when breakdown was generated from persisted aggregated data (not live events) */
  isPersistedBreakdown?: boolean;
}

export interface RatingBreakdown {
  attack: number;
  creation: number;
  passing: number;
  defense: number;
  discipline: number;
  goalkeeper: number;
}

export interface MatchRatingResult {
  hasRating: boolean;
  rating: number | null;
  baseRating: number;
  rawImpact: number;
  impactAfterMinutes: number;
  minutesFactor: number;
  minutesPlayed: number;
  breakdown: RatingBreakdown | null;
  detailedBreakdown: DetailedBreakdown | null;
  color: string;
  bgColor: string;
  label: string;
}

export interface PlayerStatsInput {
  // Attack
  goals: number;
  assists: number;
  shots_on_target: number;
  shots: number;
  
  // Creation
  dribbles_success: number;
  dribbles_total: number;
  key_passes: number;
  chances_created: number;
  crosses_success: number;
  crosses_failed: number;
  
  // Passing
  passes_completed: number;
  passes_total: number;
  
  // Defense
  interceptions: number;
  recoveries: number;
  clearances: number;
  tackles: number;
  duels_won: number;
  duels_total: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  fouls_committed: number;
  fouls_suffered: number;
  possession_lost: number;
  shots_blocked?: number;
  times_dribbled_past?: number;
  
  // Discipline
  yellow_cards: number;
  red_cards: number;
  
  // Goalkeeper-specific
  saves?: number;
  saves_inside_box?: number;
  penalty_saved?: number;
  goals_conceded?: number;
  clean_sheets?: number;
  high_claims?: number;
  punches?: number;
  sweeper_actions?: number;
  errors_led_to_goal?: number;
  
  isGoalkeeper?: boolean;
}

// === HELPER FUNCTIONS ===

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate minutes factor - PROFESSIONAL SCOUTING MODEL
 * 0-29 min → ×0.6
 * 30-59 min → ×0.8
 * 60-79 min → ×0.9
 * 80+ min → ×1.0
 */
function calculateMinutesFactor(minutesPlayed: number): number {
  if (minutesPlayed < 30) return 0.6;
  if (minutesPlayed < 60) return 0.8;
  if (minutesPlayed < 80) return 0.9;
  return 1.0;
}

/**
 * Get rating color based on value (SofaScore bands)
 */
export function getRatingColor(rating: number): string {
  if (rating < 6.0) return "text-red-500";
  if (rating < 6.5) return "text-orange-500";
  if (rating < 7.0) return "text-amber-500";
  if (rating < 8.0) return "text-green-500";
  if (rating < 9.0) return "text-cyan-500";
  return "text-blue-500";
}

/**
 * Get rating background color for badges
 */
export function getRatingBgColor(rating: number): string {
  if (rating < 6.0) return "bg-red-500";
  if (rating < 6.5) return "bg-orange-500";
  if (rating < 7.0) return "bg-amber-500";
  if (rating < 8.0) return "bg-green-500";
  if (rating < 9.0) return "bg-cyan-500";
  return "bg-blue-500";
}

/**
 * Get hex color for PDF rendering
 */
export function getRatingHexColor(rating: number): string {
  if (rating < 6.0) return "#ef4444";
  if (rating < 6.5) return "#f97316";
  if (rating < 7.0) return "#f59e0b";
  if (rating < 8.0) return "#22c55e";
  if (rating < 9.0) return "#06b6d4";
  return "#3b82f6";
}

/**
 * Get rating label
 */
function getRatingLabel(rating: number): string {
  if (rating >= 9.0) return "Excepcional";
  if (rating >= 8.0) return "Excelente";
  if (rating >= 7.0) return "Muito Bom";
  if (rating >= 6.5) return "Bom";
  if (rating >= 6.0) return "Regular";
  if (rating >= 5.0) return "Fraco";
  return "Muito Fraco";
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  attack: "Ataque",
  creation: "Criação/Dribles",
  passing: "Passes",
  defense: "Defesa",
  discipline: "Disciplina",
  goalkeeper: "Goleiro",
};

// === MAIN CALCULATION ===

export function calculateMatchRating(
  stats: PlayerStatsInput,
  minutesPlayed: number
): MatchRatingResult {
  // Players with 0 minutes don't get a rating
  if (minutesPlayed <= 0) {
    return {
      hasRating: false,
      rating: null,
      baseRating: BASE_RATING,
      rawImpact: 0,
      impactAfterMinutes: 0,
      minutesFactor: 0,
      minutesPlayed: 0,
      breakdown: null,
      detailedBreakdown: null,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Sem nota",
    };
  }

  const isGK = stats.isGoalkeeper ?? false;
  const minutesFactor = calculateMinutesFactor(minutesPlayed);
  const allItems: BreakdownItem[] = [];
  const capsApplied: CapApplied[] = [];
  
  // Track individual stat impacts for capping
  const statImpacts: Record<string, { count: number; raw: number; capped: number }> = {};
  
  // Helper to add breakdown item with optional per-stat capping
  // Added overrideWeight param for dynamic goal weight
  const addItem = (
    stat: string, 
    count: number, 
    isGkStat = false,
    customCategory?: CategoryKey,
    overrideWeight?: number
  ): BreakdownItem => {
    const weightSource = isGkStat ? GK_WEIGHTS : WEIGHTS;
    const weightInfo = weightSource[stat as keyof typeof weightSource];
    // Use override weight if provided (for dynamic goal weight)
    const weight = overrideWeight ?? weightInfo?.weight ?? 0;
    const label = weightInfo?.label ?? stat;
    const maxImpact = (weightInfo as any)?.maxImpact;
    
    let rawDelta = count * weight;
    let capped = false;
    let originalDelta = rawDelta;
    
    // Apply per-stat max impact cap (e.g., max +0.40 for shots on target)
    if (maxImpact !== undefined && rawDelta > maxImpact) {
      capped = true;
      originalDelta = rawDelta;
      rawDelta = maxImpact;
    }
    
    const afterMinutes = rawDelta * minutesFactor;
    
    const item: BreakdownItem = {
      stat,
      label,
      count,
      weight, // This will now reflect the dynamic weight for goals
      rawDelta: Math.round(rawDelta * 1000) / 1000,
      afterMinutes: Math.round(afterMinutes * 1000) / 1000,
      capped,
      originalDelta: capped ? Math.round(originalDelta * 1000) / 1000 : undefined,
    };
    
    if (count !== 0) {
      allItems.push(item);
      statImpacts[stat] = { count, raw: originalDelta, capped: rawDelta };
    }
    
    return item;
  };

  // ===== GOALKEEPER CALCULATION =====
  if (isGK) {
    const saveItem = addItem("save", Math.max(0, stats.saves ?? 0), true);
    const saveInsideBoxItem = addItem("save_inside_box", Math.max(0, stats.saves_inside_box ?? 0), true);
    const penaltySavedItem = addItem("penalty_saved", Math.max(0, stats.penalty_saved ?? 0), true);
    const cleanSheetItem = addItem("clean_sheet", Math.max(0, stats.clean_sheets ?? 0), true);
    const highClaimItem = addItem("high_claim", Math.max(0, stats.high_claims ?? 0), true);
    const punchItem = addItem("punch", Math.max(0, stats.punches ?? 0), true);
    const sweeperItem = addItem("sweeper_action", Math.max(0, stats.sweeper_actions ?? 0), true);
    const goalConcededItem = addItem("goal_conceded", Math.max(0, stats.goals_conceded ?? 0), true);
    const errorItem = addItem("error_led_to_goal", Math.max(0, stats.errors_led_to_goal ?? 0), true);
    
    let gkPositiveRaw = saveItem.rawDelta + saveInsideBoxItem.rawDelta + penaltySavedItem.rawDelta + 
                        cleanSheetItem.rawDelta + highClaimItem.rawDelta + punchItem.rawDelta + sweeperItem.rawDelta;
    
    if (gkPositiveRaw > GK_SAVES_CAP) {
      capsApplied.push({
        key: "gkSavesCap",
        label: "Limite de defesas",
        before: Math.round(gkPositiveRaw * 100) / 100,
        after: GK_SAVES_CAP,
      });
      gkPositiveRaw = GK_SAVES_CAP;
    }
    
    const gkNegativeRaw = goalConcededItem.rawDelta + errorItem.rawDelta;
    const goalkeeperRaw = gkPositiveRaw + gkNegativeRaw;
    const goalkeeperAfterMinutes = goalkeeperRaw * minutesFactor;
    
    // CRITICAL FIX: passes_total stores failed passes count, NOT actual total
    const passCompletedItem = addItem("pass_completed", Math.max(0, stats.passes_completed), true);
    const passFailedItem = addItem("pass_failed", Math.max(0, stats.passes_total), true); // passes_total IS the failed count
    
    const passingRaw = passCompletedItem.rawDelta + passFailedItem.rawDelta;
    const passingAfterMinutes = passingRaw * minutesFactor;
    
    const yellowItem = addItem("yellow_card", Math.max(0, stats.yellow_cards), true);
    const redItem = addItem("red_card", Math.max(0, stats.red_cards), true);
    
    const disciplineRaw = yellowItem.rawDelta + redItem.rawDelta;
    const disciplineAfterMinutes = disciplineRaw * minutesFactor;
    
    const categories: CategoryBreakdown[] = [
      {
        key: "goalkeeper",
        label: CATEGORY_LABELS.goalkeeper,
        raw: Math.round(goalkeeperRaw * 100) / 100,
        afterMinutes: Math.round(goalkeeperAfterMinutes * 100) / 100,
        items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "goalkeeper"),
      },
      {
        key: "passing",
        label: CATEGORY_LABELS.passing,
        raw: Math.round(passingRaw * 100) / 100,
        afterMinutes: Math.round(passingAfterMinutes * 100) / 100,
        items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "passing"),
      },
      {
        key: "discipline",
        label: CATEGORY_LABELS.discipline,
        raw: Math.round(disciplineRaw * 100) / 100,
        afterMinutes: Math.round(disciplineAfterMinutes * 100) / 100,
        items: allItems.filter(i => GK_WEIGHTS[i.stat as keyof typeof GK_WEIGHTS]?.category === "discipline"),
      },
    ];
    
    const rawImpact = goalkeeperRaw + passingRaw + disciplineRaw;
    const impactAfterMinutes = rawImpact * minutesFactor;
    const rating = clamp(BASE_RATING + impactAfterMinutes, 0.0, 10.0);
    const roundedRating = Math.round(rating * 10) / 10;
    
    const sortedItems = [...allItems].sort((a, b) => Math.abs(b.rawDelta) - Math.abs(a.rawDelta));
    
    return {
      hasRating: true,
      rating: roundedRating,
      baseRating: BASE_RATING,
      rawImpact: Math.round(rawImpact * 100) / 100,
      impactAfterMinutes: Math.round(impactAfterMinutes * 100) / 100,
      minutesFactor: Math.round(minutesFactor * 100) / 100,
      minutesPlayed,
      breakdown: {
        attack: 0,
        creation: 0,
        passing: Math.round(passingRaw * 100) / 100,
        defense: 0,
        discipline: Math.round(disciplineRaw * 100) / 100,
        goalkeeper: Math.round(goalkeeperRaw * 100) / 100,
      },
      detailedBreakdown: {
        categories,
        items: sortedItems,
        capsApplied,
        antiInflationApplied: false,
        hasImpactfulAction: true,
      },
      color: getRatingColor(roundedRating),
      bgColor: getRatingBgColor(roundedRating),
      label: getRatingLabel(roundedRating),
    };
  }

  // ===== OUTFIELD PLAYER CALCULATION =====
  
  // === DYNAMIC GOAL WEIGHT CALCULATION ===
  // Calculate participation context for dynamic goal weight (0.80–1.00)
  // Uses: minutesPlayed, actionsWithBall, totalPassesAttempted
  const passesCompleted = Math.max(0, stats.passes_completed);
  const passesFailed = Math.max(0, stats.passes_total); // passes_total stores FAILED count
  const totalPassesAttempted = passesCompleted + passesFailed;
  
  // Calculate actions with ball from participation stats
  // This includes: passes, dribbles, shots, crosses, key passes, chances, recoveries
  const dribblesSuccess = Math.max(0, stats.dribbles_success);
  const dribblesFailed = Math.max(0, stats.dribbles_total); // dribbles_total stores FAILED count
  const actionsWithBall = 
    passesCompleted + passesFailed +
    dribblesSuccess + dribblesFailed +
    Math.max(0, stats.shots) +
    Math.max(0, stats.crosses_success) + Math.max(0, stats.crosses_failed) +
    Math.max(0, stats.key_passes) +
    Math.max(0, stats.chances_created) +
    Math.max(0, stats.recoveries);
  
  const goalWeightContext: GoalWeightContext = {
    minutesPlayed,
    actionsWithBall,
    totalPassesAttempted,
  };
  
  const dynamicGoalWeight = computeGoalWeight(goalWeightContext);
  
  // === ATTACK ===
  // Use dynamic goal weight instead of static 0.80
  const goalItem = addItem("goal", Math.max(0, stats.goals), false, undefined, dynamicGoalWeight);
  const shotOnTargetItem = addItem("shot_on_target", Math.max(0, stats.shots_on_target));
  // shot_off_target = 0 weight, não pontuar
  addItem("shot_off_target", Math.max(0, stats.shots - stats.shots_on_target));
  
  let attackRaw = goalItem.rawDelta + shotOnTargetItem.rawDelta;
  
  // === CREATION (includes assists, key passes, dribbles, crosses, fouls suffered) ===
  const assistItem = addItem("assist", Math.max(0, stats.assists));
  const keyPassItem = addItem("key_pass", Math.max(0, stats.key_passes));
  const chanceCreatedItem = addItem("chance_created", Math.max(0, stats.chances_created));
  const dribbleSuccessItem = addItem("dribble_success", Math.max(0, stats.dribbles_success));
  // CRITICAL FIX: dribbles_total stores FAILED dribbles count, NOT actual total!
  const dribbleFailedItem = addItem("dribble_failed", Math.max(0, stats.dribbles_total));
  const crossSuccessItem = addItem("cross_success", Math.max(0, stats.crosses_success));
  const crossFailedItem = addItem("cross_failed", Math.max(0, stats.crosses_failed));
  const foulSufferedItem = addItem("foul_suffered", Math.max(0, stats.fouls_suffered));
  const possessionLostItem = addItem("possession_lost", Math.max(0, stats.possession_lost));
  
  let creationRaw = assistItem.rawDelta + keyPassItem.rawDelta + chanceCreatedItem.rawDelta + 
                    dribbleSuccessItem.rawDelta + dribbleFailedItem.rawDelta + 
                    crossSuccessItem.rawDelta + crossFailedItem.rawDelta +
                    foulSufferedItem.rawDelta + possessionLostItem.rawDelta;
  
  // === PASSING ===
  // CRITICAL FIX: In our database schema:
  // - passes_completed = count of 'pass_success' events (successful passes)
  // - passes_total = count of 'pass_total' events (FAILED passes, NOT actual total!)
  // The naming is misleading. passes_total actually stores failed pass count.
  const passCompletedItem = addItem("pass_completed", Math.max(0, stats.passes_completed));
  const passFailedItem = addItem("pass_failed", Math.max(0, stats.passes_total)); // passes_total IS the failed count
  
  let passingRaw = passCompletedItem.rawDelta + passFailedItem.rawDelta;
  
  // === OFFENSIVE CAP: Attack + Creation + Passing max +1.0 ===
  const totalOffensiveRaw = attackRaw + creationRaw + passingRaw;
  let offensiveCapped = false;
  if (totalOffensiveRaw > OFFENSIVE_CAP) {
    offensiveCapped = true;
    capsApplied.push({
      key: "offensiveCap",
      label: "Limite ofensivo (Ataque + Criação + Passes)",
      before: Math.round(totalOffensiveRaw * 100) / 100,
      after: OFFENSIVE_CAP,
    });
    // Scale down proportionally
    const scaleFactor = OFFENSIVE_CAP / totalOffensiveRaw;
    attackRaw *= scaleFactor;
    creationRaw *= scaleFactor;
    passingRaw *= scaleFactor;
  }
  
  const attackAfterMinutes = attackRaw * minutesFactor;
  const creationAfterMinutes = creationRaw * minutesFactor;
  const passingAfterMinutes = passingRaw * minutesFactor;
  
  // === DEFENSE (NO CAP) ===
  const tackleItem = addItem("tackle", Math.max(0, stats.tackles));
  const interceptionItem = addItem("interception", Math.max(0, stats.interceptions));
  const clearanceItem = addItem("clearance", Math.max(0, stats.clearances));
  const recoveryItem = addItem("recovery", Math.max(0, stats.recoveries));
  const shotBlockedItem = addItem("shot_blocked", Math.max(0, stats.shots_blocked ?? 0));
  
  // Duels - calculate ground duels from total - aerial
  const groundDuelsWon = Math.max(0, stats.duels_won - stats.aerial_duels_won);
  const groundDuelsLost = Math.max(0, (stats.duels_total - stats.duels_won) - (stats.aerial_duels_total - stats.aerial_duels_won));
  const aerialDuelsWon = Math.max(0, stats.aerial_duels_won);
  const aerialDuelsLost = Math.max(0, stats.aerial_duels_total - stats.aerial_duels_won);
  
  const groundDuelWonItem = addItem("ground_duel_won", groundDuelsWon);
  const groundDuelLostItem = addItem("ground_duel_lost", groundDuelsLost);
  const aerialDuelWonItem = addItem("aerial_duel_won", aerialDuelsWon);
  const aerialDuelLostItem = addItem("aerial_duel_lost", aerialDuelsLost);
  const foulCommittedItem = addItem("foul_committed", Math.max(0, stats.fouls_committed));
  const dribbledPastItem = addItem("dribbled_past", Math.max(0, stats.times_dribbled_past ?? 0));
  
  const defenseRaw = tackleItem.rawDelta + interceptionItem.rawDelta + clearanceItem.rawDelta + 
                     recoveryItem.rawDelta + shotBlockedItem.rawDelta +
                     groundDuelWonItem.rawDelta + groundDuelLostItem.rawDelta +
                     aerialDuelWonItem.rawDelta + aerialDuelLostItem.rawDelta +
                     foulCommittedItem.rawDelta + dribbledPastItem.rawDelta;
  
  const defenseAfterMinutes = defenseRaw * minutesFactor;
  
  // === DISCIPLINE ===
  const yellowItem = addItem("yellow_card", Math.max(0, stats.yellow_cards));
  const redItem = addItem("red_card", Math.max(0, stats.red_cards));
  
  const disciplineRaw = yellowItem.rawDelta + redItem.rawDelta;
  const disciplineAfterMinutes = disciplineRaw * minutesFactor;
  
  // === BUILD CATEGORY BREAKDOWN ===
  const categories: CategoryBreakdown[] = [
    {
      key: "attack",
      label: CATEGORY_LABELS.attack,
      raw: Math.round(attackRaw * 100) / 100,
      afterMinutes: Math.round(attackAfterMinutes * 100) / 100,
      items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "attack"),
    },
    {
      key: "creation",
      label: CATEGORY_LABELS.creation,
      raw: Math.round(creationRaw * 100) / 100,
      afterMinutes: Math.round(creationAfterMinutes * 100) / 100,
      items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "creation"),
    },
    {
      key: "passing",
      label: CATEGORY_LABELS.passing,
      raw: Math.round(passingRaw * 100) / 100,
      afterMinutes: Math.round(passingAfterMinutes * 100) / 100,
      items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "passing"),
    },
    {
      key: "defense",
      label: CATEGORY_LABELS.defense,
      raw: Math.round(defenseRaw * 100) / 100,
      afterMinutes: Math.round(defenseAfterMinutes * 100) / 100,
      items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "defense"),
    },
    {
      key: "discipline",
      label: CATEGORY_LABELS.discipline,
      raw: Math.round(disciplineRaw * 100) / 100,
      afterMinutes: Math.round(disciplineAfterMinutes * 100) / 100,
      items: allItems.filter(i => WEIGHTS[i.stat as keyof typeof WEIGHTS]?.category === "discipline"),
    },
  ];
  
  // === TOTAL RAW IMPACT ===
  const rawImpact = attackRaw + creationRaw + passingRaw + defenseRaw + disciplineRaw;
  const impactAfterMinutes = rawImpact * minutesFactor;
  
  // === ANTI-INFLATION RULE ===
  // Sem gol, assistência ou ação defensiva relevante → max 6.9
  const hasGoal = stats.goals > 0;
  const hasAssist = stats.assists > 0;
  const hasRelevantDefensiveAction = (stats.tackles + stats.interceptions + stats.clearances + (stats.shots_blocked ?? 0)) >= 2;
  const hasImpactfulAction = hasGoal || hasAssist || hasRelevantDefensiveAction;
  
  // === FINAL RATING ===
  let rating = clamp(BASE_RATING + impactAfterMinutes, 0.0, 10.0);
  let antiInflationApplied = false;
  
  if (!hasImpactfulAction && rating > MAX_RATING_WITHOUT_IMPACT) {
    antiInflationApplied = true;
    capsApplied.push({
      key: "antiInflation",
      label: "Sem gol/assist/defesa relevante",
      before: Math.round(rating * 100) / 100,
      after: MAX_RATING_WITHOUT_IMPACT,
    });
    rating = MAX_RATING_WITHOUT_IMPACT;
  }
  
  const roundedRating = Math.round(rating * 10) / 10;
  
  // Sort items by absolute impact (desc)
  const sortedItems = [...allItems].sort((a, b) => Math.abs(b.rawDelta) - Math.abs(a.rawDelta));
  
  return {
    hasRating: true,
    rating: roundedRating,
    baseRating: BASE_RATING,
    rawImpact: Math.round(rawImpact * 100) / 100,
    impactAfterMinutes: Math.round(impactAfterMinutes * 100) / 100,
    minutesFactor: Math.round(minutesFactor * 100) / 100,
    minutesPlayed,
    breakdown: {
      attack: Math.round(attackRaw * 100) / 100,
      creation: Math.round(creationRaw * 100) / 100,
      passing: Math.round(passingRaw * 100) / 100,
      defense: Math.round(defenseRaw * 100) / 100,
      discipline: Math.round(disciplineRaw * 100) / 100,
      goalkeeper: 0,
    },
    detailedBreakdown: {
      categories,
      items: sortedItems,
      capsApplied,
      antiInflationApplied,
      hasImpactfulAction,
    },
    color: getRatingColor(roundedRating),
    bgColor: getRatingBgColor(roundedRating),
    label: getRatingLabel(roundedRating),
  };
}

/**
 * Convert MatchPlayerStats from the hook to PlayerStatsInput
 */
export function matchPlayerStatsToInput(
  stats: MatchPlayerStats | undefined,
  isGoalkeeper = false
): PlayerStatsInput {
  if (!stats) {
    return {
      goals: 0,
      assists: 0,
      shots_on_target: 0,
      shots: 0,
      dribbles_success: 0,
      dribbles_total: 0,
      key_passes: 0,
      chances_created: 0,
      crosses_success: 0,
      crosses_failed: 0,
      passes_completed: 0,
      passes_total: 0,
      interceptions: 0,
      recoveries: 0,
      clearances: 0,
      tackles: 0,
      duels_won: 0,
      duels_total: 0,
      aerial_duels_won: 0,
      aerial_duels_total: 0,
      fouls_committed: 0,
      fouls_suffered: 0,
      possession_lost: 0,
      shots_blocked: 0,
      times_dribbled_past: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      saves_inside_box: 0,
      penalty_saved: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      high_claims: 0,
      punches: 0,
      sweeper_actions: 0,
      errors_led_to_goal: 0,
      isGoalkeeper,
    };
  }
  
  return {
    goals: stats.goals ?? 0,
    assists: stats.assists ?? 0,
    shots_on_target: stats.shots_on_target ?? 0,
    shots: stats.shots ?? 0,
    dribbles_success: stats.dribbles_success ?? 0,
    dribbles_total: stats.dribbles_total ?? 0,
    key_passes: stats.key_passes ?? 0,
    chances_created: stats.chances_created ?? 0,
    crosses_success: stats.crosses_success ?? 0,
    crosses_failed: stats.crosses_failed ?? 0,
    passes_completed: stats.passes_completed ?? 0,
    passes_total: stats.passes_total ?? 0,
    interceptions: stats.interceptions ?? 0,
    recoveries: stats.recoveries ?? 0,
    clearances: stats.clearances ?? 0,
    tackles: stats.tackles ?? 0,
    duels_won: stats.duels_won ?? 0,
    duels_total: stats.duels_total ?? 0,
    aerial_duels_won: stats.aerial_duels_won ?? 0,
    aerial_duels_total: stats.aerial_duels_total ?? 0,
    fouls_committed: stats.fouls_committed ?? 0,
    fouls_suffered: stats.fouls_suffered ?? 0,
    possession_lost: stats.possession_lost ?? 0,
    shots_blocked: stats.shots_blocked ?? 0,
    times_dribbled_past: stats.was_dribbled ?? 0,
    yellow_cards: stats.yellow_cards ?? 0,
    red_cards: stats.red_cards ?? 0,
    // Goalkeeper-specific stats
    saves: stats.saves ?? 0,
    saves_inside_box: 0, // Not tracked per-match in current schema
    penalty_saved: 0, // Not tracked per-match in current schema
    goals_conceded: stats.goals_conceded ?? 0,
    clean_sheets: 0, // Calculated separately
    high_claims: 0, // Not tracked per-match in current schema
    punches: 0, // Not tracked per-match in current schema
    sweeper_actions: 0, // Not tracked per-match in current schema
    errors_led_to_goal: 0, // Not tracked per-match in current schema
    isGoalkeeper,
  };
}

/**
 * Calculate rating for a match player using standardized minutes calculation
 */
export function calculatePlayerMatchRating(
  stats: MatchPlayerStats | undefined,
  playerMinutesInput: MatchPlayerMinutesInput,
  isGoalkeeper = false
): MatchRatingResult {
  const minutesInfo = calculateMinutesPlayed(playerMinutesInput);
  const statsInput = matchPlayerStatsToInput(stats, isGoalkeeper);
  return calculateMatchRating(statsInput, minutesInfo.minutesPlayed);
}

/**
 * Convert persisted rating to MatchRatingResult format for display
 * 
 * SINGLE SOURCE OF TRUTH: Use this to display ratings from match_player_stats.rating
 * instead of recalculating. This ensures consistency across all screens.
 * 
 * @param rating - The persisted rating value (e.g., 6.3)
 * @param minutesPlayed - Minutes the player was on field
 * @param minutesFactor - The factor used during calculation (optional)
 */
export function persistedRatingToResult(
  rating: number,
  minutesPlayed: number,
  minutesFactor: number | null = null
): MatchRatingResult {
  const getLabel = (r: number): string => {
    if (r >= 9.0) return "Excepcional";
    if (r >= 8.0) return "Excelente";
    if (r >= 7.0) return "Muito Bom";
    if (r >= 6.5) return "Bom";
    if (r >= 6.0) return "Regular";
    if (r >= 5.0) return "Fraco";
    return "Muito Fraco";
  };

  return {
    hasRating: true,
    rating,
    baseRating: 6.0,
    rawImpact: rating - 6.0,
    impactAfterMinutes: rating - 6.0,
    minutesFactor: minutesFactor ?? 1.0,
    minutesPlayed,
    breakdown: null,
    detailedBreakdown: null,
    color: getRatingColor(rating),
    bgColor: getRatingBgColor(rating),
    label: getLabel(rating),
  };
}

/**
 * Get a "no rating" result for players with 0 minutes
 */
export function noRatingResult(): MatchRatingResult {
  return {
    hasRating: false,
    rating: null,
    baseRating: 6.0,
    rawImpact: 0,
    impactAfterMinutes: 0,
    minutesFactor: 1.0,
    minutesPlayed: 0,
    breakdown: null,
    detailedBreakdown: null,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Sem nota",
  };
}
