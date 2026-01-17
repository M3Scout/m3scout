import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { MatchEventType, MatchStatus, MatchPlayerStats } from "@/hooks/useLiveMatch";
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

// Stats categories for inline panel - SINGLE SOURCE OF TRUTH
// These definitions are also mirrored in matchStatsDefinitions.ts for the summary
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
  matchStats?: MatchPlayerStats;
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
  matchStats,
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
  
  // Use matchStats (from match_player_stats table) for display - this includes derived stats
  // Fall back to eventCounts for event-based counting
  const getDisplayCount = useCallback((type: MatchEventType): number => {
    if (matchStats) {
      // Map event types to matchStats fields - using the persisted stats that include derived values
      switch (type) {
        case "goal": return matchStats.goals;
        case "assist": return matchStats.assists;
        case "shot_on_target": return matchStats.shots_on_target;
        case "shot": return matchStats.shots - matchStats.shots_on_target; // Shots outside = total shots - on target
        case "key_pass": return matchStats.key_passes;
        case "chance_created": return matchStats.chances_created;
        case "dribble_success": return matchStats.dribbles_success;
        case "dribble_attempt": return matchStats.dribbles_total - matchStats.dribbles_success;
        case "tackle": return matchStats.tackles;
        case "interception": return matchStats.interceptions;
        case "recovery": return matchStats.recoveries;
        case "clearance": return matchStats.clearances;
        case "duel_won": return matchStats.duels_won;
        case "duel_total": return matchStats.duels_total - matchStats.duels_won; // Lost duels
        case "aerial_duel_won": return matchStats.aerial_duels_won;
        case "yellow": return matchStats.yellow_cards;
        case "red": return matchStats.red_cards;
        case "foul_committed": return matchStats.fouls_committed;
        case "foul_suffered": return matchStats.fouls_suffered;
        case "pass_success": return matchStats.passes_completed;
        case "pass_total": return matchStats.passes_total - matchStats.passes_completed; // Failed passes
        case "possession_lost": return matchStats.possession_lost;
        case "save": return matchStats.saves;
        case "goal_conceded": return matchStats.goals_conceded;
        // Goalkeeper specific
        case "box_save": return 0; // Not in matchStats currently
        case "punch": return 0;
        case "high_claim": return 0;
        case "sweeper_action": return 0;
        default: return eventCounts[type] || 0;
      }
    }
    return eventCounts[type] || 0;
  }, [matchStats, eventCounts]);
  
  // For the "-" button, we need to check if there are events to remove (event-based)
  const getEventCount = (type: MatchEventType) => eventCounts[type] || 0;

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
    
    // Check event count (not display count) to see if there's an event to remove
    const eventCount = getEventCount(type);
    if (eventCount === 0) {
      toast.info("Nenhum evento para remover");
      return;
    }

    if (onVoidLastEvent) {
      setIsSubmitting(true);
      onVoidLastEvent(type);
      toast.success(`${label} -1`, { duration: 2000 });
      setTimeout(() => setIsSubmitting(false), 250);
    }
  }, [isSubmitting, disabled, onVoidLastEvent, getEventCount]);

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
        // Mobile: compact padding, Tablet: generous breathing room
        "p-3 tablet:p-6 desktop:p-6",
        "space-y-4 tablet:space-y-6 desktop:space-y-6",
        // Tablet portrait: use more screen width
        "tablet:max-w-[95vw] tablet:mx-auto",
        // Tablet landscape: even more compact to fit 2-column cards
        "tablet-landscape:p-4 tablet-landscape:space-y-4"
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

      {/* Categories Grid - mobile 1 col, iPad/tablet 2 cols side by side */}
      <div className={cn(
        "grid grid-cols-1 tablet:grid-cols-2 gap-4 tablet:gap-5 desktop:gap-6",
        // Landscape: tighter gap since cards are narrower
        "tablet-landscape:gap-4"
      )}>
        {stats.map((category) => (
          <div
            key={category.categoryKey}
            className={cn(
              // Tablet: more padding, larger rounded corners
              "rounded-2xl tablet:rounded-3xl border-2",
              "p-4 tablet:p-[20px] desktop:p-6",
              category.bgColor
            )}
          >
            {/* Category header - clear and prominent */}
            <div className={cn(
              "flex items-center gap-3 mb-4 tablet:mb-5 desktop:mb-6 pb-3 border-b border-white/10"
            )}>
              <div className={cn(
                "w-2 h-6 tablet:h-8 rounded-full",
                category.color.replace("text-", "bg-")
              )} />
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-base tablet:text-xl desktop:text-xl font-black uppercase tracking-wide",
                  category.color
                )}>
                  {category.category}
                </span>
                <span className="text-xs tablet:text-sm text-zinc-400 font-medium">
                  {CATEGORY_NAMES[category.category]}
                </span>
              </div>
            </div>

            {/* Stats grid - Mobile: 2 cols vertical, Tablet: 2 cols HORIZONTAL cards, Desktop: 4 cols */}
            <div className={cn(
              "grid",
              // Mobile: 2 columns, small cards
              "grid-cols-2 gap-3",
              // Tablet: 2 columns, WIDE horizontal cards
              "tablet:grid-cols-2 tablet:gap-4",
              // Desktop: 4 columns
              "desktop:grid-cols-4 desktop:gap-4"
            )}>
              {category.stats.map((stat) => {
                const count = getDisplayCount(stat.type);
                const isHighlight = (stat.type === "goal" || stat.type === "assist" || stat.type === "save") && count > 0;
                
                return (
                  <motion.div
                    key={stat.type}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "rounded-xl tablet:rounded-2xl transition-all duration-200",
                      "bg-zinc-900/80 border-2 border-zinc-700/50",
                      "hover:border-zinc-600 hover:shadow-xl hover:ring-2",
                      getCategoryAccent(category.color),
                      isHighlight && "border-green-500/60 bg-green-500/10 ring-2 ring-green-500/20",
                      // ========== MOBILE: Vertical compact layout ==========
                      "flex flex-col",
                      "min-h-[100px]",
                      // ========== TABLET: HORIZONTAL layout - COMPLETELY DIFFERENT ==========
                      "tablet:flex-row tablet:items-stretch",
                      "tablet:min-h-[96px] tablet:h-[104px]",
                      "tablet:min-w-[200px]",
                      // ========== DESKTOP: Back to vertical ==========
                      "desktop:flex-col desktop:min-h-[140px] desktop:h-auto"
                    )}
                  >
                    {/* ========== VALUE + LABEL SECTION ========== */}
                    <div className={cn(
                      // Mobile: centered column
                      "flex-1 flex flex-col items-center justify-center",
                      "py-3 px-3",
                      // Tablet: HORIZONTAL layout - value left, label right
                      "tablet:flex-row tablet:items-center tablet:justify-start",
                      "tablet:py-4 tablet:px-4 tablet:gap-4",
                      // Desktop: back to column
                      "desktop:flex-col desktop:items-center desktop:justify-center",
                      "desktop:py-4 desktop:px-4 desktop:gap-0"
                    )}>
                      {/* Value */}
                      <motion.p 
                        key={count}
                        initial={{ scale: 1.1, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          // Mobile: medium size
                          "text-[24px] font-black tabular-nums leading-none",
                          // Tablet: LARGE prominent value on left
                          "tablet:text-[32px] tablet:min-w-[48px] tablet:text-center",
                          // Desktop: extra large
                          "desktop:text-[42px] desktop:min-w-0",
                          count > 0 ? category.color : "text-zinc-500"
                        )}
                      >
                        {count}
                      </motion.p>
                      
                      {/* Label - FULL TEXT, no abbreviation */}
                      <p className={cn(
                        // Mobile: small centered text
                        "text-[11px] text-center mt-2 leading-tight",
                        "min-h-[28px] flex items-center justify-center",
                        // Tablet: LARGER text, LEFT aligned, max 2 lines
                        "tablet:text-[15px] tablet:text-left tablet:mt-0",
                        "tablet:leading-snug tablet:flex-1",
                        "tablet:min-h-0",
                        // Desktop: centered again
                        "desktop:text-[13px] desktop:text-center desktop:mt-2",
                        "desktop:min-h-[36px]",
                        "font-medium tracking-tight",
                        count > 0 ? "text-zinc-200" : "text-zinc-500"
                      )}>
                        {stat.label}
                      </p>
                    </div>
                    
                    {/* ========== ACTION BUTTONS ========== */}
                    <div className={cn(
                      // Mobile: horizontal bottom bar
                      "flex items-center border-t-2 border-zinc-700/40",
                      // Tablet: VERTICAL right side buttons
                      "tablet:flex-col tablet:border-t-0 tablet:border-l-2",
                      "tablet:w-[88px] tablet:shrink-0",
                      // Desktop: back to horizontal bottom
                      "desktop:flex-row desktop:border-l-0 desktop:border-t-2",
                      "desktop:w-auto"
                    )}>
                      {/* Minus button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || count === 0 || !onVoidLastEvent}
                        className={cn(
                          // Mobile: half width, compact height
                          "flex-1 h-9 flex items-center justify-center",
                          "border-r-2 border-zinc-700/40",
                          "rounded-bl-xl",
                          // Tablet: LARGE touch target (44px min)
                          "tablet:flex-1 tablet:h-[52px] tablet:w-full",
                          "tablet:border-r-0 tablet:border-b-2",
                          "tablet:rounded-bl-none tablet:rounded-tr-2xl",
                          // Desktop: back to normal
                          "desktop:h-11 desktop:border-b-0 desktop:border-r-2",
                          "desktop:rounded-tr-none desktop:rounded-bl-xl",
                          // Styling
                          "text-zinc-500 hover:text-red-400 hover:bg-red-500/15 active:bg-red-500/25",
                          "disabled:opacity-20 disabled:cursor-not-allowed",
                          "disabled:hover:bg-transparent disabled:hover:text-zinc-500",
                          "transition-all"
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
                          // Mobile: half width, compact height
                          "flex-1 h-9 flex items-center justify-center",
                          "rounded-br-xl",
                          // Tablet: LARGE touch target (44px min)
                          "tablet:flex-1 tablet:h-[52px] tablet:w-full",
                          "tablet:rounded-br-2xl tablet:rounded-bl-none",
                          // Desktop: back to normal
                          "desktop:h-11 desktop:rounded-bl-none desktop:rounded-br-xl",
                          // Styling
                          "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/15 active:bg-emerald-500/25",
                          "disabled:opacity-20 disabled:cursor-not-allowed",
                          "disabled:hover:bg-transparent disabled:hover:text-zinc-400",
                          "transition-all"
                        )}
                        aria-label={`Adicionar ${stat.label}`}
                      >
                        <Plus className="w-5 h-5 tablet:w-7 tablet:h-7" strokeWidth={2.5} />
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