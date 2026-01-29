/**
 * Apply Stats Instrumentation
 * 
 * SINGLE SOURCE OF TRUTH for Apply flow logging and assertions.
 * 
 * This module provides comprehensive instrumentation to:
 * 1. Log before/after stats to trace changes
 * 2. Assert idempotency (alreadyApplied => no changes)
 * 3. Validate invariants (passes_total = certos + errados, etc.)
 * 
 * All logs and asserts only run in DEV mode (import.meta.env.DEV).
 * 
 * @author M3 Scouting Technical Team
 */

const IS_DEV = import.meta.env.DEV;

// ===== TYPES =====

export interface PlayerStatsSnapshot {
  player_id: string;
  player_name: string;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  passes_certos: number;  // accurate_passes
  passes_errados: number; // derived: total_passes - accurate_passes (in legacy) OR total_passes IS errados
  passes_total: number;   // total_passes
  dribbles_success: number;
  dribbles_failed: number;
  dribbles_total: number;
  acoes_bola: number;     // derived ball actions
  rating_count: number;   // count of match ratings
}

export interface ApplyDelta {
  player_id: string;
  player_name: string;
  matches_delta: number;
  minutes_delta: number;
  goals_delta: number;
  assists_delta: number;
  passes_certos_delta: number;
  passes_errados_delta: number;
  dribbles_success_delta: number;
  dribbles_failed_delta: number;
}

export interface ApplyLogEntry {
  timestamp: string;
  live_match_id: string;
  player_id: string;
  player_name: string;
  already_applied: boolean;
  upsert_key: string;
  operation: 'insert' | 'update' | 'skip';
  stats_before: Partial<PlayerStatsSnapshot>;
  delta_to_apply: Partial<ApplyDelta>;
  stats_after: Partial<PlayerStatsSnapshot>;
}

// ===== SAFE NUMBER HELPER =====

function safe(val: number | undefined | null): number {
  return typeof val === 'number' && !isNaN(val) ? Math.max(0, val) : 0;
}

// ===== LOGGING =====

/**
 * Log before applying stats for a player
 */
export function logApplyBefore(
  liveMatchId: string,
  playerId: string,
  playerName: string,
  alreadyApplied: boolean,
  existingStats: Record<string, unknown> | null
): void {
  if (!IS_DEV) return;

  const statsBefore = existingStats ? {
    matches: safe(existingStats.matches as number),
    minutes: safe(existingStats.minutes as number),
    goals: safe(existingStats.goals as number),
    assists: safe(existingStats.assists as number),
    passes_certos: safe(existingStats.accurate_passes as number),
    passes_total: safe(existingStats.total_passes as number),
    dribbles_success: safe(existingStats.successful_dribbles as number),
    dribbles_total: safe(existingStats.total_dribbles as number),
  } : {
    matches: 0, minutes: 0, goals: 0, assists: 0,
    passes_certos: 0, passes_total: 0,
    dribbles_success: 0, dribbles_total: 0,
  };

  console.log(`[APPLY INSTRUMENTATION] 📊 BEFORE - ${playerName} (${playerId.slice(0, 8)})`, {
    live_match_id: liveMatchId,
    already_applied: alreadyApplied,
    stats_before: statsBefore,
    upsert_key: `${playerId}|${liveMatchId}`,
  });
}

/**
 * Log delta to be applied for a player
 */
export function logApplyDelta(
  playerId: string,
  playerName: string,
  delta: Record<string, number>
): void {
  if (!IS_DEV) return;

  console.log(`[APPLY INSTRUMENTATION] 📈 DELTA - ${playerName} (${playerId.slice(0, 8)})`, {
    delta: {
      matches: delta.matches ?? 0,
      minutes: delta.minutes ?? 0,
      goals: delta.goals ?? 0,
      assists: delta.assists ?? 0,
      passes_certos: delta.accurate_passes ?? 0,
      passes_errados: delta.total_passes ?? 0, // In our schema, total_passes IS the failed count
      dribbles_success: delta.successful_dribbles ?? 0,
      dribbles_failed: delta.total_dribbles ?? 0, // In our schema, total_dribbles can be failed count
    },
  });
}

/**
 * Log after applying stats for a player
 */
