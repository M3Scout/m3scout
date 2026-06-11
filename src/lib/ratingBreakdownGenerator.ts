/**
 * Rating Breakdown Generator
 * 
 * Generates itemized breakdown (count × weight = subtotal) from aggregated stats.
 * Used to display detailed rating explanation even when only persisted category
 * totals are available.
 * 
 * This ensures the "Como a nota foi calculada" modal always shows:
 * - Passe certo: 6 × +0.005 = +0.03
 * - Passe errado: 2 × -0.03 = -0.06
 * etc.
 */

import { 
  WEIGHTS, 
  GK_WEIGHTS, 
  computeGoalWeight,
  type CategoryKey, 
  type BreakdownItem,
  type GoalWeightContext
} from "./matchRatingEngine";
import type { MatchPlayerStats } from "@/hooks/useLiveMatch";

interface StatMapping {
  stat: string;
  label: string;
  weight: number;
  category: CategoryKey;
  getValue: (stats: MatchPlayerStats, isGk: boolean) => number;
  maxImpact?: number;
  /** If true, this stat has dynamic weight based on context */
  hasDynamicWeight?: boolean;
  getDynamicWeight?: (ctx: GoalWeightContext) => number;
}

/**
 * Map of all stats to their breakdown info
 * This is the single source of truth for what generates rating points
 */
const STAT_MAPPINGS: StatMapping[] = [
  // === ATTACK ===
  {
    stat: "goal",
    label: "Gol",
    weight: WEIGHTS.goal.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.goals ?? 0),
    hasDynamicWeight: true,
    getDynamicWeight: computeGoalWeight,
  },
  {
    stat: "penalty_won",
    label: "Pênalti sofrido",
    weight: WEIGHTS.penalty_won.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.penalties_won ?? 0),
  },
  {
    stat: "chance_created",
    label: "Chance criada",
    weight: WEIGHTS.chance_created.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.chances_created ?? 0),
  },
  {
    stat: "shot_on_post",
    label: "Finalização na trave",
    weight: WEIGHTS.shot_on_post.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.shots_on_post ?? 0),
  },
  {
    stat: "shot_on_target",
    label: "Finalização no alvo",
    weight: WEIGHTS.shot_on_target.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.shots_on_target ?? 0),
  },
  {
    stat: "shot_off_target",
    label: "Finalização para fora",
    weight: WEIGHTS.shot_off_target.weight,
    category: "attack",
    getValue: (s) => Math.max(0, s.shots ?? 0),
  },
  
  // === CREATION ===
  {
    stat: "assist",
    label: "Assistência",
    weight: WEIGHTS.assist.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.assists ?? 0),
  },
  {
    stat: "key_pass",
    label: "Passe decisivo",
    weight: WEIGHTS.key_pass.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.key_passes ?? 0),
  },
  {
    stat: "dribble_success",
    label: "Drible certo",
    weight: WEIGHTS.dribble_success.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.dribbles_success ?? 0),
  },
  {
    stat: "dribble_failed",
    label: "Drible errado",
    weight: WEIGHTS.dribble_failed.weight,
    category: "creation",
    // CRITICAL: dribbles_total stores FAILED dribbles count, NOT total!
    getValue: (s) => Math.max(0, s.dribbles_total ?? 0),
  },
  {
    stat: "cross_success",
    label: "Cruzamento certo",
    weight: WEIGHTS.cross_success.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.crosses_success ?? 0),
  },
  {
    stat: "cross_failed",
    label: "Cruzamento errado",
    weight: WEIGHTS.cross_failed.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.crosses_failed ?? 0),
  },
  {
    stat: "foul_suffered",
    label: "Falta sofrida",
    weight: WEIGHTS.foul_suffered.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.fouls_suffered ?? 0),
  },
  {
    stat: "possession_lost",
    label: "Perda de posse",
    weight: WEIGHTS.possession_lost.weight,
    category: "creation",
    getValue: (s) => Math.max(0, s.possession_lost ?? 0),
  },
  
  // === PASSING ===
  {
    stat: "pass_completed",
    label: "Passe certo",
    weight: WEIGHTS.pass_completed.weight,
    category: "passing",
    getValue: (s) => Math.max(0, s.passes_completed ?? 0),
  },
  {
    stat: "pass_failed",
    label: "Passe errado",
    weight: WEIGHTS.pass_failed.weight,
    category: "passing",
    // CRITICAL: passes_total stores FAILED passes count, NOT total!
    getValue: (s) => Math.max(0, s.passes_total ?? 0),
  },
  
  // === DEFENSE ===
  {
    stat: "tackle",
    label: "Desarme",
    weight: WEIGHTS.tackle.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.tackles ?? 0),
  },
  {
    stat: "interception",
    label: "Interceptação",
    weight: WEIGHTS.interception.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.interceptions ?? 0),
  },
  {
    stat: "clearance",
    label: "Corte",
    weight: WEIGHTS.clearance.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.clearances ?? 0),
  },
  {
    stat: "shot_blocked",
    label: "Chute bloqueado",
    weight: WEIGHTS.shot_blocked.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.blocked_shots ?? 0),
  },
  {
    stat: "ground_duel_won",
    label: "Duelo no chão ganho",
    weight: WEIGHTS.ground_duel_won.weight,
    category: "defense",
    getValue: (s) => {
      const groundWon = Math.max(0, (s.duels_won ?? 0) - (s.aerial_duels_won ?? 0));
      return groundWon;
    },
  },
  {
    stat: "ground_duel_lost",
    label: "Duelo no chão perdido",
    weight: WEIGHTS.ground_duel_lost.weight,
    category: "defense",
    getValue: (s) => {
      const totalDuelsLost = Math.max(0, (s.duels_total ?? 0) - (s.duels_won ?? 0));
      const aerialLost = Math.max(0, (s.aerial_duels_total ?? 0) - (s.aerial_duels_won ?? 0));
      return Math.max(0, totalDuelsLost - aerialLost);
    },
  },
  {
    stat: "aerial_duel_won",
    label: "Duelo aéreo ganho",
    weight: WEIGHTS.aerial_duel_won.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.aerial_duels_won ?? 0),
  },
  {
    stat: "aerial_duel_lost",
    label: "Duelo aéreo perdido",
    weight: WEIGHTS.aerial_duel_lost.weight,
    category: "defense",
    getValue: (s) => Math.max(0, (s.aerial_duels_total ?? 0) - (s.aerial_duels_won ?? 0)),
  },
  {
    stat: "foul_committed",
    label: "Falta cometida",
    weight: WEIGHTS.foul_committed.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.fouls_committed ?? 0),
  },
  {
    stat: "dribbled_past",
    label: "Driblado",
    weight: WEIGHTS.dribbled_past.weight,
    category: "defense",
    getValue: (s) => Math.max(0, s.was_dribbled ?? 0),
  },
  
  // === DISCIPLINE ===
  {
    stat: "yellow_card",
    label: "Cartão amarelo",
    weight: WEIGHTS.yellow_card.weight,
    category: "discipline",
    getValue: (s) => Math.max(0, s.yellow_cards ?? 0),
  },
  {
    stat: "red_card",
    label: "Cartão vermelho",
    weight: WEIGHTS.red_card.weight,
    category: "discipline",
    getValue: (s) => Math.max(0, s.red_cards ?? 0),
  },
];

