import { useState, useMemo, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
  FileText,
  History,
  AlertTriangle,
  BarChart3,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useMarketScore } from "@/hooks/useMarketScore";
import { MarketScoreBreakdown, MarketScoreTrend } from "@/types/marketScore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MarketScoreHistoryModal } from "./MarketScoreHistoryModal";
import { MarketScoreNotesModal } from "./MarketScoreNotesModal";
import { cn } from "@/lib/utils";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";

interface MarketScoreCardProps {
  athleteId: string;
  athleteName: string;
  position: string;
  secondaryPositions?: string[];
  birthDate?: string | null;
  age?: number | null;
}

// ── Score color palette ────────────────────────────────────────────────────────
function getScoreStyle(score: number): { color: string; label: string; bg: string } {
  if (score >= 85) return { color: "#06b6d4", label: "Elite",  bg: "rgba(6,182,212,0.12)"  };
  if (score >= 70) return { color: "#22c55e", label: "Alto",   bg: "rgba(34,197,94,0.12)"  };
  if (score >= 50) return { color: "#f59e0b", label: "Médio",  bg: "rgba(245,158,11,0.12)" };
  return             { color: "#ef4444",  label: "Baixo",  bg: "rgba(239,68,68,0.12)"  };
}

// ── Trend icon ─────────────────────────────────────────────────────────────────
function TrendIcon({ trend, size = 12 }: { trend: MarketScoreTrend; size?: number }) {
  const s = { width: size, height: size };
  if (trend === "UP")   return <TrendingUp  style={{ ...s, color: "#22c55e" }} />;
  if (trend === "DOWN") return <TrendingDown style={{ ...s, color: "#ef4444" }} />;
  return <Minus style={{ ...s, color: MUTED }} />;
}

