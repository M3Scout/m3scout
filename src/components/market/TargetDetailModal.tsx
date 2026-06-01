/**
 * Target Detail Modal
 * 
 * Shows target details, Market Score, and observations
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  AlertTriangle,
  ExternalLink,
  User,
  MapPin,
  Target as TargetIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, TargetObservation, MarketScoreTrend } from "@/types/marketScore";
import { TargetObservationModal } from "./TargetObservationModal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/authContext";
import { useTargetMarketScore } from "@/hooks/useTargetMarketScore";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface TargetWithScore extends Target {
  market_score: {
    score_total: number;
    confidence_level: number;
    trend_30d: MarketScoreTrend;
  } | null;
}

interface TargetDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TargetWithScore | null;
  onEdit?: (target: TargetWithScore) => void;
  onSuccess?: () => void;
}

function getScoreColor(score: number) {
  if (score >= 85) return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50", label: "Elite" };
  if (score >= 70) return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50", label: "Alto" };
  if (score >= 50) return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50", label: "Médio" };
  return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50", label: "Baixo" };
}

function TrendIcon({ trend }: { trend: MarketScoreTrend }) {
  if (trend === "UP") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === "DOWN") return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

const STATUS_LABELS: Record<string, string> = {
  MONITORING: "Monitorando",
  APPROACH: "Abordagem",
  NEGOTIATION: "Negociação",
  DROPPED: "Descartado",
  SIGNED: "Contratado",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function TargetDetailModal({
  open,
  onOpenChange,
  target,
  onEdit,
  onSuccess,
}: TargetDetailModalProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch observations
  const { data: observations = [], isLoading: observationsLoading } = useQuery({
    queryKey: ["target-observations", target?.id],
    queryFn: async () => {
      if (!target) return [];
      const { data, error } = await supabase
        .from("target_observations")
        .select("*")
        .eq("target_id", target.id)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      return data as TargetObservation[];
    },
    enabled: !!target && open,
  });

  // Market Score data
  const { breakdown, recalculate, isRecalculating } = useTargetMarketScore({
    targetId: target?.id ?? "",
    enabled: !!target && open,
  });

  const handleDelete = async () => {
    if (!target || !isAdmin) return;
    
    if (!confirm("Tem certeza que deseja excluir este target?")) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("targets").delete().eq("id", target.id);
      if (error) throw error;
      toast({ title: "Target excluído" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting target:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleObservationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["target-observations", target?.id] });
    setObservationModalOpen(false);
    // Recalculate score after new observation
    recalculate("Nova observação adicionada");
    onSuccess?.();
  };

  if (!target) return null;

  const hasScore = target.market_score !== null;
  const scoreColor = hasScore ? getScoreColor(target.market_score!.score_total) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-hidden"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <TargetIcon className="w-5 h-5 text-primary" />
              Detalhes do Target
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 pr-2" style={{ overflowY: 'auto' }}>
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center">
                  {target.photo_url ? (
                    <img src={getOptimizedImageUrl(target.photo_url, { width: 400, quality: 85, format: "avif" }) || target.photo_url || ""} alt={target.name} className="w-full h-full object-contain object-center" width={400} height={400} loading="lazy" decoding="async" onError={e => { if (target.photo_url) (e.target as HTMLImageElement).src = target.photo_url; }} />
                  ) : (
                    <User className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{target.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{target.position}</Badge>
                    {(target.age_estimate || target.birth_date) && (
                      <span className="text-sm text-muted-foreground">
                        {target.age_estimate ?? new Date().getFullYear() - new Date(target.birth_date!).getFullYear()} anos
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{STATUS_LABELS[target.status]}</Badge>
                    <Badge variant="outline" className={PRIORITY_COLORS[target.priority]}>
                      {target.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Location/Club Info */}
              {(target.current_club || target.league_competition || target.city) && (
                <div className="space-y-1 text-sm">
                  {target.current_club && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      {target.current_club}
                    </p>
                  )}
                  {target.league_competition && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <TargetIcon className="w-3.5 h-3.5" />
                      {target.league_competition}
                    </p>
                  )}
                  {(target.city || target.state || target.country) && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {[target.city, target.state, target.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* Tags */}
              {target.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {target.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              {/* Market Score Card */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  M3 Market Score (TARGET)
                </h4>

                {hasScore ? (
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2",
                        scoreColor?.bg,
                        scoreColor?.border
                      )}
                    >
                      <span className={cn("text-2xl font-bold", scoreColor?.text)}>
                        {target.market_score!.score_total.toFixed(0)}
                      </span>
                      <span className={cn("text-[9px] font-medium uppercase", scoreColor?.text)}>
                        {scoreColor?.label}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={target.market_score!.trend_30d} />
                        <span className="text-sm text-muted-foreground">Tendência 30d</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <span className="text-sm">
                          Confiança: <span className="font-medium">{target.market_score!.confidence_level.toFixed(0)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-dashed border-zinc-700">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Score não calculado</p>
                      <p className="text-xs text-muted-foreground">Adicione observações para melhorar a precisão.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => recalculate("Cálculo manual")} disabled={isRecalculating}>
                      Calcular
                    </Button>
                  </div>
                )}

                {/* Low confidence warning */}
                {hasScore && target.market_score!.confidence_level < 50 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400/90">
                      Confiança baixa — baseado em dados parciais. Adicione mais observações.
                    </p>
                  </div>
                )}

                {/* Breakdown */}
                {breakdown && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground">Composição do score:</p>
                    {[
                      { label: "Idade & Janela", value: breakdown.scoreAgeWindow },
                      { label: "Performance", value: breakdown.scorePerformanceImpact },
                      { label: "Contexto", value: breakdown.scoreCompetitiveContext },
                      { label: "Consistência", value: breakdown.scoreConsistencyReliability },
                      { label: "Perfil", value: breakdown.scoreMarketProfile },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{item.value.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Observations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Observações ({observations.length})
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setObservationModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nova
                  </Button>
                </div>

                {observationsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : observations.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhuma observação registrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {observations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3 rounded-lg bg-secondary/30 border border-zinc-800/50"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(obs.observation_date), "dd MMM yyyy", { locale: ptBR })}
                            {obs.minutes_observed && (
                              <span>• {obs.minutes_observed} min</span>
                            )}
                          </p>
                          {obs.performance_rating && (
                            <Badge variant="outline" className="text-[10px]">
                              Nota: {obs.performance_rating}/10
                            </Badge>
                          )}
                        </div>
                        {obs.match_context && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {obs.match_context}
                          </p>
                        )}
                        {obs.qualitative_notes && (
                          <p className="text-sm">{obs.qualitative_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {target.notes_internal && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Notas internas</h4>
                    <p className="text-sm text-muted-foreground">{target.notes_internal}</p>
                  </div>
                </>
              )}

              {/* Video */}
              {target.highlight_video_url && (
                <>
                  <Separator />
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={target.highlight_video_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver vídeo de destaque
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              )}
              <Button size="sm" onClick={() => onEdit?.(target)}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Observation Modal */}
      <TargetObservationModal
        open={observationModalOpen}
        onOpenChange={setObservationModalOpen}
        targetId={target.id}
        onSuccess={handleObservationSuccess}
      />
    </>
  );
}
