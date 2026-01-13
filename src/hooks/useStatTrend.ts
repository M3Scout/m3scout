/**
 * Hook to calculate stat trends based on historical data
 * 
 * Compares current season stats with previous season to determine improvement/decline
 */

import { useMemo } from "react";

export type TrendDirection = 'up' | 'down' | 'stable' | 'new';

export interface StatTrend {
  direction: TrendDirection;
  percentChange: number | null;
  previousValue: number | null;
}

export interface TrendData {
  [statKey: string]: StatTrend;
}

/**
 * Calculate trend direction based on percentage change
 */
function getTrendDirection(percentChange: number): TrendDirection {
  if (percentChange >= 10) return 'up';
  if (percentChange <= -10) return 'down';
  return 'stable';
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

interface SeasonStats {
  season_year: number;
  [key: string]: number | string | null | undefined;
}

/**
 * Hook to calculate stat trends by comparing current vs previous season
 * 
 * @param currentStats - Current season stats
 * @param previousStats - Previous season stats (or null if not available)
 * @param statKeys - Array of stat keys to calculate trends for
 * @returns Object with trend data for each stat
 */
export function useStatTrends(
  currentStats: SeasonStats | null,
  previousStats: SeasonStats | null,
  statKeys: string[]
): TrendData {
  return useMemo(() => {
    const trends: TrendData = {};
    
    for (const key of statKeys) {
      const currentValue = currentStats ? Number(currentStats[key] ?? 0) : 0;
      const previousValue = previousStats ? Number(previousStats[key] ?? 0) : null;
      
      if (previousValue === null) {
        // No previous data - mark as new
        trends[key] = {
          direction: 'new',
          percentChange: null,
          previousValue: null,
        };
      } else {
        const percentChange = calculatePercentChange(currentValue, previousValue);
        trends[key] = {
          direction: getTrendDirection(percentChange),
          percentChange,
          previousValue,
        };
      }
    }
    
    return trends;
  }, [currentStats, previousStats, statKeys]);
}

/**
 * Get trend colors for UI rendering
 */
export function getTrendColor(direction: TrendDirection, isInverse = false): string {
  // For inverse stats (like yellow_cards), up is bad and down is good
  const actualDirection = isInverse 
    ? (direction === 'up' ? 'down' : direction === 'down' ? 'up' : direction)
    : direction;
    
  switch (actualDirection) {
    case 'up':
      return 'text-emerald-500';
    case 'down':
      return 'text-destructive';
    case 'stable':
      return 'text-muted-foreground';
    case 'new':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get trend background colors for badges
 */
export function getTrendBgColor(direction: TrendDirection, isInverse = false): string {
  const actualDirection = isInverse 
    ? (direction === 'up' ? 'down' : direction === 'down' ? 'up' : direction)
    : direction;
    
  switch (actualDirection) {
    case 'up':
      return 'bg-emerald-500/10 border-emerald-500/30';
    case 'down':
      return 'bg-destructive/10 border-destructive/30';
    case 'stable':
      return 'bg-muted/30 border-muted';
    case 'new':
      return 'bg-primary/10 border-primary/30';
    default:
      return 'bg-muted/30 border-muted';
  }
}
