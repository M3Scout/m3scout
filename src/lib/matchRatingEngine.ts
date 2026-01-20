/**
 * Match Rating Engine v1.5 (SofaScore-style)
 * 
 * Calculates a 0.0-10.0 rating for each player based on their live match stats.
 * 
 * BASE FORMULA:
 * - baseRating = 6.0
 * - minutesFactor = clamp(sqrt(minutesPlayed / 90), 0.35, 1.0)
 * - rawImpact = sum of (stat * weight) for all stats
 * - offensiveImpact = min(offensiveImpact, OFFENSIVE_CAP) // Anti-explosion
 * - impactTotal = rawImpact * minutesFactor
 * - ratingFinal = clamp(6.0 + impactTotal, 0.0, 10.0)
 * 
 * COLOR BANDS (SofaScore-style):
 * - 0.0-5.9 = Red
 * - 6.0-6.4 = Orange
 * - 6.5-6.9 = Yellow/Amber
 * - 7.0-7.9 = Green
 * - 8.0-8.9 = Cyan
 * - 9.0-10.0 = Blue
 * 
 * CRITICAL: Only active events count (voided events are excluded)
 */

import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import type { MatchPlayerMinutesInput } from "./minutesPlayed";
import { calculateMinutesPlayed } from "./minutesPlayed";

// === WEIGHT CONSTANTS (Modelo Moderado v1.4) ===

export const WEIGHTS = {
  // ATTACK
  goal: { weight: 0.45, label: "Gol", category: "attack" as const },
  assist: { weight: 0.35, label: "Assistência", category: "attack" as const },
  shot_on_target: { weight: 0.15, label: "Finalização no alvo", category: "attack" as const },
  shot_off_target: { weight: 0.05, label: "Finalização fora", category: "attack" as const },
  shot_blocked: { weight: 0.03, label: "Finalização bloqueada", category: "attack" as const },
  
  // CREATION / DRIBBLE
  dribble_success: { weight: 0.10, label: "Drible certo", category: "creation" as const },
  dribble_failed: { weight: -0.08, label: "Drible errado", category: "creation" as const },
  key_pass: { weight: 0.10, label: "Passe-chave", category: "creation" as const },
  chance_created: { weight: 0.14, label: "Chance criada", category: "creation" as const },
  
  // PASSES
  pass_completed: { weight: 0.01, label: "Passe certo", category: "passing" as const },
  pass_failed: { weight: -0.02, label: "Passe errado", category: "passing" as const },
  
  // DEFENSE
  interception: { weight: 0.10, label: "Interceptação", category: "defense" as const },
  recovery: { weight: 0.07, label: "Recuperação", category: "defense" as const },
  clearance: { weight: 0.06, label: "Corte", category: "defense" as const },
  tackle: { weight: 0.12, label: "Desarme", category: "defense" as const },
  
  // DISCIPLINE
  yellow_card: { weight: -0.20, label: "Cartão amarelo", category: "discipline" as const },
  red_card: { weight: -0.80, label: "Cartão vermelho", category: "discipline" as const },
} as const;

// Anti-explosion cap for offensive stats
const OFFENSIVE_CAP = 1.20;

// Base rating
const BASE_RATING = 6.0;

// === TYPES ===

export type CategoryKey = "attack" | "creation" | "passing" | "defense" | "discipline";

export interface BreakdownItem {
  stat: string;
  label: string;
  count: number;
  weight: number;
  rawDelta: number;
  afterMinutes: number;
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
}

export interface RatingBreakdown {
  attack: number;
  creation: number;
  passing: number;
  defense: number;
  discipline: number;
}

