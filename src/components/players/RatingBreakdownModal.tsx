import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Info,
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  Clock,
  Star,
  TrendingUp,
  Calculator,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDetails {
  calculated_at: string;
  season_year: number;
  position_group: string;
  weights: {
    competition: number;
    production: number;
    defensive: number;
    discipline: number;
    age: number;
  };
  scores: {
    competition_level: number;
    production: number;
    defensive_actions: number;
    discipline: number;
    age_potential: number;
    overall_0_100: number;
    rating_0_5: number;
  };
  metrics: {
    total_matches: number;
    total_minutes: number;
    max_competition_coefficient: number;
    goals_per_90: number;
    assists_per_90: number;
    tackles_per_90: number;
    interceptions_per_90: number;
    recoveries_per_90: number;
    cards_per_90: number;
  };
  per_competition: Array<{
    competition_id: string;
    competition_name: string;
    final_coefficient: number;
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    goals_per_90: number;
    assists_per_90: number;
    tackles?: number;
    interceptions?: number;
    recoveries?: number;
    yellow_cards?: number;
    red_cards?: number;
  }>;
  reliability: "low" | "medium" | "high";
}

interface RatingBreakdownModalProps {
  details: RatingDetails | null;
  rating: number;
  trigger?: React.ReactNode;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-amber-500";
  return "text-destructive";
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-amber-500";
  return "bg-destructive";
}

function getReliabilityLabel(reliability: string): string {
  const labels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };
  return labels[reliability] || reliability;
}

function getReliabilityVariant(reliability: string): "destructive" | "secondary" | "default" {
  const variants: Record<string, "destructive" | "secondary" | "default"> = {
    low: "destructive",
    medium: "secondary",
    high: "default",
  };
  return variants[reliability] || "secondary";
}

function getPositionGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    forward: "Atacante",
    midfielder: "Meio-Campo",
    defender: "Defensor",
    goalkeeper: "Goleiro",
  };
  return labels[group] || group;
}

