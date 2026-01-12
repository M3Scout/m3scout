import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  Trophy,
  Target,
  Shield,
  AlertTriangle,
  Clock,
  Star,
  Calculator,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Percent,
  Activity,
  HelpCircle,
} from "lucide-react";
import { cn, safeArray } from "@/lib/utils";
import {
  RatingBreakdownV2,
  CompetitionBreakdown,
  getReliabilityLabelV2,
  getReliabilityVariantV2,
} from "@/lib/playerRatingV2";
import { formatFixed } from "@/lib/formatters";
import { StatsRadarChart } from "./StatsRadarChart";

interface RatingBreakdownModalV2Props {
  details: RatingBreakdownV2 | null;
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

function getScoreLevel(score: number): { label: string; description: string } {
  if (score >= 80) return { label: "Alto", description: "Desempenho excelente nesta métrica" };
  if (score >= 60) return { label: "Bom", description: "Desempenho acima da média" };
  if (score >= 40) return { label: "Médio", description: "Desempenho dentro da média" };
  return { label: "Baixo", description: "Área de melhoria identificada" };
}

// Detailed stat info with group, description, and specific low-score feedback
interface StatInfo {
  group: string;
  groupIcon: string;
  description: string;
  lowFeedback: string;
  highFeedback: string;
}

const STAT_INFO: Record<string, StatInfo> = {
  // Regularidade
  minutes_games: {
    group: "Regularidade",
    groupIcon: "⏱️",
    description: "Tempo de jogo e consistência. Jogadores com mais minutos demonstram confiança do treinador.",
    lowFeedback: "Poucos minutos jogados — falta de ritmo de jogo ou pouca confiança do técnico.",
    highFeedback: "Jogador titular absoluto com alta regularidade.",
  },
  
  // Finalização (Atacantes)
  goals_per_90: {
    group: "Finalização",
    groupIcon: "⚽",
    description: "Eficiência goleadora. Média de gols marcados a cada 90 minutos jogados.",
    lowFeedback: "Baixa média de gols — dificuldade em converter chances ou pouca presença na área.",
    highFeedback: "Finalizador letal com alta taxa de conversão.",
  },
  shots: {
    group: "Finalização",
    groupIcon: "⚽",
    description: "Volume de finalizações por 90 minutos. Indica presença ofensiva e busca pelo gol.",
    lowFeedback: "Poucas finalizações — baixa participação em jogadas de conclusão.",
    highFeedback: "Alta presença ofensiva com muitas tentativas de gol.",
  },
  shots_on_target: {
    group: "Finalização",
    groupIcon: "🎯",
    description: "Finalizações certas no gol. Mede precisão nas conclusões.",
    lowFeedback: "Baixa precisão nas finalizações — chutes fora do alvo ou bloqueados.",
    highFeedback: "Excelente precisão de finalização.",
  },
  
  // Participação Ofensiva
  ga_per_90: {
    group: "Participação Ofensiva",
    groupIcon: "📈",
    description: "Gols + Assistências por 90 minutos. Mede impacto direto no placar.",
    lowFeedback: "Baixa participação em gols — poucas assistências e finalizações convertidas.",
    highFeedback: "Alto impacto ofensivo com participação constante em gols.",
  },
  offensive_involvement: {
    group: "Participação Ofensiva",
    groupIcon: "📈",
    description: "Envolvimento geral em jogadas ofensivas (gols, passes decisivos, finalizações).",
    lowFeedback: "Baixo envolvimento ofensivo — pouca participação nas jogadas de ataque.",
    highFeedback: "Protagonista das ações ofensivas da equipe.",
  },
  
  // Passe & Construção
  accurate_passes: {
    group: "Passe & Construção",
    groupIcon: "🎯",
    description: "Volume de passes certos. Indica qualidade na posse e circulação de bola.",
    lowFeedback: "Poucos passes certos — dificuldade na construção ou pouco envolvimento no jogo.",
    highFeedback: "Peça fundamental na construção e circulação de bola.",
  },
  pass_accuracy: {
    group: "Passe & Construção",
    groupIcon: "🎯",
    description: "Percentual de acerto nos passes. Indica qualidade técnica e tomada de decisão.",
    lowFeedback: "Baixa precisão de passes — muitos erros de passe prejudicando a construção.",
    highFeedback: "Alta precisão técnica nos passes.",
  },
  key_passes: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Passes decisivos que geraram chances de gol. Mede capacidade de criar para os companheiros.",
    lowFeedback: "Poucos passes decisivos — dificuldade em criar oportunidades de gol.",
    highFeedback: "Criador consistente de chances de gol.",
  },
  key_pass_accuracy: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Precisão nos passes decisivos. Qualidade nas bolas que geram chances.",
    lowFeedback: "Baixa precisão em passes decisivos — passes mal calibrados em momentos chave.",
    highFeedback: "Alta qualidade nos passes que decidem jogadas.",
  },
  chances_created: {
    group: "Criação de Jogadas",
    groupIcon: "✨",
    description: "Oportunidades de gol criadas para companheiros. Mede visão de jogo e criatividade.",
    lowFeedback: "Poucas chances criadas — falta de criatividade ou visão de jogo limitada.",
    highFeedback: "Motor criativo da equipe com ótima visão de jogo.",
  },
  
  // Defesa & Duelos
  tackles: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Desarmes bem-sucedidos por 90 minutos. Indica capacidade de recuperar a bola.",
    lowFeedback: "Poucos desarmes — dificuldade em recuperar a bola ou posicionamento defensivo ruim.",
    highFeedback: "Excelente na marcação e recuperação de bola.",
  },
  interceptions: {
    group: "Defesa & Duelos",
    groupIcon: "🛡️",
    description: "Interceptações por 90 minutos. Mede leitura de jogo e antecipação.",
    lowFeedback: "Poucas interceptações — falta de leitura de jogo ou posicionamento inadequado.",
    highFeedback: "Ótima leitura de jogo e antecipação defensiva.",
  },
  recoveries: {
    group: "Intensidade Defensiva",
    groupIcon: "🔄",
    description: "Recuperações de bola. Indica pressão, intensidade e esforço defensivo.",
    lowFeedback: "Poucas recuperações — baixa intensidade ou pouca pressão na marcação.",
    highFeedback: "Alta intensidade e esforço na recuperação de bola.",
  },
  duels_won: {
    group: "Defesa & Duelos",
    groupIcon: "💪",
    description: "Duelos vencidos (aéreos e no chão). Mede força física e determinação.",
    lowFeedback: "Baixa taxa de duelos vencidos — dificuldade em disputas físicas.",
    highFeedback: "Dominante nos duelos individuais.",
  },
  aerial_duels: {
    group: "Jogo Aéreo",
    groupIcon: "🦅",
    description: "Duelos aéreos vencidos. Importante para defesa e ataque em bolas altas.",
    lowFeedback: "Dificuldade no jogo aéreo — perde muitas disputas de cabeça.",
    highFeedback: "Dominante no jogo aéreo.",
  },
  
  // Disciplina
  discipline: {
    group: "Disciplina",
    groupIcon: "📋",
    description: "Cartões por 90 min (vermelho = 3x amarelo). Menor valor = melhor.",
    lowFeedback: "Muitos cartões — jogo imprudente ou dificuldade em controlar temperamento.",
    highFeedback: "Jogo limpo e controlado emocionalmente.",
  },
  
  // Goleiro - Defesas
  saves: {
    group: "Defesas (GK)",
    groupIcon: "🧤",
    description: "Total de defesas realizadas. Mede capacidade de evitar gols.",
    lowFeedback: "Poucas defesas — pode indicar pouca exigência ou dificuldade nas finalizações.",
    highFeedback: "Goleiro decisivo com alto volume de defesas.",
  },
  goals_conceded: {
    group: "Solidez Defensiva (GK)",
    groupIcon: "🚫",
    description: "Gols sofridos. Menor valor = melhor. Indica segurança do goleiro.",
    lowFeedback: "Muitos gols sofridos — vazamentos frequentes comprometendo o resultado.",
    highFeedback: "Goleiro seguro com poucos gols sofridos.",
  },
  errors: {
    group: "Erros Graves (GK)",
    groupIcon: "⚠️",
    description: "Erros que resultaram em gol. Menor valor = melhor.",
    lowFeedback: "Erros decisivos — falhas que resultaram em gols adversários.",
    highFeedback: "Goleiro confiável sem erros graves.",
  },
  penalties_saved: {
    group: "Pênaltis (GK)",
    groupIcon: "🎯",
    description: "Pênaltis defendidos. Habilidade específica em cobranças.",
    lowFeedback: "Poucos pênaltis defendidos — pode melhorar na leitura de cobranças.",
    highFeedback: "Especialista em defesas de pênalti.",
  },
};

