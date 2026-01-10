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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RatingBreakdownV2,
  CompetitionBreakdown,
  getReliabilityLabelV2,
  getReliabilityVariantV2,
} from "@/lib/playerRatingV2";
import { formatFixed } from "@/lib/formatters";

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
          {/* Competition Info */}
          <div className="grid grid-cols-4 gap-2 text-xs text-center">
            <div>
              <p className="text-muted-foreground">Coeficiente</p>
              <Badge variant="outline" className="mt-1">{formatFixed(competition.final_coefficient, 2)}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Minutos</p>
              <p className="font-medium">{competition.minutes}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Recência</p>
              <p className="font-medium">{formatFixed(competition.recency_weight * 100, 0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fator Minutos</p>
              <p className="font-medium">{formatFixed(competition.minutes_factor * 100, 0)}%</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Stats breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Estatísticas por Posição (peso ajustado)
            </p>
            
            {availableStats.map((stat) => (
              <div key={stat.stat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {stat.label}
                    <span className="text-muted-foreground/60 ml-1">
                      ({formatFixed(stat.adjusted_weight, 0)}%)
                    </span>
                  </span>
                  <span className={cn("font-medium", getScoreColor(stat.score))}>
                    {formatFixed(stat.score, 0)}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full", getScoreBarColor(stat.score))}
                    style={{ width: `${stat.score}%` }}
                  />
                </div>
              </div>
            ))}
            
            {(unavailableStats?.length ?? 0) > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Estatísticas não disponíveis (peso redistribuído):
                </p>
                <div className="flex flex-wrap gap-1">
                  {unavailableStats.map((stat) => (
                    <Badge key={stat.stat} variant="secondary" className="text-xs opacity-60">
                      {stat.label}
                    </Badge>
                  ))}
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

        <Tabs defaultValue="competitions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="competitions">Competições</TabsTrigger>
            <TabsTrigger value="weights">Pesos por Posição</TabsTrigger>
            <TabsTrigger value="formula">Como Funciona</TabsTrigger>
          </TabsList>

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
                            <th className="text-center py-2 px-1">Coef.</th>
                            <th className="text-center py-2 px-1">Min</th>
                            <th className="text-center py-2 px-1">G</th>
                            <th className="text-center py-2 px-1">A</th>
                            <th className="text-center py-2 px-1">Peso</th>
                            <th className="text-center py-2 px-1">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(details?.competitions ?? []).map((comp) => (
                            <tr key={comp.competition_id} className="border-b border-border/30">
                              <td className="py-2 px-1 max-w-[120px] truncate" title={comp.competition_name}>
                                {comp.competition_name}
                              </td>
                              <td className="py-2 px-1 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {formatFixed(comp.final_coefficient, 2)}
                                </Badge>
                              </td>
                              <td className="py-2 px-1 text-center text-muted-foreground">{comp.minutes}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.goals}</td>
                              <td className="py-2 px-1 text-center font-medium">{comp.assists}</td>
                              <td className="py-2 px-1 text-center text-muted-foreground">
                                {formatFixed(comp.combined_weight * 100, 0)}%
                              </td>
                              <td className="py-2 px-1 text-center">
                                <span className={cn("font-semibold", getScoreColor(comp.competition_score))}>
                                  {formatFixed(comp.competition_score, 0)}
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
                {(details?.competitions ?? []).map((comp) => (
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
                {details.stat_weights.map((weight) => (
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
                    <p className="font-medium text-foreground mb-1">1. Nível da Competição</p>
                    <p>Cada competição tem um coeficiente (0.75–1.30). Convertemos para 0–100:</p>
                    <code className="text-xs bg-background/50 px-2 py-1 rounded block mt-1">
                      score_nivel = ((coef - 0.75) / 0.55) × 100
                    </code>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">2. Peso de Recência</p>
                    <p>Competições mais recentes têm mais peso:</p>
                    <ul className="text-xs list-disc ml-4 mt-1">
                      <li>Mais recente: 50%</li>
                      <li>Segunda: 30%</li>
                      <li>Demais: dividem 20%</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">3. Fator de Minutos</p>
                    <p>Mais minutos = maior confiança:</p>
                    <ul className="text-xs list-disc ml-4 mt-1">
                      <li>≥1800 min: 100%</li>
                      <li>900-1799: 80%</li>
                      <li>450-899: 60%</li>
                      <li>1-449: 35%</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">4. Estatísticas por Posição</p>
                    <p>Cada posição tem pesos diferentes. Exemplo para atacantes: gols/90 vale 28%, para zagueiros: desarmes valem 16%.</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">5. Estatísticas Faltando</p>
                    <p>Se uma estatística não está disponível, seu peso é redistribuído entre as demais, garantindo que não resulte em nota zero.</p>
                  </div>
                </div>
                
                <div className="p-3 rounded bg-background/50 text-xs font-mono space-y-1">
                  <p>score_comp = (stats_posição × 70%) + (nível_comp × 30%)</p>
                  <p>peso_final = recência × fator_minutos</p>
                  <p>nota_100 = Σ(score_comp × peso) / Σ(peso)</p>
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
