import { useState, useRef } from "react";
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
import { MatchPlayer, MatchEventType, MatchStatus } from "@/hooks/useLiveMatch";
import { 
  Plus, Undo2, ChevronDown, ChevronUp, LogIn, LogOut, 
  MoreVertical, Trash2, MessageSquare, Goal, Zap, Shield,
  Target, Footprints, HandHelping
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, getSoundForEvent } from "@/lib/sounds";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { PlayerNotesModal } from "./PlayerNotesModal";

// Quick action events
const QUICK_EVENTS: { type: MatchEventType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: "goal", icon: <Goal className="w-4 h-4" />, label: "Gol", color: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" },
  { type: "assist", icon: <HandHelping className="w-4 h-4" />, label: "Assist", color: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  { type: "shot_on_target", icon: <Target className="w-4 h-4" />, label: "Chute", color: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
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
  matchStatus: MatchStatus;
  clockStatus?: "stopped" | "running" | "paused";
  currentMinute?: number;
  onAddEvent: (eventType: MatchEventType) => void;
  onUndo: () => void;
  onPlayerEnter?: (minute: number) => void;
  onPlayerExit?: (minute: number) => void;
  onRemoveFromMatch?: () => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  disabled?: boolean;
  soundEnabled?: boolean;
  index?: number;
}

export function PremiumPlayerCard({
  matchPlayer,
  eventCounts,
  matchStatus,
  clockStatus = "stopped",
  currentMinute = 0,
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
    onPlayerEnter?.(currentMinute);
  };

  const handleExitField = () => {
    if (soundEnabled) playSound('exit');
    onPlayerExit?.(currentMinute);
  };

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;
  const totalGoals = getCount("goal");
  const totalAssists = getCount("assist");
  const totalSaves = getCount("save");
  const hasNotes = matchPlayer.notes && matchPlayer.notes.trim().length > 0;

  // Calculate key stats for display
  const keyStats = isGK ? [
    { label: "DEF", value: totalSaves },
    { label: "GOL-", value: getCount("goal_conceded") },
  ] : [
    { label: "GOL", value: totalGoals },
    { label: "ASS", value: totalAssists },
    { label: "DES", value: getCount("tackle") },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-300",
          "bg-zinc-900/60 border",
          positionColors.borderClass,
          !matchPlayer.is_on_field && !isDraft && "opacity-50",
          disabled && "pointer-events-none"
        )}
      >
        {/* Position accent bar */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", positionColors.accentClass)} />

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

        {/* Card content */}
        <div className="relative pl-4">
          {/* Header */}
          <div className="flex items-center gap-3 p-3">
            {/* Avatar */}
            <Avatar className={cn("h-12 w-12 border-2", positionColors.borderClass)}>
              <AvatarImage src={player.photo_url || undefined} />
              <AvatarFallback className={cn("font-bold", positionColors.bgClass, positionColors.textClass)}>
                {player.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-zinc-100 truncate">{player.full_name}</h4>
                {hasNotes && (
                  <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 font-bold",
                    positionColors.bgClass, positionColors.textClass
                  )}
                >
                  {shortPosition}
                </Badge>
                <Badge 
                  variant={matchPlayer.started ? "secondary" : "outline"} 
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {matchPlayer.started ? "TIT" : "RES"}
                </Badge>
                {!isDraft && matchPlayer.is_on_field && (
                  <Badge className="text-[10px] px-1.5 py-0 h-5 bg-green-600/20 text-green-400 border-green-500/30">
                    Em campo
                  </Badge>
                )}
              </div>
            </div>

            {/* Key stats */}
            <div className="flex items-center gap-2">
              {keyStats.map((stat) => (
                <div 
                  key={stat.label}
                  className="text-center px-2 py-1 rounded-lg bg-zinc-800/60"
                >
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    stat.value > 0 ? positionColors.textClass : "text-zinc-500"
                  )}>
                    {stat.value}
                  </p>
                  <p className="text-[9px] text-zinc-500 uppercase">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Enter/Exit button */}
            {isLive && (
              <>
                {!matchPlayer.is_on_field && matchPlayer.exited_minute === null ? (
                  <Button
                    size="sm"
                    className="h-10 px-4 bg-green-600 hover:bg-green-700 shrink-0"
                    onClick={handleEnterField}
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    Entrar
                  </Button>
                ) : matchPlayer.is_on_field ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 shrink-0"
                    onClick={handleExitField}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sair
                  </Button>
                ) : null}
              </>
            )}

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <MoreVertical className="w-4 h-4 text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
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
                  "px-3 pb-3 pt-0",
                  (isDraft || isPaused) && "opacity-50"
                )}>
                  {isDraft && (
                    <p className="text-[10px] text-zinc-500 text-center mb-2 bg-zinc-800/50 rounded py-1">
                      📋 Inicie o jogo para registrar estatísticas
                    </p>
                  )}
                  
                  {isPaused && isLive && (
                    <p className="text-[10px] text-amber-400 text-center mb-2 bg-amber-500/10 rounded py-1 border border-amber-500/20">
                      ⏸️ Jogo pausado — retome para registrar eventos
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {quickEvents.map((event) => (
                      <Button
                        key={event.type}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddEventWithSound(event.type)}
                        disabled={disabled || !canAddEvents}
                        className={cn(
                          "h-9 px-3 gap-1.5 rounded-lg transition-all relative",
                          event.color
                        )}
                      >
                        {event.icon}
                        <span className="text-xs font-medium">{event.label}</span>
                        {getCount(event.type) > 0 && (
                          <Badge 
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-zinc-700 text-zinc-200"
                          >
                            {getCount(event.type)}
                          </Badge>
                        )}
                      </Button>
                    ))}
                    
                    {/* More events button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* Open full stat panel */}}
                      className="h-9 px-3 gap-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Mais</span>
                    </Button>
                  </div>
                </div>
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
