import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MUTED = "#62616a";

export const TIER_COLORS = {
  S: { bg: "#F5C451", text: "#1a1a1a", label: "Elite Mundial" },
  A: { bg: "#2ECC71", text: "#ffffff", label: "Alta Qualidade" },
  B: { bg: "#3498DB", text: "#ffffff", label: "Intermediário" },
  C: { bg: "#7F8C8D", text: "#ffffff", label: "Regional" },
  D: { bg: "#E74C3C", text: "#ffffff", label: "Base/Local" },
} as const;

// ── TierBadge ────────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = "md", showTooltip = true, className }: TierBadgeProps) {
  const tierKey = tier.toUpperCase() as keyof typeof TIER_COLORS;
  const config = TIER_COLORS[tierKey] || TIER_COLORS.C;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 min-w-[22px]",
    md: "text-[11px] px-2.5 py-1 min-w-[28px] font-bold",
    lg: "text-[15px] px-3.5 py-1.5 min-w-[36px] font-bold",
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-editorial-mono font-semibold tracking-wider",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        boxShadow: size === "lg" ? `0 2px 12px ${config.bg}50` : undefined,
      }}
    >
      {tier.toUpperCase()}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Tier {tier.toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── CoefficientBar ───────────────────────────────────────────────────────────

interface CoefficientBarProps {
  value: number;
  showValue?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const getBarConfig = (value: number) => {
  if (value >= 1.03) return { color: "#22c55e", segments: 10, label: "Elite Mundial" };
  if (value >= 0.98) return { color: "#4ade80", segments: 8,  label: "Alta Competitividade" };
  if (value >= 0.94) return { color: "#3b82f6", segments: 6,  label: "Competitivo" };
  if (value >= 0.90) return { color: "#6b7280", segments: 4,  label: "Regional" };
  return                     { color: "#ef4444", segments: 2,  label: "Base/Local" };
};

export function CoefficientBar({ value, showValue = true, showTooltip = true, size = "md", className }: CoefficientBarProps) {
  const config = getBarConfig(value);

  const bar = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex gap-0.5 w-24", size === "sm" ? "h-1.5" : "h-2")}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i < config.segments ? config.color : "rgba(255,255,255,0.07)" }}
          />
        ))}
      </div>
      {showValue && (
        <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: "#ededee" }}>
          {value.toFixed(2)}
        </span>
      )}
    </div>
  );

  if (!showTooltip) return bar;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><div className="cursor-help">{bar}</div></TooltipTrigger>
        <TooltipContent className="max-w-[200px]">
          <p className="font-medium mb-1">{config.label}</p>
          <p className="text-xs text-muted-foreground">Coeficiente que influencia o score automático do atleta</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── TypeBadge ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  league:       { label: "LIGA",        bg: "#7f1d1d", text: "#fca5a5" },
  state_league: { label: "ESTADUAL",    bg: "#14532d", text: "#86efac" },
  cup:          { label: "COPA",        bg: "#1e3a8a", text: "#93c5fd" },
  continental:  { label: "CONTINENTAL", bg: "#581c87", text: "#d8b4fe" },
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const config = TYPE_CONFIG[type] || { label: type.toUpperCase(), bg: "#374151", text: "#d1d5db" };

  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded-md font-editorial-mono text-[9px] font-semibold tracking-wider uppercase", className)}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

// ── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md font-editorial-mono text-[9px] font-medium uppercase tracking-wider",
        className
      )}
      style={{
        background: isActive ? "rgba(45,206,138,0.12)" : "rgba(229,23,63,0.12)",
        color:      isActive ? "#2DCE8A"               : "#e5173f",
        border:     isActive ? "1px solid rgba(45,206,138,0.25)" : "1px solid rgba(229,23,63,0.25)",
      }}
    >
      {isActive ? "Ativa" : "Inativa"}
    </span>
  );
}

// ── VisibilityDisplay ────────────────────────────────────────────────────────

export function VisibilityDisplay({ score, className }: { score: number | null; className?: string }) {
  const value = score ?? 50;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex flex-col items-center cursor-help", className)}>
            <span className="font-display font-bold text-lg leading-none text-blue-400 tabular-nums">{value}</span>
            <span className="font-editorial-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>Visib.</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Exposição de mercado, transmissão e alcance internacional</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
