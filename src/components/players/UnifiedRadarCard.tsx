/**
 * Unified Radar Card Component
 * 
 * Automatically switches between:
 * - Goalkeeper radar (5-axis: DEF, ANT, TAT, DIS, AER)
 * - Outfield player radar (5-axis: ATA, TÉC, DEF, TÁT, CRI)
 * 
 * Maintains the same visual design, only swaps labels and data source.
 */

import { isGoalkeeper } from "@/lib/positionUtils";
import { SofaScoreRadarCard, RadarScoresData } from "./SofaScoreRadarCard";
import { GKRadarCard } from "./GKRadarCard";

interface UnifiedRadarCardProps {
  playerId: string;
  playerPosition?: string;
  showFilters?: boolean;
  className?: string;
  // Comparison support for outfield players
  comparisonScores?: RadarScoresData | null;
  comparisonLabel?: string;
  comparisonColor?: string;
}

/**
 * Unified radar component that automatically detects player type
 * and renders the appropriate radar visualization.
 */
export function UnifiedRadarCard({
  playerId,
  playerPosition = "",
  showFilters = true,
  className,
  comparisonScores,
  comparisonLabel,
  comparisonColor,
}: UnifiedRadarCardProps) {
  const isGK = isGoalkeeper(playerPosition);

  if (isGK) {
    return (
      <GKRadarCard
        playerId={playerId}
        playerPosition={playerPosition}
        showFilters={showFilters}
        className={className}
      />
    );
  }

  return (
    <SofaScoreRadarCard
      playerId={playerId}
      playerPosition={playerPosition}
      showFilters={showFilters}
      className={className}
      comparisonScores={comparisonScores}
      comparisonLabel={comparisonLabel}
      comparisonColor={comparisonColor}
    />
  );
}
