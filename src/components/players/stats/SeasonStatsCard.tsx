import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Pencil, Trash2, Zap, FileEdit, Layers } from "lucide-react";
import { CompetitionStatsSummary } from "@/components/players/stats";
import {
  ScoutCategoryStats,
  OUTFIELD_SCOUT_CATEGORIES,
  GOALKEEPER_SCOUT_CATEGORIES,
  type StatValues,
} from "./ScoutCategoryStats";
import type { PlayerStats } from "@/lib/playerStats";
import { normalizePlayerStats } from "@/lib/normalizePlayerStats";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsWithCompetition extends PlayerStats {
  competitions?: {
    name: string;
    computed_coefficient: number;
  } | null;
  // Origin tracking
  _isLiveData?: boolean;
  _isManualData?: boolean;
  _isCombined?: boolean;
  _liveStats?: Partial<PlayerStats>;
  _manualStats?: Partial<PlayerStats>;
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
  // CRITICAL: Normalize stats to ensure shots_total is calculated correctly
  // This ensures consistency between summary view (this component) and expanded view (CompetitionStatsSummary)
  // FIN (finalizações) = shots_on_target + shots_blocked + shots_off_target
  const normalizedStat = normalizePlayerStats(stat as PlayerStats);
  
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="w-full max-w-full overflow-hidden border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardContent className="p-3 w-full max-w-full min-w-0">
          {/* Header: Competition name + Origin Badge + actions */}
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
              {/* Origin Badge */}
              {stat._isCombined ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-400 bg-purple-500/10 gap-1 shrink-0">
                        <Layers className="w-2.5 h-2.5" />
                        Combinado
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      <p className="font-medium mb-1">Live Match + Manual</p>
                      <p className="text-muted-foreground">
                        Valores somados de partidas ao vivo ({stat._liveStats?.matches || 0} jogos) 
                        e entrada manual ({stat._manualStats?.matches || 0} jogos).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : stat._isLiveData ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10 gap-1 shrink-0">
                        <Zap className="w-2.5 h-2.5" />
                        Live
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Dados sincronizados automaticamente de partidas ao vivo (não editável)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : stat._isManualData ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400 bg-blue-500/10 gap-1 shrink-0">
                        <FileEdit className="w-2.5 h-2.5" />
                        Manual
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Dados inseridos manualmente via formulário de edição
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </button>
            {/* Actions: Only show edit for manual or combined stats */}
            {canEdit && (stat._isManualData || stat._isCombined) && (
              <div className="flex gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {stat._isCombined 
                        ? "Editar apenas a parte manual (não altera dados de Live Match)"
                        : "Editar estatísticas manuais"
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isAdmin && stat._isManualData && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            )}
            {/* For pure live data, show lock indicator */}
            {stat._isLiveData && !stat._isCombined && canEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex gap-1 flex-shrink-0 opacity-50">
                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-not-allowed" disabled>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Dados de Live Match não podem ser editados diretamente. 
                    Use o Modo Revisão da partida para correções.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Stats Grid - 3 columns for outfield, 2 for GK */}
          <div className={`grid gap-2 w-full ${isGK ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <StatChip label="Jogos" value={normalizedStat.matches} index={0} />
            <StatChip label="Minutos" value={normalizedStat.minutes} index={1} />

            {isGK ? (
              <>
                <StatChip label="Defesas" value={normalizedStat.saves || 0} highlight="blue" index={2} />
                <StatChip label="Gols Sofr." value={normalizedStat.goals_conceded || 0} index={3} />
                <StatChip label="Clean Sheets" value={normalizedStat.clean_sheets || 0} highlight="green" index={4} />
                <StatChip label="Pên. Def." value={normalizedStat.penalties_saved || 0} index={5} />
              </>
            ) : (
              <>
                <StatChip label="Gols" value={normalizedStat.goals} highlight="green" index={2} />
                <StatChip label="Assist" value={normalizedStat.assists} highlight="blue" index={3} />
                {/* CRITICAL: Use shots_total_derived to ensure FIN = on_target + blocked + off_target */}
                <StatChip label="Finaliz." value={normalizedStat.shots_total_derived} index={4} />
                <StatChip label="No Gol" value={normalizedStat.shots_on_target || 0} index={5} />
                <StatChip label="Amarelos" value={normalizedStat.yellow_cards} variant="warning" index={6} />
                <StatChip label="Vermelhos" value={normalizedStat.red_cards} variant="danger" index={7} />
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
  // CRITICAL: Normalize each stat before aggregating to ensure FIN uses shots_total_derived
  const totals = seasonStats.reduce(
    (acc, s) => {
      // Normalize each stat to get correct shots_total_derived
      const normalized = normalizePlayerStats(s as PlayerStats);
      return {
        matches: acc.matches + (normalized.matches || 0),
        minutes: acc.minutes + (normalized.minutes || 0),
        goals: acc.goals + (normalized.goals || 0),
        assists: acc.assists + (normalized.assists || 0),
        // Use shots_total_derived for correct FIN calculation
        shots: acc.shots + (normalized.shots_total_derived || 0),
        shots_on_target: acc.shots_on_target + (normalized.shots_on_target || 0),
        shots_blocked: acc.shots_blocked + (normalized.shots_blocked || 0),
        yellow_cards: acc.yellow_cards + (normalized.yellow_cards || 0),
        red_cards: acc.red_cards + (normalized.red_cards || 0),
        saves: acc.saves + (normalized.saves || 0),
        goals_conceded: acc.goals_conceded + (normalized.goals_conceded || 0),
        clean_sheets: acc.clean_sheets + (normalized.clean_sheets || 0),
        penalties_saved: acc.penalties_saved + (normalized.penalties_saved || 0),
      };
    },
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      shots: 0,
      shots_on_target: 0,
      shots_blocked: 0,
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
      <Card className="w-full max-w-full overflow-hidden border-zinc-800/40 bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80 border-dashed">
        <CardContent className="p-3 w-full max-w-full min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">Total da Temporada</Badge>
          </div>
          <div className={`grid gap-2 w-full ${isGK ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
                <StatChip label="Assist" value={totals.assists} highlight="blue" index={3} />
                {/* CRITICAL: Use aggregated shots which now uses shots_total_derived */}
                <StatChip label="Finaliz." value={totals.shots} index={4} />
                <StatChip label="No Gol" value={totals.shots_on_target} index={5} />
                <StatChip label="Amarelos" value={totals.yellow_cards} variant="warning" index={6} />
                <StatChip label="Vermelhos" value={totals.red_cards} variant="danger" index={7} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
