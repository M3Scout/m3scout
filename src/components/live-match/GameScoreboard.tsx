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
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { half, clockStatus, halfStartTime, elapsedSecondsInHalf, addedTimeFirstHalf, addedTimeSecondHalf } = timerState;
  
  const currentAddedTime = half === 1 ? addedTimeFirstHalf : addedTimeSecondHalf;
  const halfDuration = durationMinutes / 2;

  const calculateElapsed = useCallback(() => {
    let elapsed = elapsedSecondsInHalf;
    if (clockStatus === "running" && halfStartTime) {
      const now = Date.now();
      const start = new Date(halfStartTime).getTime();
      elapsed += Math.floor((now - start) / 1000);
    }
    return elapsed;
  }, [clockStatus, halfStartTime, elapsedSecondsInHalf]);

  useEffect(() => {
    if (clockStatus !== "running") {
      setDisplaySeconds(calculateElapsed());
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [clockStatus, calculateElapsed]);

  const getTimerInfo = useCallback((): TimerInfo => {
    const totalSeconds = displaySeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const isInAddedTime = minutes >= halfDuration;
    
    let displayMinute: number;
    let displayString: string;

    if (isInAddedTime) {
      const addedMinutes = minutes - halfDuration;
      const baseMinute = half === 1 ? 45 : 90;
      displayMinute = half === 1 ? 45 : 90;
      displayString = `${baseMinute}+${addedMinutes + 1}'`;
    } else {
      displayMinute = half === 2 ? halfDuration + minutes : minutes;
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
    const currentMinute = Math.floor(displaySeconds / 60);
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
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 bg-zinc-900/50">
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
              <p className="text-sm font-semibold text-zinc-200">vs {opponentName}</p>
              <p className="text-xs text-zinc-500">{competitionName}</p>
            </div>
          </div>

          {/* Timer display */}
          <div className="p-6">
            <div className="relative">
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
                "relative font-mono font-bold py-8 text-center rounded-xl border-2 transition-all duration-300",
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
                      "text-6xl sm:text-7xl md:text-8xl",
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
                      className="text-2xl sm:text-3xl text-amber-400 animate-pulse"
                    >
                      {timeDisplay.added}
                    </motion.span>
                  )}
                  <span className="text-xl sm:text-2xl text-zinc-500">
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
          </div>

          {/* Action bar */}
          {isLive && (
            <div className="px-4 pb-4 space-y-3">
              {/* Added time controls */}
              <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">Acréscimo:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                        onMouseDown={() => startHold(() => adjustAddedTime(-1))}
                        onMouseUp={stopHold}
                        onMouseLeave={stopHold}
                        onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(-1)); }}
                        onTouchEnd={stopHold}
                        disabled={currentAddedTime === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Badge className="text-lg font-bold min-w-[3rem] justify-center h-9 bg-zinc-700 text-zinc-100">
                        +{currentAddedTime}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
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

                  <div className="flex items-center gap-1">
                    {ADDED_TIME_CHIPS.map((chip) => (
                      <Button
                        key={chip}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-100"
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

              {/* Main action buttons */}
              <div className="grid grid-cols-3 gap-2">
                {isWaitingSecondHalf ? (
                  <Button
                    size="lg"
                    variant="info"
                    className="col-span-3 h-14 gap-2 text-lg font-semibold"
                    onClick={onStartSecondHalf}
                    disabled={isPending}
                  >
                    <Play className="w-5 h-5" />
                    Iniciar 2º Tempo
                  </Button>
                ) : (
                  <>
                    {/* Play/Pause */}
                    <Button
                      size="lg"
                      variant={isRunning ? "warning" : "success"}
                      className="h-14 gap-2 text-lg font-semibold col-span-1"
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

                    {/* End Half / Finish */}
                    {half === 1 ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => setConfirmEndHalfOpen(true)}
                        disabled={isPending || displaySeconds === 0}
                      >
                        <Flag className="w-5 h-5" />
                        <span className="hidden sm:inline">Intervalo</span>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => setConfirmFinishOpen(true)}
                        disabled={isPending || displaySeconds === 0}
                      >
                        <StopCircle className="w-5 h-5" />
                        <span className="hidden sm:inline">Encerrar</span>
                      </Button>
                    )}

                    {/* Review */}
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 gap-2 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                      asChild
                    >
                      <Link to={`/app/live-match/${matchId}/review`}>
                        <ArrowRight className="w-5 h-5" />
                        <span className="hidden sm:inline">Revisar</span>
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
                  <Link to={`/app/live-match/${matchId}/review`}>
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
