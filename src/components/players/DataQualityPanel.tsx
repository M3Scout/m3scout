import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, BarChart3, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { supabase } from "@/integrations/supabase/client";

// Position group mapping
type PositionGroup = 'goalkeeper' | 'center_back' | 'defensive_mid' | 'midfielder' | 'forward';

const POSITION_MAPPING: Record<string, PositionGroup> = {
  'Goleiro': 'goalkeeper',
  'GK': 'goalkeeper',
  'Zagueiro': 'center_back',
  'Zagueiro Central': 'center_back',
  'CB': 'center_back',
  'Volante': 'defensive_mid',
  'Primeiro Volante': 'defensive_mid',
  'DM': 'defensive_mid',
  'CDM': 'defensive_mid',
  'Lateral Direito': 'center_back',
  'Lateral Esquerdo': 'center_back',
  'Ala Direito': 'midfielder',
  'Ala Esquerdo': 'midfielder',
  'Meia': 'midfielder',
  'Meia Atacante': 'midfielder',
  'Meia Central': 'midfielder',
  'Meio-Campo': 'midfielder',
  'Segundo Volante': 'defensive_mid',
  'CM': 'midfielder',
  'CAM': 'midfielder',
  'AM': 'midfielder',
  'Atacante': 'forward',
  'Centroavante': 'forward',
  'Ponta Direita': 'forward',
  'Ponta Esquerda': 'forward',
  'Segundo Atacante': 'forward',
  'ST': 'forward',
  'CF': 'forward',
  'RW': 'forward',
  'LW': 'forward',
};

// Expected stats per position group
const EXPECTED_STATS: Record<PositionGroup, { key: string; label: string }[]> = {
  goalkeeper: [
    { key: 'matches', label: 'Jogos' },
    { key: 'minutes', label: 'Minutos' },
    { key: 'saves', label: 'Defesas' },
    { key: 'goals_conceded', label: 'Gols Sofridos' },
    { key: 'clean_sheets', label: 'Clean Sheets' },
    { key: 'penalties_saved', label: 'Pênaltis Salvos' },
    { key: 'errors_leading_to_goal', label: 'Erros que Resultam em Gol' },
    { key: 'accurate_passes', label: 'Passes Certos' },
    { key: 'aerial_duels_won', label: 'Duelos Aéreos Vencidos' },
  ],
  center_back: [
    { key: 'matches', label: 'Jogos' },
    { key: 'minutes', label: 'Minutos' },
    { key: 'tackles', label: 'Desarmes' },
    { key: 'interceptions', label: 'Interceptações' },
    { key: 'recoveries', label: 'Recuperações' },
    { key: 'duels_won', label: 'Duelos Vencidos' },
    { key: 'total_duels', label: 'Total de Duelos' },
    { key: 'accurate_passes', label: 'Passes Certos' },
    { key: 'total_passes', label: 'Total de Passes' },
    { key: 'goals', label: 'Gols' },
    { key: 'assists', label: 'Assistências' },
    { key: 'yellow_cards', label: 'Cartões Amarelos' },
    { key: 'red_cards', label: 'Cartões Vermelhos' },
  ],
  defensive_mid: [
    { key: 'matches', label: 'Jogos' },
    { key: 'minutes', label: 'Minutos' },
    { key: 'tackles', label: 'Desarmes' },
    { key: 'recoveries', label: 'Recuperações' },
    { key: 'interceptions', label: 'Interceptações' },
    { key: 'accurate_passes', label: 'Passes Certos' },
    { key: 'total_passes', label: 'Total de Passes' },
    { key: 'goals', label: 'Gols' },
    { key: 'assists', label: 'Assistências' },
    { key: 'yellow_cards', label: 'Cartões Amarelos' },
    { key: 'red_cards', label: 'Cartões Vermelhos' },
  ],
  midfielder: [
    { key: 'matches', label: 'Jogos' },
    { key: 'minutes', label: 'Minutos' },
    { key: 'goals', label: 'Gols' },
    { key: 'assists', label: 'Assistências' },
    { key: 'chances_created', label: 'Chances Criadas' },
    { key: 'key_passes', label: 'Passes Decisivos' },
    { key: 'accurate_passes', label: 'Passes Certos' },
    { key: 'total_passes', label: 'Total de Passes' },
    { key: 'shots', label: 'Finalizações' },
    { key: 'shots_on_target', label: 'Finalizações no Gol' },
    { key: 'yellow_cards', label: 'Cartões Amarelos' },
    { key: 'red_cards', label: 'Cartões Vermelhos' },
  ],
  forward: [
    { key: 'matches', label: 'Jogos' },
    { key: 'minutes', label: 'Minutos' },
    { key: 'goals', label: 'Gols' },
    { key: 'assists', label: 'Assistências' },
    { key: 'shots', label: 'Finalizações' },
    { key: 'shots_on_target', label: 'Finalizações no Gol' },
    { key: 'chances_created', label: 'Chances Criadas' },
    { key: 'yellow_cards', label: 'Cartões Amarelos' },
    { key: 'red_cards', label: 'Cartões Vermelhos' },
  ],
};

