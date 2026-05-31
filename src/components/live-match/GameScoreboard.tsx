import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Pause, Timer, Plus, Minus, Flag, 
  StopCircle, ChevronUp, Radio, Zap, Clock,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { getFootballMinute } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";

export type ClockStatus = "stopped" | "running" | "paused";

export interface TimerState {
  half: 1 | 2;
  clockStatus: ClockStatus;
  halfStartTime: string | null;
  elapsedSecondsInHalf: number;
  addedTimeFirstHalf: number;
  addedTimeSecondHalf: number;
}

export interface TimerInfo {
  displayMinute: number;
  half: 1 | 2;
  displayString: string;
  isAddedTime: boolean;
}

interface GameScoreboardProps {
  matchId: string;
  teamName?: string;
  opponentName: string;
  competitionName: string;
  venue?: string | null;
  durationMinutes: number;
  matchStatus: "draft" | "live" | "finished" | "applied";
  timerState: TimerState;
  onPlayPause: () => void;
  onReset: () => void;
  onEndHalf: () => void;
  onStartSecondHalf: () => void;
  onUpdateAddedTime: (half: 1 | 2, minutes: number) => void;
  onFinishGame?: () => void;
  onMinuteChange?: (minute: number) => void;
  onTimerInfoChange?: (info: TimerInfo) => void;
  isPending?: boolean;
}

const ADDED_TIME_CHIPS = [1, 2, 3, 5];