// Fallback for stats not in STAT_INFO
const safeLower = (v: unknown): string => {
  if (typeof v === "string" && v.trim() && v !== "—" && v !== "---") return v.toLowerCase();
  if (typeof v === "number" || typeof v === "boolean") return String(v).toLowerCase();
  return "";
};

// Human-readable stat name mapping for unknown stats
const STAT_NAME_MAP: Record<string, string> = {
  minutes_games: "Minutos/Jogos",
  ga_per_90: "G+A por 90 min",
  goals_per_90: "Gols por 90 min",
  assists_per_90: "Assistências por 90 min",
  key_pass_accuracy: "Precisão de Passes-Chave",
  pass_accuracy: "Precisão de Passes",
  offensive_involvement: "Envolvimento Ofensivo",
  shots_on_target: "Finalizações no Alvo",
  chances_created: "Chances Criadas",
  key_passes: "Passes-Chave",
  accurate_passes: "Passes Certos",
  tackles: "Desarmes",
  interceptions: "Interceptações",
  recoveries: "Recuperações de Bola",
  duels_won: "Duelos Vencidos",
  aerial_duels: "Duelos Aéreos",
  discipline: "Disciplina",
  saves: "Defesas",
  goals_conceded: "Gols Sofridos",
  errors: "Erros Graves",
  penalties_saved: "Pênaltis Defendidos",
  shots: "Finalizações",
  goals: "Gols",
  assists: "Assistências",
};

