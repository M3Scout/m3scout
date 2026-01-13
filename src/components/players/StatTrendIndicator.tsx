/**
 * Visual trend indicator for stat metrics
 * 
 * Shows improvement/decline compared to previous period
 */

import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TrendDirection } from "@/hooks/useStatTrend";
import { getTrendColor } from "@/hooks/useStatTrend";

interface StatTrendIndicatorProps {
  direction: TrendDirection;
  percentChange: number | null;
  previousValue: number | null;
  currentValue?: number;
  isInverse?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

const TrendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
  new: Sparkles,
};

export function StatTrendIndicator({
  direction,
  percentChange,
  previousValue,
  currentValue,
  isInverse = false,
  showTooltip = true,
  size = 'sm',
}: StatTrendIndicatorProps) {
  const Icon = TrendIcons[direction];
  const colorClass = getTrendColor(direction, isInverse);
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  // Don't show anything for new stats without previous data
  if (direction === 'new') {
    return null;
  }
  
  const content = (
    <span className={cn("inline-flex items-center gap-0.5", colorClass)}>
      <Icon className={iconSize} />
      {percentChange !== null && size === 'md' && (
        <span className="text-[10px] font-medium">
          {percentChange > 0 ? '+' : ''}{formatFixed(percentChange, 0)}%
        </span>
      )}
    </span>
  );
  
  if (!showTooltip) {
    return content;
  }
  
  const getTrendLabel = () => {
    if (direction === 'stable') return 'Estável';
    
    // For inverse stats, flip the meaning
    const actualDirection = isInverse 
      ? (direction === 'up' ? 'down' : 'up')
      : direction;
    
    if (actualDirection === 'up') return 'Melhora';
    return 'Queda';
  };
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">{getTrendLabel()}</p>
            {percentChange !== null && (
              <p className="text-muted-foreground">
                {percentChange > 0 ? '+' : ''}{formatFixed(percentChange, 1)}% vs temporada anterior
              </p>
            )}
            {previousValue !== null && currentValue !== undefined && (
              <p className="text-muted-foreground">
                {formatFixed(previousValue, 1)} → {formatFixed(currentValue, 1)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
