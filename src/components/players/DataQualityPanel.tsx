import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, CheckCircle, Info } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
    if (percentage >= 80) return 'text-emerald-400/90';
    if (percentage >= 50) return 'text-amber-400/90';
    return 'text-rose-400/90';
  };

  const getQualityBadgeStyles = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500/[0.08] text-emerald-400/90 border-emerald-500/20';
    if (percentage >= 50) return 'bg-amber-500/[0.08] text-amber-400/90 border-amber-500/20';
    return 'bg-rose-500/[0.08] text-rose-400/90 border-rose-500/20';
  };

  const getQualityLabel = (percentage: number) => {
    if (percentage >= 80) return 'Alta';
    if (percentage >= 50) return 'Média';
    return 'Baixa';
  };

  if (loading) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Confiabilidade dos Dados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
            <div className="h-3 bg-zinc-800 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-400/80" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Confiabilidade dos Dados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-zinc-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Nenhuma estatística cadastrada</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-zinc-900/30 transition-colors pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-400/80" />
                </div>
                <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  Confiabilidade
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider border backdrop-blur-sm",
                    getQualityBadgeStyles(qualityData.overall)
                  )}
                >
                  {getQualityLabel(qualityData.overall)}
                </Badge>
                <span className={cn("text-xl font-bold", getQualityColor(qualityData.overall))}>
                  {qualityData.overall}%
                </span>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-zinc-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-600" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">
                Perfil: <span className="text-zinc-400">{POSITION_GROUP_LABELS[positionGroup]}</span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-zinc-600" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-zinc-900 border-zinc-800">
                    <p className="text-xs text-zinc-300">
                      Indica a completude das estatísticas esperadas para {POSITION_GROUP_LABELS[positionGroup]}. 
                      Quanto maior, mais confiável é a análise automática.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              {qualityData.byCompetition.map((comp) => (
                <div 
                  key={comp.id} 
                  className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-300 truncate">{comp.competition}</p>
                      <p className="text-[10px] text-zinc-600">
                        {comp.year} • {comp.matches} jogos • {comp.minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {comp.percentage >= 80 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400/80" />
                      ) : comp.percentage >= 50 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400/80" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400/80" />
                      )}
                      <span className={cn("text-xs font-semibold", getQualityColor(comp.percentage))}>
                        {comp.presentCount}/{comp.expectedCount}
                      </span>
                    </div>
                  </div>
                  <Progress value={comp.percentage} className="h-1 bg-zinc-800" />
                  {comp.missingStats.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comp.missingStats.slice(0, 4).map((stat) => (
                        <Badge 
                          key={stat} 
                          variant="outline" 
                          className="text-[9px] py-0 px-1.5 bg-zinc-900/50 text-zinc-600 border-zinc-800/50"
                        >
                          {stat}
                        </Badge>
                      ))}
                      {comp.missingStats.length > 4 && (
                        <Badge 
                          variant="outline" 
                          className="text-[9px] py-0 px-1.5 bg-zinc-900/50 text-zinc-600 border-zinc-800/50"
                        >
                          +{comp.missingStats.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
