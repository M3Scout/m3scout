import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

// Stats categories for inline panel (same as desktop MoreStatsMenu)
const OUTFIELD_STATS: { category: string; categoryKey: string; color: string; bgColor: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "ATA",
    categoryKey: "attack",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "assist", label: "Assist." },
      { type: "shot_on_target", label: "Final. Gol" },
      { type: "shot", label: "Final. Fora" },
    ],
  },
  {
    category: "CRI",
    categoryKey: "creativity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "key_pass", label: "P. Dec." },
      { type: "chance_created", label: "Chances" },
      { type: "dribble_success", label: "Dribles ✓" },
      { type: "dribble_attempt", label: "Dribles ✗" },
    ],
  },
  {
    category: "DEF",
    categoryKey: "defense",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interc." },
      { type: "recovery", label: "Recup." },
      { type: "clearance", label: "Cortes" },
      { type: "duel_won", label: "Duelos ✓" },
      { type: "aerial_duel_won", label: "Aéreos ✓" },
    ],
  },
  {
    category: "DIS",
    categoryKey: "discipline",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    stats: [
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
      { type: "foul_committed", label: "Faltas" },
      { type: "foul_suffered", label: "F. Sof." },
      { type: "pass_success", label: "Passes ✓" },
      { type: "possession_lost", label: "Perdas" },
    ],
  },
];

const GOALKEEPER_STATS: { category: string; categoryKey: string; color: string; bgColor: string; stats: { type: MatchEventType; label: string }[] }[] = [
  {
    category: "GK",
    categoryKey: "goalkeeper",
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    stats: [
      { type: "save", label: "Defesas" },
      { type: "goal_conceded", label: "Gols Sof." },
      { type: "penalty_saved", label: "Pên. Def." },
      { type: "error_led_to_goal", label: "Erros→Gol" },
    ],
  },
  {
    category: "GK+",
    categoryKey: "goalkeeper_advanced",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { type: "box_save", label: "Def. Área" },
      { type: "punch", label: "Socos" },
      { type: "high_claim", label: "Bolas Altas" },
      { type: "sweeper_action", label: "Saídas" },
    ],
  },
  {
    category: "DIS",
    categoryKey: "discipline",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    stats: [
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
      { type: "foul_committed", label: "Faltas" },
    ],
  },
];

interface InlineMoreStatsPanelProps {
  matchStatus: MatchStatus;
  clockStatus: "stopped" | "running" | "paused";
  isGoalkeeper: boolean;
  isOnField: boolean;
  eventCounts: Record<MatchEventType, number>;
  onAddEvent: (eventType: MatchEventType) => void;
  onVoidLastEvent?: (eventType: MatchEventType) => void;
  disabled?: boolean;
}

export function InlineMoreStatsPanel({
  matchStatus,
  clockStatus,
  isGoalkeeper,
  isOnField,
  eventCounts,
  onAddEvent,
  onVoidLastEvent,
  disabled,
}: InlineMoreStatsPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  const canAddEvents = (isLive && clockStatus === "running" && isOnField) || isDraft;

  const stats = isGoalkeeper ? GOALKEEPER_STATS : OUTFIELD_STATS;
  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  const handleAddStat = useCallback((type: MatchEventType, label: string) => {
    if (isSubmitting || disabled) return;

    if (isLive && !isOnField) {
      toast.error("Atleta fora de campo");
      return;
    }
    if (isLive && isPaused) {
      toast.warning("Jogo pausado");
      return;
    }

    setIsSubmitting(true);
    onAddEvent(type);
    toast.success(`${label} +1`, { duration: 2000 });
    setTimeout(() => setIsSubmitting(false), 250);
  }, [isSubmitting, disabled, isLive, isOnField, isPaused, onAddEvent]);

  const handleRemoveStat = useCallback((type: MatchEventType, label: string) => {
    if (isSubmitting || disabled) return;
    
    const count = getCount(type);
    if (count === 0) {
      toast.info("Nenhum evento para remover");
      return;
    }

    if (onVoidLastEvent) {
      setIsSubmitting(true);
      onVoidLastEvent(type);
      toast.success(`${label} -1`, { duration: 2000 });
      setTimeout(() => setIsSubmitting(false), 250);
    }
  }, [isSubmitting, disabled, onVoidLastEvent, getCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-2.5 p-4"
    >
      {/* Status message */}
      {!canAddEvents && (
        <div
          className={cn(
            "p-2 rounded-xl text-xs text-center",
            isPaused && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
            isDraft && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            !isOnField && isLive && "bg-red-500/10 text-red-400 border border-red-500/20"
          )}
        >
          {isPaused && "⏸️ Jogo pausado"}
          {isDraft && "📋 Eventos pendentes"}
          {!isOnField && isLive && "⚠️ Fora de campo"}
        </div>
      )}

      {/* Categories grid - responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {stats.map((category) => (
          <div
            key={category.categoryKey}
            className={cn(
              "rounded-xl border p-3",
              category.bgColor
            )}
          >
            <p className={cn(
              "text-[10px] font-bold mb-2.5 uppercase tracking-wider",
              category.color
            )}>
              {category.category}
            </p>
            {/* Stats grid - 2 cols on mobile, 3 cols on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {category.stats.map((stat) => {
                const count = getCount(stat.type);
                const isHighlight = (stat.type === "goal" || stat.type === "assist" || stat.type === "save") && count > 0;
                
                return (
                  <div
                    key={stat.type}
                    className={cn(
                      "flex items-center gap-1.5 p-2 rounded-lg transition-all",
                      "bg-background/40 border border-border/30",
                      isHighlight && "border-green-500/40 bg-green-500/10"
                    )}
                  >
                    {/* Minus button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveStat(stat.type, stat.label)}
                      disabled={disabled || isSubmitting || count === 0 || !onVoidLastEvent}
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        "bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    
                    {/* Count and label */}
                    <div className="flex-1 text-center min-w-0">
                      <p className={cn(
                        "text-base font-bold tabular-nums leading-none",
                        count > 0 ? category.color : "text-zinc-500"
                      )}>
                        {count}
                      </p>
                      <p className="text-[9px] text-zinc-500 truncate mt-0.5">{stat.label}</p>
                    </div>
                    
                    {/* Plus button */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAddStat(stat.type, stat.label)}
                      disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        "bg-zinc-700/50 text-zinc-200 hover:bg-primary/20 hover:text-primary",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        "transition-colors"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}