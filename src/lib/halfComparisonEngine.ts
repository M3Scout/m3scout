/**
 * Half Comparison Engine
 * 
 * Compares player performance between 1st half and 2nd half.
 * 
 * SAFETY RULES:
 * - NO new stats created
 * - NO database writes
 * - NO impact on player rating
 * - Read-only derived calculations
 * - Executes only after match is finished
 */

import { type ZoneDistribution, calculateZoneHeatmap, type MatchStatsInput } from "./postGameAnalysis";

// ============================================
// TYPES
// ============================================

export interface HalfZoneData {
  firstHalf: ZoneDistribution;
  secondHalf: ZoneDistribution;
}

export type HalfChangeDirection = "1st_stronger" | "2nd_stronger" | "balanced";

export interface ZoneHalfChange {
  zone: "ATAQUE" | "MEIO" | "DEFESA";
  direction: HalfChangeDirection;
  /** Absolute difference in percentage points */
  diff: number;
  firstHalfPct: number;
  secondHalfPct: number;
  /** Whether this is a strong change (>= 12%) */
  isStrong: boolean;
}

export interface HalfComparisonResult {
  /** Whether any relevant change was found */
  hasChange: boolean;
  /** List of zone changes (only zones with >= 8% diff) */
  changes: ZoneHalfChange[];
  /** Zone distributions for each half */
  halfData: HalfZoneData;
  /** Auto-generated insight text (1 sentence, technical, no numbers) */
  insightText: string | null;
  /** Primary trend direction */
  primaryTrend: "more_offensive" | "more_defensive" | "more_balanced" | "no_change";
}

// ============================================
// CONSTANTS
// ============================================

/** Threshold for relevant change (percentage points) */
const RELEVANT_CHANGE_THRESHOLD = 8;

/** Threshold for strong change (percentage points) */
const STRONG_CHANGE_THRESHOLD = 12;

// ============================================
// STATS SPLITTING BY HALF
// ============================================

export interface MatchEvent {
  minute?: number | null;
  game_time_seconds?: number | null;
  half?: number | null;
  period?: number | null;
  event_type: string;
  player_id: string;
  value?: number;
  count_in_stats?: boolean;
  event_status?: string;
}

/**
 * Determine if an event belongs to first half
 * - minute <= 45 (including stoppage)
 * - OR game_time_seconds <= 2700 (45 * 60)
 * - OR half/period === 1
 */
function isFirstHalfEvent(event: MatchEvent): boolean {
  // Priority: use half/period if available
  if (event.half != null) return event.half === 1;
  if (event.period != null) return event.period === 1;
  
  // Fallback to minute
  if (event.minute != null) return event.minute <= 45;
  
  // Fallback to game_time_seconds (45 min = 2700 seconds)
  if (event.game_time_seconds != null) return event.game_time_seconds <= 2700;
  
  // Default to first half if no timing info
  return true;
}

/**
 * Aggregate stats from events by half
 */
