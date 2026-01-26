/**
 * Ball Actions - Derived Statistic (SINGLE SOURCE OF TRUTH)
 * 
 * "Ações com a Bola" is a DERIVED statistic that automatically sums up
 * all events representing controlled ball possession. It does NOT have a
 * weight in the rating engine (weight 0) and should NOT be recorded as a
 * separate event.
 * 
 * IMPORTANT: This file defines which events count as ball actions and
 * provides helper functions to calculate the derived value from any stats object.
 * 
 * @author M3 Scouting Technical Team
 * @version 2.0 - Changed from direct event to derived statistic
 */

/**
 * Events that count as "Ação com a Bola" (+1 each occurrence)
 * 
 * Criteria: Any action where the player had controlled possession of the ball
 * 
 * ATTACK / CREATION:
 * - shot_on_target (finalização no gol)
 * - shot (finalização fora) 
 * - shot_blocked (finalização bloqueada ofensiva) - mapped to shots_blocked
 * - goal
 * - assist
 * - key_pass (passe decisivo)
 * - chance_created
 * 
 * PASSING:
 * - pass_success (passe certo) - mapped to passes_completed
 * - pass_failed (passe errado) - derived from passes_total - passes_completed
 * - cross_success (cruzamento certo)
 * - cross_failed (cruzamento errado)
 * 
 * DRIBBLES / POSSESSION:
 * - dribble_success (drible certo)
 * - dribble_failed (drible errado) - mapped to dribbles_total - dribbles_success
 * - possession_lost (perda da posse)
 * 
 * DEFENSE WITH POSSESSION:
 * - recoveries (recuperação da bola)
 * 
 * DO NOT COUNT (defensive actions without clear possession):
 * - interception, clearance, blocked_shot (defensive), duels, fouls_committed, 
 *   was_dribbled, offside, cards, saves, etc.
 */

/**
 * Interface for stats object that can be used to calculate ball actions
 * Accepts partial stats - missing values default to 0
 */
export interface BallActionsInput {
  // Attack
  goals?: number;
  shots_on_target?: number;
  shots?: number; // Total shots (for calculating off-target from shots - shots_on_target)
  shots_blocked?: number; // Offensive - our shot was blocked
  assists?: number;
  key_passes?: number;
  chances_created?: number;
  
  // Passing
  passes_completed?: number;
  passes_total?: number; // passes_completed + passes_failed (we derive failed from this)
  crosses_success?: number;
  crosses_failed?: number;
  
  // Dribbles
  dribbles_success?: number;
  dribbles_total?: number; // dribbles_success + dribbles_failed (we derive failed from this)
  
  // Possession
  possession_lost?: number;
  
  // Defense with possession
  recoveries?: number;
}

/**
 * Calculate ball_actions as a derived statistic
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for ball_actions calculation.
 * All components should use this function to get the ball_actions count.
 * 
 * @param stats - Object with player statistics
 * @param manualBallActions - Optional: manual ball_actions value from legacy data (for backwards compatibility)
 * @returns The derived ball_actions count (uses max of derived vs manual for backwards compat)
 */
export function calculateDerivedBallActions(
  stats: BallActionsInput,
  manualBallActions?: number
): number {
  const s = (v: number | undefined) => Math.max(0, v ?? 0);
  
  // === ATTACK / CREATION ===
  const goals = s(stats.goals);
  const shotsOnTarget = s(stats.shots_on_target);
  // shots_off_target = total shots - on_target (but we need to check if shots includes goals)
  // In our system, shots = total shot attempts, shots_on_target = those that would have gone in
  // So shots_off_target = shots - shots_on_target
  const shotsOffTarget = Math.max(0, s(stats.shots) - s(stats.shots_on_target));
  const shotsBlocked = s(stats.shots_blocked); // Offensive blocked shots
  const assists = s(stats.assists);
  const keyPasses = s(stats.key_passes);
  const chancesCreated = s(stats.chances_created);
  
  // === PASSING ===
  const passesCompleted = s(stats.passes_completed);
  // passes_failed = passes_total - passes_completed
  const passesFailed = Math.max(0, s(stats.passes_total) - passesCompleted);
  const crossesSuccess = s(stats.crosses_success);
  const crossesFailed = s(stats.crosses_failed);
  
  // === DRIBBLES ===
  const dribblesSuccess = s(stats.dribbles_success);
  // dribbles_failed = dribbles_total - dribbles_success
  const dribblesFailed = Math.max(0, s(stats.dribbles_total) - dribblesSuccess);
  const possessionLost = s(stats.possession_lost);
  
  // === DEFENSE WITH POSSESSION ===
  const recoveries = s(stats.recoveries);
  
  // Sum all ball actions
  const derivedTotal = 
    // Attack
    goals +
    shotsOnTarget +
    shotsOffTarget +
    shotsBlocked +
    assists +
    keyPasses +
    chancesCreated +
    // Passing
    passesCompleted +
    passesFailed +
    crossesSuccess +
    crossesFailed +
    // Dribbles
    dribblesSuccess +
    dribblesFailed +
    possessionLost +
    // Defense with possession
    recoveries;
  
  // For backwards compatibility with games that had manual ball_actions recorded,
  // use the maximum of derived vs manual (prevents data loss for old matches)
  // If no manual value exists or it's 0, just use derived
  if (manualBallActions && manualBallActions > 0) {
    return Math.max(derivedTotal, manualBallActions);
  }
  
  return derivedTotal;
}

/**
 * Calculate ball_actions from a MatchPlayerStats-like object (from useLiveMatch)
 * This is optimized for the live match interface where stats are in a flat structure
 */
export function calculateBallActionsFromMatchStats(stats: {
  goals?: number;
  shots?: number;
  shots_on_target?: number;
  shots_blocked?: number;
  assists?: number;
  key_passes?: number;
  chances_created?: number;
  passes_completed?: number;
  passes_total?: number;
  crosses_success?: number;
  crosses_failed?: number;
  dribbles_success?: number;
  dribbles_total?: number;
  possession_lost?: number;
  recoveries?: number;
  ball_actions?: number; // Manual value for backwards compat
}): number {
  return calculateDerivedBallActions(stats, stats.ball_actions);
}

/**
 * List of event types that contribute to ball_actions
 * Used for documentation and validation purposes
 */
export const BALL_ACTION_ELIGIBLE_EVENTS = [
  // Attack
  "goal",
  "shot_on_target", 
  "shot", // off-target
  "shot_blocked", // offensive
  "assist",
  "key_pass",
  "chance_created",
  // Passing
  "pass_success",
  "pass_total", // failed passes
  "cross_success",
  "cross_failed",
  // Dribbles
  "dribble_success",
  "dribble_attempt", // failed dribbles
  "possession_lost",
  // Defense with possession
  "recovery",
] as const;

/**
 * Check if an event type counts as a ball action
 */
export function isBallActionEvent(eventType: string): boolean {
  return BALL_ACTION_ELIGIBLE_EVENTS.includes(eventType as any);
}
