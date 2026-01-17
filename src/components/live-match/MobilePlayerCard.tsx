import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  LogIn, LogOut, ChevronDown, ChevronUp, Goal, Shield,
  Target, Footprints, HandHelping, MoreHorizontal, Trash2,
  MessageSquare, Undo2, ArrowRight, AlertTriangle, Hand,
  ShieldCheck, RotateCcw, Ban, Users, ArrowUpRight, Square,
  UserX, CircleOff, CircleX, Crosshair, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, getSoundForEvent } from "@/lib/sounds";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { PlayerNotesModal } from "./PlayerNotesModal";
import { toast } from "sonner";

// Main quick actions - always visible in 3x2 grid
const QUICK_ACTIONS: { type: MatchEventType; icon: React.ReactNode; label: string; bgColor: string; textColor: string }[] = [
  { type: "goal", icon: <Goal className="w-5 h-5" />, label: "Gol", bgColor: "bg-emerald-500/20", textColor: "text-emerald-400" },
  { type: "assist", icon: <HandHelping className="w-5 h-5" />, label: "Assist", bgColor: "bg-blue-500/20", textColor: "text-blue-400" },
  { type: "shot_on_target", icon: <Target className="w-5 h-5" />, label: "Chute", bgColor: "bg-orange-500/20", textColor: "text-orange-400" },
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

// Secondary actions - in expandable accordion
interface SecondaryAction {
  type: MatchEventType;
  icon: React.ReactNode;
  label: string;
  category: "attack" | "passing" | "defense" | "discipline" | "goalkeeper";
}

const SECONDARY_ACTIONS: SecondaryAction[] = [
  // Attack
  { type: "shot", icon: <Crosshair className="w-4 h-4" />, label: "Chute fora", category: "attack" },
  { type: "chance_created", icon: <Zap className="w-4 h-4" />, label: "Chance criada", category: "attack" },
  { type: "dribble_attempt", icon: <Footprints className="w-4 h-4" />, label: "Drible perdido", category: "attack" },
  { type: "foul_suffered", icon: <UserX className="w-4 h-4" />, label: "Falta sofrida", category: "attack" },
  // Passing
  { type: "pass_success", icon: <ArrowRight className="w-4 h-4" />, label: "Passe certo", category: "passing" },
  { type: "pass_total", icon: <ArrowRight className="w-4 h-4" />, label: "Passe errado", category: "passing" },
  { type: "key_pass", icon: <ArrowUpRight className="w-4 h-4" />, label: "Passe decisivo", category: "passing" },
  // Defense
  { type: "interception", icon: <ShieldCheck className="w-4 h-4" />, label: "Interceptação", category: "defense" },
  { type: "recovery", icon: <RotateCcw className="w-4 h-4" />, label: "Recuperação", category: "defense" },
  { type: "clearance", icon: <Ban className="w-4 h-4" />, label: "Corte", category: "defense" },
  { type: "duel_won", icon: <Users className="w-4 h-4" />, label: "Duelo ganho", category: "defense" },
  { type: "aerial_duel_won", icon: <ArrowUpRight className="w-4 h-4" />, label: "Duelo aéreo", category: "defense" },
  { type: "foul_committed", icon: <AlertTriangle className="w-4 h-4" />, label: "Falta cometida", category: "defense" },
  { type: "possession_lost", icon: <CircleOff className="w-4 h-4" />, label: "Posse perdida", category: "defense" },
  // Discipline
  { type: "yellow", icon: <Square className="w-4 h-4 fill-yellow-400 text-yellow-400" />, label: "Amarelo", category: "discipline" },
  { type: "red", icon: <Square className="w-4 h-4 fill-red-500 text-red-500" />, label: "Vermelho", category: "discipline" },
];

const GK_SECONDARY_ACTIONS: SecondaryAction[] = [
  { type: "box_save", icon: <Hand className="w-4 h-4" />, label: "Defesa difícil", category: "goalkeeper" },
  { type: "penalty_saved", icon: <Shield className="w-4 h-4" />, label: "Pênalti defendido", category: "goalkeeper" },
  { type: "error_led_to_goal", icon: <AlertTriangle className="w-4 h-4" />, label: "Erro p/ gol", category: "goalkeeper" },
  // Also include discipline for GK
  { type: "yellow", icon: <Square className="w-4 h-4 fill-yellow-400 text-yellow-400" />, label: "Amarelo", category: "discipline" },
  { type: "red", icon: <Square className="w-4 h-4 fill-red-500 text-red-500" />, label: "Vermelho", category: "discipline" },
];

const CATEGORY_COLORS = {
  attack: "text-emerald-400",
  passing: "text-blue-400",
  defense: "text-cyan-400",
  discipline: "text-amber-400",
  goalkeeper: "text-purple-400",
} as const;

interface MobilePlayerCardProps {
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

export function MobilePlayerCard({
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
}: MobilePlayerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<MatchEventType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player = matchPlayer.player;
  if (!player) return null;

  const isGK = matchPlayer.position_template === "goalkeeper";
  const isLive = matchStatus === "live";
  const isDraft = matchStatus === "draft";
  const isPaused = clockStatus === "paused";
  const isClockRunning = clockStatus === "running";
  const positionColors = getPositionColor(player.position);
  const shortPosition = getShortPosition(player.position);
  
  const quickActions = isGK ? GK_QUICK_ACTIONS : QUICK_ACTIONS;
  const secondaryActions = isGK ? GK_SECONDARY_ACTIONS : SECONDARY_ACTIONS;
  
  // Can only add events if: live + clock running + player on field
  const canAddEvents = isLive && isClockRunning && matchPlayer.is_on_field;
  const hasNotes = matchPlayer.notes && matchPlayer.notes.trim().length > 0;

  const handleAddEventWithSound = useCallback((eventType: MatchEventType) => {
    if (isSubmitting || disabled) return;
    
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
  }, [isSubmitting, disabled, isLive, matchPlayer.is_on_field, isPaused, soundEnabled, onAddEvent, isDraft, onUndo]);

  const handleEnterField = () => {
    if (soundEnabled) playSound('enter');
    onPlayerEnter?.(currentMinute);
  };

  const handleExitField = () => {
    if (soundEnabled) playSound('exit');
    onPlayerExit?.(currentMinute);
  };

  const getCount = (type: MatchEventType) => eventCounts[type] || 0;

  // Key stats display
  const totalGoals = getCount("goal");
  const totalAssists = getCount("assist");
  const totalSaves = getCount("save");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.25 }}
        className={cn(
          // Clean card with unified radius - no extra boxes or overlays
          "relative rounded-[18px] overflow-hidden transition-all duration-300",
          "bg-zinc-900/80 backdrop-blur-sm",
          "border border-white/5",
          !matchPlayer.is_on_field && !isDraft && "opacity-60",
          disabled && "pointer-events-none"
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

        {/* ===== HEADER - Clean, no extra wrappers ===== */}
        <div className="flex items-center gap-3 p-4 pb-3">
          {/* Avatar - pill border */}
          <Avatar className={cn("h-12 w-12 border-2 shrink-0 rounded-full", positionColors.borderClass)}>
            <AvatarImage src={player.photo_url || undefined} className="rounded-full" />
            <AvatarFallback className={cn("font-bold text-sm rounded-full", positionColors.bgClass, positionColors.textClass)}>
              {player.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-zinc-100 truncate text-base">{player.full_name}</h4>
              {hasNotes && (
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>
            {/* Pills row - no extra backgrounds */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {/* Position pill */}
              <Badge 
                size="sm"
                className={cn(
                  "font-bold",
                  positionColors.bgClass, positionColors.textClass
                )}
              >
                {shortPosition}
              </Badge>
              {/* Status pill */}
              <Badge 
                size="sm"
                variant={matchPlayer.is_on_field ? "success" : "glass"}
              >
                {matchPlayer.is_on_field ? "Em campo" : "Banco"}
              </Badge>
            </div>
          </div>

          {/* Context buttons - pill shapes */}
          <div className="flex items-center gap-2 shrink-0">
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

            {/* Options button - pill */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full hover:bg-white/10"
              onClick={() => setShowOptions(!showOptions)}
            >
              <MoreHorizontal className="w-5 h-5 text-zinc-400" />
            </Button>
          </div>
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
              <div className="flex items-center gap-2 p-3 bg-zinc-800/30">
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== STATUS MESSAGE - Pill style ===== */}
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

        {/* ===== QUICK ACTIONS GRID - Pill buttons ===== */}
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
                    // Soft button - no hard rectangles
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
            
            {/* Expand button - soft pill */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-2xl",
                "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-300",
                "border border-white/5",
                "transition-all duration-200"
              )}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  <span className="text-xs font-medium">Menos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  <span className="text-xs font-medium">Mais</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* ===== SECONDARY ACTIONS (EXPANDABLE) ===== */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 mt-2">
                  Mais estatísticas
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {secondaryActions.map((action) => {
                    const count = getCount(action.type);
                    return (
                      <motion.button
                        key={action.type}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAddEventWithSound(action.type)}
                        disabled={disabled || isSubmitting || (!canAddEvents && !isDraft)}
                        className={cn(
                          "flex items-center gap-2 py-2.5 px-3 rounded-xl",
                          "bg-zinc-800/40 hover:bg-zinc-800/70",
                          "transition-all duration-150",
                          "disabled:opacity-40 disabled:cursor-not-allowed",
                          CATEGORY_COLORS[action.category]
                        )}
                      >
                        {action.icon}
                        <span className="text-xs font-medium text-zinc-200 flex-1 text-left truncate">
                          {action.label}
                        </span>
                        {count > 0 && (
                          <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-zinc-700 text-zinc-300">
                            {count}
                          </Badge>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
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
