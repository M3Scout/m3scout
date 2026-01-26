/**
 * Standardized "Time on Field" calculation utilities.
 * 
 * SCOUTING STANDARD:
 * - "Minutos Regulamentares" (Reg): Used for scoring, percentages, ratings - CAPPED at 90
 * - "Tempo Total" (Total): Informational only, includes added time (acréscimos)
 * 
 * OFFICIAL RULES:
 * - Starter: startMinute = 0
 * - End of regulation = 90 (always)
 * - Substitute: use exact minute from "Entrou em Campo" event
 * 
 * CALCULATION:
 * - minutesPlayedReg = time played within 0-90, capped at 90
 * - minutesPlayedTotal = actual time played including added time (informational)
 */

export const STANDARD_MATCH_DURATION = 90;
export const FIRST_HALF_DURATION = 45;
export const SECOND_HALF_START = 45;

/**
 * Normalize a minute value to regulatory time per half:
 * - First half: 0-45 (caps at 45)
 * - Second half: 45-90 (caps at 90)
 * 
 * If value is in first half stoppage (45+X stored as 46-59), clamps to 45
 * If value is in second half stoppage (90+X stored as 91+), clamps to 90
 */
export function normalizeMinuteReg(minute: number | string | null): number {
  if (minute === null || minute === undefined) return 0;
  
  // If it's a string like "45+5" or "90+8", extract the base minute
  if (typeof minute === "string") {
    const matchAddedTime = minute.match(/^(\d+)\+(\d+)$/);
    if (matchAddedTime) {
      const baseMinute = parseInt(matchAddedTime[1], 10);
      // Return the base minute (45 or 90), not the added value
      if (baseMinute === 45) return 45;
      if (baseMinute === 90) return 90;
      return Math.min(baseMinute, STANDARD_MATCH_DURATION);
    }
    // Try parsing as simple number
    const parsed = parseInt(minute, 10);
    if (!isNaN(parsed)) {
      return normalizeNumericMinuteReg(parsed);
    }
    return 0;
  }
  
  // Numeric value - apply per-half capping
  return normalizeNumericMinuteReg(minute);
}

/**
 * Normalize numeric minute to regulatory time, capping per half:
 * - Values 46-59 (1st half stoppage) → 45
 * - Values 91+ (2nd half stoppage) → 90
 */
function normalizeNumericMinuteReg(minute: number): number {
  if (minute <= 0) return 0;
  
  // First half: 0-45
  if (minute <= FIRST_HALF_DURATION) {
    return minute;
  }
  
  // First half stoppage time (46-89 treated as 45 if clearly in 1st half context)
  // But we can't determine context from minute alone, so:
  // - 46-89 → assume second half start, keep as is up to 90
  // - However, if it's clearly stoppage (e.g., stored as 50 for 45+5), 
  //   the calling code should handle this via matchContext
  
  // Second half: 46-90
  if (minute <= STANDARD_MATCH_DURATION) {
    return minute;
  }
  
  // Beyond 90 (90+X stoppage time stored as numeric > 90) → cap at 90
  return STANDARD_MATCH_DURATION;
}

/**
 * Normalize a minute value to total time (includes added time)
 * Handles formats like "45+5" → 50, "90+8" → 98, or numeric values
 */
export function normalizeMinuteTotal(
  minute: number | string | null, 
  matchEffectiveDuration: number
): number {
  if (minute === null || minute === undefined) return 0;
  
  // If it's a string like "45+5" or "90+8", calculate actual minute
  if (typeof minute === "string") {
    const match = minute.match(/^(\d+)\+(\d+)$/);
    if (match) {
      const baseMinute = parseInt(match[1], 10);
      const addedMinute = parseInt(match[2], 10);
      const total = baseMinute + addedMinute;
      return Math.min(total, matchEffectiveDuration);
    }
    // Simple number format
    const parsed = parseInt(minute, 10);
    if (!isNaN(parsed)) {
      return Math.min(parsed, matchEffectiveDuration);
    }
    return 0;
  }
  
  // Numeric value - cap at effective duration
  return Math.min(Math.max(0, minute), matchEffectiveDuration);
}

/**
 * Calculate effective match duration including added time
 */
export function getMatchEffectiveDuration(
  baseDuration: number = STANDARD_MATCH_DURATION,
  addedTime1H: number = 0,
  addedTime2H: number = 0
): number {
  return baseDuration + addedTime1H + addedTime2H;
}

export interface MinutesPlayedInfo {
  /** Regulatory minutes played (always capped at 90) - used for scoring/ratings */
  minutesPlayed: number;
  /** Total minutes played including added time (informational only) */
  minutesPlayedTotal: number;
  /** Start minute (0 for starters, entered_minute for subs) */
  startMinute: number;
  /** End minute regulatory (capped at 90) */
  endMinute: number;
  /** End minute total (includes added time) */
  endMinuteTotal: number;
  /** Display string like "0' → 90'" or "71' → 90'" (uses regulatory) */
  rangeDisplay: string;
  /** Display string with actual end including added time like "0' → 90+8'" */
  rangeDisplayTotal: string;
  /** Display string like "90 min" (regulatory) */
  durationDisplay: string;
  /** Display string like "98 min" (total with added time) */
  durationDisplayTotal: string;
  /** Whether match had added time */
  hasAddedTime: boolean;
}

