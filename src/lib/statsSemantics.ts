/**
 * Stats Semantics - SINGLE SOURCE OF TRUTH
 * 
 * This file defines the canonical mapping between:
 * 1. Database fields (match_player_stats, player_stats)
 * 2. Event types (match_events)
 * 3. Display metrics (X/Y format in UI)
 * 
 * CRITICAL: Database fields named "total" actually store FAILED/LOST counts.
 * This is a legacy naming convention that MUST be accounted for everywhere.
 * 
 * @author M3 Scouting Technical Team
 * @version 1.0 - Canonical stats semantics documentation
 */

import type { Database } from "@/integrations/supabase/types";

export type MatchEventType = Database["public"]["Enums"]["match_event_type"];

// ============================================
// PHASE 1: DATABASE FIELD SEMANTICS
// ============================================

/**
 * CANONICAL FIELD MAPPING
 * 
 * This documents what each database field ACTUALLY stores.
 * Fields named "*_total" are MISLEADINGLY named - they store FAILED/LOST counts.
 * 
 * ╔═══════════════════════════════╦═══════════════════════════════════════════════════════╗
 * ║ Database Field                ║ ACTUAL Semantic Meaning                               ║
 * ╠═══════════════════════════════╬═══════════════════════════════════════════════════════╣
 * ║ passes_completed              ║ SUCCESS - count of pass_success events                ║
 * ║ passes_total                  ║ FAILED - count of pass_total (failed) events          ║
 * ║ dribbles_success              ║ SUCCESS - count of dribble_success events             ║
 * ║ dribbles_total                ║ FAILED - count of dribble_attempt (failed) events     ║
 * ║ crosses_success               ║ SUCCESS - count of cross_success events               ║
 * ║ crosses_failed                ║ FAILED - count of cross_failed events                 ║
 * ║ aerial_duels_won              ║ WON - count of aerial_duel_won events                 ║
 * ║ aerial_duels_total            ║ LOST - count of aerial_duel_total (lost) events       ║
 * ║ ground_duels_won              ║ WON - count of ground_duel_won events                 ║
 * ║ ground_duels_total            ║ LOST - count of ground_duel_total (lost) events       ║
 * ║ duels_won                     ║ WON - derived: aerial_duels_won + ground_duels_won    ║
 * ║ duels_total                   ║ LOST - derived: aerial_duels_total + ground_duels_total║
 * ║ shots                         ║ OFF-TARGET shots (shot event = missed)                ║
 * ║ shots_on_target               ║ ON-TARGET shots (excludes goals)                      ║
 * ║ shots_blocked                 ║ BLOCKED shots (offensive - our shot was blocked)      ║
 * ╚═══════════════════════════════╩═══════════════════════════════════════════════════════╝
 */

// ============================================
// PHASE 2: EVENT → METRIC MAPPING
// ============================================

export interface EventMetricMapping {
  /** Event type from match_events */
  eventType: MatchEventType;
  /** Database field this event increments */
  dbField: string;
  /** Semantic meaning: success, fail, won, lost, or count */
  semantic: "success" | "fail" | "won" | "lost" | "count";
  /** Metric group this contributes to */
  metricGroup: "passes" | "dribbles" | "crosses" | "aerialDuels" | "groundDuels" | "shots" | "other";
  /** Human-readable label */
  label: string;
}

/**
 * CANONICAL EVENT → METRIC MAPPING
 * 
 * This is the SINGLE SOURCE OF TRUTH for how events translate to database fields.
 * Only events listed here can affect X/Y metrics.
 */
