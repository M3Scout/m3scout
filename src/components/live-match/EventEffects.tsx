import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { MatchEventType } from "@/hooks/useLiveMatch";
import { cn } from "@/lib/utils";

interface EventEffectsProps {
  lastEvent: { type: MatchEventType; timestamp: number } | null;
  enabled?: boolean;
}

// Confetti configurations for different events
const CONFETTI_CONFIGS = {
  goal: {
    particleCount: 150,
    spread: 100,
    startVelocity: 45,
    colors: ["#22c55e", "#16a34a", "#4ade80", "#ffffff", "#facc15"],
    origin: { x: 0.5, y: 0.7 },
  },
  assist: {
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
    colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#ffffff"],
    origin: { x: 0.5, y: 0.7 },
  },
  save: {
    particleCount: 60,
    spread: 60,
    startVelocity: 30,
    colors: ["#22c55e", "#4ade80", "#86efac"],
    origin: { x: 0.5, y: 0.7 },
  },
  penalty_saved: {
    particleCount: 200,
    spread: 120,
    startVelocity: 50,
    colors: ["#22c55e", "#16a34a", "#facc15", "#fbbf24", "#ffffff"],
    origin: { x: 0.5, y: 0.6 },
  },
};

// Flash overlay configurations
const FLASH_CONFIGS: Record<string, { color: string; duration: number; intensity: number }> = {
  goal: { color: "rgba(34, 197, 94, 0.4)", duration: 600, intensity: 0.6 },
  assist: { color: "rgba(59, 130, 246, 0.3)", duration: 400, intensity: 0.4 },
  yellow: { color: "rgba(250, 204, 21, 0.5)", duration: 400, intensity: 0.5 },
  red: { color: "rgba(239, 68, 68, 0.6)", duration: 500, intensity: 0.7 },
  save: { color: "rgba(34, 197, 94, 0.3)", duration: 350, intensity: 0.4 },
  goal_conceded: { color: "rgba(239, 68, 68, 0.4)", duration: 400, intensity: 0.5 },
  penalty_saved: { color: "rgba(250, 204, 21, 0.5)", duration: 500, intensity: 0.6 },
  error_led_to_goal: { color: "rgba(239, 68, 68, 0.5)", duration: 450, intensity: 0.5 },
};

// Fire confetti from both corners for big celebrations
function fireConfettiCelebration(config: typeof CONFETTI_CONFIGS.goal) {
  const defaults = {
    ...config,
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  // Fire from left
  confetti({
    ...defaults,
    origin: { x: 0.2, y: 0.7 },
    angle: 60,
  });

  // Fire from right
  confetti({
    ...defaults,
    origin: { x: 0.8, y: 0.7 },
    angle: 120,
  });

  // Center burst
  setTimeout(() => {
    confetti({
      ...defaults,
      origin: { x: 0.5, y: 0.6 },
      angle: 90,
      particleCount: Math.floor(config.particleCount * 0.7),
    });
  }, 150);
}

// Simple confetti burst
function fireConfettiBurst(config: typeof CONFETTI_CONFIGS.assist) {
  confetti({
    ...config,
    zIndex: 9999,
    disableForReducedMotion: true,
  });
}

export function EventEffects({ lastEvent, enabled = true }: EventEffectsProps) {
  const [flashConfig, setFlashConfig] = useState<{ color: string; key: number } | null>(null);
  const lastProcessedRef = useRef<number>(0);

  const triggerEffects = useCallback((eventType: MatchEventType) => {
    if (!enabled) return;

    // Trigger confetti for specific events
    if (eventType === "goal") {
      fireConfettiCelebration(CONFETTI_CONFIGS.goal);
    } else if (eventType === "assist") {
      fireConfettiBurst(CONFETTI_CONFIGS.assist);
    } else if (eventType === "save") {
      fireConfettiBurst(CONFETTI_CONFIGS.save);
    } else if (eventType === "penalty_saved") {
      fireConfettiCelebration(CONFETTI_CONFIGS.penalty_saved);
    }

    // Trigger flash for specific events
    const flash = FLASH_CONFIGS[eventType];
    if (flash) {
      setFlashConfig({ color: flash.color, key: Date.now() });
      setTimeout(() => setFlashConfig(null), flash.duration);
    }
  }, [enabled]);

  useEffect(() => {
    if (!lastEvent || lastEvent.timestamp === lastProcessedRef.current) return;
    
    lastProcessedRef.current = lastEvent.timestamp;
    triggerEffects(lastEvent.type);
  }, [lastEvent, triggerEffects]);

  return (
    <AnimatePresence>
      {flashConfig && (
        <motion.div
          key={flashConfig.key}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 pointer-events-none z-[9998]"
          style={{ backgroundColor: flashConfig.color }}
        />
      )}
    </AnimatePresence>
  );
}

// Hook to manage event effects state
export function useEventEffects() {
  const [lastEvent, setLastEvent] = useState<{ type: MatchEventType; timestamp: number } | null>(null);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  const triggerEvent = useCallback((eventType: MatchEventType) => {
    setLastEvent({ type: eventType, timestamp: Date.now() });
  }, []);

  return {
    lastEvent,
    triggerEvent,
    effectsEnabled,
    setEffectsEnabled,
  };
}