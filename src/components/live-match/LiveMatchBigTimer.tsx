import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Timer, Plus, Minus, Flag } from "lucide-react";
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

export type ClockStatus = "stopped" | "running" | "paused";

export interface TimerState {
  half: 1 | 2;
  clockStatus: ClockStatus;
  halfStartTime: string | null;
  elapsedSecondsInHalf: number;
  addedTimeFirstHalf: number;
  addedTimeSecondHalf: number;
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
  onMinuteChange?: (minute: number) => void;
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
  onMinuteChange,
  isPending,
}: LiveMatchBigTimerProps) {
  const [confirmEndHalfOpen, setConfirmEndHalfOpen] = useState(false);
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

  // Notify parent of minute changes
  useEffect(() => {
    const currentMinute = Math.floor(displaySeconds / 60);
    // Calculate absolute minute (including first half for second half)
    const absoluteMinute = half === 2 ? halfDuration + currentMinute : currentMinute;
    
    if (absoluteMinute !== lastMinuteRef.current) {
      lastMinuteRef.current = absoluteMinute;
      onMinuteChange?.(absoluteMinute);
    }
  }, [displaySeconds, half, halfDuration, onMinuteChange]);

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

  // Handle added time adjustment
  const adjustAddedTime = (delta: number) => {
    const newValue = Math.max(0, Math.min(15, currentAddedTime + delta));
    onUpdateAddedTime(half, newValue);
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

  // Don't render for draft status
  if (matchStatus === "draft") {
    return null;
  }

  const isRunning = clockStatus === "running";
  const isPaused = clockStatus === "paused";
  const isStopped = clockStatus === "stopped";
  const isLive = matchStatus === "live";
  const isHalfEnded = isStopped && half === 1 && elapsedSecondsInHalf > 0;
  const isWaitingSecondHalf = isHalfEnded;

  return (
    <>
      <div className="bg-card border rounded-xl p-4 shadow-lg">
        {/* Timer Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tempo de Jogo
            </span>
          </div>
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

        {/* Big Timer Display */}
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

          {/* Timer content */}
          <div
            className={cn(
              "relative font-mono text-5xl md:text-7xl font-bold tabular-nums py-6 md:py-8 text-center rounded-lg border-2 transition-all",
              isRunning && "border-green-500/50 text-green-400",
              isPaused && "border-amber-500/50 text-amber-400",
              isStopped && displaySeconds === 0 && "border-muted-foreground/20 text-muted-foreground",
              isStopped && displaySeconds > 0 && "border-blue-500/50 text-blue-400",
              isInAddedTime && "border-amber-500/50",
              isOverAddedTime && "border-red-500/50 text-red-400"
            )}
          >
            <div className="flex items-baseline justify-center gap-1">
              <span>{timeDisplay.main}</span>
              {timeDisplay.added && (
                <span className="text-2xl md:text-3xl text-amber-400 animate-pulse">
                  {timeDisplay.added}
                </span>
              )}
              <span className="text-xl md:text-2xl text-muted-foreground">
                :{timeDisplay.seconds}
              </span>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mt-3 mb-4">
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            isRunning && "bg-green-500/20 text-green-400",
            isPaused && "bg-amber-500/20 text-amber-400",
            isStopped && displaySeconds === 0 && "bg-muted text-muted-foreground",
            isWaitingSecondHalf && "bg-blue-500/20 text-blue-400",
            isOverAddedTime && "bg-red-500/20 text-red-400"
          )}>
            {isOverAddedTime
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

        {/* Added Time Controls - Always visible when live */}
        {isLive && (
          <div className="bg-muted/30 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Acréscimo:</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onMouseDown={() => startHold(() => adjustAddedTime(-1))}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    onTouchStart={() => startHold(() => adjustAddedTime(-1))}
                    onTouchEnd={stopHold}
                    disabled={currentAddedTime === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="text-lg font-bold min-w-[3rem] justify-center">
                    +{currentAddedTime}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onMouseDown={() => startHold(() => adjustAddedTime(1))}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    onTouchStart={() => startHold(() => adjustAddedTime(1))}
                    onTouchEnd={stopHold}
                    disabled={currentAddedTime >= 15}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Quick chips */}
              <div className="flex items-center gap-1">
                {ADDED_TIME_CHIPS.map((chip) => (
                  <Button
                    key={chip}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onUpdateAddedTime(half, currentAddedTime + chip)}
                  >
                    +{chip}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {/* Waiting for second half - show start 2nd half button */}
          {isWaitingSecondHalf ? (
            <Button
              size="lg"
              className="h-12 px-6 gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={onStartSecondHalf}
              disabled={isPending}
            >
              <Play className="h-5 w-5" />
              Iniciar 2º Tempo
            </Button>
          ) : (
            <>
              {/* Play/Pause button */}
              <Button
                variant={isRunning ? "destructive" : "default"}
                size="lg"
                className={cn(
                  "h-12 px-6 gap-2",
                  !isRunning && "bg-green-600 hover:bg-green-700"
                )}
                onClick={onPlayPause}
                disabled={!isLive || isPending}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-5 w-5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    {isPaused ? "Retomar" : "Iniciar"}
                  </>
                )}
              </Button>

              {/* End Half button - only show during first half when running or paused */}
              {half === 1 && (isRunning || isPaused) && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                  onClick={handleEndHalfClick}
                  disabled={isPending}
                >
                  <Flag className="h-5 w-5" />
                  Fim 1º Tempo
                </Button>
              )}

              {/* Reset - only for admin/testing - hidden for now */}
              {/* {displaySeconds > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-4"
                  onClick={onReset}
                  title="Reiniciar"
                  disabled={isRunning || isPending}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              )} */}
            </>
          )}
        </div>

        {/* Duration info */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <p className="text-xs text-muted-foreground">
            Duração: {durationMinutes} min ({halfDuration} + {halfDuration})
          </p>
          {addedTimeFirstHalf > 0 && half === 2 && (
            <Badge variant="outline" className="text-xs">
              1ºT: +{addedTimeFirstHalf} min
            </Badge>
          )}
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
    </>
  );
}
