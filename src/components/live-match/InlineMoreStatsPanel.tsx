import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

// Category full names for headers
const CATEGORY_NAMES: Record<string, string> = {
  ATA: "Ataque",
  CRI: "Criação",
  DEF: "Defesa",
  DIS: "Disciplina",
  GK: "Goleiro",
  "GK+": "Goleiro Avançado",
};

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

  // Get category accent color for hover/focus effects
  const getCategoryAccent = (color: string) => {
    const accentMap: Record<string, string> = {
      "text-red-400": "hover:ring-red-500/30 focus-within:ring-red-500/40",
      "text-amber-400": "hover:ring-amber-500/30 focus-within:ring-amber-500/40",
      "text-blue-400": "hover:ring-blue-500/30 focus-within:ring-blue-500/40",
      "text-purple-400": "hover:ring-purple-500/30 focus-within:ring-purple-500/40",
      "text-green-400": "hover:ring-green-500/30 focus-within:ring-green-500/40",
      "text-cyan-400": "hover:ring-cyan-500/30 focus-within:ring-cyan-500/40",
    };
    return accentMap[color] || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "p-3 tablet:p-5 desktop:p-6",
        "space-y-4 tablet:space-y-5 desktop:space-y-6"
      )}
    >
      {/* Status message */}
      {!canAddEvents && (
        <div
          className={cn(
            "p-3 tablet:p-4 rounded-xl text-sm tablet:text-base text-center font-medium",
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

      {/* Categories Grid - mobile 1 col, iPad/tablet 2 cols, desktop 2 cols */}
      <div className={cn(
        "grid grid-cols-1 tablet:grid-cols-2 gap-4 tablet:gap-5 desktop:gap-6"
      )}>
        {stats.map((category) => (
          <div
            key={category.categoryKey}
            className={cn(
              "rounded-2xl tablet:rounded-3xl border-2 p-4 tablet:p-5 desktop:p-6",
              category.bgColor
            )}
          >
            {/* Category header - improved spacing and visibility */}
             <div className={cn(
               "flex items-center gap-3 mb-4 tablet:mb-5 desktop:mb-6 pb-3 border-b border-white/10"
             )}>
               <div className={cn(
                 "w-2 h-6 tablet:h-7 rounded-full",
                 category.color.replace("text-", "bg-")
               )} />
              <div className="flex items-baseline gap-2">
                 <span className={cn(
                   "text-base tablet:text-lg desktop:text-xl font-black uppercase tracking-wide",
                   category.color
                 )}>
                  {category.category}
                </span>
                 <span className={cn(
                   "text-xs tablet:text-sm text-zinc-400 font-medium"
                 )}>
                  {CATEGORY_NAMES[category.category]}
                </span>
              </div>
            </div>

            {/* Stats grid - mobile 2 cols, iPad/tablet ALWAYS 2 cols, desktop 4 cols */}
            <div className={cn(
              "grid grid-cols-2 tablet:grid-cols-2 desktop:grid-cols-4",
              "gap-3 tablet:gap-[18px] desktop:gap-4"
            )}>
              {category.stats.map((stat) => {
                const count = getCount(stat.type);
                const isHighlight = (stat.type === "goal" || stat.type === "assist" || stat.type === "save") && count > 0;
                
                return (
                  <motion.div
                    key={stat.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex flex-col rounded-xl tablet:rounded-2xl transition-all duration-200",
                      "bg-zinc-900/70 border-2 border-zinc-700/50",
                      "hover:border-zinc-600 hover:shadow-xl hover:ring-2",
                      // Tablet rules (iPad): wider cards, balanced height
                      "min-h-[110px] tablet:min-h-[120px] desktop:min-h-[140px]",
                      // Touch-first: avoid cramped visuals - wider cards on tablet
                      "tablet:min-w-[180px]",
                      getCategoryAccent(category.color),
                      isHighlight && "border-green-500/60 bg-green-500/10 ring-2 ring-green-500/20"
                    )}
                  >
                    {/* Value + Label section - generous padding */}
                     <div className={cn(
                       "flex-1 flex flex-col items-center justify-center",
                       "py-4 tablet:py-4 desktop:py-6",
                       "px-4 tablet:px-4"
                     )}>
                      <motion.p 
                        key={count}
                        initial={{ scale: 1.15, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                         className={cn(
                           // Tablet: 26–30px; Desktop: larger
                           "text-[26px] tablet:text-[30px] desktop:text-[42px] font-black tabular-nums leading-none",
                           count > 0 ? category.color : "text-zinc-500"
                         )}
                      >
                        {count}
                      </motion.p>
                      {/* Label - full text, no abbreviation, responsive size */}
                       <p className={cn(
                         // Tablet label: 14–15px, full text, max 2 lines
                         "text-[12px] tablet:text-[15px] text-center mt-2 tablet:mt-3",
                         "leading-snug tablet:leading-snug",
                         "min-h-[34px] tablet:min-h-[44px] flex items-center justify-center",
                         "font-medium tracking-tight",
                         // clamp to 2 lines on tablet without relying on a plugin
                         "tablet:[display:-webkit-box] tablet:[-webkit-line-clamp:2] tablet:[-webkit-box-orient:vertical] tablet:overflow-hidden",
                         count > 0 ? "text-zinc-200" : "text-zinc-500"
                       )}>
                         {stat.label}
                       </p>
                    </div>
                    
                    {/* Action buttons footer - larger touch targets */}
                    <div className="flex items-center border-t-2 border-zinc-700/40">
                      {/* Minus button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || count === 0 || !onVoidLastEvent}
                        className={cn(
                           // Touch targets: min 40px, tablet bigger
                           "flex-1 h-10 tablet:h-11 desktop:h-12 flex items-center justify-center",
                           "text-zinc-500 hover:text-red-400 hover:bg-red-500/15 active:bg-red-500/25",
                           "disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500",
                           "transition-all rounded-bl-xl tablet:rounded-bl-2xl",
                           "border-r-2 border-zinc-700/40"
                        )}
                        aria-label={`Remover ${stat.label}`}
                      >
                         <Minus className="w-5 h-5 tablet:w-6 tablet:h-6" strokeWidth={2.5} />
                      </motion.button>
                      
                      {/* Plus button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAddStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                        className={cn(
                           // Touch targets: min 40px, tablet bigger
                           "flex-1 h-10 tablet:h-11 desktop:h-12 flex items-center justify-center",
                           "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/15 active:bg-emerald-500/25",
                           "disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-400",
                           "transition-all rounded-br-xl tablet:rounded-br-2xl"
                        )}
                        aria-label={`Adicionar ${stat.label}`}
                      >
                         <Plus className="w-5 h-5 tablet:w-6 tablet:h-6" strokeWidth={2.5} />
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