import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Info,
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  Clock,
  Star,
  TrendingUp,
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
    return null;
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
      description: `${details.metrics.goals_per_90} gols/90 | ${details.metrics.assists_per_90} assist/90`,
    },
    {
      label: "Ações Defensivas",
      score: details.scores.defensive_actions,
      weight: details.weights.defensive,
      icon: Shield,
      description: `${details.metrics.tackles_per_90} desarmes | ${details.metrics.interceptions_per_90} interceptações`,
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Nota Automática - Detalhes
          </DialogTitle>
        </DialogHeader>

        {/* Rating Summary */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div>
            <p className="text-sm text-muted-foreground">Nota Final</p>
            <p className="text-3xl font-bold text-primary">{rating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">/5.0</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score Geral</p>
            <p className={cn("text-2xl font-semibold", getScoreColor(details.scores.overall_0_100))}>
              {details.scores.overall_0_100.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
          <div className="text-right">
            <Badge variant={getReliabilityVariant(details.reliability)}>
              Confiab. {getReliabilityLabel(details.reliability)}
            </Badge>
          </div>
        </div>

        {/* Sample Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Temporada {details.season_year}
          </div>
          <div>
            {details.metrics.total_matches} jogos | {details.metrics.total_minutes} min
          </div>
        </div>

        <Separator />

        {/* Score Components */}
        <div className="space-y-4">
          <h4 className="font-medium">Componentes da Nota</h4>
          {scoreItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(item.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <span className={cn("text-sm font-semibold", getScoreColor(item.score))}>
                  {item.score.toFixed(0)}
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
        </div>

        {/* Per Competition */}
        {details.per_competition && details.per_competition.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Por Competição</h4>
              {details.per_competition.map((comp, idx) => (
                <div
                  key={comp.competition_id || idx}
                  className="p-3 rounded-lg bg-secondary/20 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{comp.competition_name}</span>
                    <Badge variant="outline">Coef. {comp.final_coefficient?.toFixed(2) || "—"}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">{comp.matches}</span> jogos
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{comp.minutes}</span> min
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{comp.goals}</span> gols
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{comp.assists}</span> assist
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Last Update */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          Calculado em:{" "}
          {new Date(details.calculated_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
