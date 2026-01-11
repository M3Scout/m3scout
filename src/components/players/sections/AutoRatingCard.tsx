import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";
import { RatingBreakdownModalV2 } from "@/components/players/RatingBreakdownModalV2";
import { adaptAutoRatingDetailsToV2 } from "@/lib/autoRatingDetailsAdapter";

interface AutoRatingCardProps {
  rating: number | null;
  updatedAt: string | null;
  details?: unknown;
}

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return "text-emerald-500";
  if (rating >= 3.0) return "text-primary";
  if (rating >= 2.0) return "text-amber-500";
  return "text-destructive";
}

function getRatingBgColor(rating: number): string {
  if (rating >= 4.0) return "bg-emerald-500/10";
  if (rating >= 3.0) return "bg-primary/10";
  if (rating >= 2.0) return "bg-amber-500/10";
  return "bg-destructive/10";
}

export function AutoRatingCard({ rating, updatedAt, details }: AutoRatingCardProps) {
  const breakdownDetails = adaptAutoRatingDetailsToV2(details);

  if (rating === null || rating === undefined) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-5 h-5" />
            Nota Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">
              Sem dados suficientes para calcular
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione estatísticas da temporada atual
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-5 h-5" />
            Nota Automática
          </CardTitle>
          {breakdownDetails && (
            <RatingBreakdownModalV2
              details={breakdownDetails}
              rating={rating}
              trigger={
                <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                  <Info className="w-3 h-3" />
                  Detalhes
                </button>
              }
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Rating Display */}
          <div
            className={cn(
              "flex items-center justify-center w-20 h-20 rounded-xl",
              getRatingBgColor(rating)
            )}
          >
            <div className="text-center">
              <span
                className={cn(
                  "text-3xl font-bold",
                  getRatingColor(rating)
                )}
              >
                {formatFixed(rating, 1)}
              </span>
              <p className="text-xs text-muted-foreground">/5.0</p>
            </div>
          </div>

          {/* Stars */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const fillLevel = Math.min(1, Math.max(0, rating - i));
                return (
                  <div key={i} className="relative w-5 h-5">
                    {/* Empty star */}
                    <Star className="w-5 h-5 text-muted-foreground/30 absolute" />
                    {/* Filled star */}
                    {fillLevel > 0 && (
                      <div
                        className="overflow-hidden absolute"
                        style={{ width: `${fillLevel * 100}%` }}
                      >
                        <Star
                          className={cn("w-5 h-5 fill-current", getRatingColor(rating))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {formattedDate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Atualizada em: {formattedDate}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
