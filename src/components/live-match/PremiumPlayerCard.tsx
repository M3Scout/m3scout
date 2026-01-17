import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Undo2, ChevronDown, ChevronUp, LogIn, LogOut, 
  MoreVertical, Trash2, MessageSquare, Goal, Shield,
  Target, Footprints, HandHelping, BarChart3, ArrowRight,
  RotateCcw, ShieldCheck, Zap, ArrowUpRight, Hand, CircleX, Ban, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, getSoundForEvent } from "@/lib/sounds";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { PlayerNotesModal } from "./PlayerNotesModal";
import { InlineMoreStatsPanel } from "./InlineMoreStatsPanel";

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

// Quick action events
const QUICK_EVENTS: { type: MatchEventType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: "goal", icon: <Goal className="w-4 h-4" />, label: "Gol", color: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" },
  { type: "assist", icon: <HandHelping className="w-4 h-4" />, label: "Assist", color: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  { type: "shot_on_target", icon: <Target className="w-4 h-4" />, label: "Final.", color: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
  { type: "tackle", icon: <Shield className="w-4 h-4" />, label: "Desarme", color: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" },
  { type: "dribble_success", icon: <Footprints className="w-4 h-4" />, label: "Drible", color: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" },
];

const GK_QUICK_EVENTS: { type: MatchEventType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: "save", icon: <Shield className="w-4 h-4" />, label: "Defesa", color: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" },
  { type: "goal_conceded", icon: <Goal className="w-4 h-4" />, label: "Gol Sof.", color: "bg-red-500/20 text-red-400 hover:bg-red-500/30" },
  { type: "high_claim", icon: <Target className="w-4 h-4" />, label: "Bola Alta", color: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  { type: "sweeper_action", icon: <Footprints className="w-4 h-4" />, label: "Saída", color: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" },
];

interface PremiumPlayerCardProps {
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
  onPlayerEnter?: (matchPlayerId: string) => void;
  onPlayerExit?: (matchPlayerId: string) => void;
  onRemoveFromMatch?: () => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  disabled?: boolean;
  soundEnabled?: boolean;
  index?: number;
}

export function PremiumPlayerCard({
  matchPlayer,
  eventCounts,
  matchStats,
  matchStatus,
  clockStatus = "stopped",
  currentMinute = 0,
  currentPeriod = 1,
  displayMinute,
  onAddEvent,
  onUndo,
  onPlayerEnter,
  onPlayerExit,
  onRemoveFromMatch,
  onSaveNotes,
  disabled,
  soundEnabled = true,
  index = 0,
}: PremiumPlayerCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<MatchEventType | null>(null);

  const player = matchPlayer.player;
  if (!player) return null;

  const isGK = matchPlayer.position_template === "goalkeeper";
  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  const isClockRunning = clockStatus === "running";
  const positionColors = getPositionColor(player.position);
  const shortPosition = getShortPosition(player.position);
  const quickEvents = isGK ? GK_QUICK_EVENTS : QUICK_EVENTS;
  
  // Can only add events if: live + clock running + player on field
  const canAddEvents = isLive && isClockRunning && matchPlayer.is_on_field;

  const handleAddEventWithSound = (eventType: MatchEventType) => {
    if (soundEnabled) playSound(getSoundForEvent(eventType));
    setLastEvent(eventType);
    setTimeout(() => setLastEvent(null), 1000);
    onAddEvent(eventType);
  };

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
  const totalShotsOnTarget = matchStats?.shots_on_target ?? getCount("shot_on_target") + getCount("goal");
  const totalSaves = matchStats?.saves ?? getCount("save");
  const totalTackles = matchStats?.tackles ?? getCount("tackle");
  const totalGoalsConceded = matchStats?.goals_conceded ?? getCount("goal_conceded");
  const hasNotes = matchPlayer.notes && matchPlayer.notes.trim().length > 0;

  // Calculate key stats for display - use actual stats from DB
  const keyStats = isGK ? [
    { label: "DEF", value: totalSaves },
    { label: "GOL-", value: totalGoalsConceded },
  ] : [
    { label: "GOL", value: totalGoals },
    { label: "ASS", value: totalAssists },
    { label: "CHU", value: totalShots },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          // Tablet: larger rounded corners
          "rounded-xl tablet:rounded-2xl",
          "bg-zinc-900/60 border",
          positionColors.borderClass,
          !matchPlayer.is_on_field && !isDraft && "opacity-50",
          disabled && "pointer-events-none"
        )}
      >
        {/* Position accent bar - thicker on tablet */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0",
          "w-1 tablet:w-1.5",
          positionColors.accentClass
        )} />

        {/* Event flash animation */}
        <AnimatePresence>
          {lastEvent && (
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={cn(
                "absolute inset-0 pointer-events-none",
                lastEvent === "goal" && "bg-emerald-500/30",
                lastEvent === "assist" && "bg-blue-500/30",
                lastEvent === "yellow" && "bg-yellow-500/30",
                lastEvent === "red" && "bg-red-500/30",
                lastEvent === "save" && "bg-emerald-500/30"
              )}
            />
          )}
        </AnimatePresence>

        {/* Card content - more padding on tablet */}
        <div className="relative pl-4 tablet:pl-5">
          {/* Header - Responsive layout optimized for tablet */}
          <div className={cn(
            "p-3 tablet:p-4 desktop:p-4",
            "space-y-2 tablet:space-y-3"
          )}>
            {/* Row 1: Avatar + Name + Key buttons */}
            <div className="flex items-center gap-3 tablet:gap-4">
              {/* Avatar - LARGER on tablet */}
              <Avatar className={cn(
                "shrink-0 border-2",
                // Mobile: compact, Tablet: prominent, Desktop: same as tablet
                "h-11 w-11 tablet:h-14 tablet:w-14 desktop:h-14 desktop:w-14",
                positionColors.borderClass
              )}>
                <AvatarImage src={player.photo_url || undefined} />
                <AvatarFallback className={cn(
                  "font-bold",
                  "text-sm tablet:text-base",
                  positionColors.bgClass, positionColors.textClass
                )}>
                  {player.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name + Notes - larger text on tablet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-semibold text-zinc-100 truncate",
                    "text-sm tablet:text-lg desktop:text-base"
                  )}>
                    {player.full_name}
                  </h4>
                  {hasNotes && (
                    <MessageSquare className="w-3 h-3 tablet:w-4 tablet:h-4 text-amber-400 shrink-0" />
                  )}
                </div>
              </div>

              {/* Right side buttons - LARGER touch targets on tablet */}
              <div className="flex items-center gap-1 tablet:gap-2 shrink-0">
                {/* Stats expand toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-lg hover:bg-white/10",
                    // Touch-friendly: 44px on tablet
                    "h-8 w-8 tablet:h-11 tablet:w-11"
                  )}
                  onClick={() => setShowDetailedStats(!showDetailedStats)}
                >
                  <BarChart3 className={cn(
                    "transition-colors",
                    "w-4 h-4 tablet:w-5 tablet:h-5",
                    showDetailedStats ? "text-blue-400" : "text-zinc-500"
                  )} />
                </Button>

                {/* Enter/Exit button - LARGER on tablet */}
                {isLive && (
                  <>
                    {!matchPlayer.is_on_field && matchPlayer.exited_minute === null ? (
                      <Button
                        size="sm"
                        className={cn(
                          "bg-green-600 hover:bg-green-700",
                          // Touch-friendly on tablet
                          "h-9 px-3 tablet:h-11 tablet:px-4 tablet:text-base"
                        )}
                        onClick={handleEnterField}
                      >
                        <LogIn className="w-4 h-4 tablet:w-5 tablet:h-5 tablet:mr-1.5 sm:mr-1" />
                        <span className="hidden sm:inline">Entrar</span>
                      </Button>
                    ) : matchPlayer.is_on_field ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "border-amber-500/50 text-amber-400 hover:bg-amber-500/10",
                          // Touch-friendly on tablet
                          "h-9 px-3 tablet:h-11 tablet:px-4 tablet:text-base"
                        )}
                        onClick={handleExitField}
                      >
                        <LogOut className="w-4 h-4 tablet:w-5 tablet:h-5 tablet:mr-1.5 sm:mr-1" />
                        <span className="hidden sm:inline">Sair</span>
                      </Button>
                    ) : null}
                  </>
                )}

                {/* More menu - LARGER on tablet */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(
                      "h-8 w-8 tablet:h-11 tablet:w-11"
                    )}>
                      <MoreVertical className="w-4 h-4 tablet:w-5 tablet:h-5 text-zinc-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 z-50">
                    <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                      {expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                      {expanded ? "Ocultar ações" : "Mostrar ações"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onUndo} disabled={isDraft}>
                      <Undo2 className="w-4 h-4 mr-2" />
                      Desfazer último
                    </DropdownMenuItem>
                    {onSaveNotes && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <div className="p-0">
                            <PlayerNotesModal
                              matchPlayer={matchPlayer}
                              onSaveNotes={onSaveNotes}
                              disabled={disabled}
                              triggerClassName="w-full flex items-center px-2 py-1.5 text-sm cursor-pointer"
                              triggerContent={
                                <>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  {hasNotes ? "Editar notas" : "Adicionar notas"}
                                </>
                              }
                            />
                          </div>
                        </DropdownMenuItem>
                      </>
                    )}
                    {onRemoveFromMatch && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={() => setRemoveDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover da partida
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Row 2: Chips + Key stats - better spacing on tablet */}
            <div className="flex items-center justify-between gap-2 tablet:gap-3">
              {/* Left: Status chips - LARGER on tablet */}
              <div className="flex items-center gap-1.5 tablet:gap-2 flex-wrap min-w-0">
                <Badge 
                  className={cn(
                    "font-bold shrink-0",
                    // Tablet: larger badges
                    "text-[10px] px-1.5 py-0 h-5 tablet:text-xs tablet:px-2 tablet:h-6",
                    positionColors.bgClass, positionColors.textClass
                  )}
                >
                  {shortPosition}
                </Badge>
                <Badge 
                  variant={matchPlayer.started ? "secondary" : "outline"} 
                  className={cn(
                    "shrink-0",
                    "text-[10px] px-1.5 py-0 h-5 tablet:text-xs tablet:px-2 tablet:h-6"
                  )}
                >
                  {matchPlayer.started ? "TIT" : "RES"}
                </Badge>
                {!isDraft && matchPlayer.is_on_field && (
                  <Badge className={cn(
                    "bg-green-600/20 text-green-400 border-green-500/30 shrink-0",
                    "text-[10px] px-1.5 py-0 h-5 tablet:text-xs tablet:px-2 tablet:h-6"
                  )}>
                    Em campo
                  </Badge>
                )}
              </div>

              {/* Right: Key stats - LARGER and more readable on tablet */}
              <div className="flex items-center gap-1 tablet:gap-2 shrink-0">
                {keyStats.map((stat) => (
                  <div 
                    key={stat.label}
                    className={cn(
                      "text-center rounded-lg bg-zinc-800/60",
                      // Tablet: wider stat boxes
                      "px-1.5 py-0.5 min-w-[38px] tablet:px-3 tablet:py-1 tablet:min-w-[52px]"
                    )}
                  >
                    <p className={cn(
                      "font-bold tabular-nums leading-tight",
                      // Tablet: larger values
                      "text-sm tablet:text-xl desktop:text-lg",
                      stat.value > 0 ? positionColors.textClass : "text-zinc-500"
                    )}>
                      {stat.value}
                    </p>
                    <p className={cn(
                      "text-zinc-500 uppercase",
                      "text-[8px] tablet:text-[10px]"
                    )}>
                      {stat.label}
                    </p>
                  </div>
                ))}
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
                <div className={cn(
                  "pb-3 pt-1",
                  "px-3 tablet:px-4"
                )}>
                  <div className={cn(
                    "grid gap-2 tablet:gap-3 p-2 tablet:p-3 rounded-xl tablet:rounded-2xl bg-zinc-800/40 border border-zinc-700/30",
                    // Tablet: 4 columns, larger cells
                    "grid-cols-4"
                  )}>
                    {(isGK ? DETAILED_STATS_GK : DETAILED_STATS_OUTFIELD).map((stat) => {
                      const value = Number(matchStats[stat.key] ?? 0);
                      return (
                        <div key={stat.key} className={cn(
                          "text-center",
                          "py-1.5 tablet:py-2"
                        )}>
                          <div className="flex items-center justify-center gap-1 mb-0.5 tablet:mb-1">
                            <span className={cn(stat.color, "tablet:[&>svg]:w-4 tablet:[&>svg]:h-4")}>{stat.icon}</span>
                          </div>
                          <p className={cn(
                            "font-bold tabular-nums",
                            // Tablet: larger values
                            "text-lg tablet:text-2xl",
                            value > 0 ? stat.color : "text-zinc-500"
                          )}>
                            {value}
                          </p>
                          <p className={cn(
                            "text-zinc-500 uppercase truncate px-0.5",
                            "text-[8px] tablet:text-[10px]"
                          )}>
                            {stat.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  "pb-3 pt-0",
                  "px-3 tablet:px-4",
                  (isDraft || isPaused) && "opacity-50"
                )}>
                  {isDraft && (
                    <p className={cn(
                      "text-zinc-500 text-center mb-2 bg-zinc-800/50 rounded py-1",
                      "text-[10px] tablet:text-xs"
                    )}>
                      📋 Inicie o jogo para registrar estatísticas
                    </p>
                  )}
                  
                  {isPaused && isLive && (
                    <p className={cn(
                      "text-amber-400 text-center mb-2 bg-amber-500/10 rounded py-1 border border-amber-500/20",
                      "text-[10px] tablet:text-xs"
                    )}>
                      ⏸️ Jogo pausado — retome para registrar eventos
                    </p>
                  )}

                  {/* Quick action buttons - LARGER on tablet */}
                  <div className="flex items-center gap-2 tablet:gap-3 flex-wrap">
                    {quickEvents.map((event) => (
                      <Button
                        key={event.type}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddEventWithSound(event.type)}
                        disabled={disabled || !canAddEvents}
                        className={cn(
                          "gap-1.5 rounded-lg tablet:rounded-xl transition-all relative",
                          // Tablet: 44px+ height for touch
                          "h-9 px-3 tablet:h-11 tablet:px-4",
                          event.color
                        )}
                      >
                        <span className="tablet:[&>svg]:w-5 tablet:[&>svg]:h-5">{event.icon}</span>
                        <span className={cn(
                          "font-medium",
                          "text-xs tablet:text-sm"
                        )}>
                          {event.label}
                        </span>
                        {getCount(event.type) > 0 && (
                          <Badge 
                            className={cn(
                              "absolute -top-1 -right-1 p-0 flex items-center justify-center bg-zinc-700 text-zinc-200",
                              "h-4 w-4 text-[9px] tablet:h-5 tablet:w-5 tablet:text-[10px]"
                            )}
                          >
                            {getCount(event.type)}
                          </Badge>
                        )}
                      </Button>
                    ))}
                    
                    {/* More stats toggle button - LARGER on tablet */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMoreStats(!showMoreStats)}
                      className={cn(
                        "gap-1.5 rounded-lg tablet:rounded-xl transition-all",
                        // Tablet: 44px+ height
                        "h-9 px-3 tablet:h-11 tablet:px-4",
                        showMoreStats 
                          ? "bg-primary/20 text-primary hover:bg-primary/30" 
                          : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      )}
                    >
                      {showMoreStats ? (
                        <ChevronUp className="w-4 h-4 tablet:w-5 tablet:h-5" />
                      ) : (
                        <Plus className="w-4 h-4 tablet:w-5 tablet:h-5" />
                      )}
                      <span className={cn(
                        "font-medium",
                        "text-xs tablet:text-sm"
                      )}>
                        {showMoreStats ? "Menos" : "Mais"}
                      </span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== INLINE MORE STATS PANEL (expandable) ===== */}
          <AnimatePresence>
            {showMoreStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden border-t border-zinc-800/50"
              >
                <InlineMoreStatsPanel
                  matchStatus={matchStatus}
                  clockStatus={clockStatus}
                  isGoalkeeper={isGK}
                  isOnField={matchPlayer.is_on_field}
                  eventCounts={eventCounts}
                  onAddEvent={handleAddEventWithSound}
                  disabled={disabled}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Remove dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza que deseja remover <strong className="text-zinc-200">{player.full_name}</strong> desta partida?
              {Object.values(eventCounts).some(v => v > 0) && (
                <span className="block mt-2 text-amber-400">
                  ⚠️ Este jogador tem eventos registrados. Os dados serão mantidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setRemoveDialogOpen(false); onRemoveFromMatch?.(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