const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  goalkeeper: 'Goleiro',
  center_back: 'Zagueiro',
  defensive_mid: 'Volante',
  midfielder: 'Meia',
  forward: 'Atacante',
};

interface PlayerStats {
  id: string;
  season_year: number;
  competition_id: string | null;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  aerial_duels_won: number;
  accurate_passes: number;
  total_passes: number;
  duels_won: number;
  total_duels: number;
  chances_created: number;
  key_passes: number;
  shots: number;
  shots_on_target: number;
  competition?: {
    name: string;
  } | null;
}

interface DataQualityPanelProps {
  playerId: string;
  position: string;
}

export function DataQualityPanel({ playerId, position }: DataQualityPanelProps) {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const positionGroup = POSITION_MAPPING[position] || 'midfielder';
  const expectedStats = EXPECTED_STATS[positionGroup];

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('player_stats')
        .select(`
          id,
          season_year,
          competition_id,
          matches,
          minutes,
          goals,
          assists,
          yellow_cards,
          red_cards,
          tackles,
          interceptions,
          recoveries,
          saves,
          goals_conceded,
          clean_sheets,
          penalties_saved,
          errors_leading_to_goal,
          aerial_duels_won,
          accurate_passes,
          total_passes,
          duels_won,
          total_duels,
          chances_created,
          key_passes,
          shots,
          shots_on_target,
          competition:competitions(name)
        `)
        .eq('player_id', playerId)
        .order('season_year', { ascending: false });

      if (!error && data) {
        setStats(data as PlayerStats[]);
      }
      setLoading(false);
    };

    fetchStats();
  }, [playerId]);

  const qualityData = useMemo(() => {
    if (stats.length === 0) {
      return {
        overall: 0,
        byCompetition: [],
      };
    }

    const byCompetition = stats.map((s) => {
      const presentStats = expectedStats.filter((expected) => {
        const value = (s as any)[expected.key];
        return value !== null && value !== undefined && value > 0;
      });

      const percentage = Math.round((presentStats.length / expectedStats.length) * 100);

      return {
        id: s.id,
        year: s.season_year,
        competition: s.competition?.name || 'Sem Competição',
        presentCount: presentStats.length,
        expectedCount: expectedStats.length,
        percentage,
        presentStats: presentStats.map((s) => s.label),
        missingStats: expectedStats
          .filter((expected) => {
            const value = (s as any)[expected.key];
            return value === null || value === undefined || value === 0;
          })
          .map((s) => s.label),
        matches: s.matches,
        minutes: s.minutes,
      };
    });

    const overall = byCompetition.length > 0
      ? Math.round(byCompetition.reduce((acc, c) => acc + c.percentage, 0) / byCompetition.length)
      : 0;

    return {
      overall,
      byCompetition,
    };
  }, [stats, expectedStats]);

  const getQualityColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getQualityBadge = (percentage: number) => {
    if (percentage >= 80) return { label: 'Boa', variant: 'default' as const };
    if (percentage >= 50) return { label: 'Parcial', variant: 'secondary' as const };
    return { label: 'Baixa', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
            Qualidade de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
            Qualidade de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Nenhuma estatística cadastrada</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const qualityBadge = getQualityBadge(qualityData.overall);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Qualidade de Dados
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={qualityBadge.variant}>{qualityBadge.label}</Badge>
                <span className={`text-lg font-bold ${getQualityColor(qualityData.overall)}`}>
                  {qualityData.overall}%
                </span>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Posição: <span className="text-foreground">{POSITION_GROUP_LABELS[positionGroup]}</span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Mostra quantas estatísticas esperadas para a posição {POSITION_GROUP_LABELS[positionGroup]} estão presentes em cada competição/ano.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-3">
              {qualityData.byCompetition.map((comp) => (
                <div key={comp.id} className="space-y-2 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{comp.competition}</p>
                      <p className="text-xs text-muted-foreground">
                        {comp.year} • {comp.matches} jogos • {comp.minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {comp.percentage >= 80 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : comp.percentage >= 50 ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-semibold ${getQualityColor(comp.percentage)}`}>
                        {comp.presentCount}/{comp.expectedCount}
                      </span>
                    </div>
                  </div>
                  <Progress value={comp.percentage} className="h-1.5" />
                  {comp.missingStats.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.missingStats.slice(0, 5).map((stat) => (
                        <Badge key={stat} variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                          {stat}
                        </Badge>
                      ))}
                      {comp.missingStats.length > 5 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                          +{comp.missingStats.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Estatísticas esperadas para {POSITION_GROUP_LABELS[positionGroup]}:</strong>{' '}
                {expectedStats.map((s) => s.label).join(', ')}
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
