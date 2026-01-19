import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MatchPlayer, MatchEventType, MatchStatus, MatchPlayerStats } from "@/hooks/useLiveMatch";
import { 
  LogIn, LogOut, Goal, Shield,
  Target, Footprints, HandHelping, MoreHorizontal, Trash2,
  MessageSquare, Undo2, ArrowRight,
  RotateCcw, ShieldCheck, Zap, ArrowUpRight, Hand, CircleX, Ban, BarChart3,
  ChevronDown, ChevronUp, Plus, UserCheck, UserMinus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, getSoundForEvent } from "@/lib/sounds";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { PlayerNotesModal } from "./PlayerNotesModal";
import { InlineMoreStatsPanel } from "./InlineMoreStatsPanel";
import { toast } from "sonner";

// Main quick actions - always visible in grid
const QUICK_ACTIONS: { type: MatchEventType; icon: React.ReactNode; label: string; bgColor: string; textColor: string }[] = [
  { type: "goal", icon: <Goal className="w-5 h-5" />, label: "Gol", bgColor: "bg-emerald-500/20", textColor: "text-emerald-400" },
  { type: "assist", icon: <HandHelping className="w-5 h-5" />, label: "Assist", bgColor: "bg-blue-500/20", textColor: "text-blue-400" },
  { type: "shot_on_target", icon: <Target className="w-5 h-5" />, label: "Final.", bgColor: "bg-orange-500/20", textColor: "text-orange-400" },
  { type: "tackle", icon: <Shield className="w-5 h-5" />, label: "Desarme", bgColor: "bg-cyan-500/20", textColor: "text-cyan-400" },
  { type: "dribble_success", icon: <Footprints className="w-5 h-5" />, label: "Drible", bgColor: "bg-purple-500/20", textColor: "text-purple-400" },
];

const GK_QUICK_ACTIONS: { type: MatchEventType; icon: React.ReactNode; label: string; bgColor: string; textColor: string }[] = [
  { type: "save", icon: <Hand className="w-5 h-5" />, label: "Defesa", bgColor: "bg-emerald-500/20", textColor: "text-emerald-400" },
  { type: "goal_conceded", icon: <CircleX className="w-5 h-5" />, label: "Gol Sof.", bgColor: "bg-red-500/20", textColor: "text-red-400" },
  { type: "high_claim", icon: <ArrowUpRight className="w-5 h-5" />, label: "Bola Alta", bgColor: "bg-blue-500/20", textColor: "text-blue-400" },
  { type: "sweeper_action", icon: <Footprints className="w-5 h-5" />, label: "Saída", bgColor: "bg-cyan-500/20", textColor: "text-cyan-400" },
  { type: "punch", icon: <Hand className="w-5 h-5" />, label: "Soco", bgColor: "bg-purple-500/20", textColor: "text-purple-400" },
];

