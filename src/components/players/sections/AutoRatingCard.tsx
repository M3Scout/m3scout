import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoRatingCardProps {
  rating: number | null;
  updatedAt: string | null;
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

export function AutoRatingCard({ rating, updatedAt }: AutoRatingCardProps) {
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5" />
          Nota Automática
        </CardTitle>
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
                {rating.toFixed(1)}
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
