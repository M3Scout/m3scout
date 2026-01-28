/**
 * Player Stats Normalizer
 * 
 * SINGLE SOURCE OF TRUTH for aggregated player statistics normalization.
 * 
 * Problem: The database sometimes stores inconsistent data where:
 * - shots_on_target: 2, shots: 1 (should be at least 2)
 * - shots_blocked: 1 but not counted in total
 * - dribbles success > total
 * 
 * This utility ensures ALL components display consistent, derived totals.
 * 
 * RULES:
 * 1. total >= sum of components (always)
 * 2. shots_total = shots_on_target + shots_blocked + shots_off_target
 * 3. If stored total < sum of parts, use sum of parts
 * 4. Never modify original data, return derived copy
 * 
 * @author M3 Scouting Technical Team
 */

import type { PlayerStats } from "./playerStats";

/**
 * Normalized player stats with guaranteed consistent totals
 */
export interface NormalizedPlayerStats extends PlayerStats {
  // Derived fields that ALWAYS respect: total >= sum of parts
  shots_total_derived: number;
  shots_off_target: number;
  passes_total_derived: number;
  dribbles_total_derived: number;
  duels_total_derived: number;
  aerial_duels_total_derived: number;
  crosses_total: number;
}

/**
 * Normalize player stats to ensure consistency
 * 
 * CRITICAL: This function ensures that:
 * - shots_total >= shots_on_target + shots_blocked
 * - passes_total >= accurate_passes
 * - dribbles_total >= successful_dribbles
 * 
 * @param raw - Raw stats from player_stats table
 * @returns Normalized stats with guaranteed consistency
 */
export function normalizePlayerStats(
  raw: PlayerStats | null | undefined
): NormalizedPlayerStats {
  const stats = raw ?? {} as PlayerStats;
  
  // Safe number helper
  const safe = (val: number | undefined | null): number => 
    typeof val === "number" && !isNaN(val) ? Math.max(0, val) : 0;
  
  // === SHOTS ===
  // In player_stats table:
  // - shots: This is ambiguous - sometimes total, sometimes off-target only
  // - shots_on_target: Shots that went toward goal
  // - shots_blocked: Our shots that were blocked by opponent
  //
  // CORRECT FORMULA: shots_total = shots_on_target + shots_off_target + shots_blocked
  //
  // But we don't have shots_off_target directly, so we need to derive it:
  // If stats.shots >= shots_on_target, then shots_off_target = shots - shots_on_target
  // Otherwise, shots_off_target = 0 and we need to recalculate total
  
  const shotsOnTarget = safe(stats.shots_on_target);
  const shotsBlocked = safe(stats.shots_blocked);
  const storedShots = safe(stats.shots);
  
  // Calculate shots off target (shots that missed the goal and weren't blocked)
  // If stored shots >= shots_on_target, assume stored shots is "non-blocked shots"
  let shotsOffTarget = 0;
  if (storedShots >= shotsOnTarget) {
    // stats.shots likely represents "total shots excluding blocked" or just "non-on-target"
    // Actually, looking at the data pattern, stats.shots seems to be the TOTAL intended by the system
    // but it's missing shots_blocked in the sum
    shotsOffTarget = Math.max(0, storedShots - shotsOnTarget);
  }
  
  // FINAL TOTAL: The true total must be at least the sum of known components
  const minimumTotal = shotsOnTarget + shotsBlocked + shotsOffTarget;
  const shots_total_derived = Math.max(storedShots, minimumTotal, shotsOnTarget + shotsBlocked);
  
  // Recalculate off target based on final total
  const shots_off_target = Math.max(0, shots_total_derived - shotsOnTarget - shotsBlocked);
  
  // === PASSES ===
  const passesCompleted = safe(stats.accurate_passes);
  const passesStoredTotal = safe(stats.total_passes);
  const passes_total_derived = Math.max(passesStoredTotal, passesCompleted);
  
  // === DRIBBLES ===
  const dribblesSuccess = safe(stats.successful_dribbles);
  const dribblesStoredTotal = safe(stats.total_dribbles);
  const dribbles_total_derived = Math.max(dribblesStoredTotal, dribblesSuccess);
  
  // === DUELS ===
  const duelsWon = safe(stats.duels_won);
  const duelsStoredTotal = safe(stats.total_duels);
  const duels_total_derived = Math.max(duelsStoredTotal, duelsWon);
  
  // === AERIAL DUELS ===
  const aerialWon = safe(stats.aerial_duels_won);
  const aerialStoredTotal = safe(stats.aerial_duels_total);
  const aerial_duels_total_derived = Math.max(aerialStoredTotal, aerialWon);
  
  // === CROSSES ===
  const crossesSuccess = safe(stats.crosses_success);
  const crossesFailed = safe(stats.crosses_failed);
  const crosses_total = crossesSuccess + crossesFailed;
  
  // === GROUND DUELS ===
  const groundWon = safe(stats.ground_duels_won);
  const groundStoredTotal = safe(stats.ground_duels_total);
  const ground_duels_total_derived = Math.max(groundStoredTotal, groundWon);
  
  return {
    // Pass through all raw values
    ...stats,
    // Override with derived values
    shots_total_derived,
    shots_off_target,
    passes_total_derived,
    dribbles_total_derived,
    duels_total_derived,
    aerial_duels_total_derived,
    crosses_total,
    // Also ensure these base fields are updated for backward compatibility
    shots: shots_total_derived,
    total_passes: passes_total_derived,
    total_dribbles: dribbles_total_derived,
    total_duels: duels_total_derived,
    aerial_duels_total: aerial_duels_total_derived,
    ground_duels_total: ground_duels_total_derived,
  };
}

/**
 * Normalize an array of player stats
 */
export function normalizePlayerStatsArray(
  statsArray: PlayerStats[]
): NormalizedPlayerStats[] {
  return statsArray.map(normalizePlayerStats);
}

/**
 * Debug log for normalized stats
 */
export function debugLogNormalizedPlayerStats(
  playerName: string,
  raw: PlayerStats | undefined,
  normalized: NormalizedPlayerStats
): void {
  if (import.meta.env.DEV) {
    console.log(`[NormalizePlayerStats] ${playerName}:`, {
      raw_shots: {
        total_stored: raw?.shots ?? 0,
        on_target: raw?.shots_on_target ?? 0,
        blocked: raw?.shots_blocked ?? 0,
      },
      normalized_shots: {
        total: normalized.shots_total_derived,
        on_target: normalized.shots_on_target ?? 0,
        blocked: normalized.shots_blocked ?? 0,
        off_target: normalized.shots_off_target,
      },
    });
  }
}
