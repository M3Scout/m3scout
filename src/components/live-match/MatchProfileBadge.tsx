/**
 * Badge component to display a player's Match Profile (Perfil do Jogo)
 * 
 * Shows the qualitative interpretation of a player's performance
 * based on objective rules from the matchProfileEngine.
 */

import { cn } from "@/lib/utils";
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
import type { MatchProfileResult } from "@/lib/matchProfileEngine";
import { Target, Shield, TrendingUp, AlertTriangle, Activity, Minus, Info } from "lucide-react";

interface MatchProfileBadgeProps {
  profile: MatchProfileResult;
  playerName?: string;
  size?: "sm" | "md" | "lg";
  showSummary?: boolean;
  showSecondary?: boolean;
  className?: string;
}

// Icon mapping for profile types
function getProfileIcon(key: string) {
  if (key.includes("decisive") || key.includes("efficient")) {
    return <Target className="h-3.5 w-3.5" />;
  }
  if (key.includes("defensive")) {
    return <Shield className="h-3.5 w-3.5" />;
  }
  if (key.includes("participative") || key.includes("impact")) {
    return <TrendingUp className="h-3.5 w-3.5" />;
  }
  if (key.includes("risk") || key.includes("unproductive")) {
    return <AlertTriangle className="h-3.5 w-3.5" />;
  }
  if (key.includes("low_general")) {
    return <Minus className="h-3.5 w-3.5" />;
  }
  return <Activity className="h-3.5 w-3.5" />;
}

export function MatchProfileBadge({
  profile,
  playerName = "Jogador",
  size = "md",
  showSummary = true,
  showSecondary = true,
  className,
}: MatchProfileBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center font-medium border transition-colors",
        profile.primary.bgColor,
        profile.primary.color,
        sizeClasses[size],
        className
      )}
    >
      {getProfileIcon(profile.primary.key)}
      <span>{profile.primary.label}</span>
    </Badge>
  );

  if (!showSummary) {
    return badge;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-pointer group">
          {badge}
          <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              {getProfileIcon(profile.primary.key)}
              Perfil do Jogo
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">{playerName}</p>
          </div>
          
          {/* Primary Profile */}
          <div className={cn(
            "p-3 rounded-lg border",
            profile.primary.bgColor
          )}>
            <div className="flex items-center gap-2 mb-1">
              {getProfileIcon(profile.primary.key)}
              <span className={cn("text-sm font-semibold", profile.primary.color)}>
                {profile.primary.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.primary.description}
            </p>
          </div>
          
          {/* Secondary Profile */}
          {showSecondary && profile.secondary && (
            <div className={cn(
              "p-2 rounded-lg border",
              profile.secondary.bgColor
            )}>
              <div className="flex items-center gap-1.5">
                {getProfileIcon(profile.secondary.key)}
                <span className={cn("text-xs font-medium", profile.secondary.color)}>
                  {profile.secondary.label}
                </span>
              </div>
            </div>
          )}
          
          {/* Summary */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {profile.summary}
            </p>
          </div>
          
          {/* Footer note */}
          <p className="text-[10px] text-muted-foreground/70 italic">
            Perfil calculado com base em regras objetivas de scouting.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline text version for lists and compact displays
 */
export function MatchProfileText({
  profile,
  showIcon = true,
  className,
}: {
  profile: MatchProfileResult;
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-1 text-xs cursor-help",
            profile.primary.color,
            className
          )}>
            {showIcon && getProfileIcon(profile.primary.key)}
            <span>{profile.primary.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{profile.summary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