export interface MatchRatingResult {
  /** Whether the player has a valid rating (played > 0 minutes) */
  hasRating: boolean;
  /** Final rating 0.0-10.0 (null if no rating) */
  rating: number | null;
  /** Base rating (6.0) */
  baseRating: number;
  /** Raw impact before minutes factor */
  rawImpact: number;
  /** Impact after minutes factor applied */
  impactAfterMinutes: number;
  /** Minutes factor applied (0.35-1.0) */
  minutesFactor: number;
  /** Minutes played (0-90+) */
  minutesPlayed: number;
  /** Simple impact breakdown by category (null if no rating) */
  breakdown: RatingBreakdown | null;
  /** Detailed breakdown with items and caps (null if no rating) */
  detailedBreakdown: DetailedBreakdown | null;
  /** Color class for display */
  color: string;
  /** Background color class for badges */
  bgColor: string;
  /** Label for display (Excepcional/Excelente/etc) */
  label: string;
}

export interface PlayerStatsInput {
  // Attack
  goals: number;
  assists: number;
  shots_on_target: number;
  shots: number; // Total shots (includes on_target)
  
  // Creation
  dribbles_success: number;
  dribbles_total: number;
  key_passes: number;
  chances_created: number;
  
  // Passing
  passes_completed: number;
  passes_total: number;
  
  // Defense
  interceptions: number;
  recoveries: number;
  clearances: number;
  tackles: number;
  
  // Discipline
  yellow_cards: number;
  red_cards: number;
}

// === HELPER FUNCTIONS ===

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate minutes factor based on minutes played
 * sqrt(minutesPlayed / 90), clamped between 0.35 and 1.0
 */
function calculateMinutesFactor(minutesPlayed: number): number {
  if (minutesPlayed <= 0) return 0.35;
  return clamp(Math.sqrt(minutesPlayed / 90), 0.35, 1.0);
}

/**
 * Get rating color based on value (SofaScore bands)
 * 0.0-5.9 = Red, 6.0-6.4 = Orange, 6.5-6.9 = Amber, 7.0-7.9 = Green, 8.0-8.9 = Cyan, 9.0-10.0 = Blue
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
 * Get rating background color for badges (SofaScore bands)
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
 * Get hex color for PDF rendering (SofaScore bands)
 */
export function getRatingHexColor(rating: number): string {
  if (rating < 6.0) return "#ef4444"; // red-500
  if (rating < 6.5) return "#f97316"; // orange-500
  if (rating < 7.0) return "#f59e0b"; // amber-500
  if (rating < 8.0) return "#22c55e"; // green-500
  if (rating < 9.0) return "#06b6d4"; // cyan-500
  return "#3b82f6"; // blue-500
}

/**
 * Get rating label based on value
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
};

// === MAIN CALCULATION ===

/**
 * Calculate match rating for a player based on their stats
 * 
 * @param stats - Player stats from match_player_stats table
 * @param minutesPlayed - Minutes played in the match
 * @returns MatchRatingResult with rating, breakdown, and display info
 */