export interface MatchPlayerMinutesInput {
  started: boolean;
  entered_minute: number | null;
  exited_minute: number | null;
  minutes_played?: number | null; // Manual override (uses regulatory)
}

export interface MatchContextInput {
  /** Base match duration (default 90) */
  baseDuration?: number;
  /** Added time in first half */
  addedTime1H?: number;
  /** Added time in second half */
  addedTime2H?: number;
  /** Raw end minute string like "90+8" if available */
  rawEndMinute?: string | null;
}

/**
 * CRITICAL: Calculate regulatory minute considering half context.
 * - If exited in 1st half stoppage (minute > 45 but < second half real play), cap at 45
 * - If exited in 2nd half stoppage (minute > 90), cap at 90
 * 
 * @param rawMinute - Raw minute value (e.g., 50 for 45+5, or 96 for 90+6)
 * @param addedTime1H - Added time in first half (to detect 1st half stoppage)
 */
function calculateRegMinuteWithContext(
  rawMinute: number | null,
  addedTime1H: number,
  isFirstHalfExit: boolean
): number {
  if (rawMinute === null) return 0;
  
  // If we know this is a first half exit and minute exceeds 45, cap at 45
  // This handles cases like exited_minute=50 which means 45+5
  if (isFirstHalfExit) {
    return Math.min(rawMinute, FIRST_HALF_DURATION);
  }
  
  // For second half or unknown context:
  // - Values 46-90 are valid second half minutes
  // - Values > 90 are stoppage time, cap at 90
  if (rawMinute > STANDARD_MATCH_DURATION) {
    return STANDARD_MATCH_DURATION;
  }
  
  return Math.max(0, rawMinute);
}

/**
 * Determine if an exit minute is in the first half.
 * An exit is in the first half if:
 * - The value is between 1 and 45 + addedTime1H (exclusive of second half start)
 * - OR if it's stored as a string "45+X"
 */
function isExitInFirstHalf(
  exitMinute: number | string | null,
  addedTime1H: number
): boolean {
  if (exitMinute === null) return false;
  
  // String format "45+X" is clearly first half
  if (typeof exitMinute === "string" && exitMinute.startsWith("45+")) {
    return true;
  }
  
  const numericValue = typeof exitMinute === "number" 
    ? exitMinute 
    : parseInt(String(exitMinute), 10);
  
  if (isNaN(numericValue)) return false;
  
  // If exit is within 45 + first half added time, it's first half
  // e.g., addedTime1H=5 means 1-50 could be first half, but >45 should be capped
  const maxFirstHalfMinute = FIRST_HALF_DURATION + addedTime1H;
  
  // If minute is between 46 and maxFirstHalfMinute, it's first half stoppage
  if (numericValue > FIRST_HALF_DURATION && numericValue <= maxFirstHalfMinute) {
    return true;
  }
  
  // If minute is exactly 45 or less, it's first half
  if (numericValue <= FIRST_HALF_DURATION) {
    return true;
  }
  
  return false;
}

/**
 * Calculate standardized minutes played for a match player.
 * Returns both regulatory (capped at 90) and total (with added time) values.
 * 
 * CRITICAL: Regulatory minutes are capped per half:
 * - 1st half: max 45 minutes
 * - 2nd half: max 45 minutes (total max 90)
 * 
 * @param player - Match player data with started, entered_minute, exited_minute
 * @param matchContext - Optional match context with added time info
 * @returns MinutesPlayedInfo with both regulatory and total values
 */
