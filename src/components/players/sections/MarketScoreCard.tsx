/**
 * M3 Market Score Card
 * 
 * Premium card displaying the athlete's Market Score (0-100) with:
 * - Score badge with color-coded faixas
 * - 30-day trend indicator
 * - Expandable breakdown by pillar
 * - Auto-generated insights
 * - Internal notes and history modals
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useMarketScore } from "@/hooks/useMarketScore";
import { MarketScoreBreakdown, MarketScoreTrend } from "@/types/marketScore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MarketScoreHistoryModal } from "./MarketScoreHistoryModal";
import { MarketScoreNotesModal } from "./MarketScoreNotesModal";
import { cn } from "@/lib/utils";

interface MarketScoreCardProps {
  athleteId: string;
  athleteName: string;
  position: string;
  secondaryPositions?: string[];
  birthDate?: string | null;
  age?: number | null;
}

// Color config based on score range
function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (score >= 85) {
    return {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/50",
      label: "Elite",
    };
  }
  if (score >= 70) {
    return {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/50",
      label: "Alto",
    };
  }
  if (score >= 50) {
    return {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/50",
      label: "Médio",
    };
  }
  return {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/50",
    label: "Baixo",
  };
}

// Trend icon component
function TrendIndicator({
  trend,
  className,
}: {
  trend: MarketScoreTrend;
  className?: string;
}) {
  if (trend === "UP") {
    return <TrendingUp className={cn("text-emerald-400", className)} />;
  }
  if (trend === "DOWN") {
    return <TrendingDown className={cn("text-red-400", className)} />;
  }
  return <Minus className={cn("text-muted-foreground", className)} />;
}

// Pillar row component
function PillarRow({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon?: React.ReactNode;
}) {
  const scoreColor = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      {icon && <div className="text-muted-foreground w-4 h-4">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground truncate">{label}</span>
          <span className={cn("text-sm font-medium", scoreColor.text)}>
            {score.toFixed(0)}
          </span>
        </div>
        <Progress value={score} className="h-1.5" />
      </div>
    </div>
  );
}

// Generate insights from breakdown
function generateInsights(breakdown: MarketScoreBreakdown | null): string[] {
  if (!breakdown) return [];

  const insights: string[] = [];

  // Age window insight
  if (breakdown.scoreAgeWindow >= 80) {
    insights.push("Janela de evolução ideal para a posição");
  } else if (breakdown.scoreAgeWindow >= 70 && breakdown.ageWindowDetails.age && breakdown.ageWindowDetails.age < 23) {
    insights.push("Alto potencial de valorização pela idade");
  }

  // Performance insight
  if (breakdown.scorePerformanceImpact >= 75) {
    insights.push("Desempenho acima da média da posição");
  } else if (breakdown.performanceImpactDetails.decisiveActionsScore >= 70) {
    insights.push("Impacto decisivo em partidas");
  }

  // Competitive context
  if (breakdown.scoreCompetitiveContext >= 70) {
    insights.push("Contexto competitivo elevando o valor");
  }

  // Consistency
  if (breakdown.scoreConsistencyReliability >= 75) {
    insights.push("Alta regularidade nas últimas partidas");
  } else if (breakdown.consistencyReliabilityDetails.matchesLast30Days >= 4) {
    insights.push("Ritmo de jogo intenso (ativo nos últimos 30 dias)");
  }

  // Market profile
  if (breakdown.marketProfileDetails.versatilityScore >= 70) {
    insights.push("Versatilidade posicional agrega valor de mercado");
  }
  if (breakdown.marketProfileDetails.keyTraits.length > 0) {
    const trait = breakdown.marketProfileDetails.keyTraits[0];
    if (trait.includes("dribble")) {
      insights.push("Perfil técnico diferenciado em dribles");
    } else if (trait.includes("aerial")) {
      insights.push("Dominância no jogo aéreo");
    } else if (trait.includes("pass")) {
      insights.push("Qualidade de passe acima da média");
    } else if (trait.includes("recovery")) {
      insights.push("Alta capacidade de recuperação de bola");
    }
  }

  // Trend insight
  if (breakdown.trend30d === "UP") {
    insights.push("Tendência de valorização nos últimos 30 dias");
  }

  // Limit to 3 insights
  return insights.slice(0, 3);
}

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

  // Compute insights
  const insights = useMemo(() => generateInsights(breakdown), [breakdown]);

  // Score colors
  const scoreTotal = breakdown?.scoreTotal ?? score?.score_total ?? 0;
  const scoreColor = getScoreColor(scoreTotal);
  const trend = breakdown?.trend30d ?? score?.trend_30d ?? "FLAT";
  const lastCalculated = score?.last_calculated_at
    ? format(new Date(score.last_calculated_at), "dd MMM yyyy, HH:mm", { locale: ptBR })
    : null;

  // Loading state
  if (scoreLoading || breakdownLoading) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            M3 Market Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              M3 Market Score
            </CardTitle>
            {lastCalculated && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{lastCalculated}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Score Display */}
          <div className="flex items-start gap-4">
            {/* Score Badge */}
            <div
              className={cn(
                "flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2",
                scoreColor.bg,
                scoreColor.border
              )}
            >
              <span className={cn("text-3xl font-bold", scoreColor.text)}>
                {scoreTotal.toFixed(0)}
              </span>
              <span className={cn("text-[10px] font-medium uppercase tracking-wider", scoreColor.text)}>
                {scoreColor.label}
              </span>
            </div>

            {/* Trend & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <TrendIndicator trend={trend} className="w-3 h-3" />
                  <span>30 dias</span>
                </Badge>
                {dataConfidence < 60 && (
                  <Badge variant="outline" className="text-xs gap-1 border-yellow-500/50 text-yellow-400">
                    <AlertTriangle className="w-3 h-3" />
                    Amostra reduzida
                  </Badge>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setNotesModalOpen(true)}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Nota interna
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setHistoryModalOpen(true)}
                >
                  <History className="w-3 h-3 mr-1" />
                  Histórico
                </Button>
              </div>
            </div>
          </div>

          {/* Sample Warning */}
          {!hasEnoughData && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/90">
                Score com amostra reduzida — confiabilidade moderada. 
                Adicione mais partidas para aumentar a precisão.
              </p>
            </div>
          )}

          {/* Breakdown Accordion */}
          <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-9 px-3 hover:bg-zinc-800/50"
              >
                <span className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4" />
                  Ver composição do score
                </span>
                {breakdownOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <PillarRow
                label="Idade & Janela de Evolução"
                score={breakdown?.scoreAgeWindow ?? 0}
              />
              <PillarRow
                label="Performance + Impacto"
                score={breakdown?.scorePerformanceImpact ?? 0}
              />
              <PillarRow
                label="Contexto Competitivo"
                score={breakdown?.scoreCompetitiveContext ?? 0}
              />
              <PillarRow
                label="Consistência & Confiabilidade"
                score={breakdown?.scoreConsistencyReliability ?? 0}
              />
              <PillarRow
                label="Perfil de Mercado"
                score={breakdown?.scoreMarketProfile ?? 0}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Insights de Mercado</span>
              </div>
              <ul className="space-y-1.5">
                {insights.map((insight, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
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