function getHumanStatName(statKey: string, providedLabel: unknown): string {
  // 1. If providedLabel is a valid non-placeholder string, use it
  if (typeof providedLabel === "string" && providedLabel.trim() && providedLabel !== "—" && providedLabel !== "---" && providedLabel !== "unknown") {
    return providedLabel;
  }
  // 2. Try our manual mapping
  if (STAT_NAME_MAP[statKey]) {
    return STAT_NAME_MAP[statKey];
  }
  // 3. Convert snake_case to Title Case as last resort
  if (statKey && statKey !== "unknown") {
    return statKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // 4. Ultimate fallback
  return "Estatística não identificada";
}

function getStatInfo(statKey: string, label: unknown): StatInfo {
  const humanLabel = getHumanStatName(statKey, label);
  const labelLower = safeLower(humanLabel) || "esta estatística";

  if (import.meta.env.DEV && typeof label !== "string") {
    console.debug("[RatingBreakdownModalV2] getStatInfo label not string:", label, "statKey:", statKey);
  }

  // If we have it in STAT_INFO, return it directly
  if (STAT_INFO[statKey]) {
    return STAT_INFO[statKey];
  }

  // Build a dynamic fallback with meaningful copy
  return {
    group: "Desempenho Geral",
    groupIcon: "📊",
    description: `Mede o desempenho em ${humanLabel}.`,
    lowFeedback: `Desempenho abaixo do esperado em ${humanLabel}.`,
    highFeedback: `Excelente desempenho em ${humanLabel}.`,
  };
}

function StatScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded-md">
      <span className="font-medium">Legenda:</span>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span>Alto (80+)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span>Bom (60-79)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span>Médio (40-59)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <span>Baixo (&lt;40)</span>
      </div>
    </div>
  );
}

