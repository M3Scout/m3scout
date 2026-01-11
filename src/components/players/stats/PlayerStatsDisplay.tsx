import { isGoalkeeper } from "@/lib/positionUtils";
import { OutfieldPlayerStats } from "./OutfieldPlayerStats";
import { GoalkeeperStats } from "./GoalkeeperStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface PlayerStatsDisplayProps {
  playerPosition: string;
  stats: Record<string, number>;
  seasonYear?: number;
  competitionName?: string;
}

/**
 * Conditional stats display component
 * Renders goalkeeper UI for GK positions, outfield UI for all others
 * Never mixes the two UIs
 */
export function PlayerStatsDisplay({ 
  playerPosition, 
  stats,
  seasonYear,
  competitionName 
}: PlayerStatsDisplayProps) {
  const isGK = isGoalkeeper(playerPosition);

  // Ensure all values are safe numbers
  const safeStats = Object.fromEntries(
    Object.entries(stats).map(([key, val]) => [
      key, 
      typeof val === "number" && !isNaN(val) ? val : 0
    ])
  ) as Record<string, number>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Estatísticas Detalhadas
          </CardTitle>
          <div className="flex items-center gap-2">
            {seasonYear && (
              <Badge variant="outline">{seasonYear}</Badge>
            )}
            {competitionName && (
              <Badge variant="secondary">{competitionName}</Badge>
            )}
            <Badge variant={isGK ? "default" : "secondary"}>
              {isGK ? "Goleiro" : "Jogador de Linha"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isGK ? (
          <GoalkeeperStats stats={safeStats as any} />
        ) : (
          <OutfieldPlayerStats stats={safeStats as any} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Aggregated stats display for multiple competitions/seasons
 */
interface AggregatedStatsDisplayProps {
  playerPosition: string;
  aggregatedStats: Record<string, number>;
  label?: string;
}

export function AggregatedStatsDisplay({ 
  playerPosition, 
  aggregatedStats,
  label = "Totais da Temporada"
}: AggregatedStatsDisplayProps) {
  const isGK = isGoalkeeper(playerPosition);

  // Ensure all values are safe numbers
  const safeStats = Object.fromEntries(
    Object.entries(aggregatedStats).map(([key, val]) => [
      key, 
      typeof val === "number" && !isNaN(val) ? val : 0
    ])
  ) as Record<string, number>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {label}
          </CardTitle>
          <Badge variant={isGK ? "default" : "secondary"}>
            {isGK ? "Goleiro" : "Jogador de Linha"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isGK ? (
          <GoalkeeperStats stats={safeStats as any} />
        ) : (
          <OutfieldPlayerStats stats={safeStats as any} />
        )}
      </CardContent>
    </Card>
  );
}
