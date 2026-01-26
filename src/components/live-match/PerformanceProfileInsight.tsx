/**
 * Performance Profile Insight Component
 * 
 * Displays contextual insight text comparing current game performance
 * to the player's season average pattern.
 * 
 * RULES:
 * - NO recalculation (uses pre-calculated deviation result)
 * - Only renders if hasDeviation == true
 * - Technical, neutral, short text (no numbers)
 * - Fails silently on error
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ZoneDeviationResult } from "@/lib/zoneDeviationEngine";
import { generateCombinedInsight, type ZoneDeviationInsight } from "@/lib/zoneDeviationInsight";

// ============================================
// TYPES
// ============================================

interface PerformanceProfileInsightProps {
  /** Pre-calculated zone deviation result */
  deviationResult: ZoneDeviationResult;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function PerformanceProfileInsight({
  deviationResult,
  compact = false,
  className,
}: PerformanceProfileInsightProps) {
  // Generate insight text from deviation result (no recalculation)
  const insight: ZoneDeviationInsight | null = useMemo(() => {
    try {
      return generateCombinedInsight(deviationResult);
    } catch {
      // Fail silently
      return null;
    }
  }, [deviationResult]);

  // Don't render if no insight
  if (!insight) {
    return null;
  }

  // Icon based on direction
  const IconComponent = insight.direction === "up" ? TrendingUp : TrendingDown;
  const iconColorClass = insight.direction === "up" 
    ? "text-emerald-400" 
    : "text-amber-400";

  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-1.5 text-[10px] text-muted-foreground mt-2",
        "py-1.5 px-2 rounded-md bg-zinc-800/30 border border-zinc-700/30",
        className
      )}>
        <IconComponent className={cn("h-3 w-3 mt-0.5 flex-shrink-0", iconColorClass)} />
        <span className="leading-tight">{insight.text}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-md border border-zinc-700/40 bg-zinc-800/20 p-3 space-y-1.5",
      className
    )}>
      {/* Title */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span className="font-medium">Perfil de Atuação</span>
      </div>

      {/* Insight Text */}
      <div className="flex items-start gap-2">
        <IconComponent className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColorClass)} />
        <p className="text-sm leading-snug">{insight.text}</p>
      </div>
    </div>
  );
}