export function RatingBreakdownModal({ details, rating, trigger }: RatingBreakdownModalProps) {
  if (!details) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-1">
              <Info className="w-4 h-4" />
              Como é calculada?
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Nota Automática
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Detalhes indisponíveis. Recalcule a nota para ver o breakdown.
            </p>
            <p className="text-xs text-muted-foreground">
              A nota será recalculada automaticamente quando houver estatísticas disponíveis.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const scoreItems = [
    {
      label: "Nível da Competição",
      score: details.scores.competition_level,
      weight: details.weights.competition,
      icon: Trophy,
      description: `Coef. máximo: ${details.metrics.max_competition_coefficient.toFixed(2)}`,
    },
    {
      label: "Produção Ofensiva",
      score: details.scores.production,
      weight: details.weights.production,
      icon: Target,
      description: `${details.metrics.goals_per_90.toFixed(2)} gols/90 | ${details.metrics.assists_per_90.toFixed(2)} assist/90`,
    },
    {
      label: "Ações Defensivas",
      score: details.scores.defensive_actions,
      weight: details.weights.defensive,
      icon: Shield,
      description: `${details.metrics.tackles_per_90.toFixed(2)} desarmes | ${details.metrics.interceptions_per_90.toFixed(2)} interc.`,
    },
    {
      label: "Disciplina",
      score: details.scores.discipline,
      weight: details.weights.discipline,
      icon: AlertTriangle,
      description: `${details.metrics.cards_per_90.toFixed(2)} cartões/90`,
    },
    {
      label: "Potencial (Idade)",
      score: details.scores.age_potential,
      weight: details.weights.age,
      icon: TrendingUp,
      description: `Grupo: ${getPositionGroupLabel(details.position_group)}`,
    },
  ];

  // Calculate G+A per 90 and contribution per competition
  const competitionsWithGc90 = details.per_competition?.map(comp => {
    const minutes90 = comp.minutes / 90;
    const gc90 = minutes90 > 0 ? ((comp.goals + comp.assists) / minutes90) : 0;
    const minutesFactor = Math.min(1, comp.minutes / 900); // Target 900 minutes
    const contribution = gc90 * comp.final_coefficient * minutesFactor;
    return {
      ...comp,
      gc90,
      minutesFactor,
      contribution,
    };
  }) || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-1">
            <Info className="w-4 h-4" />
            Como é calculada?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Como essa nota foi calculada
          </DialogTitle>
        </DialogHeader>

        {/* Summary Card */}
        <Card className="bg-secondary/30 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nota Final</p>
                <div className="flex items-baseline gap-1">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                  <span className="text-4xl font-bold text-primary">{rating.toFixed(1)}</span>
                  <span className="text-lg text-muted-foreground">/5</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Performance Index</p>
                <span className={cn("text-2xl font-semibold", getScoreColor(details.scores.overall_0_100))}>
                  {details.scores.overall_0_100.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="text-right">
                <Badge variant={getReliabilityVariant(details.reliability)} className="text-sm">
                  Confiab. {getReliabilityLabel(details.reliability)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Temporada {details.season_year}
          </div>
          <div>
            {details.metrics.total_matches} jogos | {details.metrics.total_minutes} minutos
          </div>
          <div className="ml-auto text-xs">
            Atualizado em:{" "}
            {new Date(details.calculated_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <Separator />

        {/* Score Components */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Componentes da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoreItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      (peso: {(item.weight * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <span className={cn("text-sm font-semibold", getScoreColor(item.score))}>
                    {item.score.toFixed(0)}/100
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getScoreBarColor(item.score))}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Per Competition Breakdown */}
        {competitionsWithGc90.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Breakdown por Competição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-1 font-medium text-muted-foreground">Competição</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Coef.</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Min</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">G</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">A</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">G+A/90</th>
                      <th className="text-center py-2 px-1 font-medium text-muted-foreground">Fator Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitionsWithGc90.map((comp, idx) => (
                      <tr key={comp.competition_id || idx} className="border-b border-border/30">
                        <td className="py-2 px-1 font-medium max-w-[150px] truncate" title={comp.competition_name}>
                          {comp.competition_name}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Badge variant="outline" className="text-xs">
                            {comp.final_coefficient.toFixed(2)}
                          </Badge>
                        </td>
                        <td className="py-2 px-1 text-center text-muted-foreground">{comp.minutes}</td>
                        <td className="py-2 px-1 text-center font-medium">{comp.goals}</td>
                        <td className="py-2 px-1 text-center font-medium">{comp.assists}</td>
                        <td className="py-2 px-1 text-center">
                          <span className={cn("font-semibold", comp.gc90 >= 0.5 ? "text-emerald-500" : "text-muted-foreground")}>
                            {comp.gc90.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-1 text-center text-muted-foreground">
                          {(comp.minutesFactor * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discipline/Penalties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Penalidades & Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cartões por 90 min:</span>
                <span className="ml-2 font-medium">{details.metrics.cards_per_90.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Score Disciplina:</span>
                <span className={cn("ml-2 font-medium", getScoreColor(details.scores.discipline))}>
                  {details.scores.discipline}/100
                </span>
              </div>
            </div>
            {details.metrics.cards_per_90 > 0.3 && (
              <p className="text-xs text-amber-500 mt-2">
                ⚠️ Taxa de cartões acima da média (-{((0.3 - details.metrics.cards_per_90) * -20).toFixed(0)} pontos)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Formula Explanation */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Como funciona o cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Calculamos <strong>G+A por 90 minutos</strong>, ponderamos pela <strong>força da competição</strong> (coeficiente), 
              ajustamos pela <strong>quantidade de minutos jogados</strong> (amostra de confiança) e aplicamos 
              <strong> penalidades por cartões</strong>. Consideramos também <strong>ações defensivas</strong> (desarmes, 
              interceptações, recuperações). Por fim, normalizamos para uma escala de <strong>0 a 5</strong> e 
              aplicamos um pequeno <strong>bônus por idade</strong> (jogadores mais jovens têm maior potencial).
            </p>
            <div className="mt-3 p-2 rounded bg-background/50 text-xs font-mono">
              Nota = (CompScore×30% + ProdScore×35% + DefScore×20% + DiscScore×10% + AgeScore×5%) ÷ 20
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