export function logApplyAfter(
  playerId: string,
  playerName: string,
  statsAfter: Record<string, unknown>,
  operation: 'insert' | 'update' | 'skip'
): void {
  if (!IS_DEV) return;

  console.log(`[APPLY INSTRUMENTATION] ✅ AFTER - ${playerName} (${playerId.slice(0, 8)})`, {
    operation,
    stats_after: {
      matches: safe(statsAfter.matches as number),
      minutes: safe(statsAfter.minutes as number),
      goals: safe(statsAfter.goals as number),
      assists: safe(statsAfter.assists as number),
      passes_certos: safe(statsAfter.accurate_passes as number),
      passes_total: safe(statsAfter.total_passes as number),
      dribbles_success: safe(statsAfter.successful_dribbles as number),
      dribbles_total: safe(statsAfter.total_dribbles as number),
    },
  });
}

/**
 * Log when skipping a player (already applied)
 */
export function logApplySkipped(
  liveMatchId: string,
  playerId: string,
  playerName: string,
  reason: string
): void {
  if (!IS_DEV) return;

  console.log(`[APPLY INSTRUMENTATION] ⏭️ SKIPPED - ${playerName} (${playerId.slice(0, 8)})`, {
    live_match_id: liveMatchId,
    reason,
  });
}

// ===== ASSERTIONS (DEV ONLY) =====

/**
 * Assert that stats didn't change when already applied (idempotency)
 */
export function assertIdempotencyNoChange(
  playerName: string,
  statsBefore: Record<string, number>,
  statsAfter: Record<string, number>
): boolean {
  if (!IS_DEV) return true;

  const keysToCheck = ['matches', 'minutes', 'goals', 'assists', 'accurate_passes', 'total_passes'];
  const violations: string[] = [];

  for (const key of keysToCheck) {
    const before = safe(statsBefore[key]);
    const after = safe(statsAfter[key]);
    if (before !== after) {
      violations.push(`${key}: ${before} → ${after}`);
    }
  }

  if (violations.length > 0) {
    console.error(`[APPLY ASSERT] ❌ IDEMPOTENCY VIOLATION - ${playerName}`, {
      message: 'Stats changed when match was already applied!',
      violations,
    });
    return false;
  }

  console.log(`[APPLY ASSERT] ✓ Idempotency OK - ${playerName}: no changes on re-apply`);
  return true;
}

/**
 * Assert that stats_after = stats_before + delta (for first apply)
 */
export function assertDeltaAppliedCorrectly(
  playerName: string,
  statsBefore: Record<string, number>,
  delta: Record<string, number>,
  statsAfter: Record<string, number>
): boolean {
  if (!IS_DEV) return true;

  const mappings: Array<{ beforeKey: string; deltaKey: string; afterKey: string; label: string }> = [
    { beforeKey: 'matches', deltaKey: 'matches', afterKey: 'matches', label: 'Jogos' },
    { beforeKey: 'minutes', deltaKey: 'minutes', afterKey: 'minutes', label: 'Minutos' },
    { beforeKey: 'goals', deltaKey: 'goals', afterKey: 'goals', label: 'Gols' },
    { beforeKey: 'assists', deltaKey: 'assists', afterKey: 'assists', label: 'Assistências' },
    { beforeKey: 'accurate_passes', deltaKey: 'accurate_passes', afterKey: 'accurate_passes', label: 'Passes Certos' },
    { beforeKey: 'total_passes', deltaKey: 'total_passes', afterKey: 'total_passes', label: 'Passes Errados' },
    { beforeKey: 'successful_dribbles', deltaKey: 'successful_dribbles', afterKey: 'successful_dribbles', label: 'Dribles Certos' },
    { beforeKey: 'total_dribbles', deltaKey: 'total_dribbles', afterKey: 'total_dribbles', label: 'Dribles Totais' },
  ];

  const violations: string[] = [];

  for (const { beforeKey, deltaKey, afterKey, label } of mappings) {
    const before = safe(statsBefore[beforeKey]);
    const deltav = safe(delta[deltaKey]);
    const after = safe(statsAfter[afterKey]);
    const expected = before + deltav;

    if (after !== expected) {
      violations.push(`${label}: ${before} + ${deltav} = ${expected}, mas got ${after}`);
    }
  }

  if (violations.length > 0) {
    console.error(`[APPLY ASSERT] ❌ DELTA MISMATCH - ${playerName}`, {
      message: 'stats_after != stats_before + delta',
      violations,
    });
    return false;
  }

  console.log(`[APPLY ASSERT] ✓ Delta OK - ${playerName}: before + delta = after`);
  return true;
}

