import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Star, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  type RatingBreakdown,
  getReliabilityLabel,
  getReliabilityVariant,
  RATING_WEIGHTS,
} from "@/lib/playerRating";

interface PlayerRatingBadgeProps {
  rating: number;
  breakdown?: RatingBreakdown;
  showReliability?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PlayerRatingBadge({
  rating,
  breakdown,
  showReliability = true,
  size = "md",
}: PlayerRatingBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const starSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.0) return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
    if (rating >= 3.0) return "bg-blue-500/20 text-blue-600 border-blue-500/30";
    if (rating >= 2.0) return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    return "bg-red-500/20 text-red-600 border-red-500/30";
  };

  const reliabilityIcon = breakdown ? {
    low: <AlertCircle className="w-3 h-3" />,
    medium: <TrendingUp className="w-3 h-3" />,
    high: <CheckCircle2 className="w-3 h-3" />,
  }[breakdown.reliability] : null;

  const content = (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`${sizeClasses[size]} ${getRatingColor(rating)} font-semibold`}
      >
        <Star className={`${starSize[size]} mr-1 fill-current`} />
        {rating.toFixed(1)}/5
      </Badge>
      {showReliability && breakdown && (
        <Badge variant={getReliabilityVariant(breakdown.reliability)} className="text-xs">
          {reliabilityIcon}
          <span className="ml-1">{getReliabilityLabel(breakdown.reliability)}</span>
        </Badge>
      )}
    </div>
  );

  if (!breakdown) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold">Nota Automática</span>
              <span className="text-lg font-bold">{rating.toFixed(1)}/5</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Calculado por: idade + nível da competição + performance
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Nível Competição ({(RATING_WEIGHTS.competitionLevel * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{breakdown.competitionLevelScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Produção ({(RATING_WEIGHTS.production * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{breakdown.productionScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Ações Defensivas ({(RATING_WEIGHTS.defensiveActions * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{breakdown.defensiveActionsScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Disciplina ({(RATING_WEIGHTS.discipline * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{breakdown.disciplineScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Potencial Idade ({(RATING_WEIGHTS.agePotential * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{breakdown.agePotentialScore.toFixed(1)}</span>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall (0-100)</span>
              <span className="font-semibold">{breakdown.overall0_100.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {reliabilityIcon}
              <span>
                Confiabilidade: <strong>{getReliabilityLabel(breakdown.reliability)}</strong>
                {breakdown.reliability === "low" && " (poucos dados)"}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
