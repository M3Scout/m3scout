import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverallRatingCardProps {
  autoRating: number | null;
  overallRating: number | null;
  potentialRating: number | null;
  ratingUpdatedAt: string | null;
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
}: OverallRatingCardProps) {
  const displayRating = autoRating ?? overallRating;
  
  const formattedDate = ratingUpdatedAt
    ? new Date(ratingUpdatedAt).toLocaleDateString("pt-BR")
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5 text-primary" />
          Avaliação Geral
        </CardTitle>
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