export function splitStatsByHalf(
  events: MatchEvent[],
  playerStats: MatchStatsInput
): { firstHalf: MatchStatsInput; secondHalf: MatchStatsInput } {
  // Filter valid events (not voided, counts in stats)
  const validEvents = events.filter(e => 
    e.event_status !== "voided" && 
    e.count_in_stats !== false
  );

  const firstHalfEvents = validEvents.filter(isFirstHalfEvent);
  const secondHalfEvents = validEvents.filter(e => !isFirstHalfEvent(e));

  // Aggregate stats by event type per half
  const aggregateByType = (evts: MatchEvent[]) => {
    const stats: Partial<MatchStatsInput> = {};
    
    evts.forEach(event => {
      const val = event.value ?? 1;
      switch (event.event_type) {
        case "goal": stats.goals = (stats.goals ?? 0) + val; break;
        case "assist": stats.assists = (stats.assists ?? 0) + val; break;
        case "shot": stats.shots = (stats.shots ?? 0) + val; break;
        case "shot_on_target": stats.shots_on_target = (stats.shots_on_target ?? 0) + val; break;
        case "key_pass": stats.key_passes = (stats.key_passes ?? 0) + val; break;
        case "chance_created": stats.chances_created = (stats.chances_created ?? 0) + val; break;
        case "pass_completed": stats.passes_completed = (stats.passes_completed ?? 0) + val; break;
        case "pass_failed": 
          stats.passes_total = (stats.passes_total ?? 0) + val;
          break;
        case "dribble_success": stats.dribbles_success = (stats.dribbles_success ?? 0) + val; break;
        case "dribble_fail": stats.dribbles_total = (stats.dribbles_total ?? 0) + val; break;
        case "tackle": stats.tackles = (stats.tackles ?? 0) + val; break;
        case "interception": stats.interceptions = (stats.interceptions ?? 0) + val; break;
        case "clearance": stats.clearances = (stats.clearances ?? 0) + val; break;
        case "recovery": stats.recoveries = (stats.recoveries ?? 0) + val; break;
        case "duel_won": stats.duels_won = (stats.duels_won ?? 0) + val; break;
        case "duel_lost": stats.duels_total = (stats.duels_total ?? 0) + val; break;
        case "aerial_won": stats.aerial_duels_won = (stats.aerial_duels_won ?? 0) + val; break;
        case "aerial_lost": stats.aerial_duels_total = (stats.aerial_duels_total ?? 0) + val; break;
        case "foul_committed": stats.fouls_committed = (stats.fouls_committed ?? 0) + val; break;
        case "foul_suffered": stats.fouls_suffered = (stats.fouls_suffered ?? 0) + val; break;
        case "possession_lost": stats.possession_lost = (stats.possession_lost ?? 0) + val; break;
        case "save": stats.saves = (stats.saves ?? 0) + val; break;
        case "goal_conceded": stats.goals_conceded = (stats.goals_conceded ?? 0) + val; break;
        case "blocked_shot": stats.blocked_shots = (stats.blocked_shots ?? 0) + val; break;
        case "was_dribbled": stats.was_dribbled = (stats.was_dribbled ?? 0) + val; break;
        case "ball_action": stats.ball_actions = (stats.ball_actions ?? 0) + val; break;
        case "cross_success": stats.crosses_success = (stats.crosses_success ?? 0) + val; break;
        case "cross_fail": stats.crosses_failed = (stats.crosses_failed ?? 0) + val; break;
        case "offside": stats.offsides = (stats.offsides ?? 0) + val; break;
        case "shot_blocked": stats.shots_blocked = (stats.shots_blocked ?? 0) + val; break;
      }
    });

    // Fix totals
    if (stats.passes_completed) {
      stats.passes_total = (stats.passes_total ?? 0) + stats.passes_completed;
    }
    if (stats.dribbles_success) {
      stats.dribbles_total = (stats.dribbles_total ?? 0) + stats.dribbles_success;
    }
    if (stats.duels_won) {
      stats.duels_total = (stats.duels_total ?? 0) + stats.duels_won;
    }
    if (stats.aerial_duels_won) {
      stats.aerial_duels_total = (stats.aerial_duels_total ?? 0) + stats.aerial_duels_won;
    }

    return stats as MatchStatsInput;
  };

  // If no events, split player stats 50/50 as approximation
  if (validEvents.length === 0) {
    const half = (val: number | undefined) => val ? Math.floor(val / 2) : 0;
    const splitStats: MatchStatsInput = {
      goals: half(playerStats.goals),
      assists: half(playerStats.assists),
      shots: half(playerStats.shots),
      shots_on_target: half(playerStats.shots_on_target),
      key_passes: half(playerStats.key_passes),
      chances_created: half(playerStats.chances_created),
      passes_completed: half(playerStats.passes_completed),
      passes_total: half(playerStats.passes_total),
      dribbles_success: half(playerStats.dribbles_success),
      dribbles_total: half(playerStats.dribbles_total),
      tackles: half(playerStats.tackles),
      interceptions: half(playerStats.interceptions),
      clearances: half(playerStats.clearances),
      recoveries: half(playerStats.recoveries),
      duels_won: half(playerStats.duels_won),
      duels_total: half(playerStats.duels_total),
      aerial_duels_won: half(playerStats.aerial_duels_won),
      aerial_duels_total: half(playerStats.aerial_duels_total),
      fouls_committed: half(playerStats.fouls_committed),
      fouls_suffered: half(playerStats.fouls_suffered),
      possession_lost: half(playerStats.possession_lost),
      saves: half(playerStats.saves),
      goals_conceded: half(playerStats.goals_conceded),
      blocked_shots: half(playerStats.blocked_shots),
      was_dribbled: half(playerStats.was_dribbled),
      ball_actions: half(playerStats.ball_actions),
      crosses_success: half(playerStats.crosses_success),
      crosses_failed: half(playerStats.crosses_failed),
      offsides: half(playerStats.offsides),
      shots_blocked: half(playerStats.shots_blocked),
    };
    return { firstHalf: splitStats, secondHalf: splitStats };
  }

  return {
    firstHalf: aggregateByType(firstHalfEvents),
    secondHalf: aggregateByType(secondHalfEvents),
  };
}

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