function StatBreakdownCard({ 
  competition, 
  isExpanded, 
  onToggle 
}: { 
  competition: CompetitionBreakdown; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statBreakdown = Array.isArray(competition.stat_breakdown) ? competition.stat_breakdown : [];
  const availableStats = statBreakdown.filter(s => s.available);
  const unavailableStats = statBreakdown.filter(s => !s.available);
  
  return (
    <Card className="bg-secondary/20 border-border/50">
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">{competition.competition_name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {competition.season_year}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className={cn("text-sm font-semibold", getScoreColor(competition.competition_score))}>
                {formatFixed(competition.competition_score, 1)}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {/* Competition Info - V2 with year-based weighting */}
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            <div>
              <p className="text-muted-foreground">Ano</p>
              <Badge variant="outline" className="mt-1">{competition.season_year}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Minutos</p>
              <p className="font-medium">{competition.minutes}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Ano</p>
              <p className="font-medium">{formatFixed((competition.year_weight ?? competition.recency_weight) * 100, 0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso no Ano</p>
              <p className="font-medium">{formatFixed((competition.in_year_weight ?? competition.minutes_factor) * 100, 0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Final</p>
              <p className="font-medium">{formatFixed((competition.final_weight ?? competition.combined_weight) * 100, 0)}%</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Stats breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Estatísticas por Posição (peso ajustado)
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">
                      Cada estatística tem um peso diferente baseado na posição do jogador. 
                      A nota final considera apenas estatísticas disponíveis, redistribuindo os pesos.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Color Legend */}
            <StatScoreLegend />
            
            {/* Stats bars with tooltips */}
            <TooltipProvider delayDuration={200}>
              {safeArray(availableStats).map((stat) => {
                const scoreLevel = getScoreLevel(stat.score);
                const statInfo = getStatInfo(stat.stat, stat.label);
                const humanLabel = getHumanStatName(stat.stat, stat.label);
                const isLow = stat.score < 40;
                const isHigh = stat.score >= 80;
                const playerValue = stat.value !== undefined && stat.value !== null ? stat.value : null;
                
                return (
                  <Tooltip key={stat.stat}>
                    <TooltipTrigger asChild>
                      <div className="space-y-1 cursor-help hover:bg-muted/30 rounded-md p-1.5 -mx-1.5 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="mr-1">{statInfo.groupIcon}</span>
                            <span className="font-medium text-foreground">
                              {humanLabel}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                              {statInfo.group}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {formatFixed(stat.adjusted_weight, 0)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-semibold tabular-nums", getScoreColor(stat.score))}>
                              {formatFixed(stat.score, 0)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getScoreBarColor(stat.score))}
                            style={{ width: `${stat.score}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <div className="space-y-2">
                        {/* Header with group */}
                        <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                          <span className="text-base">{statInfo.groupIcon}</span>
                          <div>
                            <p className="font-semibold text-sm">{humanLabel}</p>
                            <p className="text-xs text-muted-foreground">{statInfo.group}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs ml-auto",
                              stat.score >= 80 && "border-emerald-500 text-emerald-500",
                              stat.score >= 60 && stat.score < 80 && "border-primary text-primary",
                              stat.score >= 40 && stat.score < 60 && "border-amber-500 text-amber-500",
                              stat.score < 40 && "border-destructive text-destructive"
                            )}
                          >
                            {scoreLevel.label}
                          </Badge>
                        </div>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground">{statInfo.description}</p>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                          <div>
                            <span className="text-muted-foreground">Nota: </span>
                            <span className={cn("font-bold", getScoreColor(stat.score))}>
                              {formatFixed(stat.score, 0)}/100
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Peso: </span>
                            <span className="font-semibold">{formatFixed(stat.adjusted_weight, 0)}%</span>
                          </div>
                          {playerValue !== null && (
                            <div>
                              <span className="text-muted-foreground">Valor: </span>
                              <span className="font-semibold">{playerValue}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Specific feedback for low scores */}
                        {isLow && (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
                            <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                              <AlertTriangle className="w-3 h-3" />
                              Ponto de Atenção
                            </p>
                            <p className="text-xs text-destructive/90">
                              Abaixo do esperado em <strong>{humanLabel}</strong>{playerValue !== null ? ` (${playerValue})` : ""}.
                            </p>
                          </div>
                        )}
                        
                        {/* Specific feedback for high scores */}
                        {isHigh && (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
                            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mb-1">
                              <Star className="w-3 h-3" />
                              Ponto Forte
                            </p>
                            <p className="text-xs text-emerald-600/90">
                              Excelente em <strong>{humanLabel}</strong>{playerValue !== null ? ` (${playerValue})` : ""}.
                            </p>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
            
            {(unavailableStats?.length ?? 0) > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Estatísticas não disponíveis (peso redistribuído):
                </p>
                <div className="flex flex-wrap gap-1">
                  {safeArray(unavailableStats).map((stat) => {
                    const statInfo = getStatInfo(stat.stat, stat.label);
                    const humanLabel = getHumanStatName(stat.stat, stat.label);
                    return (
                      <TooltipProvider key={stat.stat}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs opacity-60 cursor-help">
                              <span className="mr-1">{statInfo.groupIcon}</span>
                              {humanLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium text-xs">{humanLabel}</p>
                              <p className="text-xs text-muted-foreground">{statInfo.description}</p>
                              <p className="text-xs text-amber-500">Dados não disponíveis para esta competição.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Score components */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div className="text-xs">
              <span className="text-muted-foreground">Stats Posição (70%):</span>
              <span className={cn("ml-2 font-medium", getScoreColor(competition.position_stats_score))}>
                {formatFixed(competition.position_stats_score, 1)}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Nível Comp. (30%):</span>
              <span className={cn("ml-2 font-medium", getScoreColor(competition.competition_level_score))}>
                {formatFixed(competition.competition_level_score, 1)}
              </span>
            </div>
          </div>
          
          {/* Final contribution */}
          <div className="flex items-center justify-between bg-background/50 p-2 rounded text-xs">
            <span className="text-muted-foreground">
              Contribuição Final (peso {formatFixed(competition.combined_weight * 100, 0)}%):
            </span>
            <span className={cn("font-semibold", getScoreColor(competition.competition_score))}>
              {formatFixed(competition.weighted_contribution, 1)} pontos
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function RatingBreakdownModalV2({ details, rating, trigger }: RatingBreakdownModalV2Props) {
  const [expandedCompetitions, setExpandedCompetitions] = useState<Set<string>>(new Set());
  
  const toggleCompetition = (id: string) => {
    setExpandedCompetitions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
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
        <Card className="bg-gradient-to-r from-secondary/30 to-secondary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nota Final</p>
                <div className="flex items-baseline gap-1">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                  <span className="text-4xl font-bold text-primary">{formatFixed(rating, 1)}</span>
                  <span className="text-lg text-muted-foreground">/5</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Índice</p>
                <span className={cn("text-2xl font-semibold", getScoreColor(details.final_score_100))}>
                  {formatFixed(details.final_score_100, 0)}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="text-right">
                <Badge variant={getReliabilityVariantV2(details.reliability)} className="text-sm mb-1">
                  Confiab. {getReliabilityLabelV2(details.reliability)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {details.total_competitions} competições
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position and sample info */}
        <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <Badge variant="secondary">{details.position_group_label}</Badge>
          </div>
          <div>
            {details.total_matches} jogos | {details.total_minutes} minutos
          </div>
          <div className="ml-auto text-xs">
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

        <Tabs defaultValue="radar" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="competitions">Competições</TabsTrigger>
            <TabsTrigger value="weights">Pesos</TabsTrigger>
            <TabsTrigger value="formula">Fórmula</TabsTrigger>
          </TabsList>

          {/* Radar Tab */}
          <TabsContent value="radar" className="mt-4">
            {(() => {
              // Aggregate all stat breakdowns from competitions
              const allStats = safeArray(details?.competitions ?? []).flatMap(c => 
                safeArray(c.stat_breakdown).filter(s => s.available)
              );
              
              // Group and average by stat
              const statMap = new Map<string, { total: number; count: number; label: string; weight: number; value: number }>();
              allStats.forEach((s) => {
                const statKey = String((s as any)?.stat ?? "unknown");
                const providedLabel = (s as any)?.label;
                const humanLabel = getHumanStatName(statKey, providedLabel);
                const score = Number((s as any)?.score) || 0;
                const weight = Number((s as any)?.adjusted_weight ?? (s as any)?.weight) || 0;
                const value = Number((s as any)?.value) || 0;

                const existing = statMap.get(statKey);
                if (existing) {
                  existing.total += score;
                  existing.count += 1;
                  existing.value += value;
                } else {
                  statMap.set(statKey, {
                    total: score,
                    count: 1,
                    label: humanLabel,
                    weight,
                    value,
                  });
                }
              });

              const aggregatedStats = Array.from(statMap.entries()).map(([stat, data]) => ({
                stat,
                label: data.label || getHumanStatName(stat, stat),
                value: data.value / data.count,
                score: data.total / data.count,
                weight: data.weight,
                adjusted_weight: data.weight,
                available: true,
              }));
              
              // Compute strengths (top 2 high-scoring) and weaknesses (bottom 2 low-scoring)
              const sortedByScore = [...aggregatedStats].sort((a, b) => b.score - a.score);
              const strengths = sortedByScore.filter(s => s.score >= 60).slice(0, 2);
              const weaknesses = sortedByScore.filter(s => s.score < 40).slice(-2).reverse();
              
              return (
                <div className="space-y-4">
                  {/* Summary: Top Strengths and Weaknesses */}
                  {(strengths.length > 0 || weaknesses.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mb-2">
                          <Star className="w-3 h-3" />
                          Pontos Fortes
                        </p>
                        {strengths.length > 0 ? (
                          <ul className="text-xs text-emerald-700 space-y-1">
                            {strengths.map(s => (
                              <li key={s.stat}>• <strong>{s.label}</strong> ({formatFixed(s.score, 0)})</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">Nenhum destaque positivo</p>
                        )}
                      </div>
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-2">
                          <AlertTriangle className="w-3 h-3" />
                          Pontos de Atenção
                        </p>
                        {weaknesses.length > 0 ? (
                          <ul className="text-xs text-destructive space-y-1">
                            {weaknesses.map(s => (
                              <li key={s.stat}>• <strong>{s.label}</strong> ({formatFixed(s.score, 0)})</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">Nenhuma área crítica</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <StatsRadarChart
                    statBreakdown={aggregatedStats}
                    positionGroup={details.position_group}
                    positionGroupLabel={details.position_group_label}
                  />
                </div>
              );
            })()}
          </TabsContent>

          {/* Competitions Tab */}
          <TabsContent value="competitions" className="space-y-3 mt-4">
            {(details?.competitions?.length ?? 0) === 0 ? (
              <Card className="bg-secondary/20">
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Nenhuma competição encontrada para este jogador.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Resumo por Competição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 px-1">Competição</th>
                            <th className="text-center py-2 px-1">Ano</th>
                            <th className="text-center py-2 px-1">Min</th>
                            <th className="text-center py-2 px-1">G</th>
                            <th className="text-center py-2 px-1">A</th>
                            <th className="text-center py-2 px-1" title="Peso do Ano (60% ou 40%)">Ano%</th>
                            <th className="text-center py-2 px-1" title="Peso dentro do Ano (por minutos)">NoAno%</th>
                            <th className="text-center py-2 px-1" title="Peso Final (Ano × NoAno)">Peso</th>
                            <th className="text-center py-2 px-1">Score</th>
                            <th className="text-center py-2 px-1" title="Contribuição = Score × Peso">Contrib</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeArray(details?.competitions ?? []).map((comp) => (
                            <tr key={comp.competition_id} className="border-b border-border/30">
                              <td className="py-2 px-1 max-w-[100px] truncate" title={comp.competition_name}>
                                {comp.competition_name ?? "Sem competição"}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {comp.season_year}
                                </Badge>
                              </td>
                              <td className="py-2 px-1 text-center text-muted-foreground">{comp.minutes}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.goals}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.assists}</td>
                              <td className="py-2 px-1 text-center text-muted-foreground">
                                {formatFixed((comp.year_weight ?? comp.recency_weight) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center text-muted-foreground">
                                {formatFixed((comp.in_year_weight ?? comp.minutes_factor) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center text-primary font-medium">
                                {formatFixed((comp.final_weight ?? comp.combined_weight) * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center">
                                <span className={cn("font-semibold", getScoreColor(comp.competition_score))}>
                                  {formatFixed(comp.competition_score, 0)}
                                </span>
                              </td>
                              <td className="py-2 px-1 text-center">
                                <span className={cn("font-medium", getScoreColor(comp.competition_score))}>
                                  {formatFixed(comp.weighted_contribution, 1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Expandable competition details */}
                <p className="text-xs text-muted-foreground px-1">
                  Clique em uma competição para ver o breakdown detalhado:
                </p>
                {safeArray(details?.competitions ?? []).map((comp) => (
                  <StatBreakdownCard
                    key={comp.competition_id}
                    competition={comp}
                    isExpanded={expandedCompetitions.has(comp.competition_id)}
                    onToggle={() => toggleCompetition(comp.competition_id)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* Weights Tab */}
          <TabsContent value="weights" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Pesos para {details.position_group_label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cada posição tem pesos diferentes para cada estatística
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeArray(details.stat_weights).map((weight) => (
                  <div key={weight.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{weight.label}</span>
                      {weight.inverse && (
                        <Badge variant="secondary" className="text-xs">inverso</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={weight.weight} className="w-24 h-2" />
                      <span className="text-sm font-medium w-10 text-right">{weight.weight}%</span>
                    </div>
                  </div>
                ))}
                
                <Separator className="my-4" />
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Nota:</strong> Estatísticas com "inverso" significam que valores menores são melhores (ex: cartões).</p>
                  <p>Se uma estatística não estiver disponível, seu peso é redistribuído proporcionalmente entre as demais.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Formula Tab */}
          <TabsContent value="formula" className="mt-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Como funciona o cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">1. Seleção de Anos</p>
                    <p>Considera apenas os <strong>2 anos mais recentes</strong> com estatísticas registradas.</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">2. Peso por Ano (Recência)</p>
                    <ul className="text-xs list-disc ml-4 mt-1">
                      <li>Ano mais recente: <strong>60%</strong></li>
                      <li>Segundo ano: <strong>40%</strong></li>
                      <li>Se apenas 1 ano: <strong>100%</strong></li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">3. Peso Dentro do Ano (por Minutos)</p>
                    <p>Dentro de cada ano, cada competição recebe peso proporcional aos minutos jogados:</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      peso_no_ano = minutos_comp / total_minutos_do_ano
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">4. Peso Final</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      peso_final = peso_ano × peso_no_ano
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">5. Nível da Competição</p>
                    <p>Cada competição tem um coeficiente (0.75–1.30). Convertemos para 0–100:</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      score_nivel = ((coef - 0.75) / 0.55) × 100
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">6. Estatísticas por Posição</p>
                    <p>Cada posição tem pesos diferentes. Exemplo: atacantes valorizam gols/90 (28%), zagueiros valorizam desarmes (16%).</p>
                  </div>
                </div>
                
                <div className="p-3 rounded bg-background/50 text-xs font-mono space-y-1">
                  <p className="text-muted-foreground mb-2"># Fórmula Final:</p>
                  <p>score_comp = (stats_posição × 70%) + (nível_comp × 30%)</p>
                  <p>peso_final = peso_ano × (minutos / total_minutos_ano)</p>
                  <p>contribuição = score_comp × peso_final</p>
                  <p>nota_100 = Σ(contribuição) / Σ(peso_final)</p>
                  <p>nota_0_5 = arredondar(nota_100 / 20, 0.5)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
