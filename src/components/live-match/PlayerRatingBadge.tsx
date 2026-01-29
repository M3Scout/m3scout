/**
 * Badge component to display a player's match rating (0.0-10.0)
 * 
 * Uses the SofaScore-style color scheme:
 * - 0.0-5.9 = Red
 * - 6.0-6.4 = Orange
 * - 6.5-6.9 = Amber
 * - 7.0-7.9 = Green
 * - 8.0-8.9 = Cyan
 * - 9.0-10.0 = Blue
 */

import { cn } from "@/lib/utils";
import { getRatingBgColor, type MatchRatingResult } from "@/lib/matchRatingEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RatingBreakdownModal } from "./RatingBreakdownModal";
import { Star, Info } from "lucide-react";

interface PlayerRatingBadgeProps {
  rating: MatchRatingResult;
  playerName?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showTooltip?: boolean;
  showDetailButton?: boolean;
  className?: string;
}

export function PlayerRatingBadge({
  rating,
  playerName = "Jogador",
  size = "md",
  showLabel = false,
  showTooltip = true,
  showDetailButton = true,
  className,
}: PlayerRatingBadgeProps) {
  const sizeClasses = {
    sm: "h-5 min-w-[32px] text-xs px-1.5",
    md: "h-7 min-w-[40px] text-sm px-2",
    lg: "h-9 min-w-[52px] text-base px-3 font-bold",
  };
  
  // Players with no rating (0 minutes) show "—"
  if (!rating.hasRating) {
    const noRatingBadge = (
      <div
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md font-semibold text-muted-foreground bg-muted/50 border border-border",
          sizeClasses[size],
          className
        )}
      >
        <span>—</span>
      </div>
    );
    
    if (!showTooltip) {
      return (
        <div className="flex items-center gap-1.5">
          {noRatingBadge}
          {showLabel && (
            <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
              Sem nota
            </span>
          )}
        </div>
      );
    }
    
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              {noRatingBadge}
              {showLabel && (
                <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
                  Sem nota
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs text-muted-foreground">Sem nota disponível</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const bgColor = getRatingBgColor(rating.rating!);
  
  const badge = (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md font-semibold text-white shadow-sm transition-transform hover:scale-105",
        bgColor,
        sizeClasses[size],
        showDetailButton && "cursor-pointer",
        className
      )}
    >
      {size === "lg" && <Star className="h-4 w-4 fill-current" />}
      <span className="tabular-nums">{rating.rating!.toFixed(1)}</span>
    </div>
  );
  
  // If detail button enabled, wrap in modal
  if (showDetailButton && rating.hasRating) {
    return (
      <RatingBreakdownModal rating={rating} playerName={playerName}>
        <div className="flex items-center gap-1.5 cursor-pointer group">
          {badge}
          {showLabel && (
            <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
              {rating.label}
            </span>
          )}
          <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </RatingBreakdownModal>
    );
  }
  
  if (!showTooltip) {
    return (
      <div className="flex items-center gap-1.5">
        {badge}
        {showLabel && (
          <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
            {rating.label}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            {badge}
            {showLabel && (
              <span className={cn("text-muted-foreground", size === "sm" ? "text-[10px]" : "text-xs")}>
                {rating.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Nota Final</span>
              <span className="font-bold">{rating.rating!.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Classificação</span>
              <span className={rating.color}>{rating.label}</span>
            </div>
            <hr className="border-border/50" />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Minutos</span>
              <span>{rating.minutesPlayed} min</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Fator Minutos</span>
              <span>×{rating.minutesFactor}</span>
            </div>
            {rating.breakdown && (
              <>
                <hr className="border-border/50" />
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Ataque</span>
                    <span className={rating.breakdown.attack >= 0 ? "text-green-400" : "text-red-400"}>
                      {rating.breakdown.attack >= 0 ? "+" : ""}{rating.breakdown.attack}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Criação</span>
                    <span className={rating.breakdown.creation >= 0 ? "text-green-400" : "text-red-400"}>
                      {rating.breakdown.creation >= 0 ? "+" : ""}{rating.breakdown.creation}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passe</span>
                    <span className={rating.breakdown.passing >= 0 ? "text-green-400" : "text-red-400"}>
                      {rating.breakdown.passing >= 0 ? "+" : ""}{rating.breakdown.passing}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Defesa</span>
                    <span className={rating.breakdown.defense >= 0 ? "text-green-400" : "text-red-400"}>
                      {rating.breakdown.defense >= 0 ? "+" : ""}{rating.breakdown.defense}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disciplina</span>
                    <span className={rating.breakdown.discipline >= 0 ? "text-green-400" : "text-red-400"}>
                      {rating.breakdown.discipline >= 0 ? "+" : ""}{rating.breakdown.discipline}
                    </span>
                  </div>
                </div>
              </>
            )}
            <p className="text-[10px] text-muted-foreground/70 pt-1">
              Clique para ver detalhes
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
