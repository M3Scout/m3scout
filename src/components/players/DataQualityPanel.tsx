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
import { fetchUnifiedCompetitions, UnifiedCompetition } from "@/lib/unifiedCompetitions";
import { fetchPlayerMatchStatsRaw } from "@/lib/playerMatchStatsProvider";

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

interface UnifiedCompetitionStats {
  id: string;
  seasonYear: number;
  competitionName: string;
  matches: number;
  minutes: number;
  stats: Record<string, number>;
}

interface DataQualityPanelProps {
  playerId: string;
  position: string;
}

export function DataQualityPanel({ playerId, position }: DataQualityPanelProps) {
  const [unifiedStats, setUnifiedStats] = useState<UnifiedCompetitionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const positionGroup = POSITION_MAPPING[position] || 'midfielder';
  const expectedStats = EXPECTED_STATS[positionGroup];

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        // Fetch live match stats (PRIMARY SOURCE)
        const { matchPlayers, matchStats } = await fetchPlayerMatchStatsRaw({ playerId });
        
        // Fetch manual stats from manual_player_stats (FALLBACK ONLY)
        const { data: manualData } = await supabase
          .from('manual_player_stats')
          .select(`
            id,
            season_year,
            competition_id,
            games,
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
            aerial_duels_won,
            aerial_duels_lost,
            passes_completed,
            passes_failed,
            duels_won,
            duels_lost,
            chances_created,
            key_passes,
            shots,
            shots_on_target,
            competition:competitions(name, display_name)
          `)
          .eq('player_id', playerId)
          .order('season_year', { ascending: false });
        
        // Build unified stats map with PRIORITY: live > manual
        const statsMap = new Map<string, UnifiedCompetitionStats & { source: 'live' | 'manual' }>();
        
        // STEP 1: Aggregate live match stats by competition (PRIMARY)
        (matchPlayers || []).forEach((mp: any) => {
          const match = mp.match;
          if (!match || !match.competition_id) return;
          if (!['finished', 'applied'].includes(match.status)) return;
          
          const compId = match.competition_id;
          const seasonYear = match.season_year;
          const key = `${compId}-${seasonYear}`;
          const compName = match.competition?.display_name || match.competition?.name || 'Competição';
          
          const existingLive = statsMap.get(key);
          const matchStatRow = matchStats.find((ms: any) => ms.match_id === mp.match_id);
          
          const minutesPlayed = Math.min(mp.minutes_played ?? 0, 90);
          if (minutesPlayed <= 0) return;
          
          if (!existingLive) {
            statsMap.set(key, {
              id: key,
              seasonYear,
              competitionName: compName,
              matches: 1,
              minutes: minutesPlayed,
              source: 'live',
              stats: {
                matches: 1,
                minutes: minutesPlayed,
                goals: matchStatRow?.goals ?? 0,
                assists: matchStatRow?.assists ?? 0,
                yellow_cards: matchStatRow?.yellow_cards ?? 0,
                red_cards: matchStatRow?.red_cards ?? 0,
                tackles: matchStatRow?.tackles ?? 0,
                interceptions: matchStatRow?.interceptions ?? 0,
                recoveries: matchStatRow?.recoveries ?? 0,
                saves: matchStatRow?.saves ?? 0,
                goals_conceded: matchStatRow?.goals_conceded ?? 0,
                clean_sheets: 0,
                penalties_saved: 0,
                errors_leading_to_goal: 0,
                aerial_duels_won: matchStatRow?.aerial_duels_won ?? 0,
                accurate_passes: matchStatRow?.passes_completed ?? 0,
                total_passes: (matchStatRow?.passes_completed ?? 0) + (matchStatRow?.passes_total ?? 0),
                duels_won: matchStatRow?.duels_won ?? 0,
                total_duels: matchStatRow?.duels_total ?? 0,
                chances_created: matchStatRow?.chances_created ?? 0,
                key_passes: matchStatRow?.key_passes ?? 0,
                shots: matchStatRow?.shots ?? 0,
                shots_on_target: matchStatRow?.shots_on_target ?? 0,
              },
            });
          } else if (existingLive.source === 'live') {
            // Sum multiple live matches for the same competition/season
            existingLive.matches += 1;
            existingLive.minutes += minutesPlayed;
            existingLive.stats.matches += 1;
            existingLive.stats.minutes += minutesPlayed;
            if (matchStatRow) {
              existingLive.stats.goals += matchStatRow.goals ?? 0;
              existingLive.stats.assists += matchStatRow.assists ?? 0;
              existingLive.stats.yellow_cards += matchStatRow.yellow_cards ?? 0;
              existingLive.stats.red_cards += matchStatRow.red_cards ?? 0;
              existingLive.stats.tackles += matchStatRow.tackles ?? 0;
              existingLive.stats.interceptions += matchStatRow.interceptions ?? 0;
              existingLive.stats.recoveries += matchStatRow.recoveries ?? 0;
              existingLive.stats.saves += matchStatRow.saves ?? 0;
              existingLive.stats.goals_conceded += matchStatRow.goals_conceded ?? 0;
              existingLive.stats.aerial_duels_won += matchStatRow.aerial_duels_won ?? 0;
              existingLive.stats.accurate_passes += matchStatRow.passes_completed ?? 0;
              existingLive.stats.total_passes += (matchStatRow.passes_completed ?? 0) + (matchStatRow.passes_total ?? 0);
              existingLive.stats.duels_won += matchStatRow.duels_won ?? 0;
              existingLive.stats.total_duels += matchStatRow.duels_total ?? 0;
              existingLive.stats.chances_created += matchStatRow.chances_created ?? 0;
              existingLive.stats.key_passes += matchStatRow.key_passes ?? 0;
              existingLive.stats.shots += matchStatRow.shots ?? 0;
              existingLive.stats.shots_on_target += matchStatRow.shots_on_target ?? 0;
            }
          }
          // If existing source is 'live', we only sum live data (never mix with manual)
        });
        
        // STEP 2: Add manual stats ONLY for competitions that have NO live data
        (manualData || []).forEach((s: any) => {
          const compId = s.competition_id;
          if (!compId) return;
          
          const key = `${compId}-${s.season_year}`;
          
          // PRIORITY: If live data exists for this key, SKIP manual
          if (statsMap.has(key)) {
            if (import.meta.env.DEV) {
              console.log(`[DataQuality] Skipping manual for ${key} - live data takes priority`);
            }
            return;
          }
          
          const compName = s.competition?.display_name || s.competition?.name || 'Sem Competição';
          
          statsMap.set(key, {
            id: key,
            seasonYear: s.season_year,
            competitionName: compName,
            matches: s.games || 0,
            minutes: s.minutes || 0,
            source: 'manual',
            stats: {
              matches: s.games || 0,
              minutes: s.minutes || 0,
              goals: s.goals || 0,
              assists: s.assists || 0,
              yellow_cards: s.yellow_cards || 0,
              red_cards: s.red_cards || 0,
              tackles: s.tackles || 0,
              interceptions: s.interceptions || 0,
              recoveries: s.recoveries || 0,
              saves: s.saves || 0,
              goals_conceded: s.goals_conceded || 0,
              clean_sheets: s.clean_sheets || 0,
              penalties_saved: s.penalties_saved || 0,
              errors_leading_to_goal: 0,
              aerial_duels_won: s.aerial_duels_won || 0,
              accurate_passes: s.passes_completed || 0,
              total_passes: (s.passes_completed || 0) + (s.passes_failed || 0),
              duels_won: s.duels_won || 0,
              total_duels: (s.duels_won || 0) + (s.duels_lost || 0),
              chances_created: s.chances_created || 0,
              key_passes: s.key_passes || 0,
              shots: s.shots || 0,
              shots_on_target: s.shots_on_target || 0,
            },
          });
        });
        
        // Convert to array and sort by season desc
        const result = Array.from(statsMap.values())
          .map(({ source, ...rest }) => rest) // Remove source field for output
          .sort((a, b) => b.seasonYear - a.seasonYear);
        setUnifiedStats(result);
      } catch (error) {
        console.error("[DataQualityPanel] Error fetching unified stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, [playerId]);

  const qualityData = useMemo(() => {
    if (unifiedStats.length === 0) {
      return {
        overall: 0,
        byCompetition: [],
      };
    }

    const byCompetition = unifiedStats.map((s) => {
      const presentStats = expectedStats.filter((expected) => {
        const value = s.stats[expected.key];
        return value !== null && value !== undefined && value > 0;
      });

      const percentage = Math.round((presentStats.length / expectedStats.length) * 100);

      return {
        id: s.id,
        year: s.seasonYear,
        competition: s.competitionName,
        presentCount: presentStats.length,
        expectedCount: expectedStats.length,
        percentage,
        presentStats: presentStats.map((st) => st.label),
        missingStats: expectedStats
          .filter((expected) => {
            const value = s.stats[expected.key];
            return value === null || value === undefined || value === 0;
          })
          .map((st) => st.label),
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
  }, [unifiedStats, expectedStats]);

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

  if (unifiedStats.length === 0) {
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
