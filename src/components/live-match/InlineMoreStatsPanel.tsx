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
      { type: "assist", label: "Assistências" },
      { type: "shot_on_target", label: "Finalizações no Gol" },
      { type: "shot", label: "Finalizações Fora" },
    ],
  },
  {
    category: "CRI",
    categoryKey: "creativity",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "key_pass", label: "Passes Decisivos" },
      { type: "chance_created", label: "Chances Criadas" },
      { type: "dribble_success", label: "Dribles Certos" },
      { type: "dribble_attempt", label: "Dribles Errados" },
    ],
  },
  {
    category: "DEF",
    categoryKey: "defense",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interceptações" },
      { type: "recovery", label: "Recuperações" },
      { type: "clearance", label: "Cortes" },
      { type: "duel_won", label: "Duelos Ganhos" },
      { type: "aerial_duel_won", label: "Duelos Aéreos" },
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
      { type: "foul_committed", label: "Faltas Cometidas" },
      { type: "foul_suffered", label: "Faltas Sofridas" },
      { type: "pass_success", label: "Passes Certos" },
      { type: "possession_lost", label: "Perdas de Posse" },
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
      { type: "goal_conceded", label: "Gols Sofridos" },
      { type: "penalty_saved", label: "Pênaltis Defendidos" },
      { type: "error_led_to_goal", label: "Erros para Gol" },
    ],
  },
  {
    category: "GK+",
    categoryKey: "goalkeeper_advanced",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      { type: "box_save", label: "Defesas na Área" },
      { type: "punch", label: "Socos" },
      { type: "high_claim", label: "Bolas Altas" },
      { type: "sweeper_action", label: "Saídas do Gol" },
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
      { type: "foul_committed", label: "Faltas Cometidas" },
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

  // Get category glow color for hover effects
  const getCategoryGlow = (color: string) => {
    const glowMap: Record<string, string> = {
      "text-red-400": "hover:shadow-red-500/20 focus-within:shadow-red-500/20",
      "text-amber-400": "hover:shadow-amber-500/20 focus-within:shadow-amber-500/20",
      "text-blue-400": "hover:shadow-blue-500/20 focus-within:shadow-blue-500/20",
      "text-purple-400": "hover:shadow-purple-500/20 focus-within:shadow-purple-500/20",
      "text-green-400": "hover:shadow-green-500/20 focus-within:shadow-green-500/20",
      "text-cyan-400": "hover:shadow-cyan-500/20 focus-within:shadow-cyan-500/20",
    };
    return glowMap[color] || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-3 p-4"
    >
      {/* Status message */}
      {!canAddEvents && (
        <div
          className={cn(
            "p-2.5 rounded-xl text-xs text-center font-medium",
            isPaused && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
            isDraft && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            !isOnField && isLive && "bg-red-500/10 text-red-400 border border-red-500/20"
          )}
        >
          {isPaused && "⏸️ Jogo pausado — retome para registrar"}
          {isDraft && "📋 Eventos pendentes até iniciar"}
          {!isOnField && isLive && "⚠️ Jogador fora de campo"}
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {stats.map((category) => (
          <div
            key={category.categoryKey}
            className={cn(
              "rounded-2xl border p-3",
              category.bgColor
            )}
          >
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "w-1.5 h-4 rounded-full",
                category.color.replace("text-", "bg-")
              )} />
              <p className={cn(
                "text-xs font-bold uppercase tracking-wider",
                category.color
              )}>
                {category.category}
              </p>
            </div>

            {/* Stats grid - 2 cols mobile, 3-4 cols desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {category.stats.map((stat) => {
                const count = getCount(stat.type);
                const isHighlight = (stat.type === "goal" || stat.type === "assist" || stat.type === "save") && count > 0;
                
                return (
                  <motion.div
                    key={stat.type}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "flex flex-col rounded-xl transition-all duration-200",
                      "bg-zinc-900/60 border border-zinc-700/40",
                      "hover:border-zinc-600/60 hover:shadow-lg",
                      getCategoryGlow(category.color),
                      isHighlight && "border-green-500/50 bg-green-500/5 shadow-green-500/10"
                    )}
                  >
                    {/* Value + Label section */}
                    <div className="flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-[60px]">
                      <motion.p 
                        key={count}
                        initial={{ scale: 1.2, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "text-2xl font-bold tabular-nums leading-none",
                          count > 0 ? category.color : "text-zinc-500"
                        )}
                      >
                        {count}
                      </motion.p>
                      <p className={cn(
                        "text-[9px] sm:text-[10px] text-center leading-snug mt-1.5 px-1 min-h-[24px] flex items-center justify-center",
                        count > 0 ? "text-zinc-300" : "text-zinc-500"
                      )}>
                        {stat.label}
                      </p>
                    </div>
                    
                    {/* Action buttons footer */}
                    <div className="flex items-center border-t border-zinc-700/30">
                      {/* Minus button */}
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleRemoveStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || count === 0 || !onVoidLastEvent}
                        className={cn(
                          "flex-1 h-8 flex items-center justify-center",
                          "text-zinc-500 hover:text-red-400 hover:bg-red-500/10",
                          "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500",
                          "transition-colors rounded-bl-xl",
                          "border-r border-zinc-700/30"
                        )}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </motion.button>
                      
                      {/* Plus button */}
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleAddStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                        className={cn(
                          "flex-1 h-8 flex items-center justify-center",
                          "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10",
                          "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-400",
                          "transition-colors rounded-br-xl"
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}