/**
 * Match Rating Engine v1.4 (SofaScore-style)
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
 * CRITICAL: Only active events count (voided events are excluded)
 */

import type { MatchPlayerStats } from "@/hooks/useLiveMatch";
import type { MatchPlayerMinutesInput } from "./minutesPlayed";
import { calculateMinutesPlayed } from "./minutesPlayed";

// === WEIGHT CONSTANTS (Modelo Moderado v1.4) ===

const WEIGHTS = {
  // ATTACK
  goal: 0.45,
  assist: 0.35,
  shot_on_target: 0.15,
  shot_off_target: 0.05,
  shot_blocked: 0.03,
  
  // CREATION / DRIBBLE
  dribble_success: 0.10,
  dribble_failed: -0.08,
  key_pass: 0.10,
  chance_created: 0.14,
  
  // PASSES
  pass_completed: 0.01,
  pass_failed: -0.02,
  
  // DEFENSE
  interception: 0.10,
  recovery: 0.07,
  clearance: 0.06,
  tackle: 0.12,
  
  // DISCIPLINE
  yellow_card: -0.20,
  red_card: -0.80,
} as const;

// Anti-explosion cap for offensive stats
const OFFENSIVE_CAP = 1.20;

// Base rating
const BASE_RATING = 6.0;

// === TYPES ===

export interface RatingBreakdown {
  attack: number;
  creation: number;
  passing: number;
  defense: number;
  discipline: number;
}

export interface MatchRatingResult {
  /** Final rating 0.0-10.0 */
  rating: number;
  /** Raw impact before minutes factor */
  rawImpact: number;
  /** Minutes factor applied (0.35-1.0) */
  minutesFactor: number;
  /** Minutes played (0-90+) */
  minutesPlayed: number;
  /** Impact breakdown by category */
  breakdown: RatingBreakdown;
  /** Color for display (green/yellow/orange/red) */
  color: string;
  /** Label for display (Excelente/Bom/Regular/Fraco) */
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
 * Get rating color based on value
 */
function getRatingColor(rating: number): string {
  if (rating >= 8.0) return "text-emerald-400";
  if (rating >= 7.0) return "text-green-400";
  if (rating >= 6.0) return "text-amber-400";
  if (rating >= 5.0) return "text-orange-400";
  return "text-red-400";
}

/**
 * Get rating background color for badges
 */
export function getRatingBgColor(rating: number): string {
  if (rating >= 8.0) return "bg-emerald-500";
  if (rating >= 7.0) return "bg-green-500";
  if (rating >= 6.0) return "bg-amber-500";
  if (rating >= 5.0) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Get rating label based on value
 */
function getRatingLabel(rating: number): string {
  if (rating >= 8.5) return "Excepcional";
  if (rating >= 8.0) return "Excelente";
  if (rating >= 7.0) return "Muito Bom";
  if (rating >= 6.0) return "Bom";
  if (rating >= 5.0) return "Regular";
  if (rating >= 4.0) return "Fraco";
  return "Muito Fraco";
}

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
  // === ATTACK IMPACT ===
  const goals = Math.max(0, stats.goals) * WEIGHTS.goal;
  const assists = Math.max(0, stats.assists) * WEIGHTS.assist;
  const shotsOnTarget = Math.max(0, stats.shots_on_target) * WEIGHTS.shot_on_target;
  // Shots off target = total shots - shots on target
  const shotsOffTarget = Math.max(0, stats.shots - stats.shots_on_target) * WEIGHTS.shot_off_target;
  
  let attackImpact = goals + assists + shotsOnTarget + shotsOffTarget;
  // Apply offensive cap BEFORE minutes factor
  attackImpact = Math.min(attackImpact, OFFENSIVE_CAP);
  
  // === CREATION IMPACT ===
  const dribblesSuccess = Math.max(0, stats.dribbles_success) * WEIGHTS.dribble_success;
  // Failed dribbles = total - success
  const dribblesFailed = Math.max(0, stats.dribbles_total - stats.dribbles_success) * WEIGHTS.dribble_failed;
  const keyPasses = Math.max(0, stats.key_passes) * WEIGHTS.key_pass;
  const chancesCreated = Math.max(0, stats.chances_created) * WEIGHTS.chance_created;
  
  const creationImpact = dribblesSuccess + dribblesFailed + keyPasses + chancesCreated;
  
  // === PASSING IMPACT ===
  const passesCompleted = Math.max(0, stats.passes_completed) * WEIGHTS.pass_completed;
  // Failed passes = total - completed
  const passesFailed = Math.max(0, stats.passes_total - stats.passes_completed) * WEIGHTS.pass_failed;
  
  const passingImpact = passesCompleted + passesFailed;
  
  // === DEFENSE IMPACT ===
  const interceptions = Math.max(0, stats.interceptions) * WEIGHTS.interception;
  const recoveries = Math.max(0, stats.recoveries) * WEIGHTS.recovery;
  const clearances = Math.max(0, stats.clearances) * WEIGHTS.clearance;
  const tackles = Math.max(0, stats.tackles) * WEIGHTS.tackle;
  
  const defenseImpact = interceptions + recoveries + clearances + tackles;
  
  // === DISCIPLINE IMPACT ===
  const yellowCards = Math.max(0, stats.yellow_cards) * WEIGHTS.yellow_card;
  const redCards = Math.max(0, stats.red_cards) * WEIGHTS.red_card;
  
  const disciplineImpact = yellowCards + redCards; // These are negative weights
  
  // === TOTAL RAW IMPACT ===
  const rawImpact = attackImpact + creationImpact + passingImpact + defenseImpact + disciplineImpact;
  
  // === APPLY MINUTES FACTOR ===
  const minutesFactor = calculateMinutesFactor(minutesPlayed);
  const adjustedImpact = rawImpact * minutesFactor;
  
  // === FINAL RATING ===
  const rating = clamp(BASE_RATING + adjustedImpact, 0.0, 10.0);
  
  // Round to 1 decimal place
  const roundedRating = Math.round(rating * 10) / 10;
  
  return {
    rating: roundedRating,
    rawImpact: Math.round(rawImpact * 100) / 100,
    minutesFactor: Math.round(minutesFactor * 100) / 100,
    minutesPlayed,
    breakdown: {
      attack: Math.round(attackImpact * 100) / 100,
      creation: Math.round(creationImpact * 100) / 100,
      passing: Math.round(passingImpact * 100) / 100,
      defense: Math.round(defenseImpact * 100) / 100,
      discipline: Math.round(disciplineImpact * 100) / 100,
    },
    color: getRatingColor(roundedRating),
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
