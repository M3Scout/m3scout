import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveMatchBigTimerProps {
  durationMinutes: number;
  onMinuteChange?: (minute: number) => void;
  matchStatus: "draft" | "live" | "finished" | "applied";
}

export function LiveMatchBigTimer({ 
  durationMinutes, 
  onMinuteChange,
  matchStatus 
}: LiveMatchBigTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMinuteRef = useRef(0);

  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;
  const isOvertime = minutes >= durationMinutes;

  // Progress percentage (capped at 100%)
  const progressPercent = Math.min((minutes / durationMinutes) * 100, 100);

  // Notify parent when minute changes
  useEffect(() => {
    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes;
      onMinuteChange?.(minutes);
    }
  }, [minutes, onMinuteChange]);

  // Timer logic
  useEffect(() => {
    if (isRunning && matchStatus === "live") {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, matchStatus]);

  const handlePlayPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
    lastMinuteRef.current = 0;
    onMinuteChange?.(0);
  }, [onMinuteChange]);

  const formatTime = (min: number, sec: number) => {
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Don't render for draft status
  if (matchStatus === "draft") {
    return null;
  }

  return (
    <div className="bg-card border rounded-xl p-4 shadow-lg">
      {/* Timer Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tempo de Jogo
        </span>
      </div>

      {/* Big Timer Display */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute inset-0 rounded-lg bg-muted/30 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              isOvertime ? "bg-red-500/20" : "bg-green-500/20"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timer content */}
        <div
          className={cn(
            "relative font-mono text-5xl md:text-6xl font-bold tabular-nums py-6 text-center rounded-lg border-2 transition-all",
            isRunning && "border-green-500/50 text-green-400",
            !isRunning && seconds > 0 && "border-amber-500/50 text-amber-400",
            !isRunning && seconds === 0 && "border-muted-foreground/20 text-muted-foreground",
            isOvertime && "border-red-500/50 text-red-400"
          )}
        >
          {formatTime(minutes, displaySeconds)}
          {isOvertime && (
            <span className="text-2xl ml-2 animate-pulse">+</span>
          )}
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mt-3 mb-4">
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          isRunning && "bg-green-500/20 text-green-400",
          !isRunning && seconds > 0 && "bg-amber-500/20 text-amber-400",
          !isRunning && seconds === 0 && "bg-muted text-muted-foreground",
          isOvertime && "bg-red-500/20 text-red-400"
        )}>
          {isOvertime
            ? "⏱️ Acréscimos"
            : isRunning
            ? "🟢 Em andamento"
            : seconds > 0
            ? "⏸️ Pausado"
            : "⏹️ Parado"}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={isRunning ? "destructive" : "default"}
          size="lg"
          className="h-12 px-6 gap-2"
          onClick={handlePlayPause}
          disabled={matchStatus !== "live"}
        >
          {isRunning ? (
            <>
              <Pause className="h-5 w-5" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Iniciar
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 px-4"
          onClick={handleReset}
          title="Reiniciar"
          disabled={seconds === 0}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Duration info */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        Duração: {durationMinutes} min
      </p>
    </div>
  );
}
