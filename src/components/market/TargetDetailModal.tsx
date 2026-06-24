import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit, Plus, Trash2, Sparkles, TrendingUp, TrendingDown, Minus,
  Calendar, Clock, AlertTriangle, ExternalLink, User, Star,
  Video, FileText, Building2, Trophy, CalendarCheck, Briefcase,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Design helpers ───────────────────────────────────────────────────────────

const ACCENT   = "#ec4525";
const MUTED    = "#62616a";
const FG       = "#ededee";
const BG_CARD  = "rgba(255,255,255,0.03)";
const BDR      = "rgba(255,255,255,0.07)";

function getScoreTier(score: number) {
  if (score >= 85) return { label: "Elite",  color: "#22c55e" };
  if (score >= 70) return { label: "Alto",   color: "#3b82f6" };
  if (score >= 50) return { label: "Médio",  color: "#f59e0b" };
  return             { label: "Baixo",  color: "#ef4444" };
}

const GRADE_CFG: Record<string, { label: string; color: string }> = {
  A: { label: "Contratar Imediatamente", color: "#22c55e" },
  B: { label: "Ótimo Potencial",         color: "#3b82f6" },
  C: { label: "Continuar Observando",    color: "#f59e0b" },
  D: { label: "Descartado",             color: "#ef4444" },
};

const AGENCY_LABELS: Record<string, string> = {
  free:          "Livre (sem representação)",
  known_agency:  "Agência Conhecida",
  unknown:       "Desconhecido",
};

const STATUS_LABELS: Record<string, string> = {
  MONITORING:  "Monitorando",
  APPROACH:    "Abordagem",
  NEGOTIATION: "Negociação",
  DROPPED:     "Descartado",
  SIGNED:      "Contratado",
};

// ─── Sub-atoms ────────────────────────────────────────────────────────────────

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] tracking-[0.14em] uppercase", className)}>
      {children}
    </span>
  );
}