// Detailed stats config for expandable panel
interface DetailedStat {
  key: keyof MatchPlayerStats;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const DETAILED_STATS_OUTFIELD: DetailedStat[] = [
  { key: "shots_on_target", label: "No Gol", icon: <Target className="w-3.5 h-3.5" />, color: "text-orange-400" },
  { key: "passes_completed", label: "Passes", icon: <ArrowRight className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { key: "dribbles_success", label: "Dribles", icon: <Footprints className="w-3.5 h-3.5" />, color: "text-purple-400" },
  { key: "recoveries", label: "Recup.", icon: <RotateCcw className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  { key: "tackles", label: "Desarm.", icon: <Shield className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  { key: "interceptions", label: "Interc.", icon: <ShieldCheck className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  { key: "key_passes", label: "P. Dec.", icon: <ArrowUpRight className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { key: "chances_created", label: "Chances", icon: <Zap className="w-3.5 h-3.5" />, color: "text-emerald-400" },
];

const DETAILED_STATS_GK: DetailedStat[] = [
  { key: "saves", label: "Defesas", icon: <Hand className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { key: "goals_conceded", label: "Gols Sof.", icon: <CircleX className="w-3.5 h-3.5" />, color: "text-red-400" },
  { key: "clearances", label: "Cortes", icon: <Ban className="w-3.5 h-3.5" />, color: "text-cyan-400" },
  { key: "recoveries", label: "Recup.", icon: <RotateCcw className="w-3.5 h-3.5" />, color: "text-cyan-400" },
];

interface MobilePlayerCardProps {
  matchPlayer: MatchPlayer;
  eventCounts: Record<MatchEventType, number>;
  matchStats?: MatchPlayerStats;
  matchStatus: MatchStatus;
  clockStatus?: "stopped" | "running" | "paused";
  currentMinute?: number;
  currentPeriod?: number;
  displayMinute?: string;
  onAddEvent: (eventType: MatchEventType) => void;
  onUndo: () => void;
  onVoidLastEvent?: (eventType: MatchEventType) => void;
  onPlayerEnter?: (matchPlayerId: string) => void;
  onPlayerExit?: (matchPlayerId: string) => void;
  onRemoveFromMatch?: () => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  onUpdateStarterStatus?: (matchPlayerId: string, started: boolean) => Promise<void>;
  disabled?: boolean;
  soundEnabled?: boolean;
  isReviewMode?: boolean;
  index?: number;
}

export function MobilePlayerCard({
  matchPlayer,
  eventCounts,
  matchStats,
  matchStatus,
  clockStatus = "stopped",
  onAddEvent,
  onUndo,
  onVoidLastEvent,
  onPlayerEnter,
  onPlayerExit,
  onRemoveFromMatch,
  onSaveNotes,
  onUpdateStarterStatus,
  disabled,
  soundEnabled = true,
  isReviewMode = false,
  index = 0,
}: MobilePlayerCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<MatchEventType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player = matchPlayer.player;
  if (!player) return null;

  const isGK = matchPlayer.position_template === "goalkeeper";
  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isFinished = matchStatus === "finished";
  const isPaused = clockStatus === "paused";
  const isClockRunning = clockStatus === "running";
  const positionColors = getPositionColor(player.position);
  const shortPosition = getShortPosition(player.position);
  
  const quickActions = isGK ? GK_QUICK_ACTIONS : QUICK_ACTIONS;
  
  // Can add events if: (live + clock running + player on field) OR review mode
  const canAddEvents = (isLive && isClockRunning && matchPlayer.is_on_field) || isReviewMode;
  const hasNotes = matchPlayer.notes && matchPlayer.notes.trim().length > 0;

  const handleAddEventWithSound = useCallback((eventType: MatchEventType) => {
    if (isSubmitting || disabled) return;
    
    // In review mode, skip field/clock validations
    if (!isReviewMode) {
      // Check validations
      if (isLive && !matchPlayer.is_on_field) {
        toast.error("Atleta fora de campo", {
          description: "Este jogador não está em campo.",
        });
        return;
      }

      if (isLive && isPaused) {
        toast.warning("Jogo pausado", {
          description: "Retome o jogo para registrar eventos.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    
    if (soundEnabled) playSound(getSoundForEvent(eventType));
    setLastEvent(eventType);
    setTimeout(() => setLastEvent(null), 800);
    onAddEvent(eventType);
    
    toast.success(`Evento registrado`, {
      description: isDraft ? "Pendente até iniciar o jogo" : undefined,
      action: {
        label: "Desfazer",
        onClick: () => onUndo(),
      },
      duration: 5000,
    });
    
    // Debounce
    setTimeout(() => setIsSubmitting(false), 300);
  }, [isSubmitting, disabled, isLive, matchPlayer.is_on_field, isPaused, soundEnabled, onAddEvent, isDraft, onUndo, isReviewMode]);

  const handleEnterField = () => {
    if (soundEnabled) playSound('enter');
    onPlayerEnter?.(matchPlayer.id);
  };

  const handleExitField = () => {
    if (soundEnabled) playSound('exit');
    onPlayerExit?.(matchPlayer.id);
  };

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  // Use matchStats if available, fall back to eventCounts
  const totalGoals = matchStats?.goals ?? getCount("goal");
  const totalAssists = matchStats?.assists ?? getCount("assist");
  const totalShots = matchStats?.shots ?? getCount("shot") + getCount("shot_on_target") + getCount("goal");
  const totalSaves = matchStats?.saves ?? getCount("save");
  const totalGoalsConceded = matchStats?.goals_conceded ?? getCount("goal_conceded");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.25 }}
        className={cn(
          "relative rounded-[18px] overflow-hidden transition-all duration-300",
          "bg-zinc-900/80 backdrop-blur-sm",
          "border border-white/5",
          !matchPlayer.is_on_field && !isDraft && "opacity-60"
        )}
      >
        {/* Event flash animation */}
        <AnimatePresence>
          {lastEvent && (
            <motion.div
              initial={{ opacity: 0.6, scale: 1.05 }}
              animate={{ opacity: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className={cn(
                "absolute inset-0 pointer-events-none z-10 rounded-[18px]",
                lastEvent === "goal" && "bg-emerald-500/40",
                lastEvent === "assist" && "bg-blue-500/40",
                lastEvent === "yellow" && "bg-yellow-500/40",
                lastEvent === "red" && "bg-red-500/40",
                lastEvent === "save" && "bg-emerald-500/40",
                lastEvent === "tackle" && "bg-cyan-500/40",
                lastEvent === "dribble_success" && "bg-purple-500/40"
              )}
            />
          )}
        </AnimatePresence>

        {/* ===== HEADER - Responsive 2-line layout ===== */}
        <div className="p-4 pb-2 space-y-2">
          {/* Row 1: Avatar + Name + Stats toggle */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className={cn("h-11 w-11 border-2 shrink-0 rounded-full", positionColors.borderClass)}>
              <AvatarImage src={player.photo_url || undefined} className="rounded-full" />
              <AvatarFallback className={cn("font-bold text-sm rounded-full", positionColors.bgClass, positionColors.textClass)}>
                {player.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name + Notes icon */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h4 className="font-semibold text-zinc-100 truncate text-base">{player.full_name}</h4>
              {hasNotes && (
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>

            {/* Stats toggle button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-white/10 shrink-0"
              onClick={() => setShowDetailedStats(!showDetailedStats)}
            >
              <BarChart3 className={cn(
                "w-4 h-4 transition-colors",
                showDetailedStats ? "text-blue-400" : "text-zinc-500"
              )} />
            </Button>
          </div>

          {/* Row 2: Chips + Key stats - Always visible, never overlapping */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Status chips - flex-wrap to prevent overlap */}
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <Badge 
                className={cn(
                  "font-bold text-[10px] px-1.5 py-0.5 h-5 shrink-0",
                  positionColors.bgClass, positionColors.textClass
                )}
              >
                {shortPosition}
              </Badge>
              <Badge 
                className={cn(
                  "text-[10px] px-1.5 py-0.5 h-5 shrink-0",
                  matchPlayer.is_on_field 
                    ? "bg-green-600/20 text-green-400 border-green-500/30" 
                    : "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
                )}
              >
                {matchPlayer.is_on_field ? "Em campo" : "Banco"}
              </Badge>
              {isReviewMode && (
                <Badge 
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 h-5 shrink-0 animate-pulse",
                    "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  )}
                >
                  Revisão
                </Badge>
              )}
            </div>

            {/* Right: Key stats - compact display */}
            <div className="flex items-center gap-1 shrink-0">
              {isGK ? (
                <>
                  <div className="text-center px-1.5 py-0.5 rounded-md bg-zinc-800/60 min-w-[36px]">
                    <p className={cn("text-sm font-bold tabular-nums leading-tight", totalSaves > 0 ? "text-emerald-400" : "text-zinc-500")}>
                      {totalSaves}
                    </p>
                    <p className="text-[7px] text-zinc-500 uppercase">DEF</p>
                  </div>
                  <div className="text-center px-1.5 py-0.5 rounded-md bg-zinc-800/60 min-w-[36px]">
                    <p className={cn("text-sm font-bold tabular-nums leading-tight", totalGoalsConceded > 0 ? "text-red-400" : "text-zinc-500")}>
                      {totalGoalsConceded}
                    </p>
                    <p className="text-[7px] text-zinc-500 uppercase">GOL-</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center px-1.5 py-0.5 rounded-md bg-zinc-800/60 min-w-[36px]">
                    <p className={cn("text-sm font-bold tabular-nums leading-tight", totalGoals > 0 ? "text-emerald-400" : "text-zinc-500")}>
                      {totalGoals}
                    </p>
                    <p className="text-[7px] text-zinc-500 uppercase">GOL</p>
                  </div>
                  <div className="text-center px-1.5 py-0.5 rounded-md bg-zinc-800/60 min-w-[36px]">
                    <p className={cn("text-sm font-bold tabular-nums leading-tight", totalAssists > 0 ? "text-blue-400" : "text-zinc-500")}>
                      {totalAssists}
                    </p>
                    <p className="text-[7px] text-zinc-500 uppercase">ASS</p>
                  </div>
                  <div className="text-center px-1.5 py-0.5 rounded-md bg-zinc-800/60 min-w-[36px]">
                    <p className={cn("text-sm font-bold tabular-nums leading-tight", totalShots > 0 ? "text-orange-400" : "text-zinc-500")}>
                      {totalShots}
                    </p>
                    <p className="text-[7px] text-zinc-500 uppercase">FIN</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== DETAILED STATS PANEL (expandable) ===== */}
        <AnimatePresence>
          {showDetailedStats && matchStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 pt-1">
                <div className="grid grid-cols-4 gap-2 p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                  {(isGK ? DETAILED_STATS_GK : DETAILED_STATS_OUTFIELD).map((stat) => {
                    const value = Number(matchStats[stat.key] ?? 0);
                    return (
                      <div key={stat.key} className="text-center py-1.5">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <span className={stat.color}>{stat.icon}</span>
                        </div>
                        <p className={cn(
                          "text-lg font-bold tabular-nums",
                          value > 0 ? stat.color : "text-zinc-500"
                        )}>
                          {value}
                        </p>
                        <p className="text-[8px] text-zinc-500 uppercase truncate px-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== ACTION BUTTONS ROW ===== */}
        <div className="flex items-center justify-end gap-2 px-4 pb-3">
          {isLive && (
            <>
              {!matchPlayer.is_on_field && matchPlayer.exited_minute === null ? (
                <Button
                  variant="success"
                  size="sm"
                  className="h-10 px-4 rounded-full"
                  onClick={handleEnterField}
                >
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Entrar
                </Button>
              ) : matchPlayer.is_on_field ? (
                <Button
                  variant="glass"
                  size="sm"
                  className="h-10 px-4 rounded-full border-amber-500/30 text-amber-400"
                  onClick={handleExitField}
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sair
                </Button>
              ) : null}
            </>
          )}

          {/* Options button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full hover:bg-white/10"
            onClick={() => setShowOptions(!showOptions)}
          >
            <MoreHorizontal className="w-5 h-5 text-zinc-400" />
          </Button>
        </div>

        {/* ===== OPTIONS DRAWER (collapsed) ===== */}
        <AnimatePresence>
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-zinc-800/50"
            >
              <div className="flex flex-col gap-2 p-3 bg-zinc-800/30">
                {/* Starter status toggle - only in draft mode */}
                {isDraft && onUpdateStarterStatus && (
                  <div className="flex items-center gap-2">
                    {matchPlayer.started ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 rounded-lg text-amber-400 hover:bg-amber-500/10"
                        onClick={() => { 
                          onUpdateStarterStatus(matchPlayer.id, false); 
                          setShowOptions(false); 
                        }}
                      >
                        <UserMinus className="w-4 h-4 mr-1.5" />
                        Definir como Reserva
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => { 
                          onUpdateStarterStatus(matchPlayer.id, true); 
                          setShowOptions(false); 
                        }}
                      >
                        <UserCheck className="w-4 h-4 mr-1.5" />
                        Definir como Titular
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-9 rounded-lg text-zinc-300 hover:bg-zinc-700/50"
                    onClick={() => { onUndo(); setShowOptions(false); }}
                    disabled={isDraft}
                  >
                    <Undo2 className="w-4 h-4 mr-1.5" />
                    Desfazer
                  </Button>
                  {onSaveNotes && (
                    <PlayerNotesModal
                      matchPlayer={matchPlayer}
                      onSaveNotes={onSaveNotes}
                      disabled={disabled}
                      triggerClassName="flex-1 h-9 rounded-lg text-zinc-300 hover:bg-zinc-700/50 bg-transparent border-0 justify-center"
                      triggerContent={
                        <>
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Notas
                        </>
                      }
                    />
                  )}
                  {onRemoveFromMatch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-lg text-red-400 hover:bg-red-500/10"
                      onClick={() => { setRemoveDialogOpen(true); setShowOptions(false); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== STATUS MESSAGE ===== */}
        {(isDraft || (isLive && isPaused) || (isLive && !matchPlayer.is_on_field)) && (
          <div className="px-4 pb-2">
            <div className={cn(
              "text-[11px] text-center py-2 px-4 rounded-full",
              isDraft && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
              isPaused && isLive && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
              !matchPlayer.is_on_field && isLive && !isPaused && "bg-zinc-800/40 text-zinc-500 border border-zinc-700/30"
            )}>
              {isDraft && "Inicie o jogo para contar eventos"}
              {isPaused && isLive && "Jogo pausado"}
              {!matchPlayer.is_on_field && isLive && !isPaused && "Atleta no banco"}
            </div>
          </div>
        )}

        {/* ===== QUICK ACTIONS GRID ===== */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action) => {
              const count = getCount(action.type);
              return (
                <motion.button
                  key={action.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddEventWithSound(action.type)}
                  disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-2xl",
                    "transition-all duration-200",
                    action.bgColor,
                    "border border-white/5",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "active:scale-95"
                  )}
                >
                  <span className={action.textColor}>{action.icon}</span>
                  <span className={cn("text-xs font-medium", action.textColor)}>{action.label}</span>
                  {count > 0 && (
                    <Badge 
                      size="sm"
                      className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-zinc-200 border border-zinc-700"
                    >
                      {count}
                    </Badge>
                  )}
                </motion.button>
              );
            })}
            
            {/* "Mais" button - expands inline stats panel */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMoreStats(!showMoreStats)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-2xl",
                "transition-all duration-200",
                showMoreStats ? "bg-primary/20 border-primary/30" : "bg-zinc-800/60",
                "border border-white/5"
              )}
            >
              {showMoreStats ? (
                <ChevronUp className="w-5 h-5 text-primary" />
              ) : (
                <Plus className="w-5 h-5 text-zinc-400" />
              )}
              <span className={cn("text-xs font-medium", showMoreStats ? "text-primary" : "text-zinc-400")}>
                {showMoreStats ? "Menos" : "Mais"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* ===== INLINE MORE STATS PANEL (expandable) ===== */}
        <AnimatePresence>
          {showMoreStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-zinc-800/50"
            >
              <InlineMoreStatsPanel
                matchStatus={matchStatus}
                clockStatus={clockStatus}
                isGoalkeeper={isGK}
                isOnField={matchPlayer.is_on_field}
                eventCounts={eventCounts}
                matchStats={matchStats}
                onAddEvent={handleAddEventWithSound}
                onVoidLastEvent={onVoidLastEvent}
                disabled={disabled}
                isReviewMode={isReviewMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Remover <strong className="text-zinc-200">{player.full_name}</strong> desta partida?
              {Object.values(eventCounts).some(v => v > 0) && (
                <span className="block mt-2 text-amber-400">
                  ⚠️ Eventos registrados serão mantidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setRemoveDialogOpen(false); onRemoveFromMatch?.(); }}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
