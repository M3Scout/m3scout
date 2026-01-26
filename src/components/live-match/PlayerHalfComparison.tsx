/**
 * Player Half Comparison Component
 * 
 * Displays a visual and textual comparison between 1st and 2nd half performance
 * for an individual player's zone distribution.
 * 
 * RULES:
 * - Only renders for finished matches
 * - Only shows if there's a relevant change (>= 8%)
 * - Technical, neutral text (no numbers)
 * - Fails silently on error
 */

import { useMemo } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type HalfComparisonResult, 
  calculateHalfComparison, 
  splitStatsByHalf,
  type MatchEvent 
} from "@/lib/halfComparisonEngine";
import { type MatchStatsInput } from "@/lib/postGameAnalysis";

// ============================================
// TYPES
// ============================================

interface PlayerHalfComparisonProps {
  /** Player position */
  position: string;
  /** Match events for this player */
  events: MatchEvent[];
  /** Aggregated player stats */
  playerStats: MatchStatsInput;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function PlayerHalfComparison({
  position,
  events,
  playerStats,
  compact = false,
  className,
}: PlayerHalfComparisonProps) {
  // Calculate half comparison
  const result: HalfComparisonResult | null = useMemo(() => {
    try {
      // Split stats by half
      const { firstHalf, secondHalf } = splitStatsByHalf(events, playerStats);
      
      // Calculate comparison
      return calculateHalfComparison(position, firstHalf, secondHalf);
    } catch {
      // Fail silently
      return null;
    }
  }, [position, events, playerStats]);

  // Don't render if no result or no change
  if (!result || !result.hasChange || !result.insightText) {
    return null;
  }

  // Icon based on trend
  const TrendIcon = result.primaryTrend === "more_offensive" 
    ? TrendingUp 
    : result.primaryTrend === "more_defensive" 
      ? TrendingDown 
      : Scale;

  const trendColor = result.primaryTrend === "more_offensive"
    ? "text-emerald-400"
    : result.primaryTrend === "more_defensive"
      ? "text-sky-400"
      : "text-amber-400";

  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-1.5 text-[10px] text-muted-foreground",
        "py-1.5 px-2 rounded-md bg-zinc-800/30 border border-zinc-700/30",
        className
      )}>
        <TrendIcon className={cn("h-3 w-3 mt-0.5 flex-shrink-0", trendColor)} />
        <span className="leading-tight">{result.insightText}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-md border border-zinc-700/40 bg-zinc-800/20 p-3 space-y-2",
      className
    )}>
      {/* Title */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        <span className="font-medium">Evolução por Tempo</span>
      </div>

      {/* Visual comparison bars */}
      <div className="flex items-center gap-2 text-[9px]">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">1ºT</span>
            <span className="text-muted-foreground">2ºT</span>
          </div>
          <div className="flex gap-1">
            {/* Attack comparison */}
            <div className="flex-1 space-y-0.5">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-emerald-500/60"
                  style={{ width: `${result.halfData.firstHalf.attack}%` }}
                />
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-emerald-400/80"
                  style={{ width: `${result.halfData.secondHalf.attack}%` }}
                />
              </div>
              <span className="text-emerald-400/70 text-center block">ATA</span>
            </div>
            {/* Midfield comparison */}
            <div className="flex-1 space-y-0.5">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-amber-500/60"
                  style={{ width: `${result.halfData.firstHalf.midfield}%` }}
                />
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-amber-400/80"
                  style={{ width: `${result.halfData.secondHalf.midfield}%` }}
                />
              </div>
              <span className="text-amber-400/70 text-center block">MEI</span>
            </div>
            {/* Defense comparison */}
            <div className="flex-1 space-y-0.5">
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-sky-500/60"
                  style={{ width: `${result.halfData.firstHalf.defense}%` }}
                />
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                <div 
                  className="bg-sky-400/80"
                  style={{ width: `${result.halfData.secondHalf.defense}%` }}
                />
              </div>
              <span className="text-sky-400/70 text-center block">DEF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insight Text */}
      <div className="flex items-start gap-2 pt-1">
        <TrendIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", trendColor)} />
        <p className="text-sm leading-snug">{result.insightText}</p>
      </div>
    </div>
  );
}