export function GameScoreboard({
  matchId,
  teamName,
  opponentName,
  competitionName,
  venue,
  durationMinutes,
  matchStatus,
  timerState,
  onPlayPause,
  onReset,
  onEndHalf,
  onStartSecondHalf,
  onUpdateAddedTime,
  onFinishGame,
  onMinuteChange,
  onTimerInfoChange,
  isPending,
}: GameScoreboardProps) {
  const [confirmEndHalfOpen, setConfirmEndHalfOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const lastMinuteRef = useRef(0);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { half, clockStatus, halfStartTime, elapsedSecondsInHalf, addedTimeFirstHalf, addedTimeSecondHalf } = timerState;
  
  const currentAddedTime = half === 1 ? addedTimeFirstHalf : addedTimeSecondHalf;
  const halfDuration = durationMinutes / 2;

  // We intentionally avoid using client Date.now() - halfStartTime math here because
  // client devices can have clock skew (e.g. iPad time ahead), which makes the timer
  // start "adiantado". Instead we fetch the authoritative elapsed seconds from the backend
  // once when entering running state, then tick locally.

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const syncFromBackend = async () => {
      try {
        const { data, error } = await supabase.rpc("get_period_clock_seconds", {
          p_match_id: matchId,
        });
        if (error) throw error;
        if (!cancelled && typeof data === "number" && Number.isFinite(data)) {
          setDisplaySeconds(Math.max(0, Math.floor(data)));
        }
      } catch {
        // Fallback: use persisted seconds only
        if (!cancelled) setDisplaySeconds(Math.max(0, elapsedSecondsInHalf));
      }
    };

    if (clockStatus === "running") {
      // Immediate optimistic render
      setDisplaySeconds(Math.max(0, elapsedSecondsInHalf));
      // Authoritative sync (fixes skew on "Iniciar")
      void syncFromBackend();

      interval = setInterval(() => {
        setDisplaySeconds((s) => s + 1);
      }, 1000);
    } else {
      setDisplaySeconds(Math.max(0, elapsedSecondsInHalf));
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [matchId, clockStatus, halfStartTime, elapsedSecondsInHalf]);

  const getTimerInfo = useCallback((): TimerInfo => {
    const totalSeconds = displaySeconds;
    // Use football-style rounding for display minute
    const footballMinute = getFootballMinute(totalSeconds);
    const isInAddedTime = footballMinute >= halfDuration;
    
    let displayMinute: number;
    let displayString: string;

    if (isInAddedTime) {
      const addedMinutes = footballMinute - halfDuration;
      const baseMinute = half === 1 ? 45 : 90;
      displayMinute = half === 1 ? 45 : 90;
      if (addedMinutes > 0) {
        displayString = `${baseMinute}+${addedMinutes}'`;
      } else {
        displayString = `${baseMinute}'`;
      }
    } else {
      displayMinute = half === 2 ? halfDuration + footballMinute : footballMinute;
      displayString = `${displayMinute}'`;
    }

    return {
      displayMinute,
      half,
      displayString,
      isAddedTime: isInAddedTime,
    };
  }, [displaySeconds, halfDuration, half]);

  useEffect(() => {
    // Use football-style rounding for minute change detection
    const currentMinute = getFootballMinute(displaySeconds);
    const absoluteMinute = half === 2 ? halfDuration + currentMinute : currentMinute;
    
    if (absoluteMinute !== lastMinuteRef.current) {
      lastMinuteRef.current = absoluteMinute;
      onMinuteChange?.(absoluteMinute);
    }

    onTimerInfoChange?.(getTimerInfo());
  }, [displaySeconds, half, halfDuration, onMinuteChange, onTimerInfoChange, getTimerInfo]);

  const formatTimeDisplay = () => {
    const totalSeconds = displaySeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    if (minutes >= halfDuration) {
      const addedMinutes = minutes - halfDuration;
      const baseMinute = half === 1 ? 45 : 90;
      return {
        main: `${baseMinute}`,
        added: `+${addedMinutes + 1}`,
        seconds: secs.toString().padStart(2, "0"),
        isAddedTime: true,
      };
    }

    const displayMinute = half === 2 ? 45 + minutes : minutes;
    return {
      main: displayMinute.toString().padStart(2, "0"),
      added: null,
      seconds: secs.toString().padStart(2, "0"),
      isAddedTime: false,
    };
  };

  const timeDisplay = formatTimeDisplay();
  const minutes = Math.floor(displaySeconds / 60);
  const isInAddedTime = minutes >= halfDuration;
  const isOverAddedTime = isInAddedTime && (minutes - halfDuration) >= currentAddedTime;
  const progressPercent = Math.min((minutes / halfDuration) * 100, 100);

  const adjustAddedTime = (delta: number) => {
    const newValue = Math.max(0, Math.min(15, currentAddedTime + delta));
    onUpdateAddedTime(half, newValue);
    if (navigator.vibrate) navigator.vibrate(10);
    toast.success(`Acréscimo: +${newValue} min`, { duration: 1000 });
  };

  const startHold = (action: () => void) => {
    action();
    holdIntervalRef.current = setInterval(action, 250);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const isRunning = clockStatus === "running";
  const isPaused = clockStatus === "paused";
  const isStopped = clockStatus === "stopped";
  const isLive = matchStatus === "live";
  const isFinished = matchStatus === "finished";
  const isHalfEnded = isStopped && half === 1 && elapsedSecondsInHalf > 0;
  const isWaitingSecondHalf = isHalfEnded;
  const canFinishGame = half === 2 && isLive;

  if (matchStatus === "draft") return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-2xl blur-xl transition-colors duration-500",
          isRunning && "bg-green-500/10",
          isPaused && "bg-amber-500/10",
          isFinished && "bg-zinc-500/5"
        )} />

        <div className="relative rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 overflow-hidden shadow-2xl">
          {/* Header row - compact on landscape */}
          <div className={cn(
            "flex items-center justify-between border-b border-zinc-800/40 bg-zinc-900/50",
            // Normal padding
            "px-4 py-3",
            // Landscape: more compact
            "tablet-landscape:px-5 tablet-landscape:py-2"
          )}>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="relative flex items-center gap-2">
                <span className={cn(
                  "absolute w-2 h-2 rounded-full",
                  isRunning && "bg-green-500 animate-ping"
                )} />
                <span className={cn(
                  "relative w-2 h-2 rounded-full",
                  isRunning ? "bg-green-500" : isPaused ? "bg-amber-500" : "bg-zinc-600"
                )} />
                <Badge 
                  className={cn(
                    "text-xs font-bold h-6",
                    isRunning && "bg-green-500/20 text-green-400 border-green-500/30",
                    isPaused && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                    isStopped && !isWaitingSecondHalf && "bg-zinc-700/60 text-zinc-400",
                    isWaitingSecondHalf && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                    isFinished && "bg-zinc-700/60 text-zinc-400"
                  )}
                >
                  {isFinished ? "Finalizado" : isRunning ? "Ao Vivo" : isPaused ? "Pausado" : isWaitingSecondHalf ? "Intervalo" : "Parado"}
                </Badge>
              </div>

              {/* Half badge */}
              <Badge 
                className={cn(
                  "text-xs font-bold h-6",
                  half === 1 ? "bg-blue-600/80 text-white" : "bg-purple-600/80 text-white"
                )}
              >
                {half === 1 ? "1º Tempo" : "2º Tempo"}
              </Badge>
            </div>

            {/* Match info */}
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-200">
                {teamName || "Time"} <span className="text-zinc-500 font-medium">×</span> {opponentName || "Adversário"}
              </p>
              <p className="text-xs text-zinc-500">{competitionName}</p>
            </div>
          </div>

          {/* Timer display - HORIZONTAL layout on landscape */}
          <div className={cn(
            // Normal: vertical stacked
            "p-6",
            // Landscape: horizontal, less vertical padding
            "tablet-landscape:p-4 tablet-landscape:flex tablet-landscape:items-center tablet-landscape:gap-6"
          )}>
            {/* Timer section */}
            <div className={cn(
              "relative",
              // Landscape: flex-1 to share space
              "tablet-landscape:flex-1"
            )}>
              {/* Progress bar */}
              <div className="absolute inset-0 rounded-xl bg-zinc-800/30 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full transition-colors duration-500",
                    isOverAddedTime ? "bg-red-500/20" : isInAddedTime ? "bg-amber-500/15" : "bg-green-500/15"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Timer content */}
              <div className={cn(
                "relative font-mono font-bold text-center rounded-xl border-2 transition-all duration-300",
                // Normal padding
                "py-8",
                // Landscape: more compact
                "tablet-landscape:py-4",
                isRunning && "border-green-500/40",
                isPaused && "border-amber-500/40",
                isStopped && displaySeconds === 0 && "border-zinc-700/40",
                isStopped && displaySeconds > 0 && "border-blue-500/40",
                isFinished && "border-zinc-700/40"
              )}>
                <div className="flex items-baseline justify-center gap-1">
                  <motion.span 
                    key={timeDisplay.main}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      // Normal sizes
                      "text-6xl sm:text-7xl md:text-8xl",
                      // Landscape: smaller
                      "tablet-landscape:text-5xl",
                      isRunning && "text-green-400",
                      isPaused && "text-amber-400",
                      isStopped && displaySeconds > 0 && "text-blue-400",
                      isFinished && "text-zinc-400"
                    )}
                  >
                    {timeDisplay.main}
                  </motion.span>
                  {timeDisplay.added && (
                    <motion.span 
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={cn(
                        "text-amber-400 animate-pulse",
                        "text-2xl sm:text-3xl",
                        "tablet-landscape:text-xl"
                      )}
                    >
                      {timeDisplay.added}
                    </motion.span>
                  )}
                  <span className={cn(
                    "text-zinc-500",
                    "text-xl sm:text-2xl",
                    "tablet-landscape:text-lg"
                  )}>
                    :{timeDisplay.seconds}
                  </span>
                </div>

                {/* Added time indicator */}
                {isInAddedTime && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "mt-2 text-xs font-medium",
                      isOverAddedTime ? "text-red-400" : "text-amber-400"
                    )}
                  >
                    {isOverAddedTime ? "⚠️ Tempo esgotado" : `⏱️ Acréscimos (+${currentAddedTime} min)`}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Landscape: Show key actions inline */}
            {isLive && (
              <div className={cn(
                // Hide on non-landscape
                "hidden",
                // Landscape: show inline quick controls
                "tablet-landscape:flex tablet-landscape:flex-col tablet-landscape:gap-2 tablet-landscape:shrink-0"
              )}>
                {/* Play/Pause button - large */}
                <Button
                  size="lg"
                  variant={isRunning ? "warning" : "success"}
                  className="h-12 w-32 gap-2 font-semibold"
                  onClick={onPlayPause}
                  disabled={isPending}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Jogar
                    </>
                  )}
                </Button>

                {/* Added time display */}
                <div className="flex items-center justify-center gap-1 bg-zinc-800/60 rounded-lg px-3 py-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <Badge className="text-sm font-bold bg-zinc-700 text-zinc-100">
                    +{currentAddedTime}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Action bar - hide added time section on landscape (shown inline above) */}
          {isLive && (
            <div className={cn(
              "px-4 pb-4 space-y-3",
              // Landscape: more compact padding
              "tablet-landscape:px-5 tablet-landscape:pb-3 tablet-landscape:space-y-2"
            )}>
              {/* Added time controls - Hide on landscape (shown inline in timer area) */}
              <div className={cn(
                "bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40",
                // Landscape: hide this section (controls shown inline)
                "tablet-landscape:hidden"
              )}>
                <div className="flex flex-wrap items-center gap-2 w-full">
                  {/* Main controls: Label + minus/value/plus */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-4 h-4 text-zinc-500 hidden sm:block" />
                    <span className="text-xs text-zinc-400 hidden sm:inline">Acréscimo:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                        onMouseDown={() => startHold(() => adjustAddedTime(-1))}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(-1)); }}
                        onTouchEnd={stopHold}
                        disabled={currentAddedTime === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Badge className="text-base sm:text-lg font-bold min-w-[2.5rem] sm:min-w-[3rem] justify-center h-8 sm:h-9 bg-zinc-700 text-zinc-100">
                        +{currentAddedTime}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                        onMouseDown={() => startHold(() => adjustAddedTime(1))}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(1)); }}
                        onTouchEnd={stopHold}
                        disabled={currentAddedTime >= 15}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preset chips - flex-wrap with responsive sizing */}
                  <div className="flex items-center gap-1 flex-wrap flex-1 justify-end min-w-0">
                    {ADDED_TIME_CHIPS.map((chip) => (
                      <Button
                        key={chip}
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
                        onClick={() => {
                          onUpdateAddedTime(half, currentAddedTime + chip);
                          toast.success(`+${currentAddedTime + chip} min`, { duration: 1000 });
                        }}
                      >
                        +{chip}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main action buttons - horizontal on landscape */}
              <div className={cn(
                "grid gap-2",
                // Normal: 3 columns
                "grid-cols-3",
                // Landscape: 4 columns with smaller buttons
                "tablet-landscape:grid-cols-4 tablet-landscape:gap-3"
              )}>
                {isWaitingSecondHalf ? (
                  <Button
                    size="lg"
                    variant="info"
                    className={cn(
                      "gap-2 font-semibold",
                      "col-span-3 h-14 text-lg",
                      "tablet-landscape:col-span-4 tablet-landscape:h-11 tablet-landscape:text-base"
                    )}
                    onClick={onStartSecondHalf}
                    disabled={isPending}
                  >
                    <Play className="w-5 h-5" />
                    Iniciar 2º Tempo
                  </Button>
                ) : (
                  <>
                    {/* Play/Pause - hidden on landscape (shown inline in timer) */}
                    <Button
                      size="lg"
                      variant={isRunning ? "warning" : "success"}
                      className={cn(
                        "gap-2 font-semibold col-span-1",
                        "h-14 text-lg",
                        // Landscape: hide (shown inline above)
                        "tablet-landscape:hidden"
                      )}
                      onClick={onPlayPause}
                      disabled={isPending}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-5 h-5" />
                          <span className="hidden sm:inline">Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          <span className="hidden sm:inline">Jogar</span>
                        </>
                      )}
                    </Button>

                    {/* Added time adjust - show on landscape */}
                    <div className={cn(
                      "hidden",
                      "tablet-landscape:flex tablet-landscape:items-center tablet-landscape:gap-1"
                    )}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                        onMouseDown={() => startHold(() => adjustAddedTime(-1))}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(-1)); }}
                        onTouchEnd={stopHold}
                        disabled={currentAddedTime === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Badge className="text-lg font-bold min-w-[3rem] justify-center h-11 bg-zinc-700 text-zinc-100 px-3">
                        +{currentAddedTime}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                        onMouseDown={() => startHold(() => adjustAddedTime(1))}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(1)); }}
                        onTouchEnd={stopHold}
                        disabled={currentAddedTime >= 15}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* End Half / Finish */}
                    {half === 1 ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className={cn(
                          "gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10",
                          "h-14",
                          "tablet-landscape:h-11"
                        )}
                        onClick={() => setConfirmEndHalfOpen(true)}
                        disabled={isPending || displaySeconds === 0}
                      >
                        <Flag className="w-5 h-5" />
                        <span className="hidden sm:inline tablet-landscape:inline">Intervalo</span>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        className={cn(
                          "gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10",
                          "h-14",
                          "tablet-landscape:h-11"
                        )}
                        onClick={() => setConfirmFinishOpen(true)}
                        disabled={isPending || displaySeconds === 0}
                      >
                        <StopCircle className="w-5 h-5" />
                        <span className="hidden sm:inline tablet-landscape:inline">Encerrar</span>
                      </Button>
                    )}

                    {/* Review */}
                    <Button
                      size="lg"
                      variant="outline"
                      className={cn(
                        "gap-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800",
                        "h-14",
                        "tablet-landscape:h-11"
                      )}
                      asChild
                    >
                      <Link to={`/dashboard/aovivo/${matchId}/review`}>
                        <ArrowRight className="w-5 h-5" />
                        <span className="hidden sm:inline tablet-landscape:inline">Revisar</span>
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Finished state actions */}
          {isFinished && (
            <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="success"
                className="h-14 gap-2"
                onClick={onPlayPause}
                disabled={isPending}
              >
                <Play className="w-5 h-5" />
                Retomar
              </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  asChild
                >
                  <Link to={`/dashboard/aovivo/${matchId}/review`}>
                    <ArrowRight className="w-5 h-5" />
                    Revisar
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirm End Half Dialog */}
      <AlertDialog open={confirmEndHalfOpen} onOpenChange={setConfirmEndHalfOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar 1º Tempo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              O cronômetro será pausado e você poderá iniciar o 2º tempo quando estiver pronto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmEndHalfOpen(false); onEndHalf(); }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Flag className="w-4 h-4 mr-2" />
              Intervalo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Finish Dialog */}
      <AlertDialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Jogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              O jogo será finalizado. Você ainda poderá editar os eventos antes de aplicar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmFinishOpen(false); onFinishGame?.(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