export function calculateMatchRating(
  stats: PlayerStatsInput,
  minutesPlayed: number
): MatchRatingResult {
  // CRITICAL: Players with 0 minutes don't get a rating
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

  const minutesFactor = calculateMinutesFactor(minutesPlayed);
  const allItems: BreakdownItem[] = [];
  const capsApplied: CapApplied[] = [];
  
  // Helper to add breakdown item
  const addItem = (stat: string, count: number): BreakdownItem => {
    const weightInfo = WEIGHTS[stat as keyof typeof WEIGHTS];
    const weight = weightInfo?.weight ?? 0;
    const label = weightInfo?.label ?? stat;
    const rawDelta = count * weight;
    const afterMinutes = rawDelta * minutesFactor;
    
    const item: BreakdownItem = {
      stat,
      label,
      count,
      weight,
      rawDelta: Math.round(rawDelta * 1000) / 1000,
      afterMinutes: Math.round(afterMinutes * 1000) / 1000,
    };
    
    if (count !== 0) {
      allItems.push(item);
    }
    
    return item;
  };

  // === ATTACK ITEMS ===
  const goalItem = addItem("goal", Math.max(0, stats.goals));
  const assistItem = addItem("assist", Math.max(0, stats.assists));
  const shotOnTargetItem = addItem("shot_on_target", Math.max(0, stats.shots_on_target));
  const shotOffTargetItem = addItem("shot_off_target", Math.max(0, stats.shots - stats.shots_on_target));
  
  let attackRaw = goalItem.rawDelta + assistItem.rawDelta + shotOnTargetItem.rawDelta + shotOffTargetItem.rawDelta;
  const attackBeforeCap = attackRaw;
  
  // Apply offensive cap
  if (attackRaw > OFFENSIVE_CAP) {
    capsApplied.push({
      key: "offensiveCap",
      label: "Limite de ataque",
      before: Math.round(attackRaw * 100) / 100,
      after: OFFENSIVE_CAP,
    });
    attackRaw = OFFENSIVE_CAP;
  }
  
  const attackAfterMinutes = attackRaw * minutesFactor;
  
  // === CREATION ITEMS ===
  const dribbleSuccessItem = addItem("dribble_success", Math.max(0, stats.dribbles_success));
  const dribbleFailedItem = addItem("dribble_failed", Math.max(0, stats.dribbles_total - stats.dribbles_success));
  const keyPassItem = addItem("key_pass", Math.max(0, stats.key_passes));
  const chanceCreatedItem = addItem("chance_created", Math.max(0, stats.chances_created));
  
  const creationRaw = dribbleSuccessItem.rawDelta + dribbleFailedItem.rawDelta + keyPassItem.rawDelta + chanceCreatedItem.rawDelta;
  const creationAfterMinutes = creationRaw * minutesFactor;
  
  // === PASSING ITEMS ===
  const passCompletedItem = addItem("pass_completed", Math.max(0, stats.passes_completed));
  const passFailedItem = addItem("pass_failed", Math.max(0, stats.passes_total - stats.passes_completed));
  
  const passingRaw = passCompletedItem.rawDelta + passFailedItem.rawDelta;
  const passingAfterMinutes = passingRaw * minutesFactor;
  
  // === DEFENSE ITEMS ===
  const interceptionItem = addItem("interception", Math.max(0, stats.interceptions));
  const recoveryItem = addItem("recovery", Math.max(0, stats.recoveries));
  const clearanceItem = addItem("clearance", Math.max(0, stats.clearances));
  const tackleItem = addItem("tackle", Math.max(0, stats.tackles));
  
  const defenseRaw = interceptionItem.rawDelta + recoveryItem.rawDelta + clearanceItem.rawDelta + tackleItem.rawDelta;
  const defenseAfterMinutes = defenseRaw * minutesFactor;
  
  // === DISCIPLINE ITEMS ===
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
  
  // === FINAL RATING ===
  const rating = clamp(BASE_RATING + impactAfterMinutes, 0.0, 10.0);
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
    },
    detailedBreakdown: {
      categories,
      items: sortedItems,
      capsApplied,
    },
    color: getRatingColor(roundedRating),
    bgColor: getRatingBgColor(roundedRating),
    label: getRatingLabel(roundedRating),
  };
}

/**
 * Convert MatchPlayerStats from the hook to PlayerStatsInput
 */
export function matchPlayerStatsToInput(stats: MatchPlayerStats | undefined): PlayerStatsInput {
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
      passes_completed: 0,
      passes_total: 0,
      interceptions: 0,
      recoveries: 0,
      clearances: 0,
      tackles: 0,
      yellow_cards: 0,
      red_cards: 0,
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
    passes_completed: stats.passes_completed ?? 0,
    passes_total: stats.passes_total ?? 0,
    interceptions: stats.interceptions ?? 0,
    recoveries: stats.recoveries ?? 0,
    clearances: stats.clearances ?? 0,
    tackles: stats.tackles ?? 0,
    yellow_cards: stats.yellow_cards ?? 0,
    red_cards: stats.red_cards ?? 0,
  };
}

/**
 * Calculate rating for a match player using standardized minutes calculation
 */
export function calculatePlayerMatchRating(
  stats: MatchPlayerStats | undefined,
  playerMinutesInput: MatchPlayerMinutesInput
): MatchRatingResult {
  const minutesInfo = calculateMinutesPlayed(playerMinutesInput);
  const statsInput = matchPlayerStatsToInput(stats);
  return calculateMatchRating(statsInput, minutesInfo.minutesPlayed);
}