function InfoRow({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-none" style={{ color: MUTED }} />
      <span className="text-[13px]" style={{ color: FG }}>{value}</span>
    </div>
  );
}

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg" style={{ background: BG_CARD, border: `1px solid ${BDR}` }}>
      <Mono className="text-[#62616a]">{label}</Mono>
      <span className="text-[13px] font-medium" style={{ color: FG }}>{value}</span>
    </div>
  );
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-[12px]" style={{ color: MUTED }}>—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const fill = value >= s ? "full" : value >= s - 0.5 ? "half" : "empty";
        return (
          <div key={s} className="relative w-3.5 h-3.5">
            <Star className="absolute inset-0 w-3.5 h-3.5 text-zinc-700" />
            {fill === "full" && <Star className="absolute inset-0 w-3.5 h-3.5 fill-[#ec4525] text-[#ec4525]" />}
            {fill === "half" && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star className="w-3.5 h-3.5 fill-[#ec4525] text-[#ec4525]" />
              </div>
            )}
          </div>
        );
      })}
      <span className="ml-1 font-mono text-[11px]" style={{ color: ACCENT }}>
        {value % 1 === 0 ? value : value.toFixed(1)}
      </span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <Mono className="w-28 shrink-0" style={{ color: MUTED } as React.CSSProperties}>{label}</Mono>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${ACCENT}, #ff6b47)` }}
        />
      </div>
      <span className="font-mono text-[11px] w-6 text-right" style={{ color: FG }}>{value.toFixed(0)}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: BDR }} />
      <Mono style={{ color: MUTED } as React.CSSProperties}>{children}</Mono>
      <div className="h-px flex-1" style={{ background: BDR }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TargetDetailModal({ open, onOpenChange, target, onEdit, onSuccess }: TargetDetailModalProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingObsId, setDeletingObsId] = useState<string | null>(null);

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
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteObs = async (obsId: string) => {
    if (!confirm("Excluir esta observação?")) return;
    setDeletingObsId(obsId);
    try {
      const { error } = await supabase.from("target_observations").delete().eq("id", obsId);
      if (error) throw error;
      toast({ title: "Observação excluída" });
      queryClient.invalidateQueries({ queryKey: ["target-observations", target?.id] });
      recalculate("Observação removida");
      onSuccess?.();
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeletingObsId(null);
    }
  };

  const handleObservationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["target-observations", target?.id] });
    setObservationModalOpen(false);
    recalculate("Nova observação adicionada");
    onSuccess?.();
  };

  if (!target) return null;

  const t = target as any;
  const hasScore   = target.market_score !== null;
  const scoreTier  = hasScore ? getScoreTier(target.market_score!.score_total) : null;
  const grade      = t.recommendation_grade as string | undefined;
  const gradeCfg   = grade ? GRADE_CFG[grade] : null;
  const tags: string[] = Array.from(new Set([...(target.tags || []), ...(t.notable_characteristics || [])]));

  const pillars = [
    { label: "Físico",   sub: "Força · Velocidade · Stamina",    value: t.score_physical   ?? null },
    { label: "Técnico",  sub: "Passe · Domínio · Finalização",   value: t.score_technical  ?? null },
    { label: "Tático",   sub: "Posicionamento · Leitura",         value: t.score_tactical   ?? null },
    { label: "Mental",   sub: "Liderança · Frieza · Pressão",    value: t.score_mental     ?? null },
  ];

  const avgPillar = (() => {
    const vals = pillars.map(p => p.value).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="p-0 overflow-hidden"
          style={{
            maxWidth: "min(900px, 95vw)",
            maxHeight: "90vh",
            background: "#0a0a0d",
            border: `1px solid ${BDR}`,
          }}
        >
          {/* ── HEADER BANNER ─────────────────────────────────────────── */}
          <div
            className="relative pl-6 pr-14 pt-6 pb-5"
            style={{ background: "linear-gradient(135deg, #0f0d14 0%, #12101a 100%)", borderBottom: `1px solid ${BDR}` }}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-none" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BDR}` }}>
                {target.photo_url ? (
                  <img
                    src={getOptimizedImageUrl(target.photo_url, { width: 200, quality: 85, format: "avif" }) || target.photo_url}
                    alt={target.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-7 h-7" style={{ color: MUTED }} />
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-semibold text-[20px] leading-tight" style={{ color: FG }}>
                  {target.name}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono border" style={{ color: FG, borderColor: BDR, background: "rgba(255,255,255,0.04)" }}>
                    {target.position}
                  </span>
                  {t.tactical_function && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono" style={{ color: MUTED, background: "rgba(255,255,255,0.03)", border: `1px solid ${BDR}` }}>
                      {t.tactical_function}
                    </span>
                  )}
                  {(target.age_estimate || target.birth_date) && (
                    <Mono style={{ color: MUTED } as React.CSSProperties}>
                      {target.age_estimate ?? new Date().getFullYear() - new Date(target.birth_date!).getFullYear()} anos
                    </Mono>
                  )}
                  {target.dominant_foot && (
                    <Mono style={{ color: MUTED } as React.CSSProperties}>
                      Pé {target.dominant_foot === "right" ? "Direito" : target.dominant_foot === "left" ? "Esquerdo" : "Ambidestro"}
                    </Mono>
                  )}
                </div>
              </div>

              {/* Grade + Status */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {gradeCfg && grade ? (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: `${gradeCfg.color}18`, border: `1px solid ${gradeCfg.color}40` }}
                  >
                    <span className="font-display font-bold text-[20px] leading-none" style={{ color: gradeCfg.color }}>
                      {grade}
                    </span>
                    <div>
                      <Mono style={{ color: gradeCfg.color } as React.CSSProperties}>Grau</Mono>
                      <p className="text-[10px] font-mono leading-tight mt-0.5" style={{ color: gradeCfg.color, opacity: 0.8 }}>
                        {gradeCfg.label}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BDR}` }}>
                    <Mono style={{ color: FG } as React.CSSProperties}>{STATUS_LABELS[target.status]}</Mono>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BODY: 2 COLUMNS ──────────────────────────────────────── */}
          <div
            className="grid overflow-auto"
            style={{ gridTemplateColumns: "1fr 1fr", maxHeight: "calc(90vh - 160px)" }}
          >
            {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ borderRight: `1px solid ${BDR}` }}>

              {/* Clube / Liga / Localização */}
              {(target.current_club || target.league_competition || t.contract_end_date || t.agency_situation || target.source) && (
                <div className="space-y-2">
                  <SectionLabel>Contexto de Mercado</SectionLabel>
                  <div className="space-y-1.5">
                    {target.current_club    && <InfoRow icon={Building2}    value={target.current_club} />}
                    {target.league_competition && <InfoRow icon={Trophy}    value={target.league_competition} />}
                    {t.contract_end_date    && (
                      <InfoRow icon={CalendarCheck} value={`Contrato até ${format(new Date(t.contract_end_date + "-01"), "MMM yyyy", { locale: ptBR })}`} />
                    )}
                    {t.agency_situation     && <InfoRow icon={Briefcase}   value={AGENCY_LABELS[t.agency_situation] ?? t.agency_situation} />}
                    {target.source          && <InfoRow icon={ExternalLink} value={`Origem: ${target.source}`} />}
                  </div>
                </div>
              )}

              {/* Dados físicos */}
              {(target.height || target.weight) && (
                <div className="grid grid-cols-2 gap-2">
                  {target.height && <DataPill label="Altura" value={`${target.height} cm`} />}
                  {target.weight && <DataPill label="Peso"   value={`${Number(target.weight)} kg`} />}
                </div>
              )}

              {/* Pilares de Avaliação */}
              {pillars.some(p => p.value !== null) && (
                <div className="space-y-2">
                  <SectionLabel>Matriz de Avaliação</SectionLabel>
                  <div className="space-y-2">
                    {pillars.map(p => (
                      <div
                        key={p.label}
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ background: BG_CARD, border: `1px solid ${BDR}` }}
                      >
                        <div>
                          <p className="text-[13px] font-medium leading-tight" style={{ color: FG }}>{p.label}</p>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: MUTED }}>{p.sub}</p>
                        </div>
                        <StarDisplay value={p.value} />
                      </div>
                    ))}
                  </div>
                  {avgPillar !== null && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${ACCENT}0d`, border: `1px solid ${ACCENT}25` }}>
                      <Mono style={{ color: MUTED } as React.CSSProperties}>Média</Mono>
                      <span className="font-display font-bold text-[16px]" style={{ color: ACCENT }}>{avgPillar.toFixed(1)}</span>
                      <Mono style={{ color: MUTED } as React.CSSProperties}>/ 5</Mono>
                    </div>
                  )}
                </div>
              )}

              {/* Características / Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <SectionLabel>Características</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[11px] font-mono border"
                        style={{ color: FG, borderColor: BDR, background: "rgba(255,255,255,0.04)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas do Scout */}
              {target.notes_internal && (
                <div className="space-y-2">
                  <SectionLabel>Notas do Scout</SectionLabel>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: BG_CARD, border: `1px solid ${BDR}` }}>
                    <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: MUTED }} />
                    <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "#9c9ba3" }}>{target.notes_internal}</p>
                  </div>
                </div>
              )}

              {/* Link de vídeo */}
              {target.highlight_video_url && (
                <a
                  href={target.highlight_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}
                >
                  <Video className="w-4 h-4" style={{ color: ACCENT }} />
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: ACCENT }}>Ver vídeo de destaque</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" style={{ color: ACCENT }} />
                </a>
              )}
            </div>

            {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto">

              {/* M3 Market Score */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                    <Mono style={{ color: MUTED } as React.CSSProperties}>M3 Market Score</Mono>
                  </div>
                  {!hasScore && (
                    <button
                      onClick={() => recalculate("Cálculo manual")}
                      disabled={isRecalculating}
                      className="font-mono text-[10px] tracking-wide px-2.5 py-1 rounded-md transition-colors hover:opacity-80 disabled:opacity-50"
                      style={{ color: ACCENT, background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}
                    >
                      {isRecalculating ? "Calculando..." : "Calcular"}
                    </button>
                  )}
                </div>

                {hasScore && scoreTier ? (
                  <>
                    {/* Score card */}
                    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${scoreTier.color}0f`, border: `1px solid ${scoreTier.color}30` }}>
                      <div className="flex flex-col items-center justify-center w-[68px] h-[68px] rounded-xl" style={{ background: `${scoreTier.color}18`, border: `2px solid ${scoreTier.color}50` }}>
                        <span className="font-display font-bold text-[28px] leading-none" style={{ color: scoreTier.color }}>
                          {target.market_score!.score_total.toFixed(0)}
                        </span>
                        <Mono style={{ color: scoreTier.color } as React.CSSProperties}>{scoreTier.label}</Mono>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {target.market_score!.trend_30d === "UP"   && <TrendingUp   className="w-4 h-4 text-emerald-400" />}
                          {target.market_score!.trend_30d === "DOWN" && <TrendingDown  className="w-4 h-4 text-red-400" />}
                          {target.market_score!.trend_30d === "STABLE" && <Minus       className="w-4 h-4" style={{ color: MUTED }} />}
                          <span className="text-[12px] font-mono" style={{ color: MUTED }}>Tendência 30d</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: target.market_score!.confidence_level >= 70 ? "#22c55e" : target.market_score!.confidence_level >= 50 ? "#f59e0b" : "#ef4444" }} />
                          <span className="text-[12px] font-mono" style={{ color: FG }}>
                            Confiança: <span className="font-semibold">{target.market_score!.confidence_level.toFixed(0)}%</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Low confidence */}
                    {target.market_score!.confidence_level < 50 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "#f59e0b10", border: "1px solid #f59e0b25" }}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] font-mono text-amber-400/80 leading-relaxed">
                          Confiança baixa — adicione mais observações para melhorar a precisão.
                        </p>
                      </div>
                    )}

                    {/* Breakdown */}
                    {breakdown && (
                      <div className="space-y-2.5 pt-1">
                        <Mono style={{ color: MUTED } as React.CSSProperties}>Composição</Mono>
                        {[
                          { label: "Idade & Janela", value: breakdown.scoreAgeWindow },
                          { label: "Performance",    value: breakdown.scorePerformanceImpact },
                          { label: "Contexto",       value: breakdown.scoreCompetitiveContext },
                          { label: "Consistência",   value: breakdown.scoreConsistencyReliability },
                          { label: "Perfil",         value: breakdown.scoreMarketProfile },
                        ].map(item => (
                          <ScoreBar key={item.label} label={item.label} value={item.value} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl text-center" style={{ background: BG_CARD, border: `1px dashed ${BDR}` }}>
                    <Sparkles className="w-6 h-6" style={{ color: MUTED }} />
                    <p className="text-[12px] font-mono" style={{ color: MUTED }}>Score não calculado</p>
                    <p className="text-[11px] font-mono" style={{ color: MUTED, opacity: 0.7 }}>Adicione observações para melhorar a precisão</p>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    <Mono style={{ color: MUTED } as React.CSSProperties}>Observações ({observations.length})</Mono>
                  </div>
                  <button
                    onClick={() => setObservationModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-[10px] tracking-wide transition-colors hover:opacity-80"
                    style={{ color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}25` }}
                  >
                    <Plus className="w-3 h-3" /> Nova
                  </button>
                </div>

                {observationsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
                    <Skeleton className="h-14 w-full rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>
                ) : observations.length === 0 ? (
                  <p className="text-center text-[11px] font-mono py-6" style={{ color: MUTED }}>
                    Nenhuma observação registrada.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {observations.map(obs => (
                      <div
                        key={obs.id}
                        className="group/obs p-3 rounded-lg space-y-1"
                        style={{ background: BG_CARD, border: `1px solid ${BDR}` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="w-3 h-3 flex-none" style={{ color: MUTED }} />
                            <Mono style={{ color: MUTED } as React.CSSProperties}>
                              {format(new Date(obs.observation_date), "dd MMM yyyy", { locale: ptBR })}
                              {obs.minutes_observed ? ` · ${obs.minutes_observed} min` : ""}
                            </Mono>
                          </div>
                          <div className="flex items-center gap-2 flex-none">
                            {obs.performance_rating && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ color: ACCENT, background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
                                {obs.performance_rating}/10
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteObs(obs.id)}
                              disabled={deletingObsId === obs.id}
                              className="opacity-0 group-hover/obs:opacity-100 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-red-500/15"
                              title="Excluir observação"
                            >
                              {deletingObsId === obs.id
                                ? <span className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "#ef4444" }} />
                                : <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                              }
                            </button>
                          </div>
                        </div>
                        {obs.match_context && (
                          <p className="text-[11px] font-mono" style={{ color: MUTED }}>{obs.match_context}</p>
                        )}
                        {obs.qualitative_notes && (
                          <p className="text-[12px] leading-relaxed" style={{ color: "#9c9ba3" }}>{obs.qualitative_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FOOTER ACTIONS ────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderTop: `1px solid ${BDR}`, background: "#0a0a0d" }}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="font-mono text-[11px] tracking-wide px-4 py-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: MUTED }}
            >
              Fechar
            </button>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="font-mono text-[11px] tracking-wide text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deleting ? "Excluindo..." : "Excluir"}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => onEdit?.(target)}
                className="font-mono text-[11px] tracking-wide"
                style={{ background: ACCENT, color: "#fff" }}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TargetObservationModal
        open={observationModalOpen}
        onOpenChange={setObservationModalOpen}
        targetId={target.id}
        onSuccess={handleObservationSuccess}
      />
    </>
  );
}