/**
 * Goalkeeper-specific stat mappings
 */
const GK_STAT_MAPPINGS: StatMapping[] = [
  {
    stat: "save",
    label: "Defesa",
    weight: GK_WEIGHTS.save.weight,
    category: "goalkeeper",
    getValue: (s) => Math.max(0, s.saves ?? 0),
  },
  {
    stat: "goal_conceded",
    label: "Gol sofrido",
    weight: GK_WEIGHTS.goal_conceded.weight,
    category: "goalkeeper",
    getValue: (s) => Math.max(0, s.goals_conceded ?? 0),
  },
  // Passes (same for GK)
  {
    stat: "pass_completed",
    label: "Passe certo",
    weight: GK_WEIGHTS.pass_completed.weight,
    category: "passing",
    getValue: (s) => Math.max(0, s.passes_completed ?? 0),
  },
  {
    stat: "pass_failed",
    label: "Passe errado",
    weight: GK_WEIGHTS.pass_failed.weight,
    category: "passing",
    getValue: (s) => Math.max(0, s.passes_total ?? 0),
  },
  // Discipline (same for GK)
  {
    stat: "yellow_card",
    label: "Cartão amarelo",
    weight: GK_WEIGHTS.yellow_card.weight,
    category: "discipline",
    getValue: (s) => Math.max(0, s.yellow_cards ?? 0),
  },
  {
    stat: "red_card",
    label: "Cartão vermelho",
    weight: GK_WEIGHTS.red_card.weight,
    category: "discipline",
    getValue: (s) => Math.max(0, s.red_cards ?? 0),
  },
];

export interface CategoryItemizedBreakdown {
  key: CategoryKey;
  label: string;
  items: BreakdownItem[];
  rawTotal: number;
}

/**
 * Generate itemized breakdown from match player stats
 * Returns breakdown items grouped by category with count × weight = subtotal
 * 
 * @param stats - Match player stats
 * @param minutesFactor - Minutes factor for rating calculation
 * @param isGoalkeeper - Whether the player is a goalkeeper
 * @param minutesPlayed - Optional: minutes played for dynamic goal weight calculation
 */
