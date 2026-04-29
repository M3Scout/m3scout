import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchTimerProps {
  durationMinutes: number;
  onMinuteChange?: (minute: number) => void;
}

export function MatchTimer({ durationMinutes, onMinuteChange }: MatchTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMinuteRef = useRef(0);

  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;
  const isOvertime = minutes >= durationMinutes;

  // Notify parent when minute changes
  useEffect(() => {
    if (minutes !== lastMinuteRef.current) {
      lastMinuteRef.current = minutes;
      onMinuteChange?.(minutes);
    }
  }, [minutes, onMinuteChange]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
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
  }, [isRunning]);

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

  return (
    <div className="flex items-center gap-2">
      {/* Timer display */}
      <div
        className={cn(
          "font-mono text-lg font-bold tabular-nums px-3 py-1 rounded-md border",
          isRunning && "bg-green-500/10 border-green-500/30 text-green-400",
          !isRunning && seconds > 0 && "bg-amber-500/10 border-amber-500/30 text-amber-400",
          !isRunning && seconds === 0 && "bg-muted border-muted-foreground/20",
          isOvertime && "bg-red-500/10 border-red-500/30 text-red-400"
        )}
      >
        {formatTime(minutes, displaySeconds)}
        {isOvertime && <span className="text-xs ml-1">+</span>}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handlePlayPause}
          title={isRunning ? "Pausar" : "Iniciar"}
        >
          {isRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleReset}
          title="Reiniciar"
          disabled={seconds === 0}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
