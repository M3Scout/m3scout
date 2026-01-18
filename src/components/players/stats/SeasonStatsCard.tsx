import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { CompetitionStatsSummary } from "@/components/players/stats";
import type { PlayerStats } from "@/lib/playerStats";

interface StatsWithCompetition extends PlayerStats {
  competitions?: {
    name: string;
    computed_coefficient: number;
  } | null;
}

interface SeasonStatsCardProps {
  stat: StatsWithCompetition;
  isGK: boolean;
  isExpanded: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  playerPosition?: string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SeasonStatsCard({
  stat,
  isGK,
  isExpanded,
  canEdit,
  isAdmin,
  playerPosition,
  onToggleExpand,
  onEdit,
  onDelete,
}: SeasonStatsCardProps) {
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardContent className="p-3 w-full max-w-full min-w-0">
        {/* Header: Competition name + actions */}
        <div className="flex items-start justify-between gap-2 mb-3 w-full min-w-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-left flex-1 min-w-0"
          >
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            <span className="font-medium text-sm break-words line-clamp-2 min-w-0">
              {stat.competitions?.name || "Sem competição"}
            </span>
          </button>
          {canEdit && (
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <StatChip label="Jogos" value={stat.matches} />
          <StatChip label="Minutos" value={stat.minutes} />

          {isGK ? (
            <>
              <StatChip label="Defesas" value={stat.saves || 0} highlight="blue" />
              <StatChip label="Gols Sofr." value={stat.goals_conceded || 0} />
              <StatChip label="Clean Sheets" value={stat.clean_sheets || 0} highlight="green" />
              <StatChip label="Pên. Def." value={stat.penalties_saved || 0} />
            </>
          ) : (
            <>
              <StatChip label="Gols" value={stat.goals} highlight="green" />
              <StatChip label="Assistências" value={stat.assists} highlight="blue" />
              <StatChip label="Amarelos" value={stat.yellow_cards} variant="warning" />
              <StatChip label="Vermelhos" value={stat.red_cards} variant="danger" />
            </>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t w-full max-w-full overflow-hidden">
            <CompetitionStatsSummary
              stats={stat as PlayerStats}
              playerPosition={playerPosition}
              competitionName={stat.competitions?.name}
              compact
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatChipProps {
  label: string;
  value: number;
  highlight?: "blue" | "green";
  variant?: "warning" | "danger";
}

function StatChip({ label, value, highlight, variant }: StatChipProps) {
  let valueClass = "text-foreground";
  let bgClass = "bg-muted/50";

  if (highlight === "blue") {
    valueClass = "text-blue-600 dark:text-blue-400";
    bgClass = "bg-blue-500/10";
  } else if (highlight === "green") {
    valueClass = "text-emerald-600 dark:text-emerald-400";
    bgClass = "bg-emerald-500/10";
  } else if (variant === "warning") {
    valueClass = "text-amber-600 dark:text-amber-400";
    bgClass = "bg-amber-500/10";
  } else if (variant === "danger") {
    valueClass = "text-red-600 dark:text-red-400";
    bgClass = "bg-red-500/10";
  }

  return (
    <div className={`${bgClass} rounded-lg px-2.5 py-1.5 flex items-center justify-between min-w-0`}>
      <span className="text-[11px] text-muted-foreground uppercase truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

interface SeasonTotalsCardProps {
  seasonStats: StatsWithCompetition[];
  isGK: boolean;
}

export function SeasonTotalsCard({ seasonStats, isGK }: SeasonTotalsCardProps) {
  const totals = seasonStats.reduce(
    (acc, s) => ({
      matches: acc.matches + (s.matches || 0),
      minutes: acc.minutes + (s.minutes || 0),
      goals: acc.goals + (s.goals || 0),
      assists: acc.assists + (s.assists || 0),
      yellow_cards: acc.yellow_cards + (s.yellow_cards || 0),
      red_cards: acc.red_cards + (s.red_cards || 0),
      saves: acc.saves + (s.saves || 0),
      goals_conceded: acc.goals_conceded + (s.goals_conceded || 0),
      clean_sheets: acc.clean_sheets + (s.clean_sheets || 0),
      penalties_saved: acc.penalties_saved + (s.penalties_saved || 0),
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
    }
  );

  return (
    <Card className="w-full max-w-full overflow-hidden bg-muted/30 border-dashed">
      <CardContent className="p-3 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">Total da Temporada</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          <StatChip label="Jogos" value={totals.matches} />
          <StatChip label="Minutos" value={totals.minutes} />
          {isGK ? (
            <>
              <StatChip label="Defesas" value={totals.saves} highlight="blue" />
              <StatChip label="Gols Sofr." value={totals.goals_conceded} />
              <StatChip label="Clean Sheets" value={totals.clean_sheets} highlight="green" />
              <StatChip label="Pên. Def." value={totals.penalties_saved} />
            </>
          ) : (
            <>
              <StatChip label="Gols" value={totals.goals} highlight="green" />
              <StatChip label="Assistências" value={totals.assists} highlight="blue" />
              <StatChip label="Amarelos" value={totals.yellow_cards} variant="warning" />
              <StatChip label="Vermelhos" value={totals.red_cards} variant="danger" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