export function calculateMinutesPlayed(
  player: MatchPlayerMinutesInput,
  matchContext?: MatchContextInput
): MinutesPlayedInfo {
  const baseDuration = matchContext?.baseDuration ?? STANDARD_MATCH_DURATION;
  const addedTime1H = matchContext?.addedTime1H ?? 0;
  const addedTime2H = matchContext?.addedTime2H ?? 0;
  const effectiveDuration = getMatchEffectiveDuration(baseDuration, addedTime1H, addedTime2H);
  const hasAddedTime = addedTime1H > 0 || addedTime2H > 0;
  
  // If manual override is set, use it for regulatory (but still calculate range)
  const hasManualOverride = player.minutes_played !== null && player.minutes_played !== undefined;
  
  let startMinuteReg: number;
  let startMinuteTotal: number;
  let endMinuteReg: number;
  let endMinuteTotal: number;
  let rawStartDisplay: string;
  let rawEndDisplay: string;
  
  // Detect if exit was in first half (for proper capping)
  const exitedInFirstHalf = isExitInFirstHalf(player.exited_minute, addedTime1H);
  
  if (player.started) {
    // Starter: begins at 0'
    startMinuteReg = 0;
    startMinuteTotal = 0;
    rawStartDisplay = "0";
    
    if (player.exited_minute !== null) {
      // Was substituted out - apply context-aware regulatory capping
      const rawExit = typeof player.exited_minute === "number" 
        ? player.exited_minute 
        : parseInt(String(player.exited_minute), 10) || 0;
      
      endMinuteReg = calculateRegMinuteWithContext(rawExit, addedTime1H, exitedInFirstHalf);
      endMinuteTotal = normalizeMinuteTotal(player.exited_minute, effectiveDuration);
      rawEndDisplay = String(player.exited_minute);
    } else {
      // Played until end
      endMinuteReg = STANDARD_MATCH_DURATION;
      endMinuteTotal = effectiveDuration;
      // Use added time format if available
      if (addedTime2H > 0) {
        rawEndDisplay = `90+${addedTime2H}`;
      } else {
        rawEndDisplay = "90";
      }
    }
  } else {
    // Substitute: begins at entered_minute
    if (player.entered_minute !== null) {
      // Detect if entry was in first half for proper capping
      const enteredInFirstHalf = isExitInFirstHalf(player.entered_minute, addedTime1H);
      const rawEntry = typeof player.entered_minute === "number"
        ? player.entered_minute
        : parseInt(String(player.entered_minute), 10) || 0;
      
      // Regulatory start: clamp to 0-90 with half context
      startMinuteReg = calculateRegMinuteWithContext(rawEntry, addedTime1H, enteredInFirstHalf);
      // Total start: actual entry minute (for total calculation)
      startMinuteTotal = normalizeMinuteTotal(player.entered_minute, effectiveDuration);
      rawStartDisplay = String(player.entered_minute);
      
      if (player.exited_minute !== null) {
        // Was substituted out
        const rawExit = typeof player.exited_minute === "number"
          ? player.exited_minute
          : parseInt(String(player.exited_minute), 10) || 0;
        
        endMinuteReg = calculateRegMinuteWithContext(rawExit, addedTime1H, exitedInFirstHalf);
        endMinuteTotal = normalizeMinuteTotal(player.exited_minute, effectiveDuration);
        rawEndDisplay = String(player.exited_minute);
      } else {
        // Played until end
        endMinuteReg = STANDARD_MATCH_DURATION;
        endMinuteTotal = effectiveDuration;
        if (addedTime2H > 0) {
          rawEndDisplay = `90+${addedTime2H}`;
        } else {
          rawEndDisplay = "90";
        }
      }
    } else {
      // Never entered - 0 minutes
      startMinuteReg = 0;
      startMinuteTotal = 0;
      endMinuteReg = 0;
      endMinuteTotal = 0;
      rawStartDisplay = "—";
      rawEndDisplay = "—";
    }
  }
  
  // Calculate minutes played - REGULATORY uses only regulatory start/end (capped per half)
  let minutesPlayedReg = Math.max(0, endMinuteReg - startMinuteReg);
  // TOTAL uses actual start/end including added time
  const minutesPlayedTotal = Math.max(0, endMinuteTotal - startMinuteTotal);
  
  // Safety cap: regulatory never exceeds 90
  minutesPlayedReg = Math.min(minutesPlayedReg, STANDARD_MATCH_DURATION);
  
  // Use manual override if set (for regulatory only, still capped at 90)
  if (hasManualOverride) {
    minutesPlayedReg = Math.min(player.minutes_played!, STANDARD_MATCH_DURATION);
  }
  
  // Build display strings
  const didPlay = player.started || player.entered_minute !== null;
  
  // Regulatory range display (capped at 90)
  const rangeDisplay = didPlay
    ? `${startMinuteReg}' → ${endMinuteReg}'`
    : "—";
  
  // Total range display (shows actual end with added time)
  const rangeDisplayTotal = didPlay
    ? `${rawStartDisplay}' → ${rawEndDisplay}'`
    : "—";
  
  const durationDisplay = `${minutesPlayedReg} min`;
  const durationDisplayTotal = `${minutesPlayedTotal} min`;
  
  return {
    minutesPlayed: minutesPlayedReg,
    minutesPlayedTotal,
    startMinute: startMinuteReg,
    endMinute: endMinuteReg,
    endMinuteTotal,
    rangeDisplay,
    rangeDisplayTotal,
    durationDisplay,
    durationDisplayTotal,
    hasAddedTime,
  };
}

/**
 * Get percentage of match played (based on 90' regulatory game)
 * Always capped at 100%
 */
export function getMinutesPlayedPercent(minutesPlayed: number): number {
  const percent = Math.round((minutesPlayed / STANDARD_MATCH_DURATION) * 100);
  return Math.min(percent, 100);
}
