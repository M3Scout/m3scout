/**
 * MatchEfficiencyBadge - Displays the "Eficiência no Jogo" indicator
 * 
 * Shows the quality vs risk classification for a player's performance.
 * This is SEPARATE from the match rating - it's a distinct scouting metric.
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Gauge, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchEfficiencyResult } from "@/lib/matchEfficiencyEngine";

interface MatchEfficiencyBadgeProps {
  efficiency: MatchEfficiencyResult;
  playerName?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Icon component based on efficiency level
 */
function EfficiencyIcon({ level, className }: { level: string; className?: string }) {
  switch (level) {
    case "high":
      return <TrendingUp className={cn("w-3 h-3", className)} />;
    case "low":
      return <TrendingDown className={cn("w-3 h-3", className)} />;
    default:
      return <Minus className={cn("w-3 h-3", className)} />;
  }
}

/**
 * Main badge component
 */
export function MatchEfficiencyBadge({
  efficiency,
  playerName,
  size = "md",
  showIcon = true,
  showDetails = true,
  className,
}: MatchEfficiencyBadgeProps) {
  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 h-4",
    md: "text-[10px] px-2 py-0.5 h-5",
    lg: "text-xs px-2.5 py-1 h-6",
  };
  
  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-medium gap-1 border",
        efficiency.bgColor,
        efficiency.borderColor,
        efficiency.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <EfficiencyIcon level={efficiency.level} className={iconSizes[size]} />}
      <span>{efficiency.labelShort}</span>
    </Badge>
  );
  
  if (!showDetails) {
    return badge;
  }
  
  // Desktop: Tooltip with details
  // Mobile: Popover with details
  return (
    <>
      {/* Desktop Tooltip */}
      <div className="hidden sm:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-[280px] p-3 bg-zinc-900/95 border-zinc-800/60"
            >
              <EfficiencyDetailsContent efficiency={efficiency} playerName={playerName} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Mobile Popover */}
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            {badge}
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            className="w-[280px] p-3 bg-zinc-900/95 border-zinc-800/60"
          >
            <EfficiencyDetailsContent efficiency={efficiency} playerName={playerName} />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

/**
 * Detailed content for tooltip/popover
 */
function EfficiencyDetailsContent({
  efficiency,
  playerName,
}: {
  efficiency: MatchEfficiencyResult;
  playerName?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Gauge className={cn("w-4 h-4", efficiency.color)} />
        <span className="text-sm font-semibold text-zinc-100">
          Eficiência no Jogo
        </span>
      </div>
      
      {playerName && (
        <p className="text-[10px] text-muted-foreground">
          {playerName}
        </p>
      )}
      
      <div className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        efficiency.bgColor,
        "border",
        efficiency.borderColor
      )}>
        <EfficiencyIcon level={efficiency.level} className={cn("w-4 h-4", efficiency.color)} />
        <span className={cn("text-sm font-medium", efficiency.color)}>
          {efficiency.label}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          <span>{efficiency.positiveActions} positivas</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400">
          <TrendingDown className="w-3 h-3" />
          <span>{efficiency.riskActions} de risco</span>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {efficiency.description}
      </p>
      
      {efficiency.ratio > 0 && efficiency.ratio !== Infinity && (
        <p className="text-[9px] text-zinc-500 flex items-center gap-1">
          <Info className="w-2.5 h-2.5" />
          Ratio: {efficiency.ratio.toFixed(2)} (positivas/risco)
        </p>
      )}
    </div>
  );
}

/**
 * Inline text component for compact displays
 */
export function MatchEfficiencyText({
  efficiency,
  showIcon = true,
  className,
}: {
  efficiency: MatchEfficiencyResult;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", efficiency.color, className)}>
      {showIcon && <EfficiencyIcon level={efficiency.level} className="w-2.5 h-2.5" />}
      <span>{efficiency.label}</span>
    </span>
  );
}

/**
 * Card variant for summary displays
 */
export function MatchEfficiencyCard({
  efficiency,
  playerName,
  className,
}: {
  efficiency: MatchEfficiencyResult;
  playerName?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      efficiency.bgColor,
      efficiency.borderColor,
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Gauge className={cn("w-4 h-4", efficiency.color)} />
        <span className="text-xs font-medium text-zinc-300">Eficiência</span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <EfficiencyIcon level={efficiency.level} className={cn("w-5 h-5", efficiency.color)} />
        <span className={cn("text-sm font-semibold", efficiency.color)}>
          {efficiency.label}
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-emerald-400">
          {efficiency.positiveActions} positivas
        </span>
        <span className="text-zinc-500">|</span>
        <span className="text-red-400">
          {efficiency.riskActions} de risco
        </span>
      </div>
      
      <p className="text-[9px] text-muted-foreground mt-2 line-clamp-2">
        {efficiency.description}
      </p>
    </div>
  );
}
