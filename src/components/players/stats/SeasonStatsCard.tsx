import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { CompetitionStatsSummary } from "@/components/players/stats";
import type { PlayerStats } from "@/lib/playerStats";
import { motion, AnimatePresence } from "framer-motion";

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
  index?: number;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.03,
      duration: 0.2,
      ease: "easeOut" as const,
    },
  }),
};

export function SeasonStatsCard({
  stat,
  isGK,
  isExpanded,
  canEdit,
  isAdmin,
  playerPosition,
  index = 0,
  onToggleExpand,
  onEdit,
  onDelete,
}: SeasonStatsCardProps) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="w-full max-w-full overflow-hidden">
        <CardContent className="p-3 w-full max-w-full min-w-0">
          {/* Header: Competition name + actions */}
          <div className="flex items-start justify-between gap-2 mb-3 w-full min-w-0">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-2 text-left flex-1 min-w-0"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.div>
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
            <StatChip label="Jogos" value={stat.matches} index={0} />
            <StatChip label="Minutos" value={stat.minutes} index={1} />

            {isGK ? (
              <>
                <StatChip label="Defesas" value={stat.saves || 0} highlight="blue" index={2} />
                <StatChip label="Gols Sofr." value={stat.goals_conceded || 0} index={3} />
                <StatChip label="Clean Sheets" value={stat.clean_sheets || 0} highlight="green" index={4} />
                <StatChip label="Pên. Def." value={stat.penalties_saved || 0} index={5} />
              </>
            ) : (
              <>
                <StatChip label="Gols" value={stat.goals} highlight="green" index={2} />
                <StatChip label="Assistências" value={stat.assists} highlight="blue" index={3} />
                <StatChip label="Amarelos" value={stat.yellow_cards} variant="warning" index={4} />
                <StatChip label="Vermelhos" value={stat.red_cards} variant="danger" index={5} />
              </>
            )}
          </div>

          {/* Expanded details with animation */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={expandVariants}
                className="mt-3 pt-3 border-t w-full max-w-full overflow-hidden"
              >
                <CompetitionStatsSummary
                  stats={stat as PlayerStats}
                  playerPosition={playerPosition}
                  competitionName={stat.competitions?.name}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface StatChipProps {
  label: string;
  value: number;
  highlight?: "blue" | "green";
  variant?: "warning" | "danger";
  index?: number;
}

function StatChip({ label, value, highlight, variant, index = 0 }: StatChipProps) {
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
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={chipVariants}
      className={`${bgClass} rounded-lg px-2.5 py-1.5 flex items-center justify-between min-w-0`}
    >
      <span className="text-[11px] text-muted-foreground uppercase truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</span>
    </motion.div>
  );
}

interface SeasonTotalsCardProps {
  seasonStats: StatsWithCompetition[];
  isGK: boolean;
  index?: number;
}

export function SeasonTotalsCard({ seasonStats, isGK, index = 0 }: SeasonTotalsCardProps) {
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
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <Card className="w-full max-w-full overflow-hidden bg-muted/30 border-dashed">
        <CardContent className="p-3 w-full max-w-full min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">Total da Temporada</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            <StatChip label="Jogos" value={totals.matches} index={0} />
            <StatChip label="Minutos" value={totals.minutes} index={1} />
            {isGK ? (
              <>
                <StatChip label="Defesas" value={totals.saves} highlight="blue" index={2} />
                <StatChip label="Gols Sofr." value={totals.goals_conceded} index={3} />
                <StatChip label="Clean Sheets" value={totals.clean_sheets} highlight="green" index={4} />
                <StatChip label="Pên. Def." value={totals.penalties_saved} index={5} />
              </>
            ) : (
              <>
                <StatChip label="Gols" value={totals.goals} highlight="green" index={2} />
                <StatChip label="Assistências" value={totals.assists} highlight="blue" index={3} />
                <StatChip label="Amarelos" value={totals.yellow_cards} variant="warning" index={4} />
                <StatChip label="Vermelhos" value={totals.red_cards} variant="danger" index={5} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
