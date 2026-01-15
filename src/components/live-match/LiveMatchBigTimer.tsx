import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Pause, Timer, Plus, Minus, Flag, 
  StopCircle, ChevronUp 
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

interface LiveMatchBigTimerProps {
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

// Quick added time chips
const ADDED_TIME_CHIPS = [1, 2, 3, 5];

export function LiveMatchBigTimer({
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
}: LiveMatchBigTimerProps) {
  const [confirmEndHalfOpen, setConfirmEndHalfOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const lastMinuteRef = useRef(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { half, clockStatus, halfStartTime, elapsedSecondsInHalf, addedTimeFirstHalf, addedTimeSecondHalf } = timerState;
  
  const currentAddedTime = half === 1 ? addedTimeFirstHalf : addedTimeSecondHalf;
  const halfDuration = durationMinutes / 2; // 45 min for 90 min match

  // Calculate elapsed seconds in current half
  const calculateElapsed = useCallback(() => {
    let elapsed = elapsedSecondsInHalf;
    if (clockStatus === "running" && halfStartTime) {
      const now = Date.now();
      const start = new Date(halfStartTime).getTime();
      elapsed += Math.floor((now - start) / 1000);
    }
    return elapsed;
  }, [clockStatus, halfStartTime, elapsedSecondsInHalf]);

  // Update display every second when running
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

  // Build timer info for parent
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

  // Notify parent of minute changes
  useEffect(() => {
    const currentMinute = Math.floor(displaySeconds / 60);
    const absoluteMinute = half === 2 ? halfDuration + currentMinute : currentMinute;
    
    if (absoluteMinute !== lastMinuteRef.current) {
      lastMinuteRef.current = absoluteMinute;
      onMinuteChange?.(absoluteMinute);
    }

    // Always update timer info
    onTimerInfoChange?.(getTimerInfo());
  }, [displaySeconds, half, halfDuration, onMinuteChange, onTimerInfoChange, getTimerInfo]);

  // Format time display
  const formatTimeDisplay = () => {
    const totalSeconds = displaySeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    // Check if in added time
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

    // Regular time
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

  // Progress percentage (capped at 100%)
  const progressPercent = Math.min((minutes / halfDuration) * 100, 100);

  // Handle added time adjustment with haptic feedback
  const adjustAddedTime = (delta: number) => {
    const newValue = Math.max(0, Math.min(15, currentAddedTime + delta));
    onUpdateAddedTime(half, newValue);
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    // Visual feedback
    toast.success(`Acréscimo: +${newValue} min`, { duration: 1000 });
  };

  // Hold to repeat for +/- buttons
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

  // Handle end half confirmation
  const handleEndHalfClick = () => {
    setConfirmEndHalfOpen(true);
  };

  const handleConfirmEndHalf = () => {
    setConfirmEndHalfOpen(false);
    onEndHalf();
  };

  // Handle finish game
  const handleFinishClick = () => {
    setConfirmFinishOpen(true);
  };

  const handleConfirmFinish = () => {
    setConfirmFinishOpen(false);
    onFinishGame?.();
  };

  // Don't render for draft status
  if (matchStatus === "draft") {
    return null;
  }

  const isRunning = clockStatus === "running";
  const isPaused = clockStatus === "paused";
  const isStopped = clockStatus === "stopped";
  const isLive = matchStatus === "live";
  const isFinished = matchStatus === "finished";
  const isHalfEnded = isStopped && half === 1 && elapsedSecondsInHalf > 0;
  const isWaitingSecondHalf = isHalfEnded;
  const canFinishGame = half === 2 && isLive;

  return (
    <>
      {/* Main Timer Card - Optimized for iPad/iPhone */}
      <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant={half === 1 ? "default" : "secondary"}
              className={cn(
                "text-xs font-bold",
                half === 1 && "bg-blue-600",
                half === 2 && "bg-purple-600"
              )}
            >
              {half === 1 ? "1º TEMPO" : "2º TEMPO"}
            </Badge>
          </div>
          
          {/* Status indicator */}
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            isRunning && "bg-green-500/20 text-green-400",
            isPaused && "bg-amber-500/20 text-amber-400",
            isStopped && displaySeconds === 0 && "bg-muted text-muted-foreground",
            isWaitingSecondHalf && "bg-blue-500/20 text-blue-400",
            isOverAddedTime && "bg-red-500/20 text-red-400",
            isFinished && "bg-amber-500/20 text-amber-400"
          )}>
            {isFinished
              ? "⏹️ Finalizado"
              : isOverAddedTime
              ? "⚠️ Acima do acréscimo"
              : isInAddedTime
              ? "⏱️ Acréscimos"
              : isRunning
              ? "🟢 Em andamento"
              : isPaused
              ? "⏸️ Pausado"
              : isWaitingSecondHalf
              ? "⏳ Aguardando 2º tempo"
              : "⏹️ Parado"}
          </span>
        </div>

        {/* Timer Display - Large for iPad, still readable on iPhone */}
        <div className="p-3 sm:p-4">
          <div className="relative">
            {/* Progress bar background */}
            <div className="absolute inset-0 rounded-lg bg-muted/30 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000",
                  isOverAddedTime ? "bg-red-500/30" : isInAddedTime ? "bg-amber-500/20" : "bg-green-500/20"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Timer content - responsive sizing */}
            <div
              className={cn(
                "relative font-mono font-bold tabular-nums py-4 sm:py-6 md:py-8 text-center rounded-lg border-2 transition-all",
                // iPhone: 40px, iPad: 56-72px
                "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
                isRunning && "border-green-500/50 text-green-400",
                isPaused && "border-amber-500/50 text-amber-400",
                isStopped && displaySeconds === 0 && "border-muted-foreground/20 text-muted-foreground",
                isStopped && displaySeconds > 0 && "border-blue-500/50 text-blue-400",
                isInAddedTime && "border-amber-500/50",
                isOverAddedTime && "border-red-500/50 text-red-400",
                isFinished && "border-amber-500/50 text-amber-400"
              )}
            >
              <div className="flex items-baseline justify-center gap-1">
                <span>{timeDisplay.main}</span>
                {timeDisplay.added && (
                  <span className="text-xl sm:text-2xl md:text-3xl text-amber-400 animate-pulse">
                    {timeDisplay.added}
                  </span>
                )}
                <span className="text-lg sm:text-xl md:text-2xl text-muted-foreground">
                  :{timeDisplay.seconds}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section - Responsive layout */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
          {/* Added Time Controls - Always visible when live */}
          {isLive && (
            <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
              {/* Mobile: Compact layout */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Acréscimo:</span>
                  <div className="flex items-center gap-1">
                    {/* Minus button - 44px touch target */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      onMouseDown={() => startHold(() => adjustAddedTime(-1))}
                      onMouseUp={stopHold}
                      onMouseLeave={stopHold}
                      onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(-1)); }}
                      onTouchEnd={stopHold}
                      disabled={currentAddedTime === 0}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Badge variant="secondary" className="text-lg sm:text-xl font-bold min-w-[3.5rem] sm:min-w-[4rem] justify-center h-11 sm:h-10">
                      +{currentAddedTime}
                    </Badge>
                    {/* Plus button - 44px touch target */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 sm:h-10 sm:w-10"
                      onMouseDown={() => startHold(() => adjustAddedTime(1))}
                      onMouseUp={stopHold}
                      onMouseLeave={stopHold}
                      onTouchStart={(e) => { e.preventDefault(); startHold(() => adjustAddedTime(1)); }}
                      onTouchEnd={stopHold}
                      disabled={currentAddedTime >= 15}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Quick chips - Desktop: inline, Mobile: popover */}
                <div className="hidden sm:flex items-center gap-1">
                  {ADDED_TIME_CHIPS.map((chip) => (
                    <Button
                      key={chip}
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 text-sm"
                      onClick={() => {
                        onUpdateAddedTime(half, currentAddedTime + chip);
                        toast.success(`Acréscimo: +${currentAddedTime + chip} min`, { duration: 1000 });
                      }}
                    >
                      +{chip}
                    </Button>
                  ))}
                </div>

                {/* Mobile: Popover for quick chips */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 px-3 sm:hidden"
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Atalhos
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <div className="flex flex-wrap gap-2">
                      {ADDED_TIME_CHIPS.map((chip) => (
                        <Button
                          key={chip}
                          variant="outline"
                          size="lg"
                          className="h-12 min-w-[3rem] text-lg"
                          onClick={() => {
                            onUpdateAddedTime(half, currentAddedTime + chip);
                            toast.success(`Acréscimo: +${currentAddedTime + chip} min`, { duration: 1000 });
                          }}
                        >
                          +{chip}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Main Action Buttons - Responsive grid */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2">
            {/* Waiting for second half - show start 2nd half button */}
            {isWaitingSecondHalf ? (
              <Button
                size="lg"
                className="col-span-2 h-12 sm:h-14 px-6 gap-2 bg-purple-600 hover:bg-purple-700 text-base sm:text-lg"
                onClick={onStartSecondHalf}
                disabled={isPending}
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                Iniciar 2º Tempo
              </Button>
            ) : isFinished ? (
              /* Finished state - show resume button */
              <Button
                size="lg"
                className="col-span-2 h-12 sm:h-14 px-6 gap-2 bg-green-600 hover:bg-green-700 text-base sm:text-lg"
                onClick={onPlayPause}
                disabled={isPending}
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                Retomar Jogo
              </Button>
            ) : (
              <>
                {/* Play/Pause button - 44px minimum */}
                <Button
                  variant={isRunning ? "destructive" : "default"}
                  size="lg"
                  className={cn(
                    "h-12 sm:h-14 px-4 sm:px-6 gap-2 text-base sm:text-lg",
                    !isRunning && "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={onPlayPause}
                  disabled={!isLive || isPending}
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span className="hidden sm:inline">Pausar</span>
                      <span className="sm:hidden">⏸</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span className="hidden sm:inline">{isPaused ? "Retomar" : "Iniciar"}</span>
                      <span className="sm:hidden">▶</span>
                    </>
                  )}
                </Button>

                {/* End Half button - only show during first half when running or paused */}
                {half === 1 && (isRunning || isPaused) && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 sm:h-14 px-4 sm:px-6 gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 text-base sm:text-lg"
                    onClick={handleEndHalfClick}
                    disabled={isPending}
                  >
                    <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden sm:inline">Fim 1º Tempo</span>
                    <span className="sm:hidden">Fim 1ºT</span>
                  </Button>
                )}

                {/* Finish Game button - only in 2nd half */}
                {canFinishGame && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 sm:h-14 px-4 sm:px-6 gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10 text-base sm:text-lg"
                    onClick={handleFinishClick}
                    disabled={isPending}
                  >
                    <StopCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden sm:inline">Finalizar Jogo</span>
                    <span className="sm:hidden">Finalizar</span>
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Duration info - compact */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <span>Duração: {durationMinutes}min</span>
            {addedTimeFirstHalf > 0 && half === 2 && (
              <Badge variant="outline" className="text-xs">
                1ºT: +{addedTimeFirstHalf}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Confirm End Half Dialog */}
      <AlertDialog open={confirmEndHalfOpen} onOpenChange={setConfirmEndHalfOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar 1º Tempo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Confirmar fim do 1º tempo?</p>
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  ⏱️ Tempo decorrido: <strong>{Math.floor(displaySeconds / 60)}</strong> min
                </p>
                <p className="text-sm">
                  ➕ Acréscimo definido: <strong>+{currentAddedTime}</strong> min
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                O cronômetro será pausado e você poderá iniciar o 2º tempo quando estiver pronto.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmEndHalf}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Flag className="h-4 w-4 mr-1" />
              Encerrar 1º Tempo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Finish Game Dialog */}
      <AlertDialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Jogo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Confirmar fim do jogo?</p>
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  ⏱️ Tempo: <strong>{timeDisplay.main}{timeDisplay.added || ""}</strong>
                </p>
                <p className="text-sm">
                  ➕ Acréscimo 2º tempo: <strong>+{addedTimeSecondHalf}</strong> min
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                O jogo será marcado como finalizado e você poderá revisar as estatísticas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmFinish}
              className="bg-red-600 hover:bg-red-700"
            >
              <StopCircle className="h-4 w-4 mr-1" />
              Finalizar Jogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
