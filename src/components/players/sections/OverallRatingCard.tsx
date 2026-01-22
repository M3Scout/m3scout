import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, Clock, Info, RefreshCw, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";
import { SafeRatingBreakdownModalV2 } from "@/components/players/SafeRatingBreakdownModalV2";
import { adaptAutoRatingDetailsToV2 } from "@/lib/autoRatingDetailsAdapter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OverallRatingCardProps {
  autoRating: number | null;
  overallRating: number | null;
  potentialRating: number | null;
  ratingUpdatedAt: string | null;
  ratingDetails?: unknown;
  playerId?: string;
  playerPosition?: string;
  isAdmin?: boolean;
  onRatingRecalculated?: () => void;
}

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return "text-emerald-400/90";
  if (rating >= 3.0) return "text-primary";
  if (rating >= 2.0) return "text-amber-400/90";
  return "text-rose-400/90";
}

function getRatingBgGradient(rating: number): string {
  if (rating >= 4.0) return "from-emerald-500/[0.08] to-emerald-500/[0.02]";
  if (rating >= 3.0) return "from-primary/[0.08] to-primary/[0.02]";
  if (rating >= 2.0) return "from-amber-500/[0.08] to-amber-500/[0.02]";
  return "from-rose-500/[0.08] to-rose-500/[0.02]";
}

function getRatingBorderColor(rating: number): string {
  if (rating >= 4.0) return "border-emerald-500/20";
  if (rating >= 3.0) return "border-primary/20";
  if (rating >= 2.0) return "border-amber-500/20";
  return "border-rose-500/20";
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
  playerId,
  playerPosition,
  isAdmin,
  onRatingRecalculated,
}: OverallRatingCardProps) {
  const [recalculating, setRecalculating] = useState(false);
  const displayRating = autoRating ?? overallRating;
  const breakdownDetails = adaptAutoRatingDetailsToV2(ratingDetails);

  const formattedDate = ratingUpdatedAt
    ? new Date(ratingUpdatedAt).toLocaleDateString("pt-BR")
    : null;

  const handleRecalculate = async () => {
    if (!playerId) return;

    setRecalculating(true);
    try {
      const { error } = await supabase.rpc("update_player_auto_rating", {
        p_player_id: playerId,
      });

      if (error) throw error;

      toast.success("Nota recalculada com sucesso!");
      onRatingRecalculated?.();
    } catch (error) {
      console.error("Error recalculating rating:", error);
      toast.error("Erro ao recalcular nota");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Avaliação Geral
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAdmin && playerId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRecalculate}
                disabled={recalculating}
                className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                {recalculating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span className="ml-1 hidden sm:inline">Recalcular</span>
              </Button>
            )}
            {autoRating !== null && breakdownDetails && playerId && (
              <SafeRatingBreakdownModalV2
                details={breakdownDetails}
                rating={autoRating}
                playerId={playerId}
                playerPosition={playerPosition}
                isAdmin={isAdmin}
                onRecalculated={onRatingRecalculated}
                trigger={
                  <button className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors uppercase tracking-wider">
                    <Info className="w-3 h-3" />
                    Detalhes
                  </button>
                }
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-5">
          {/* Main Rating - Primary Focus */}
          {displayRating !== null ? (
            <div
              className={cn(
                "relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl",
                "bg-gradient-to-br border backdrop-blur-sm",
                "transition-all duration-200",
                getRatingBgGradient(displayRating),
                getRatingBorderColor(displayRating)
              )}
            >
              {/* Glow effect */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-50 blur-xl",
                displayRating >= 4.0 ? "bg-emerald-500/10" :
                displayRating >= 3.0 ? "bg-primary/10" :
                displayRating >= 2.0 ? "bg-amber-500/10" :
                "bg-rose-500/10"
              )} />
              <span className={cn("text-4xl font-bold tracking-tight relative z-10", getRatingColor(displayRating))}>
                {formatFixed(displayRating, 1)}
              </span>
              <span className="text-[10px] text-zinc-600 font-medium relative z-10">/5.0</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-zinc-900/50 border border-zinc-800/40">
              <span className="text-sm text-zinc-600">N/A</span>
            </div>
          )}

          {/* Rating Details */}
          <div className="flex-1 space-y-3">
            {/* Status Badge - Executive style */}
            {displayRating !== null && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-medium uppercase tracking-wide backdrop-blur-sm border",
                  displayRating >= 4.0 ? "bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20" :
                  displayRating >= 3.0 ? "bg-primary/[0.08] text-primary border-primary/20" :
                  displayRating >= 2.0 ? "bg-amber-500/[0.08] text-amber-400/90 border-amber-500/20" :
                  "bg-rose-500/[0.08] text-rose-400/90 border-rose-500/20"
                )}
              >
                {getRatingLabel(displayRating)}
              </Badge>
            )}

            {/* Stars - Secondary role, subtle */}
            {displayRating !== null && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const fillLevel = Math.min(1, Math.max(0, displayRating - i));
                  return (
                    <div key={i} className="relative w-3.5 h-3.5">
                      <Star className="w-3.5 h-3.5 text-zinc-800 absolute" />
                      {fillLevel > 0 && (
                        <div
                          className="overflow-hidden absolute"
                          style={{ width: `${fillLevel * 100}%` }}
                        >
                          <Star className={cn("w-3.5 h-3.5 fill-current", getRatingColor(displayRating))} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Secondary Indicators - Organized and discrete */}
            <div className="space-y-1.5 pt-1">
              {/* Potential */}
              {potentialRating !== null && (
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-amber-500/70" />
                  <span className="text-zinc-600">Potencial</span>
                  <span className="font-semibold text-amber-400/90">{formatFixed(potentialRating, 1)}</span>
                </div>
              )}

              {/* Scout Rating if different from auto */}
              {overallRating !== null && autoRating !== null && overallRating !== autoRating && (
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-600">Scout</span>
                  <span className="font-semibold text-zinc-400">{formatFixed(overallRating, 1)}</span>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 pt-1">
                  <Clock className="w-3 h-3" />
                  <span>Atualizado em {formattedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
