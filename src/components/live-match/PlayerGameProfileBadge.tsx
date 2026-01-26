/**
 * Player Game Profile Badge Component
 * 
 * Displays the player's classified game profile as a compact badge.
 * 
 * RULES:
 * - Only renders for finished matches
 * - Only shows if hasData is true
 * - Fails silently on error
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  classifyGameProfile, 
  type GameProfileStatsInput,
  type GameProfileResult 
} from "@/lib/playerGameProfileEngine";
import { type ZoneDistribution, calculateZoneHeatmap } from "@/lib/postGameAnalysis";

// ============================================
// TYPES
// ============================================

interface PlayerGameProfileBadgeProps {
  /** Player position for zone calculation */
  position: string;
  /** Player stats */
  stats: Omit<GameProfileStatsInput, "zoneDistribution">;
  /** Minutes played */
  minutesPlayed: number;
  /** Pre-calculated zone distribution (optional, will calculate if not provided) */
  zoneDistribution?: ZoneDistribution;
  /** Compact mode */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function PlayerGameProfileBadge({
  position,
  stats,
  minutesPlayed,
  zoneDistribution,
  compact = false,
  className,
}: PlayerGameProfileBadgeProps) {
  // Calculate profile
  const result: GameProfileResult | null = useMemo(() => {
    try {
      // Calculate zone distribution if not provided
      const zones = zoneDistribution ?? calculateZoneHeatmap(position, stats, minutesPlayed).percentages;
      
      return classifyGameProfile({
        ...stats,
        zoneDistribution: zones,
      });
    } catch {
      return null;
    }
  }, [position, stats, minutesPlayed, zoneDistribution]);

  // Don't render if no result or insufficient data
  if (!result || !result.hasData) {
    return null;
  }

  const { profile } = result;

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border",
        profile.bgColor,
        profile.color,
        className
      )}>
        <span>{profile.icon}</span>
        <span>{profile.label}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-1.5 rounded-md border",
      profile.bgColor,
      className
    )}>
      <span className="text-base">{profile.icon}</span>
      <div className="flex flex-col">
        <span className={cn("text-xs font-medium", profile.color)}>
          Perfil no jogo
        </span>
        <span className="text-[11px] text-muted-foreground">
          {profile.label}
        </span>
      </div>
    </div>
  );
}