// ── Pillar progress row ────────────────────────────────────────────────────────
function PillarRow({ label, score }: { label: string; score: number }) {
  const { color } = getScoreStyle(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-editorial-mono text-[10.5px] tracking-[0.04em]" style={{ color: MUTED }}>
          {label}
        </span>
        <span className="font-editorial-mono text-[11px] font-bold tabular-nums" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Utility functions (unchanged logic) ───────────────────────────────────────
function calculateBaseScore(breakdown: MarketScoreBreakdown | null): number | null {
  if (!breakdown) return null;
  const { consistencyReliabilityDetails, weightsUsed } = breakdown;
  const samplePenalty = consistencyReliabilityDetails.samplePenalty;
  if (samplePenalty >= 1.0) return null;
  const actualConsistencyScore = breakdown.scoreConsistencyReliability;
  const baseConsistencyScore = Math.min(100, actualConsistencyScore / samplePenalty);
  const baseScore = Math.round(
    breakdown.scoreAgeWindow * weightsUsed.ageWindow +
    breakdown.scorePerformanceImpact * weightsUsed.performanceImpact +
    breakdown.scoreCompetitiveContext * weightsUsed.competitiveContext +
    baseConsistencyScore * weightsUsed.consistencyReliability +
    breakdown.scoreMarketProfile * weightsUsed.marketProfile,
  );
  return Math.min(100, baseScore);
}

function getConfidenceExplanation(breakdown: MarketScoreBreakdown | null): string {
  if (!breakdown) return "";
  const { consistencyReliabilityDetails, performanceImpactDetails } = breakdown;
  const matches      = consistencyReliabilityDetails.totalMatches;
  const samplePenalty = consistencyReliabilityDetails.samplePenalty;
  const ratingVariance = consistencyReliabilityDetails.ratingVariance;
  const reasons: string[] = [];
  if (matches < 3) reasons.push(`poucos jogos analisados (${matches})`);
  else if (matches < 5) reasons.push(`amostra moderada (${matches} jogos)`);
  if (ratingVariance !== null && ratingVariance > 1.0) reasons.push("alta variação de notas");
  if (performanceImpactDetails.averageRating === null) reasons.push("sem notas de jogo registradas");
  if (consistencyReliabilityDetails.matchesLast30Days === 0) reasons.push("sem jogos nos últimos 30 dias");
  if (reasons.length === 0) return "Dados suficientes para análise confiável.";
  return `Ajuste aplicado por: ${reasons.join(", ")}.`;
}

function generateInsights(breakdown: MarketScoreBreakdown | null): string[] {
  if (!breakdown) return [];
  const insights: string[] = [];
  if (breakdown.scoreAgeWindow >= 80) insights.push("Janela de evolução ideal para a posição");
  else if (breakdown.scoreAgeWindow >= 70 && breakdown.ageWindowDetails.age && breakdown.ageWindowDetails.age < 23)
    insights.push("Alto potencial de valorização pela idade");
  if (breakdown.scorePerformanceImpact >= 75) insights.push("Desempenho acima da média da posição");
  else if (breakdown.performanceImpactDetails.decisiveActionsScore >= 70) insights.push("Impacto decisivo em partidas");
  if (breakdown.scoreCompetitiveContext >= 70) insights.push("Contexto competitivo elevando o valor");
  if (breakdown.scoreConsistencyReliability >= 75) insights.push("Alta regularidade nas últimas partidas");
  else if (breakdown.consistencyReliabilityDetails.matchesLast30Days >= 4)
    insights.push("Ritmo de jogo intenso (ativo nos últimos 30 dias)");
  if (breakdown.marketProfileDetails.versatilityScore >= 70) insights.push("Versatilidade posicional agrega valor de mercado");
  if (breakdown.marketProfileDetails.keyTraits.length > 0) {
    const trait = breakdown.marketProfileDetails.keyTraits[0];
    if (trait.includes("dribble"))  insights.push("Perfil técnico diferenciado em dribles");
    else if (trait.includes("aerial")) insights.push("Dominância no jogo aéreo");
    else if (trait.includes("pass"))   insights.push("Qualidade de passe acima da média");
    else if (trait.includes("recovery")) insights.push("Alta capacidade de recuperação de bola");
  }
  if (breakdown.trend30d === "UP") insights.push("Tendência de valorização nos últimos 30 dias");
  return insights.slice(0, 3);
}

// ── Component ──────────────────────────────────────────────────────────────────
export function MarketScoreCard({
  athleteId,
  athleteName,
  position,
  secondaryPositions = [],
  birthDate = null,
  age = null,
}: MarketScoreCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);

  const {
    score,
    scoreLoading,
    breakdown,
    breakdownLoading,
    displayScore,
    history,
    historyLoading,
    recalculate,
    isRecalculating,
    hasEnoughData,
    dataConfidence,
  } = useMarketScore({
    playerId: athleteId,
    playerName: athleteName,
    position,
    secondaryPositions,
    birthDate,
    age,
    enabled: true,
  });

  const hasAutoCalculated = useRef(false);
  useEffect(() => {
    if (!scoreLoading && !breakdownLoading && breakdown && !score && !hasAutoCalculated.current && !isRecalculating) {
      hasAutoCalculated.current = true;
      recalculate("Cálculo inicial ao abrir perfil");
    }
  }, [score, breakdown, scoreLoading, breakdownLoading, recalculate, isRecalculating]);

  const insights = useMemo(() => generateInsights(breakdown), [breakdown]);

  const scoreTotal  = displayScore ?? 0;
  const scoreStyle  = getScoreStyle(scoreTotal);
  const trend       = score?.trend_30d ?? "FLAT";
  const lastCalc    = score?.last_calculated_at
    ? format(new Date(score.last_calculated_at), "dd MMM yyyy, HH:mm", { locale: ptBR })
    : null;

  const baseScore            = useMemo(() => calculateBaseScore(breakdown), [breakdown]);
  const confidenceExplanation = useMemo(() => getConfidenceExplanation(breakdown), [breakdown]);
  const samplePenalty        = breakdown?.consistencyReliabilityDetails.samplePenalty ?? 1.0;
  const hasConfidenceAdjust  = samplePenalty < 1.0 && baseScore !== null && baseScore > scoreTotal;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (scoreLoading || breakdownLoading) {
    return (
      <div
        className="rounded-xl border overflow-hidden flex flex-col flex-1"
        style={{ background: CARD_BG, borderColor: CARD_BORDER }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <Skeleton className="h-3 w-32 bg-zinc-800" />
          <Skeleton className="h-3 w-20 bg-zinc-800" />
        </div>
        <div className="px-5 py-6 space-y-4">
          <div className="flex items-start gap-5">
            <Skeleton className="w-20 h-20 rounded-xl bg-zinc-800" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-24 bg-zinc-800" />
              <Skeleton className="h-3 w-36 bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="rounded-xl border overflow-hidden flex flex-col flex-1"
        style={{ background: CARD_BG, borderColor: CARD_BORDER }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: CARD_BORDER }}
        >
          <span
            className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
            style={{ color: MUTED }}
          >
            // M3 Market Score
          </span>
          {lastCalc && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: MUTED }} />
              <span className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
                {lastCalc}
              </span>
            </div>
          )}
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* ── Main score + trend ───────────────────────────────────────── */}
          <div className="flex items-start gap-5">
            {/* Score badge */}
            <div
              className="relative flex flex-col items-center justify-center w-[80px] h-[80px] rounded-xl flex-shrink-0 transition-opacity"
              style={{
                background: scoreStyle.bg,
                border: `1.5px solid ${scoreStyle.color}33`,
                opacity: isRecalculating ? 0.5 : 1,
              }}
            >
              {isRecalculating && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: `${scoreStyle.color}66`, borderTopColor: "transparent" }}
                  />
                </div>
              )}
              <span
                className="font-display font-semibold leading-none tabular-nums"
                style={{ fontSize: 32, color: scoreStyle.color }}
              >
                {scoreTotal.toFixed(0)}
              </span>
              <span
                className="font-editorial-mono text-[9px] tracking-[0.12em] uppercase mt-1"
                style={{ color: scoreStyle.color }}
              >
                {scoreStyle.label}
              </span>
            </div>

            {/* Trend + badges + actions */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Trend + confidence */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Trend pill */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${CARD_BORDER}` }}
                >
                  <TrendIcon trend={trend} size={11} />
                  <span className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>30 dias</span>
                </div>

                {/* Confidence badge */}
                {dataConfidence < 60 ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-help"
                          style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}
                        >
                          <AlertTriangle className="w-3 h-3" style={{ color: "#f59e0b" }} />
                          <span className="font-editorial-mono text-[9.5px]" style={{ color: "#f59e0b" }}>
                            Amostra reduzida
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[280px] bg-zinc-900 border-zinc-800 p-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 font-medium text-yellow-400">
                            <ShieldCheck className="w-4 h-4" />
                            Confiabilidade: {dataConfidence}%
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{confidenceExplanation}</p>
                          {hasConfidenceAdjust && baseScore && (
                            <div className="pt-1 border-t border-zinc-800 text-xs">
                              <span className="text-muted-foreground">Score base: </span>
                              <span className="font-medium">{baseScore}</span>
                              <span className="text-muted-foreground"> → Ajustado: </span>
                              <span className="font-medium text-yellow-400">{scoreTotal}</span>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-lg cursor-help"
                          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}
                        >
                          <ShieldCheck className="w-3 h-3" style={{ color: "#22c55e" }} />
                          <span className="font-editorial-mono text-[9.5px]" style={{ color: "#22c55e" }}>
                            {dataConfidence}% confiança
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[240px] bg-zinc-900 border-zinc-800 p-3">
                        <p className="text-xs text-muted-foreground">
                          Dados suficientes para análise confiável. Score calculado com amostra adequada de jogos e minutos.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Ghost actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNotesModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${CARD_BORDER}`,
                    color: MUTED,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  <FileText className="w-3 h-3" />
                  <span className="font-editorial-mono text-[10px]">Nota interna</span>
                </button>
                <button
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${CARD_BORDER}`,
                    color: MUTED,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  <History className="w-3 h-3" />
                  <span className="font-editorial-mono text-[10px]">Histórico</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Confidence adjustment block ───────────────────────────────── */}
          {hasConfidenceAdjust && baseScore && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}
            >
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: MUTED }} />
              <div className="space-y-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>Score Base:</span>
                  <span className="font-editorial-mono text-[11px] font-bold" style={{ color: TEXT }}>{baseScore}</span>
                  <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>→ Ajustado:</span>
                  <span className="font-editorial-mono text-[11px] font-bold" style={{ color: scoreStyle.color }}>{scoreTotal}</span>
                </div>
                <p className="font-editorial-mono text-[10px] leading-relaxed" style={{ color: MUTED }}>
                  Fator de confiabilidade{" "}
                  <span style={{ color: "#f59e0b" }}>{Math.round(samplePenalty * 100)}%</span> aplicado.{" "}
                  {confidenceExplanation}
                </p>
              </div>
            </div>
          )}

          {/* ── Sample warning ────────────────────────────────────────────── */}
          {!hasEnoughData && !hasConfidenceAdjust && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <p className="font-editorial-mono text-[10px] leading-relaxed" style={{ color: "#f59e0b" }}>
                Score com amostra reduzida — confiabilidade moderada. Adicione mais partidas para aumentar a precisão.
              </p>
            </div>
          )}

          {/* ── Breakdown accordion ───────────────────────────────────────── */}
          <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
            <CollapsibleTrigger asChild>
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${CARD_BORDER}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: MUTED }} />
                  <span className="font-editorial-mono text-[10.5px] tracking-[0.06em]" style={{ color: MUTED }}>
                    Composição do score
                  </span>
                </span>
                {breakdownOpen
                  ? <ChevronUp  className="w-3.5 h-3.5" style={{ color: MUTED }} />
                  : <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
                }
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-3">
              <PillarRow label="Idade & Janela de Evolução"   score={breakdown?.scoreAgeWindow              ?? 0} />
              <PillarRow label="Performance + Impacto"        score={breakdown?.scorePerformanceImpact       ?? 0} />
              <PillarRow label="Contexto Competitivo"         score={breakdown?.scoreCompetitiveContext      ?? 0} />
              <PillarRow label="Consistência & Confiabilidade" score={breakdown?.scoreConsistencyReliability ?? 0} />
              <PillarRow label="Perfil de Mercado"            score={breakdown?.scoreMarketProfile           ?? 0} />
            </CollapsibleContent>
          </Collapsible>

          {/* ── Insights ─────────────────────────────────────────────────── */}
          {insights.length > 0 && (
            <div
              className="pt-4 border-t"
              style={{ borderColor: CARD_BORDER }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-3.5 h-3.5" style={{ color: MUTED }} />
                <span
                  className="font-editorial-mono text-[10px] tracking-[0.16em] uppercase"
                  style={{ color: MUTED }}
                >
                  Insights de Mercado
                </span>
              </div>
              <ul className="space-y-2">
                {insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-editorial-mono text-[10px] mt-0.5" style={{ color: "#ec4525" }}>•</span>
                    <span className="font-editorial-mono text-[10.5px] leading-snug" style={{ color: MUTED }}>
                      {insight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modals — sem mudança */}
      <MarketScoreHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        events={history}
        loading={historyLoading}
      />
      <MarketScoreNotesModal
        open={notesModalOpen}
        onOpenChange={setNotesModalOpen}
        scoreId={score?.id}
        currentNotes={score?.notes_internal ?? ""}
      />
    </>
  );
}
