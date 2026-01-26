import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { MatchEventType, MatchStatus, MatchPlayerStats } from "@/hooks/useLiveMatch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Minus, Calculator } from "lucide-react";
import { calculateBallActionsFromMatchStats } from "@/lib/derivedBallActions";

// Category full names for headers - NEW STRUCTURE
const CATEGORY_NAMES: Record<string, string> = {
  ATAQUE: "Ataque",
  PASSES: "Passes",
  DRIBLES: "Dribles / Posse",
  DEFESA: "Defesa",
  GK: "Goleiro",
  "GK+": "Goleiro Avançado",
};

// Stats categories for inline panel - SINGLE SOURCE OF TRUTH
// NEW STRUCTURE: ATAQUE, PASSES, DRIBLES/POSSE, DEFESA
const OUTFIELD_STATS: { category: string; categoryKey: string; color: string; bgColor: string; stats: { type: MatchEventType; label: string }[] }[] = [
  // ATAQUE - Finalizações, gols e impedimento
  {
    category: "ATAQUE",
    categoryKey: "attack",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    stats: [
      { type: "goal", label: "Gols" },
      { type: "shot_on_target", label: "Finalizações no Gol" },
      { type: "shot", label: "Finalizações Fora" },
      { type: "shot_blocked", label: "Finalização Bloqueada" },
      { type: "offside", label: "Impedimento" },
    ],
  },
  // PASSES - Assistências, criação e cruzamentos
  {
    category: "PASSES",
    categoryKey: "passing",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    stats: [
      { type: "assist", label: "Assistências" },
      { type: "key_pass", label: "Passes Decisivos" },
      { type: "chance_created", label: "Chances Criadas" },
      { type: "pass_success", label: "Passes Certos" },
      { type: "pass_total", label: "Passes Errados" },
      { type: "cross_success", label: "Cruzamentos Certos" },
      { type: "cross_failed", label: "Cruzamentos Errados" },
    ],
  },
  // DRIBLES / POSSE
  // NOTE: ball_action is now a DERIVED stat - calculated automatically from other events
  // It is handled separately in the rendering logic as display-only (no +/- buttons)
  {
    category: "DRIBLES",
    categoryKey: "dribbles",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    stats: [
      // ball_action is NOT here - it's rendered separately as derived/display-only
      { type: "dribble_success", label: "Dribles Certos" },
      { type: "dribble_attempt", label: "Dribles Errados" },
      { type: "foul_suffered", label: "Faltas Sofridas" },
      { type: "possession_lost", label: "Perdas de Posse" },
    ],
  },
  // DEFESA (inclui duelos e disciplina)
  {
    category: "DEFESA",
    categoryKey: "defense",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    stats: [
      { type: "tackle", label: "Desarmes" },
      { type: "interception", label: "Interceptações" },
      { type: "clearance", label: "Cortes" },
      { type: "recovery", label: "Recuperações" },
      { type: "blocked_shot", label: "Chute Bloqueado" },
      { type: "was_dribbled", label: "Driblado" },
      { type: "ground_duel_won", label: "Duelo Chão ✓" },
      { type: "ground_duel_total", label: "Duelo Chão ✗" },
      { type: "aerial_duel_won", label: "Duelo Aéreo ✓" },
      { type: "aerial_duel_total", label: "Duelo Aéreo ✗" },
      { type: "foul_committed", label: "Faltas Cometidas" },
      { type: "yellow", label: "Amarelos" },
      { type: "red", label: "Vermelhos" },
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
  isReviewMode?: boolean;
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
  isReviewMode = false,
}: InlineMoreStatsPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  // Can add events if: (live + clock running + on field) OR draft OR review mode
  const canAddEvents = (isLive && clockStatus === "running" && isOnField) || isDraft || isReviewMode;

  const stats = isGoalkeeper ? GOALKEEPER_STATS : OUTFIELD_STATS;
  
  // Use matchStats (from match_player_stats table) for display - this includes derived stats
  // Fall back to eventCounts for event-based counting
  const getDisplayCount = useCallback((type: MatchEventType): number => {
    if (matchStats) {
      // Map event types to matchStats fields - using the persisted stats that include derived values
      // All subtraction-based calculations must be clamped to >= 0 to prevent negative values
      switch (type) {
        case "goal": return Math.max(0, matchStats.goals);
        case "assist": return Math.max(0, matchStats.assists);
        case "shot_on_target": return Math.max(0, matchStats.shots_on_target);
        case "shot": return Math.max(0, matchStats.shots - matchStats.shots_on_target); // Shots outside = total shots - on target
        case "shot_blocked": return Math.max(0, matchStats.shots_blocked ?? 0); // NEW: Finalização bloqueada (ataque)
        case "offside": return Math.max(0, matchStats.offsides ?? 0); // NEW: Impedimento
        case "key_pass": return Math.max(0, matchStats.key_passes);
        case "chance_created": return Math.max(0, matchStats.chances_created);
        case "cross_success": return Math.max(0, matchStats.crosses_success ?? 0); // NEW: Cruzamentos certos
        case "cross_failed": return Math.max(0, matchStats.crosses_failed ?? 0); // NEW: Cruzamentos errados
        // ball_action is DERIVED - calculated from sum of eligible events (not directly recorded)
        case "ball_action": return calculateBallActionsFromMatchStats(matchStats);
        case "dribble_success": return Math.max(0, matchStats.dribbles_success);
        case "dribble_attempt": return Math.max(0, matchStats.dribbles_total - matchStats.dribbles_success); // Dribble attempts failed
        case "tackle": return Math.max(0, matchStats.tackles);
        case "interception": return Math.max(0, matchStats.interceptions);
        case "recovery": return Math.max(0, matchStats.recoveries);
        case "clearance": return Math.max(0, matchStats.clearances);
        case "blocked_shot": return Math.max(0, matchStats.blocked_shots ?? 0); // NEW: Chute bloqueado (defesa)
        case "was_dribbled": return Math.max(0, matchStats.was_dribbled ?? 0); // NEW: Driblado
        // Duels - now using dedicated fields for won/lost tracking
        case "ground_duel_won": return Math.max(0, matchStats.duels_won - matchStats.aerial_duels_won); // Ground duels won
        case "ground_duel_total": return Math.max(0, (matchStats.duels_total - matchStats.duels_won) - (matchStats.aerial_duels_total - matchStats.aerial_duels_won)); // Ground duels lost
        case "aerial_duel_won": return Math.max(0, matchStats.aerial_duels_won);
        case "aerial_duel_total": return Math.max(0, matchStats.aerial_duels_total - matchStats.aerial_duels_won); // Aerial duels lost
        // Legacy generic duels (for backward compatibility)
        case "duel_won": return Math.max(0, matchStats.duels_won);
        case "duel_total": return Math.max(0, matchStats.duels_total - matchStats.duels_won); // All lost duels
        case "yellow": return Math.max(0, matchStats.yellow_cards);
        case "red": return Math.max(0, matchStats.red_cards);
        case "foul_committed": return Math.max(0, matchStats.fouls_committed);
        case "foul_suffered": return Math.max(0, matchStats.fouls_suffered);
        case "pass_success": return Math.max(0, matchStats.passes_completed);
        case "pass_total": return Math.max(0, matchStats.passes_total - matchStats.passes_completed); // Failed passes
        case "possession_lost": return Math.max(0, matchStats.possession_lost);
        case "save": return Math.max(0, matchStats.saves);
        case "goal_conceded": return Math.max(0, matchStats.goals_conceded);
        // Goalkeeper specific
        case "box_save": return 0; // Not in matchStats currently
        case "punch": return 0;
        case "high_claim": return 0;
        case "sweeper_action": return 0;
        default: return Math.max(0, eventCounts[type] || 0);
      }
    }
    return Math.max(0, eventCounts[type] || 0);
  }, [matchStats, eventCounts]);
  
  // For the "-" button, we need to check if there are events to remove (event-based)
  const getEventCount = (type: MatchEventType) => eventCounts[type] || 0;

  // Haptic feedback for touch devices
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'error' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 20,
        error: [30, 50, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const handleAddStat = useCallback((type: MatchEventType, label: string) => {
    if (isSubmitting || disabled) return;

    // In review mode, skip field/clock validations
    if (!isReviewMode) {
      if (isLive && !isOnField) {
        triggerHaptic('error');
        toast.error("Atleta fora de campo");
        return;
      }
      if (isLive && isPaused) {
        triggerHaptic('error');
        toast.warning("Jogo pausado");
        return;
      }
    }

    triggerHaptic('medium');
    setIsSubmitting(true);
    onAddEvent(type);
    toast.success(`${label} +1`, { duration: 2000 });
    setTimeout(() => setIsSubmitting(false), 250);
  }, [isSubmitting, disabled, isLive, isOnField, isPaused, onAddEvent, triggerHaptic, isReviewMode]);

  const handleRemoveStat = useCallback((type: MatchEventType, label: string) => {
    if (isSubmitting || disabled) return;
    
    // Check event count (not display count) to see if there's an event to remove
    const eventCount = getEventCount(type);
    if (eventCount === 0) {
      triggerHaptic('error');
      toast.info("Nenhum evento para remover");
      return;
    }

    if (onVoidLastEvent) {
      triggerHaptic('light');
      setIsSubmitting(true);
      onVoidLastEvent(type);
      toast.success(`${label} -1`, { duration: 2000 });
      setTimeout(() => setIsSubmitting(false), 250);
    }
  }, [isSubmitting, disabled, onVoidLastEvent, getEventCount, triggerHaptic]);

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

      {/* Categories - ALWAYS stacked vertically (1 column) on all breakpoints */}
      <div className="grid grid-cols-1 gap-4 tablet:gap-5 desktop:gap-6">
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

            {/* Stats grid - Responsive: 2 cols mobile, 4 cols tablet/desktop */}
            <div className={cn(
              "grid w-full",
              // Gap between stat cards
              "gap-2.5 tablet:gap-3 desktop:gap-3.5",
              // Mobile: 2 columns
              "grid-cols-2",
              // Tablet (iPad): 4 columns for better use of space
              "tablet:grid-cols-4",
              // Desktop: 4 columns
              "desktop:grid-cols-4"
            )}>
              {/* DERIVED STAT: "Ações com a Bola" - display-only, no +/- buttons */}
              {/* Only shown in DRIBLES category */}
              {category.categoryKey === "dribbles" && (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className={cn(
                    "rounded-xl transition-all duration-200",
                    "bg-gradient-to-br from-cyan-900/30 to-zinc-900/80 border-2 border-cyan-500/30",
                    "hover:border-cyan-400/50 hover:shadow-xl",
                    "flex flex-col",
                    "min-h-[110px] tablet:min-h-[120px] desktop:min-h-[130px]",
                    "relative overflow-hidden"
                  )}
                >
                  {/* Derived indicator badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30">
                    <Calculator className="w-3 h-3 text-cyan-400" />
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Auto</span>
                  </div>
                  
                  {/* VALUE + LABEL SECTION */}
                  <div className="flex-1 flex flex-col items-center justify-center py-3 px-2 tablet:py-4 tablet:px-3">
                    <motion.p 
                      key={getDisplayCount("ball_action")}
                      initial={{ scale: 1.1, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "font-black tabular-nums leading-none",
                        "text-[28px] tablet:text-[36px] desktop:text-[38px]",
                        getDisplayCount("ball_action") > 0 ? "text-cyan-400" : "text-zinc-500"
                      )}
                    >
                      {getDisplayCount("ball_action")}
                    </motion.p>
                    
                    <p className={cn(
                      "text-center mt-2 leading-tight font-medium tracking-tight",
                      "text-[11px] min-h-[26px] tablet:text-[13px] tablet:min-h-[32px] tablet:mt-2.5 desktop:text-[13px] desktop:min-h-[34px]",
                      getDisplayCount("ball_action") > 0 ? "text-zinc-200" : "text-zinc-500"
                    )}>
                      Ações com a Bola
                    </p>
                  </div>
                  
                  {/* Info footer - instead of action buttons */}
                  <div className="flex items-center justify-center border-t-2 border-cyan-500/20 h-10 tablet:h-12 desktop:h-11 bg-cyan-500/5">
                    <span className="text-[10px] tablet:text-xs text-cyan-400/70 font-medium">
                      Soma automática
                    </span>
                  </div>
                </motion.div>
              )}
              
              {category.stats.map((stat) => {
                const count = getDisplayCount(stat.type);
                const isHighlight = (stat.type === "goal" || stat.type === "assist" || stat.type === "save") && count > 0;
                
                return (
                  <motion.div
                    key={stat.type}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      "bg-zinc-900/80 border-2 border-zinc-700/50",
                      "hover:border-zinc-600 hover:shadow-xl hover:ring-2",
                      getCategoryAccent(category.color),
                      isHighlight && "border-green-500/60 bg-green-500/10 ring-2 ring-green-500/20",
                      // SIMPLE: always vertical layout
                      "flex flex-col",
                      // Mobile: compact
                      "min-h-[110px]",
                      // Tablet: wider and taller for touch
                      "tablet:min-h-[120px]",
                      // Desktop: similar
                      "desktop:min-h-[130px]"
                    )}
                  >
                    {/* VALUE + LABEL SECTION - always vertical centered */}
                    <div className="flex-1 flex flex-col items-center justify-center py-3 px-2 tablet:py-4 tablet:px-3">
                      {/* Value - large and prominent */}
                      <motion.p 
                        key={count}
                        initial={{ scale: 1.1, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "font-black tabular-nums leading-none",
                          // Mobile: readable
                          "text-[28px]",
                          // Tablet: larger for visibility
                          "tablet:text-[36px]",
                          // Desktop
                          "desktop:text-[38px]",
                          count > 0 ? category.color : "text-zinc-500"
                        )}
                      >
                        {count}
                      </motion.p>
                      
                      {/* Label - FULL TEXT, allow 2 lines, no abbreviation */}
                      <p className={cn(
                        "text-center mt-2 leading-tight font-medium tracking-tight",
                        // Mobile: readable text
                        "text-[11px] min-h-[26px]",
                        // Tablet: larger, clearer text
                        "tablet:text-[13px] tablet:min-h-[32px] tablet:mt-2.5",
                        // Desktop
                        "desktop:text-[13px] desktop:min-h-[34px]",
                        count > 0 ? "text-zinc-200" : "text-zinc-500"
                      )}>
                        {stat.label}
                      </p>
                    </div>
                    
                    {/* ACTION BUTTONS - TOUCH FRIENDLY */}
                    <div className="flex items-center border-t-2 border-zinc-700/40">
                      {/* Minus button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveStat(stat.type, stat.label)}
                        disabled={disabled || isSubmitting || count === 0 || !onVoidLastEvent}
                        className={cn(
                          "flex-1 flex items-center justify-center",
                          "border-r border-zinc-700/40",
                          "rounded-bl-xl",
                          // Mobile: decent size
                          "h-10",
                          // Tablet: LARGE touch target (44px minimum)
                          "tablet:h-12",
                          // Desktop
                          "desktop:h-11",
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
                        disabled={disabled || isSubmitting || !canAddEvents}
                        className={cn(
                          "flex-1 flex items-center justify-center",
                          "rounded-br-xl",
                          // Mobile: decent size
                          "h-10",
                          // Tablet: LARGE touch target (44px minimum)
                          "tablet:h-12",
                          // Desktop
                          "desktop:h-11",
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