export const EVENT_METRIC_MAPPINGS: EventMetricMapping[] = [
  // === PASSES ===
  { eventType: "pass_success", dbField: "passes_completed", semantic: "success", metricGroup: "passes", label: "Passe Certo" },
  { eventType: "pass_total", dbField: "passes_total", semantic: "fail", metricGroup: "passes", label: "Passe Errado" },
  
  // === DRIBBLES ===
  { eventType: "dribble_success", dbField: "dribbles_success", semantic: "success", metricGroup: "dribbles", label: "Drible Certo" },
  { eventType: "dribble_attempt", dbField: "dribbles_total", semantic: "fail", metricGroup: "dribbles", label: "Drible Errado" },
  
  // === CROSSES ===
  { eventType: "cross_success", dbField: "crosses_success", semantic: "success", metricGroup: "crosses", label: "Cruzamento Certo" },
  { eventType: "cross_failed", dbField: "crosses_failed", semantic: "fail", metricGroup: "crosses", label: "Cruzamento Errado" },
  
  // === AERIAL DUELS ===
  { eventType: "aerial_duel_won", dbField: "aerial_duels_won", semantic: "won", metricGroup: "aerialDuels", label: "Duelo Aéreo Ganho" },
  { eventType: "aerial_duel_total", dbField: "aerial_duels_total", semantic: "lost", metricGroup: "aerialDuels", label: "Duelo Aéreo Perdido" },
  
  // === GROUND DUELS ===
  { eventType: "ground_duel_won", dbField: "ground_duels_won", semantic: "won", metricGroup: "groundDuels", label: "Duelo Chão Ganho" },
  { eventType: "ground_duel_total", dbField: "ground_duels_total", semantic: "lost", metricGroup: "groundDuels", label: "Duelo Chão Perdido" },
  
  // === SHOTS ===
  { eventType: "shot", dbField: "shots", semantic: "fail", metricGroup: "shots", label: "Finalização Fora" },
  { eventType: "shot_on_target", dbField: "shots_on_target", semantic: "success", metricGroup: "shots", label: "Finalização no Gol" },
  { eventType: "shot_blocked", dbField: "shots_blocked", semantic: "count", metricGroup: "shots", label: "Finalização Bloqueada" },
  { eventType: "goal", dbField: "goals", semantic: "success", metricGroup: "shots", label: "Gol" },
];

// ============================================
// PHASE 3: X/Y METRIC DEFINITIONS
// ============================================

export interface XYMetricDefinition {
  /** Unique identifier for this metric */
  id: string;
  /** Display label */
  label: string;
  /** Database field for success count (X) */
  successField: string;
  /** Database field for fail count (to derive Y) */
  failField: string;
  /** How to derive Y: 'sum' = X + failField, 'direct' = failField is already total */
  totalDerivation: "sum";
}

/**
 * CANONICAL X/Y METRIC DEFINITIONS
 * 
 * These define how to calculate display metrics in format "X/Y (Z%)"
 * 
 * RULE: Y = X + fail_count (derived from events)
 * NEVER: Y = direct database "total" field (these are actually fail counts)
 */
export const XY_METRICS: XYMetricDefinition[] = [
  {
    id: "passes",
    label: "Passes",
    successField: "passes_completed", // pass_success events
    failField: "passes_total", // pass_total (failed) events
    totalDerivation: "sum", // total = completed + failed
  },
  {
    id: "dribbles",
    label: "Dribles",
    successField: "dribbles_success", // dribble_success events
    failField: "dribbles_total", // dribble_attempt (failed) events
    totalDerivation: "sum", // total = success + failed
  },
  {
    id: "crosses",
    label: "Cruzamentos",
    successField: "crosses_success",
    failField: "crosses_failed",
    totalDerivation: "sum",
  },
  {
    id: "aerial_duels",
    label: "Duelos Aéreos",
    successField: "aerial_duels_won",
    failField: "aerial_duels_total", // lost duels
    totalDerivation: "sum", // total = won + lost
  },
  {
    id: "ground_duels",
    label: "Duelos no Chão",
    successField: "ground_duels_won",
    failField: "ground_duels_total", // lost duels
    totalDerivation: "sum", // total = won + lost
  },
  {
    id: "shots",
    label: "Finalizações",
    successField: "shots_on_target", // on target (excludes goals for display)
    failField: "shots", // off target
    totalDerivation: "sum", // total = on_target + off_target (+ blocked handled separately)
  },
];