export function generateBreakdownItemsFromStats(
  stats: MatchPlayerStats,
  minutesFactor: number,
  isGoalkeeper = false,
  minutesPlayed?: number
): CategoryItemizedBreakdown[] {
  const mappings = isGoalkeeper ? GK_STAT_MAPPINGS : STAT_MAPPINGS;
  
  // Calculate context for dynamic goal weight
  const passesCompleted = Math.max(0, stats.passes_completed ?? 0);
  const passesFailed = Math.max(0, stats.passes_total ?? 0); // passes_total stores FAILED count
  const totalPassesAttempted = passesCompleted + passesFailed;
  
  const dribblesSuccess = Math.max(0, stats.dribbles_success ?? 0);
  const dribblesFailed = Math.max(0, stats.dribbles_total ?? 0); // dribbles_total stores FAILED count
  const actionsWithBall = 
    passesCompleted + passesFailed +
    dribblesSuccess + dribblesFailed +
    Math.max(0, stats.shots ?? 0) +
    Math.max(0, stats.crosses_success ?? 0) + Math.max(0, stats.crosses_failed ?? 0) +
    Math.max(0, stats.key_passes ?? 0) +
    Math.max(0, stats.chances_created ?? 0) +
    Math.max(0, stats.recoveries ?? 0);
  
  const goalWeightContext: GoalWeightContext = {
    minutesPlayed: minutesPlayed ?? 0,
    actionsWithBall,
    totalPassesAttempted,
  };
  
  const categoryMap = new Map<CategoryKey, BreakdownItem[]>();
  
  for (const mapping of mappings) {
    const count = mapping.getValue(stats, isGoalkeeper);
    
    // Skip items with count = 0 (cleaner UI)
    if (count === 0) continue;
    
    // Use dynamic weight if available (for goal)
    let effectiveWeight = mapping.weight;
    if (mapping.hasDynamicWeight && mapping.getDynamicWeight) {
      effectiveWeight = mapping.getDynamicWeight(goalWeightContext);
    }
    
    let rawDelta = count * effectiveWeight;
    let capped = false;
    let originalDelta = rawDelta;
    
    // Apply per-stat max impact cap
    if (mapping.maxImpact !== undefined && rawDelta > mapping.maxImpact) {
      capped = true;
      originalDelta = rawDelta;
      rawDelta = mapping.maxImpact;
    }
    
    const afterMinutes = rawDelta * minutesFactor;
    
    const item: BreakdownItem = {
      stat: mapping.stat,
      label: mapping.label,
      count,
      weight: effectiveWeight, // Use the dynamic weight for display
      rawDelta: Math.round(rawDelta * 1000) / 1000,
      afterMinutes: Math.round(afterMinutes * 1000) / 1000,
      capped,
      originalDelta: capped ? Math.round(originalDelta * 1000) / 1000 : undefined,
    };
    
    if (!categoryMap.has(mapping.category)) {
      categoryMap.set(mapping.category, []);
    }
    categoryMap.get(mapping.category)!.push(item);
  }
  
  // Build category breakdowns
  const categoryLabels: Record<CategoryKey, string> = {
    attack: "Ataque",
    creation: "Criação/Dribles",
    passing: "Passes",
    defense: "Defesa",
    discipline: "Disciplina",
    goalkeeper: "Goleiro",
  };
  
  const result: CategoryItemizedBreakdown[] = [];
  
  // Order: attack, creation, passing, defense, discipline, goalkeeper
  const orderedCategories: CategoryKey[] = isGoalkeeper
    ? ["goalkeeper", "passing", "discipline"]
    : ["attack", "creation", "passing", "defense", "discipline"];
  
  for (const key of orderedCategories) {
    const items = categoryMap.get(key) ?? [];
    const rawTotal = items.reduce((sum, item) => sum + item.rawDelta, 0);
    
    result.push({
      key,
      label: categoryLabels[key],
      items: items.sort((a, b) => Math.abs(b.rawDelta) - Math.abs(a.rawDelta)),
      rawTotal: Math.round(rawTotal * 100) / 100,
    });
  }
  
  return result;
}

/**
 * Format a single breakdown item for display
 * Ex: "Passe certo: 6 × +0.005 = +0.03"
 */
export function formatBreakdownItem(item: BreakdownItem): string {
  const weightSign = item.weight >= 0 ? "+" : "";
  const deltaSign = item.rawDelta >= 0 ? "+" : "";
  
  return `${item.label}: ${item.count} × ${weightSign}${item.weight.toFixed(3)} = ${deltaSign}${item.rawDelta.toFixed(2)}`;
}