/**
 * Compare zone distribution between 1st and 2nd half
 */
export function calculateHalfComparison(
  position: string,
  firstHalfStats: MatchStatsInput,
  secondHalfStats: MatchStatsInput
): HalfComparisonResult {
  // Calculate zone heatmaps for each half
  const firstHalfHeatmap = calculateZoneHeatmap(position, firstHalfStats, 45);
  const secondHalfHeatmap = calculateZoneHeatmap(position, secondHalfStats, 45);

  const halfData: HalfZoneData = {
    firstHalf: firstHalfHeatmap.percentages,
    secondHalf: secondHalfHeatmap.percentages,
  };

  const changes: ZoneHalfChange[] = [];

  // Check each zone for changes
  const zones: Array<{ key: keyof ZoneDistribution; label: "ATAQUE" | "MEIO" | "DEFESA" }> = [
    { key: "attack", label: "ATAQUE" },
    { key: "midfield", label: "MEIO" },
    { key: "defense", label: "DEFESA" },
  ];

  for (const { key, label } of zones) {
    const first = halfData.firstHalf[key];
    const second = halfData.secondHalf[key];
    const diff = second - first;
    const absDiff = Math.abs(diff);

    // Only include if change >= 8%
    if (absDiff >= RELEVANT_CHANGE_THRESHOLD) {
      changes.push({
        zone: label,
        direction: diff > 0 ? "2nd_stronger" : "1st_stronger",
        diff: absDiff,
        firstHalfPct: first,
        secondHalfPct: second,
        isStrong: absDiff >= STRONG_CHANGE_THRESHOLD,
      });
    }
  }

  // Sort by absolute difference (highest first)
  changes.sort((a, b) => b.diff - a.diff);

  // Determine primary trend
  let primaryTrend: HalfComparisonResult["primaryTrend"] = "no_change";
  let insightText: string | null = null;

  if (changes.length > 0) {
    const primaryChange = changes[0];
    
    // Generate insight text based on primary change
    if (primaryChange.zone === "ATAQUE") {
      if (primaryChange.direction === "2nd_stronger") {
        insightText = "Atuação mais ofensiva no segundo tempo.";
        primaryTrend = "more_offensive";
      } else {
        insightText = "Maior presença ofensiva no primeiro tempo.";
        primaryTrend = "more_defensive"; // relative
      }
    } else if (primaryChange.zone === "DEFESA") {
      if (primaryChange.direction === "2nd_stronger") {
        insightText = "Maior presença defensiva após o intervalo.";
        primaryTrend = "more_defensive";
      } else {
        insightText = "Participação mais defensiva no primeiro tempo.";
        primaryTrend = "more_offensive"; // relative
      }
    } else if (primaryChange.zone === "MEIO") {
      if (primaryChange.direction === "2nd_stronger") {
        insightText = "Maior envolvimento na construção no segundo tempo.";
      } else {
        insightText = "Participação mais central no primeiro tempo.";
      }
      primaryTrend = "more_balanced";
    }
  }

  return {
    hasChange: changes.length > 0,
    changes,
    halfData,
    insightText,
    primaryTrend,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get icon for trend direction
 */
export function getHalfTrendIcon(trend: HalfComparisonResult["primaryTrend"]): string {
  switch (trend) {
    case "more_offensive": return "⚡";
    case "more_defensive": return "🛡️";
    case "more_balanced": return "⚖️";
    default: return "";
  }
}