// ============================================
// PHASE 4: CANONICAL CALCULATION HELPERS
// ============================================

/**
 * Calculate X/Y metric from raw database values
 * 
 * @param successValue - Value from success field (e.g., passes_completed)
 * @param failValue - Value from "total" field which is actually FAILED count
 * @returns { success, fail, total, percentage }
 */
export function calculateXYMetric(
  successValue: number | undefined | null,
  failValue: number | undefined | null
): { success: number; fail: number; total: number; percentage: number } {
  const success = Math.max(0, successValue ?? 0);
  const fail = Math.max(0, failValue ?? 0);
  const total = success + fail;
  const percentage = total > 0 ? Math.min(Math.round((success / total) * 100), 100) : 0;
  
  return { success, fail, total, percentage };
}

/**
 * Calculate all X/Y metrics from a stats object
 */
export function calculateAllXYMetrics(stats: Record<string, any>): Record<string, ReturnType<typeof calculateXYMetric>> {
  const result: Record<string, ReturnType<typeof calculateXYMetric>> = {};
  
  for (const metric of XY_METRICS) {
    result[metric.id] = calculateXYMetric(
      stats[metric.successField],
      stats[metric.failField]
    );
  }
  
  return result;
}

// ============================================
// PHASE 5: VALIDATION / ASSERTIONS
// ============================================

export interface StatsValidationError {
  athleteId: string;
  matchId: string;
  metric: string;
  success: number;
  fail: number;
  total: number;
  errorType: "success_exceeds_total" | "fail_without_total_mismatch" | "percentage_over_100";
  message: string;
}

/**
 * Validate stats and log errors (does NOT throw - just logs)
 * 
 * @param stats - Stats object to validate
 * @param athleteId - For logging
 * @param matchId - For logging (optional, use 'seasonal' for aggregated)
 * @returns Array of validation errors (empty if valid)
 */
export function validateXYStats(
  stats: Record<string, any>,
  athleteId: string,
  matchId: string = "seasonal"
): StatsValidationError[] {
  const errors: StatsValidationError[] = [];
  
  for (const metric of XY_METRICS) {
    const success = Math.max(0, stats[metric.successField] ?? 0);
    const fail = Math.max(0, stats[metric.failField] ?? 0);
    const total = success + fail;
    
    // Check: success should never exceed calculated total
    if (success > total) {
      const error: StatsValidationError = {
        athleteId,
        matchId,
        metric: metric.id,
        success,
        fail,
        total,
        errorType: "success_exceeds_total",
        message: `[StatsValidation] ${metric.label}: success (${success}) > total (${total})`,
      };
      errors.push(error);
      console.error(error.message, { athleteId, matchId, metric: metric.id });
    }
    
    // Check: if fail is 0 but stored "total" > success, something is wrong
    // This shouldn't happen with our schema but check anyway
    const percentage = total > 0 ? (success / total) * 100 : 0;
    if (percentage > 100) {
      const error: StatsValidationError = {
        athleteId,
        matchId,
        metric: metric.id,
        success,
        fail,
        total,
        errorType: "percentage_over_100",
        message: `[StatsValidation] ${metric.label}: percentage (${percentage}%) > 100`,
      };
      errors.push(error);
      console.error(error.message, { athleteId, matchId, metric: metric.id });
    }
  }
  
  return errors;
}

/**
 * Validate and log stats on component mount (for debugging)
 * Safe to call - never throws, only logs
 */
export function debugValidateStats(
  stats: Record<string, any>,
  athleteId: string,
  matchId?: string,
  componentName?: string
): void {
  if (import.meta.env.DEV) {
    const errors = validateXYStats(stats, athleteId, matchId);
    if (errors.length > 0) {
      console.warn(
        `[${componentName || "StatsValidation"}] Found ${errors.length} validation errors:`,
        errors
      );
    }
  }
}
