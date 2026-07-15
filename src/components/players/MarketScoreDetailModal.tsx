import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2, User } from "lucide-react";
import { useMarketScore } from "@/hooks/useMarketScore";
import { MarketScoreTrend } from "@/types/marketScore";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { toast } from "sonner";

// ── Design tokens (matches MarketAtivos.tsx) ────────────────────────────────────
const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

function getScoreColor(score: number): { hex: string; label: string } {
  if (score >= 85) return { hex: "#2DCE8A", label: "Elite" };
  if (score >= 70) return { hex: "#4ade80", label: "Alto" };
  if (score >= 50) return { hex: "#E8C84A", label: "Médio" };
  return { hex: "#e5173f", label: "Baixo" };
}

function TrendIcon({ trend }: { trend: MarketScoreTrend }) {
  if (trend === "UP") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === "DOWN") return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4" style={{ color: MUTED }} />;
}

interface MarketScoreDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  athleteName: string;
  position: string;
  age?: number | null;
  birthDate?: string | null;
  photoUrl?: string | null;
  currentClub?: string | null;
}

export function MarketScoreDetailModal({
  open, onOpenChange, athleteId, athleteName, position, age, birthDate, photoUrl, currentClub,
}: MarketScoreDetailModalProps) {
  const {
    displayScore, dataConfidence, breakdown, scoreLoading,
    recalculate, isRecalculating,
  } = useMarketScore({
    playerId: athleteId,
    playerName: athleteName,
    position,
    birthDate: birthDate ?? null,
    age: age ?? null,
    enabled: open,
  });

  const tier = displayScore !== null ? getScoreColor(displayScore) : null;
  const trend = breakdown?.trend30d ?? "FLAT";

  const pillars = breakdown ? [
    { label: "Idade & Janela",  value: breakdown.scoreAgeWindow,             reasoning: breakdown.ageWindowDetails.reasoning },
    { label: "Performance",     value: breakdown.scorePerformanceImpact,      reasoning: breakdown.performanceImpactDetails.reasoning },
    { label: "Contexto",        value: breakdown.scoreCompetitiveContext,     reasoning: breakdown.competitiveContextDetails.reasoning },
    { label: "Consistência",    value: breakdown.scoreConsistencyReliability, reasoning: breakdown.consistencyReliabilityDetails.reasoning },
    { label: "Perfil",          value: breakdown.scoreMarketProfile,          reasoning: breakdown.marketProfileDetails.reasoning },
  ] : [];

  const handleRecalculate = () => {
    recalculate("Recálculo manual")
      .then(() => toast.success("Market Score recalculado"))
      .catch((err) => {
        console.error("[MarketScore] Falha ao recalcular:", err);
        toast.error("Erro ao recalcular", { description: err?.message });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden max-h-[88vh] flex flex-col"
        style={{ maxWidth: 480, background: "#0a0a0d", border: `1px solid ${CARD_BORDER}` }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-none" style={{ background: "#111113", border: `1px solid ${CARD_BORDER}` }}>
              {photoUrl ? (
                <img
                  src={getOptimizedImageUrl(photoUrl, { width: 200, quality: 85, format: "avif" }) || photoUrl}
                  alt={athleteName}
                  className="w-full h-full object-cover object-[center_5%]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5" style={{ color: MUTED }} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-display font-semibold text-[15px] truncate" style={{ color: TEXT }}>
                {athleteName}
              </DialogTitle>
              <p className="font-editorial-mono text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>
                {[position, age ? `${age}a` : null, currentClub].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Score + Confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
              <span className="font-editorial-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>M3 Market Score</span>
            </div>
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="font-editorial-mono text-[9px] tracking-wide px-2.5 py-1 rounded-md transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ color: ACCENT, background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}
            >
              {isRecalculating ? "Calculando..." : displayScore !== null ? "Recalcular" : "Calcular"}
            </button>
          </div>

          {scoreLoading ? (
            <p className="font-editorial-mono text-[11px] text-center py-6" style={{ color: MUTED }}>Carregando...</p>
          ) : displayScore === null ? (
            <p className="font-editorial-mono text-[11px] text-center py-6" style={{ color: MUTED }}>
              Sem score calculado ainda. Clique em "Calcular" acima.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${tier!.hex}0f`, border: `1px solid ${tier!.hex}30` }}>
                <div className="flex flex-col items-center justify-center w-[68px] h-[68px] rounded-xl flex-none" style={{ background: `${tier!.hex}18`, border: `2px solid ${tier!.hex}50` }}>
                  <span className="font-display font-bold text-[28px] leading-none" style={{ color: tier!.hex }}>
                    {displayScore.toFixed(0)}
                  </span>
                  <span className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: tier!.hex }}>{tier!.label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendIcon trend={trend} />
                    <span className="text-[12px] font-editorial-mono" style={{ color: MUTED }}>Tendência 30d</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: dataConfidence >= 70 ? "#22c55e" : dataConfidence >= 50 ? "#f59e0b" : "#ef4444" }} />
                    <span className="text-[12px] font-editorial-mono" style={{ color: TEXT }}>
                      Confiança: <span className="font-semibold">{dataConfidence.toFixed(0)}%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Pillars */}
              <div className="space-y-4 pt-1">
                <span className="font-editorial-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Composição</span>
                {pillars.map(pillar => {
                  const pc = getScoreColor(pillar.value);
                  return (
                    <div key={pillar.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-editorial-mono text-[11px]" style={{ color: TEXT }}>{pillar.label}</span>
                        <span className="font-editorial-mono text-[12px] font-bold tabular-nums" style={{ color: pc.hex }}>{pillar.value.toFixed(0)}</span>
                      </div>
                      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pillar.value}%`, background: pc.hex }} />
                      </div>
                      <p className="font-editorial-mono text-[10.5px] leading-snug" style={{ color: MUTED }}>
                        {pillar.reasoning}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
