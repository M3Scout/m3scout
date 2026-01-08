import { ScoreBreakdown, getRatingLabel, getScoreColor } from "@/lib/scoring";
import { RatingStars } from "@/components/players/RatingStars";
import { 
  HelpCircle, 
  Calculator, 
  Trophy, 
  TrendingUp, 
  Sparkles,
  Scale
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ScoreBreakdownDisplayProps {
  breakdown: ScoreBreakdown;
  showExplanation?: boolean;
}

export function ScoreBreakdownDisplay({ 
  breakdown, 
  showExplanation = true 
}: ScoreBreakdownDisplayProps) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Breakdown da Pontuação
        </h3>
        {showExplanation && (
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm">
                O score final é calculado aplicando pesos às categorias, 
                multiplicando pelo coeficiente da competição e adicionando 
                modificadores de potencial e consistência.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Score Steps */}
      <div className="space-y-4">
        {/* Base Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Score Base</p>
              <p className="text-xs text-muted-foreground">
                Média ponderada das categorias
              </p>
            </div>
          </div>
          <span className="text-xl font-bold">
            {breakdown.baseScore.toFixed(1)}
          </span>
        </div>

        {/* Competition Coefficient */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-accent" />
            <div>
              <p className="font-medium">Coeficiente da Competição</p>
              <p className="text-xs text-muted-foreground">
                Multiplicador baseado no nível
              </p>
            </div>
          </div>
          <span className="text-xl font-bold text-accent">
            ×{breakdown.competitionCoefficient.toFixed(2)}
          </span>
        </div>

        {/* Adjusted Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border-l-2 border-primary">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Score Ajustado</p>
              <p className="text-xs text-muted-foreground">
                Base × Coeficiente
              </p>
            </div>
          </div>
          <span className="text-xl font-bold text-primary">
            {breakdown.adjustedScore.toFixed(1)}
          </span>
        </div>

        {/* Modifiers */}
        {(breakdown.potentialBonus > 0 || breakdown.consistencyModifier !== 0) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-medium">Modificadores</p>
                <p className="text-xs text-muted-foreground">
                  Potencial: +{breakdown.potentialBonus} | Consistência: {breakdown.consistencyModifier >= 0 ? '+' : ''}{breakdown.consistencyModifier}
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-400">
              {breakdown.potentialBonus + breakdown.consistencyModifier >= 0 ? '+' : ''}
              {breakdown.potentialBonus + breakdown.consistencyModifier}
            </span>
          </div>
        )}
      </div>

      {/* Final Score & Rating */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Score Final</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", getScoreColor(breakdown.finalScore))}>
                {breakdown.finalScore.toFixed(1)}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Rating</p>
            <RatingStars rating={breakdown.rating} size="lg" />
            <p className="text-sm font-medium mt-1 text-accent">
              {getRatingLabel(breakdown.rating)}
            </p>
          </div>
        </div>
      </div>

      {/* Why This Score */}
      {showExplanation && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Por que essa nota?
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O score de <strong>{breakdown.baseScore.toFixed(1)}</strong> foi calculado 
            usando a média ponderada das 5 categorias (Técnico 25%, Tático 25%, Físico 20%, 
            Mental 20%, Impacto 10%). Esse score foi então multiplicado pelo coeficiente 
            da competição (<strong>×{breakdown.competitionCoefficient.toFixed(2)}</strong>) 
            para refletir o nível de exigência do campeonato
            {(breakdown.potentialBonus > 0 || breakdown.consistencyModifier !== 0) && (
              <>, com modificadores de potencial e consistência adicionados</>
            )}.
          </p>
        </div>
      )}
    </div>
  );
}
