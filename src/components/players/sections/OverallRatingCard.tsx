import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { RatingBreakdownModal } from "@/components/players/RatingBreakdownModal";

interface RatingDetails {
  calculated_at: string;
  season_year: number;
  position_group: string;
  weights: {
    competition: number;
    production: number;
    defensive: number;
    discipline: number;
    age: number;
  };
  scores: {
    competition_level: number;
    production: number;
    defensive_actions: number;
    discipline: number;
    age_potential: number;
    overall_0_100: number;
    rating_0_5: number;
  };
  metrics: {
    total_matches: number;
    total_minutes: number;
    max_competition_coefficient: number;
    goals_per_90: number;
    assists_per_90: number;
    tackles_per_90: number;
    interceptions_per_90: number;
    recoveries_per_90: number;
    cards_per_90: number;
  };
  per_competition: Array<{
    competition_id: string;
    competition_name: string;
    final_coefficient: number;
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    goals_per_90: number;
    assists_per_90: number;
  }>;
  reliability: "low" | "medium" | "high";
}

interface OverallRatingCardProps {
  autoRating: number | null;
  overallRating: number | null;
  potentialRating: number | null;
  ratingUpdatedAt: string | null;
  ratingDetails?: RatingDetails | null;
}

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return "text-emerald-400";
  if (rating >= 3.0) return "text-primary";
  if (rating >= 2.0) return "text-amber-400";
  return "text-destructive";
}

function getRatingBgColor(rating: number): string {
  if (rating >= 4.0) return "bg-emerald-500/10";
  if (rating >= 3.0) return "bg-primary/10";
  if (rating >= 2.0) return "bg-amber-500/10";
  return "bg-destructive/10";
}

function getRatingLabel(rating: number): string {
  if (rating >= 4.5) return "Excelente";
  if (rating >= 4.0) return "Muito Bom";
  if (rating >= 3.0) return "Bom";
  if (rating >= 2.0) return "Regular";
  return "Em Desenvolvimento";
}

export function OverallRatingCard({
  autoRating,
  overallRating,
  potentialRating,
  ratingUpdatedAt,
  ratingDetails,
}: OverallRatingCardProps) {
  const displayRating = autoRating ?? overallRating;
  
  const formattedDate = ratingUpdatedAt
    ? new Date(ratingUpdatedAt).toLocaleDateString("pt-BR")
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-5 h-5 text-primary" />
            Avaliação Geral
          </CardTitle>
          {autoRating !== null && ratingDetails && (
            <RatingBreakdownModal
              details={ratingDetails}
              rating={autoRating}
              trigger={
                <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  <Info className="w-3 h-3" />
                  Como é calculada?
                </button>
              }
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Main Rating */}
          {displayRating !== null ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center w-20 h-20 rounded-xl",
                getRatingBgColor(displayRating)
              )}
            >
              <span className={cn("text-3xl font-bold", getRatingColor(displayRating))}>
                {displayRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/5.0</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-secondary/30">
              <span className="text-sm text-muted-foreground">N/A</span>
            </div>
          )}

          {/* Rating Details */}
          <div className="flex-1 space-y-2">
            {displayRating !== null && (
              <Badge className={cn("text-xs", getRatingBgColor(displayRating), getRatingColor(displayRating))}>
                {getRatingLabel(displayRating)}
              </Badge>
            )}

            {/* Stars */}
            {displayRating !== null && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const fillLevel = Math.min(1, Math.max(0, displayRating - i));
                  return (
                    <div key={i} className="relative w-4 h-4">
                      <Star className="w-4 h-4 text-muted-foreground/30 absolute" />
                      {fillLevel > 0 && (
                        <div
                          className="overflow-hidden absolute"
                          style={{ width: `${fillLevel * 100}%` }}
                        >
                          <Star className={cn("w-4 h-4 fill-current", getRatingColor(displayRating))} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Potential */}
            {potentialRating !== null && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Potencial:</span>
                <span className="font-medium text-amber-400">{potentialRating.toFixed(1)}</span>
              </div>
            )}

            {/* Scout Rating if different from auto */}
            {overallRating !== null && autoRating !== null && overallRating !== autoRating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Scout:</span>
                <span className="font-medium">{overallRating.toFixed(1)}</span>
              </div>
            )}

            {formattedDate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Atualizado em {formattedDate}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