// ===== INVARIANT CHECKS =====

/**
 * Validate statistical invariants
 */
export function validateInvariants(
  playerName: string,
  stats: Record<string, number>
): { valid: boolean; violations: string[] } {
  if (!IS_DEV) return { valid: true, violations: [] };

  const violations: string[] = [];

  // In our schema, total_passes IS the failed count, not the actual total
  // So actual_total = accurate_passes + total_passes
  const passesCertos = safe(stats.accurate_passes);
  const passesErrados = safe(stats.total_passes); // This IS the failed count
  const passesTotal = passesCertos + passesErrados;
  
  // Percentage check: never > 100%
  if (passesTotal > 0) {
    const passPct = (passesCertos / passesTotal) * 100;
    if (passPct > 100) {
      violations.push(`Passes %: ${passPct.toFixed(1)}% > 100%`);
    }
  }

  // Same for dribbles
  const dribblesCertos = safe(stats.successful_dribbles);
  const dribblesErrados = safe(stats.total_dribbles); // This might be failed count
  const dribblesTotal = dribblesCertos + dribblesErrados;
  
  if (dribblesTotal > 0) {
    const dribblePct = (dribblesCertos / dribblesTotal) * 100;
    if (dribblePct > 100) {
      violations.push(`Dribles %: ${dribblePct.toFixed(1)}% > 100%`);
    }
  }

  // Minutes must be >= 0
  const minutes = safe(stats.minutes);
  if (minutes < 0) {
    violations.push(`Minutos: ${minutes} < 0`);
  }

  // Matches must be >= 0
  const matches = safe(stats.matches);
  if (matches < 0) {
    violations.push(`Jogos: ${matches} < 0`);
  }

  // Goals/Assists must be >= 0
  if (safe(stats.goals) < 0) violations.push(`Gols: ${stats.goals} < 0`);
  if (safe(stats.assists) < 0) violations.push(`Assistências: ${stats.assists} < 0`);

  if (violations.length > 0) {
    console.error(`[APPLY INVARIANT] ❌ VIOLATION - ${playerName}`, { violations });
  } else if (IS_DEV) {
    console.log(`[APPLY INVARIANT] ✓ All invariants OK - ${playerName}`);
  }

  return { valid: violations.length === 0, violations };
}

// ===== SUMMARY LOG =====

/**
 * Log summary of the entire apply operation
 */
export function logApplySummary(
  liveMatchId: string,
  matchStatus: string,
  totalPlayers: number,
  appliedCount: number,
  skippedCount: number,
  assertionFailures: number
): void {
  if (!IS_DEV) return;

  const status = assertionFailures > 0 ? '⚠️ WITH ASSERTION FAILURES' : '✅ SUCCESS';
  
  console.log(`[APPLY INSTRUMENTATION] 📋 SUMMARY - ${status}`, {
    live_match_id: liveMatchId,
    match_status: matchStatus,
    total_players: totalPlayers,
    applied: appliedCount,
    skipped: skippedCount,
    assertion_failures: assertionFailures,
  });
}

/**
 * Create a snapshot of player stats for comparison
 */
export function createStatsSnapshot(stats: Record<string, unknown> | null): Record<string, number> {
  if (!stats) {
    return {
      matches: 0, minutes: 0, goals: 0, assists: 0,
      accurate_passes: 0, total_passes: 0,
      successful_dribbles: 0, total_dribbles: 0,
    };
  }

  return {
    matches: safe(stats.matches as number),
    minutes: safe(stats.minutes as number),
    goals: safe(stats.goals as number),
    assists: safe(stats.assists as number),
    accurate_passes: safe(stats.accurate_passes as number),
    total_passes: safe(stats.total_passes as number),
    successful_dribbles: safe(stats.successful_dribbles as number),
    total_dribbles: safe(stats.total_dribbles as number),
  };
}
