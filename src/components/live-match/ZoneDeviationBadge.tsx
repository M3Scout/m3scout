/**
 * Zone Deviation Badge
 * 
 * Displays the deviation between current game zone vs season average
 * Only shows when a significant deviation (>= 10%) is detected
 * 
 * SAFETY: Read-only, no data modification, derived display only
 */

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { type ZoneDeviationResult } from "@/lib/zoneDeviationEngine";

interface ZoneDeviationBadgeProps {
  result: ZoneDeviationResult;
  compact?: boolean;
}

export function ZoneDeviationBadge({ result, compact = false }: ZoneDeviationBadgeProps) {
  // Don't render if no deviation or not enough data
  if (!result.hasEnoughData || !result.hasDeviation || result.deviations.length === 0) {
    return null;
  }

  if (compact) {
    // Compact mode: single line summary
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {result.deviations.map((deviation) => (
          <span
            key={deviation.zone}
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium",
              deviation.direction === "up"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            )}
          >
            {deviation.direction === "up" ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            <span>{deviation.zone}</span>
            <span className="opacity-70">
              {deviation.direction === "up" ? "+" : "-"}{deviation.diff}%
            </span>
          </span>
        ))}
      </div>
    );
  }

  // Full mode: detailed breakdown
  return (
    <div className="mt-2 p-2 rounded-md bg-zinc-800/30 border border-zinc-700/40">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
        <span>vs Média da Temporada</span>
        <span className="text-[9px] opacity-60">({result.gamesUsed} jogos)</span>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {result.deviations.map((deviation) => (
          <div
            key={deviation.zone}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-[10px]",
              deviation.isStrong
                ? deviation.direction === "up"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : deviation.direction === "up"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            )}
          >
            {deviation.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span className="font-medium">{deviation.zone}</span>
            <span className="opacity-80">
              {deviation.current}%
              <span className="mx-0.5 opacity-50">·</span>
              <span className="text-[9px]">
                média {deviation.seasonAvg}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline text for deviation (for PDF or minimal display)
 */
export function getDeviationText(result: ZoneDeviationResult): string | null {
  if (!result.hasEnoughData || !result.hasDeviation) {
    return null;
  }

  const parts = result.deviations.map((d) => {
    const arrow = d.direction === "up" ? "↑" : "↓";
    return `${d.zone} ${arrow}${d.diff}%`;
  });

  return parts.join(" · ");
}
