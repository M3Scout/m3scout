/**
 * Match Clock - Single Source of Truth
 * 
 * This module provides centralized utilities for calculating match elapsed time.
 * All components that display match time should use these functions to ensure consistency.
 */

import type { Tables } from "@/integrations/supabase/types";

type Match = Pick<Tables<"matches">, 
  | "clock_status" 
  | "half_start_time" 
  | "elapsed_seconds_in_half" 
  | "half" 
  | "duration_minutes"
  | "added_time_first_half"
  | "added_time_second_half"
>;

export interface MatchClockInfo {
  /** Elapsed seconds in the current half (real-time calculation) */
  elapsedSecondsInHalf: number;
  /** Current half (1 or 2) */
  half: 1 | 2;
  /** Half duration in minutes (e.g., 45 for a 90-minute match) */
  halfDuration: number;
  /** Whether the clock is currently running */
  isRunning: boolean;
  /** Display time in mm:ss format for the current half */
  displayTime: string;
  /** Display minute string with football notation (e.g., "45+2'") */
  displayMinute: string;
  /** Absolute minute in the match (0-90+) */
  absoluteMinute: number;
  /** Whether currently in added time */
  isInAddedTime: boolean;
  /** Current added time for this half (in minutes) */
  currentAddedTime: number;
}

/**
 * Calculate the elapsed seconds in the current half based on match state.
 * This is the core calculation that should be used everywhere.
 * 
 * @param match - Match object with clock fields
 * @returns Elapsed seconds in the current half
 */
export function calculateElapsedSecondsInHalf(match: Match): number {
  const baseElapsed = match.elapsed_seconds_in_half ?? 0;
  
  if (match.clock_status !== "running" || !match.half_start_time) {
    return Math.max(0, baseElapsed);
  }
  
  // Clock is running - calculate real-time elapsed
  const halfStartMs = new Date(match.half_start_time).getTime();
  const nowMs = Date.now();
  const secondsSinceStart = Math.floor((nowMs - halfStartMs) / 1000);
  
  return Math.max(0, baseElapsed + secondsSinceStart);
}

/**
 * Get complete clock info for a match.
 * This provides all the data needed to display the clock in any format.
 * 
 * @param match - Match object with clock fields
 * @returns MatchClockInfo with all calculated values
 */
export function getMatchClockInfo(match: Match): MatchClockInfo {
  const half = (match.half ?? 1) as 1 | 2;
  const halfDuration = (match.duration_minutes ?? 90) / 2;
  const isRunning = match.clock_status === "running";
  const currentAddedTime = half === 1 
    ? (match.added_time_first_half ?? 0) 
    : (match.added_time_second_half ?? 0);
  
  const elapsedSecondsInHalf = calculateElapsedSecondsInHalf(match);
  
  const mins = Math.floor(elapsedSecondsInHalf / 60);
  const secs = elapsedSecondsInHalf % 60;
  
  // Format display time (mm:ss for the current half)
  const displayTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  // Calculate if in added time
  const isInAddedTime = mins >= halfDuration;
  
  // Calculate absolute minute and display string
  let absoluteMinute: number;
  let displayMinute: string;
  
  if (isInAddedTime) {
    const addedMins = mins - halfDuration;
    const baseMinute = half === 1 ? 45 : 90;
    absoluteMinute = baseMinute;
    
    if (addedMins > 0) {
      displayMinute = `${baseMinute}+${addedMins}'`;
    } else {
      displayMinute = `${baseMinute}'`;
    }
  } else {
    absoluteMinute = half === 1 ? mins : halfDuration + mins;
    displayMinute = `${Math.floor(absoluteMinute)}'`;
  }
  
  return {
    elapsedSecondsInHalf,
    half,
    halfDuration,
    isRunning,
    displayTime,
    displayMinute,
    absoluteMinute,
    isInAddedTime,
    currentAddedTime,
  };
}

/**
 * Format elapsed seconds as mm:ss
 */
export function formatClockTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get the display minute string from elapsed seconds and half info
 */
export function getDisplayMinute(
  elapsedSecondsInHalf: number, 
  half: 1 | 2, 
  halfDuration: number
): string {
  const mins = Math.floor(elapsedSecondsInHalf / 60);
  const isInAddedTime = mins >= halfDuration;
  
  if (isInAddedTime) {
    const addedMins = mins - halfDuration;
    const baseMinute = half === 1 ? 45 : 90;
    return addedMins > 0 ? `${baseMinute}+${addedMins}'` : `${baseMinute}'`;
  }
  
  const absoluteMinute = half === 1 ? mins : halfDuration + mins;
  return `${Math.floor(absoluteMinute)}'`;
}
