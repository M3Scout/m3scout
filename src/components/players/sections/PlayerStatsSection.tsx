import { useState, useEffect, useMemo } from "react";
import { cn, safeArray } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCompetitionSelect } from "@/components/ui/searchable-competition-select";
import {
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Trophy,
  Clock,
  Target,
  Shield,
  ChevronDown,
  ChevronsUpDown,
  TrendingUp,
  Zap,
  FileEdit,
  Layers,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  getAllPlayerStats, 
  upsertPlayerStats, 
  deletePlayerStats,
  type PlayerStats,
} from "@/lib/playerStats";
import { isGoalkeeper } from "@/lib/positionUtils";
import { normalizePlayerStats } from "@/lib/normalizePlayerStats";
import { CompetitionStatsSummary, SeasonEvolutionChart, SeasonStatsCard, SeasonTotalsCard } from "@/components/players/stats";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlayerMatchStatsBySeasonCompetition, type SeasonCompetitionStats } from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";

interface Competition {
  id: string;
  name: string;
  computed_coefficient: number;
}

interface PlayerStatsSectionProps {
  playerId: string;
  playerPosition?: string;
  onStatsChange?: () => void;
}

interface StatsWithCompetition extends PlayerStats {
  competitions?: {
    name: string;
    computed_coefficient: number;
  } | null;
  _isLiveData?: boolean;
  _isManualData?: boolean;
  _isCombined?: boolean;
  _liveStats?: Partial<StatsWithCompetition>;
  _manualStats?: Partial<StatsWithCompetition>;
}

const currentYear = new Date().getFullYear();
const seasonOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function PlayerStatsSection({ playerId, playerPosition, onStatsChange }: PlayerStatsSectionProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;
  const isGK = isGoalkeeper(playerPosition);
  const isMobile = useIsMobile();

  // LIVE STATS: From match_player_stats
  const { 
    stats: liveMatchStats, 
    bySeason: liveStatsBySeason, 
    seasons: liveSeasons,
    isLoading: liveLoading,
    refetch: refetchLiveStats,
  } = usePlayerMatchStatsBySeasonCompetition({ playerId });

  // Legacy manual stats from player_stats table
  const [manualStats, setManualStats] = useState<StatsWithCompetition[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStats, setSelectedStats] = useState<StatsWithCompetition | null>(null);
  const [statsToDelete, setStatsToDelete] = useState<string | null>(null);
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  const toggleStatExpanded = (statId: string) => {
    setExpandedStats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(statId)) {
        newSet.delete(statId);
      } else {
        newSet.add(statId);
      }
      return newSet;
    });
  };

  const [formData, setFormData] = useState({
    season_year: currentYear,
    competition_id: "",
    matches: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    shots_on_target: 0,
    yellow_cards: 0,
    red_cards: 0,
    tackles: 0,
    interceptions: 0,
    recoveries: 0,
    saves: 0,
    goals_conceded: 0,
    clean_sheets: 0,
    penalties_saved: 0,
    errors_leading_to_goal: 0,
  });

  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    const [statsRes, competitionsRes] = await Promise.all([
      getAllPlayerStats(playerId),
      supabase.from("competitions").select("id, name, computed_coefficient").eq("is_active", true).order("name"),
    ]);
    if (statsRes.data) setManualStats(statsRes.data as StatsWithCompetition[]);
    if (competitionsRes.data) setCompetitions(competitionsRes.data);
    setLoading(false);
  };

  // STATS CONSOLIDATION (RULE): Live has absolute priority.
  // If Live exists for (season_year, competition_id), manual MUST NOT be summed or shown as "Combinado".
  const stats = useMemo(() => {
    type ExtendedStats = StatsWithCompetition & { 
      _isLiveData?: boolean;
      _isManualData?: boolean;
      _isCombined?: boolean;
      _liveStats?: Partial<StatsWithCompetition>;
      _manualStats?: Partial<StatsWithCompetition>;
    };

    // Convert live match stats to format expected by UI
    const liveAsPlayerStats: ExtendedStats[] = liveMatchStats.map((ls) => ({
      id: `live_${ls.id}`,
      player_id: playerId,
      season_year: ls.season_year,
      competition_id: ls.competition_id,
      matches: ls.stats.matches,
      minutes: ls.stats.minutes,
      goals: ls.stats.goals,
      assists: ls.stats.assists,
      yellow_cards: ls.stats.yellow_cards,
      red_cards: ls.stats.red_cards,
      tackles: ls.stats.tackles,
      interceptions: ls.stats.interceptions,
      recoveries: ls.stats.recoveries,
      clearances: ls.stats.clearances,
      saves: ls.stats.saves,
      saves_inside_box: 0,
      goals_conceded: ls.stats.goals_conceded,
      clean_sheets: ls.stats.clean_sheets,
      penalties_saved: ls.stats.penalties_saved,
      errors_leading_to_goal: 0,
      punches: 0, successful_runs_out: 0, total_runs_out: 0, high_claims: 0,
      accurate_passes: ls.stats.passes_completed,
      total_passes: ls.stats.passes_total,
      key_passes: ls.stats.key_passes,
      chances_created: ls.stats.chances_created,
      long_passes_accurate: 0, long_passes_total: 0,
      crosses_success: ls.stats.crosses_success ?? 0,
      crosses_failed: ls.stats.crosses_failed ?? 0,
      shots: ls.stats.shots,
      shots_on_target: ls.stats.shots_on_target,
      shots_blocked: ls.stats.shots_blocked ?? 0,
      offsides: ls.stats.offsides ?? 0,
      duels_won: ls.stats.duels_won,
      total_duels: ls.stats.duels_total,
      aerial_duels_won: ls.stats.aerial_duels_won,
      aerial_duels_total: ls.stats.aerial_duels_total,
      ground_duels_won: ls.stats.ground_duels_won,
      ground_duels_total: ls.stats.ground_duels_total,
      ball_actions: ls.stats.ball_actions ?? 0,
      successful_dribbles: ls.stats.dribbles_success,
      total_dribbles: ls.stats.dribbles_total,
      possession_lost: ls.stats.possession_lost,
      fouls_drawn: ls.stats.fouls_suffered,
      fouls_committed: ls.stats.fouls_committed,
      times_dribbled_past: ls.stats.was_dribbled ?? 0,
      blocked_shots: ls.stats.blocked_shots ?? 0,
      was_dribbled: ls.stats.was_dribbled ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      competitions: ls.competition_name ? { name: ls.competition_name, computed_coefficient: 1.0 } : null,
      _isLiveData: true,
    } as ExtendedStats));

    const liveByKey = new Map<string, ExtendedStats>();
    liveAsPlayerStats.forEach(ls => {
      liveByKey.set(`${ls.season_year}_${ls.competition_id || 'none'}`, ls);
    });

    const manualWithFlag: ExtendedStats[] = manualStats.map(ms => ({ ...ms, _isManualData: true }));
    const manualByKey = new Map<string, ExtendedStats>();
    manualWithFlag.forEach(ms => {
      manualByKey.set(`${ms.season_year}_${ms.competition_id || 'none'}`, ms);
    });

    // Get all unique keys
    const allKeys = new Set([...liveByKey.keys(), ...manualByKey.keys()]);

    // Merge with PRIORITY: live > manual (no summing across sources)
    const merged: ExtendedStats[] = [];

    allKeys.forEach((key) => {
      const live = liveByKey.get(key);
      const manual = manualByKey.get(key);

      if (live) {
        merged.push(live);
        return;
      }

      if (manual) {
        merged.push(manual);
      }
    });

    // DEV-only breakdown for the unified list
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('debugStats')) {
        console.log('[PlayerStatsSectionBreakdown]', {
          playerId,
          liveKeys: Array.from(liveByKey.keys()),
          manualKeys: Array.from(manualByKey.keys()),
          merged: merged.map((s) => ({
            id: s.id,
            season_year: s.season_year,
            competition_id: s.competition_id,
            matches: s.matches,
            minutes: s.minutes,
            source: s._isLiveData ? 'live' : 'manual',
          })),
        });
      }
    }

    // Sort by season (descending) then competition name
    return merged.sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year;
      return (a.competitions?.name || "").localeCompare(b.competitions?.name || "");
    });
  }, [liveMatchStats, manualStats, playerId]);

  const resetForm = () => {
    setFormData({
      season_year: currentYear,
      competition_id: "",
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      // Shooting stats
      shots: 0,
      shots_on_target: 0,
      yellow_cards: 0,
      red_cards: 0,
      tackles: 0,
      interceptions: 0,
      recoveries: 0,
      // Goalkeeper-specific stats
      saves: 0,
      goals_conceded: 0,
      clean_sheets: 0,
      penalties_saved: 0,
      errors_leading_to_goal: 0,
    });
    setSelectedStats(null);
  };

  const handleOpenDialog = (stat?: StatsWithCompetition) => {
    if (stat) {
      const extStat = stat as StatsWithCompetition & { 
        _isLiveData?: boolean;
        _isCombined?: boolean;
        _manualStats?: StatsWithCompetition;
      };
      
      // CRITICAL: For combined or live-only stats, determine the manual portion
      // - Combined: load only manual values (NEVER fall back to live/combined totals)
      // - Live-only: if editing, start with zeros (manual portion = 0)
      // - Manual-only: load the values directly
      
      let manualStatsToEdit: StatsWithCompetition | null = null;
      
      if (extStat._isCombined && extStat._manualStats) {
        // Combined: edit only the manual portion
        manualStatsToEdit = extStat._manualStats;
      } else if (extStat._isLiveData) {
        // Pure live data: if user wants to add manual, start with zeros
        // This should NOT happen as edit is disabled for pure live, but safety fallback
        manualStatsToEdit = null;
      } else {
        // Pure manual data: load as-is
        manualStatsToEdit = stat;
      }
      
      // Set selected stats for update - use the ACTUAL manual record if exists
      setSelectedStats(manualStatsToEdit);
      
      setFormData({
        season_year: stat.season_year,
        competition_id: stat.competition_id || "",
        // CRITICAL FIX: Only use manual stats values, NEVER fall back to combined/live totals
        // If manualStatsToEdit is null, default to 0 (no manual data exists)
        matches: manualStatsToEdit?.matches ?? 0,
        minutes: manualStatsToEdit?.minutes ?? 0,
        goals: manualStatsToEdit?.goals ?? 0,
        assists: manualStatsToEdit?.assists ?? 0,
        // Shooting stats
        shots: manualStatsToEdit?.shots ?? 0,
        shots_on_target: manualStatsToEdit?.shots_on_target ?? 0,
        yellow_cards: manualStatsToEdit?.yellow_cards ?? 0,
        red_cards: manualStatsToEdit?.red_cards ?? 0,
        tackles: manualStatsToEdit?.tackles ?? 0,
        interceptions: manualStatsToEdit?.interceptions ?? 0,
        recoveries: manualStatsToEdit?.recoveries ?? 0,
        // Goalkeeper-specific stats
        saves: manualStatsToEdit?.saves ?? 0,
        goals_conceded: manualStatsToEdit?.goals_conceded ?? 0,
        clean_sheets: manualStatsToEdit?.clean_sheets ?? 0,
        penalties_saved: manualStatsToEdit?.penalties_saved ?? 0,
        errors_leading_to_goal: manualStatsToEdit?.errors_leading_to_goal ?? 0,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // Detect if a record already exists for the currently selected season+competition (new entry only)
  const existingRecordForForm = useMemo(() => {
    if (selectedStats) return null; // edit mode, not relevant
    if (!formData.competition_id) return null;
    return manualStats.find(
      s => s.season_year === formData.season_year && s.competition_id === formData.competition_id
    ) ?? null;
  }, [selectedStats, formData.season_year, formData.competition_id, manualStats]);


    e.preventDefault();

    // Validate required fields
    if (!formData.season_year || formData.season_year < 1900) {
      toast.error("Temporada inválida", { description: "Por favor, informe um ano de temporada válido." });
      return;
    }
    if (!formData.competition_id) {
      toast.error("Competição obrigatória", { description: "Por favor, selecione uma competição." });
      return;
    }

    setSaving(true);

    const isNewEntry = !selectedStats;
    const { data, error, wasAccumulated } = await upsertPlayerStats({
      player_id: playerId,
      season_year: formData.season_year,
      competition_id: formData.competition_id,
      matches: formData.matches,
      minutes: formData.minutes,
      goals: formData.goals,
      assists: formData.assists,
      // Shooting stats
      shots: formData.shots,
      shots_on_target: formData.shots_on_target,
      yellow_cards: formData.yellow_cards,
      red_cards: formData.red_cards,
      tackles: formData.tackles,
      interceptions: formData.interceptions,
      recoveries: formData.recoveries,
      // Goalkeeper-specific stats
      saves: formData.saves,
      goals_conceded: formData.goals_conceded,
      clean_sheets: formData.clean_sheets,
      penalties_saved: formData.penalties_saved,
      errors_leading_to_goal: formData.errors_leading_to_goal,
    }, { mode: isNewEntry ? 'accumulate' : 'replace' });

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar estatísticas", { description: error.message });
      return;
    }

    if (wasAccumulated) {
      toast.success("Dados acumulados com sucesso!", { 
        description: "Os novos valores foram somados ao total existente da competição." 
      });
    } else {
      toast.success(selectedStats ? "Estatísticas atualizadas!" : "Estatísticas adicionadas!");
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
    // Notify parent that stats changed (triggers auto_rating refresh)
    onStatsChange?.();
  };

  const handleDelete = async () => {
    if (!statsToDelete) return;

    const { error } = await deletePlayerStats(statsToDelete);

    if (error) {
      toast.error("Erro ao excluir estatísticas", { description: error.message });
      return;
    }

    toast.success("Estatísticas excluídas!");
    setDeleteDialogOpen(false);
    setStatsToDelete(null);
    fetchData();
    // Notify parent that stats changed
    onStatsChange?.();
  };

  const handleInputChange = (field: string, value: number | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Group stats by season
  const statsBySeason = stats.reduce((acc, stat) => {
    const year = stat.season_year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(stat);
    return acc;
  }, {} as Record<number, StatsWithCompetition[]>);

  const sortedSeasons = Object.keys(statsBySeason)
    .map(Number)
    .sort((a, b) => b - a);

  // Toggle all expanded/collapsed
  const allStatsIds = stats.map(s => s.id);
  const allExpanded = allStatsIds.length > 0 && allStatsIds.every(id => expandedStats.has(id));
  
  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedStats(new Set());
    } else {
      setExpandedStats(new Set(allStatsIds));
    }
  };

  // Career totals aggregation - CRITICAL: Use normalizePlayerStats for correct shots total
  const careerTotals = stats.reduce((acc, stat) => {
    // Normalize to get shots_total_derived
    const normalized = normalizePlayerStats(stat as PlayerStats);
    acc.matches += stat.matches || 0;
    acc.minutes += stat.minutes || 0;
    acc.goals += stat.goals || 0;
    acc.assists += stat.assists || 0;
    acc.yellow_cards += stat.yellow_cards || 0;
    acc.red_cards += stat.red_cards || 0;
    acc.tackles += stat.tackles || 0;
    acc.interceptions += stat.interceptions || 0;
    acc.recoveries += stat.recoveries || 0;
    acc.clearances += stat.clearances || 0;
    // CRITICAL: Use shots_total_derived for correct FIN calculation
    acc.shots += normalized.shots_total_derived || 0;
    acc.shots_on_target += stat.shots_on_target || 0;
    acc.shots_blocked += normalized.shots_blocked || 0;
    acc.key_passes += stat.key_passes || 0;
    acc.chances_created += stat.chances_created || 0;
    acc.successful_dribbles += stat.successful_dribbles || 0;
    acc.total_dribbles += stat.total_dribbles || 0;
    acc.accurate_passes += stat.accurate_passes || 0;
    acc.total_passes += stat.total_passes || 0;
    acc.ground_duels_won += stat.ground_duels_won || 0;
    acc.ground_duels_total += stat.ground_duels_total || 0;
    acc.aerial_duels_won += stat.aerial_duels_won || 0;
    acc.aerial_duels_total += stat.aerial_duels_total || 0;
    acc.fouls_committed += stat.fouls_committed || 0;
    acc.fouls_drawn += stat.fouls_drawn || 0;
    // GK stats
    acc.saves += stat.saves || 0;
    acc.goals_conceded += stat.goals_conceded || 0;
    acc.clean_sheets += stat.clean_sheets || 0;
    acc.penalties_saved += stat.penalties_saved || 0;
    acc.errors_leading_to_goal += stat.errors_leading_to_goal || 0;
    return acc;
  }, {
    matches: 0, minutes: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
    tackles: 0, interceptions: 0, recoveries: 0, clearances: 0,
    shots: 0, shots_on_target: 0, shots_blocked: 0, key_passes: 0, chances_created: 0,
    successful_dribbles: 0, total_dribbles: 0, accurate_passes: 0, total_passes: 0,
    ground_duels_won: 0, ground_duels_total: 0, aerial_duels_won: 0, aerial_duels_total: 0,
    fouls_committed: 0, fouls_drawn: 0,
    saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0, errors_leading_to_goal: 0,
  });

  const uniqueSeasons = sortedSeasons.length;
  const uniqueCompetitions = new Set(stats.map(s => s.competition_id)).size;

  // Combined loading state
  const isLoading = loading || liveLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden">
      <Card className="border-zinc-800/40 bg-gradient-to-b from-zinc-950/95 via-zinc-950/90 to-zinc-900/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-400/80" />
              </div>
              <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Estatísticas por Temporada
              </span>
            </CardTitle>
            {liveMatchStats.length > 0 && (
              <p className="text-[10px] text-zinc-600 flex items-center gap-1 ml-10">
                <Zap className="w-3 h-3 text-emerald-400/80" />
                Sincronizado de {liveMatchStats.length} partida{liveMatchStats.length > 1 ? 's' : ''} ao vivo
              </p>
            )}
          </div>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleOpenDialog()}
                  className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800/50 hover:border-zinc-700/60"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedStats ? "Editar Estatísticas" : "Adicionar Estatísticas"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Season and Competition */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Temporada *</Label>
                      <Select
                        value={formData.season_year.toString()}
                        onValueChange={(v) => handleInputChange("season_year", parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {safeArray(seasonOptions).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Competição *</Label>
                      <SearchableCompetitionSelect
                        competitions={safeArray(competitions)}
                        value={formData.competition_id}
                        onValueChange={(v) => handleInputChange("competition_id", v)}
                        placeholder="Selecione uma competição..."
                        triggerClassName={!formData.competition_id ? "border-destructive/50" : ""}
                      />
                      {!formData.competition_id && (
                        <p className="text-xs text-destructive">Competição é obrigatória</p>
                      )}
                    </div>
                  </div>

                  {/* Matches and Minutes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Jogos
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.matches}
                        onChange={(e) => handleInputChange("matches", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Minutos
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.minutes}
                        onChange={(e) => handleInputChange("minutes", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Goals and Assists */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Gols
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.goals}
                        onChange={(e) => handleInputChange("goals", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assistências</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.assists}
                        onChange={(e) => handleInputChange("assists", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Shooting Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Finalizações (Total)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.shots}
                        onChange={(e) => handleInputChange("shots", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={formData.shots_on_target > formData.shots ? "text-destructive" : ""}>
                        Finalizações no Gol
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={formData.shots}
                        value={formData.shots_on_target}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleInputChange("shots_on_target", Math.min(value, formData.shots));
                        }}
                        className={formData.shots_on_target > formData.shots ? "border-destructive" : ""}
                      />
                      {formData.shots_on_target > formData.shots && (
                        <p className="text-xs text-destructive">Não pode ser maior que o total</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Finalizações Fora</Label>
                      <Input
                        type="number"
                        value={Math.max(0, formData.shots - formData.shots_on_target)}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cartões Amarelos</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.yellow_cards}
                        onChange={(e) => handleInputChange("yellow_cards", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cartões Vermelhos</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.red_cards}
                        onChange={(e) => handleInputChange("red_cards", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Defensive Actions */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Desarmes
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.tackles}
                        onChange={(e) => handleInputChange("tackles", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interceptações</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.interceptions}
                        onChange={(e) => handleInputChange("interceptions", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Recuperações</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.recoveries}
                        onChange={(e) => handleInputChange("recoveries", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Goalkeeper-specific Stats */}
                  {isGK && (
                    <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h4 className="font-medium flex items-center gap-2 text-primary">
                        <Shield className="w-4 h-4" />
                        Estatísticas de Goleiro
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Defesas</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.saves}
                            onChange={(e) => handleInputChange("saves", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gols Sofridos</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.goals_conceded}
                            onChange={(e) => handleInputChange("goals_conceded", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Clean Sheets</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.clean_sheets}
                            onChange={(e) => handleInputChange("clean_sheets", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pênaltis Defendidos</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.penalties_saved}
                            onChange={(e) => handleInputChange("penalties_saved", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Erros p/ Gol</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.errors_leading_to_goal}
                            onChange={(e) => handleInputChange("errors_leading_to_goal", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {selectedStats ? "Salvar" : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {(stats?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma estatística registrada</p>
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar primeira estatística
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Career Summary Card - Premium Headline */}
              <div className="relative rounded-xl p-5 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-950/80 border border-white/[0.04] overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400/80" />
                    Resumo de Carreira
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-zinc-900/60 border-zinc-800/50 text-zinc-500">
                      {uniqueSeasons} temporada{uniqueSeasons > 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-zinc-900/60 border-zinc-800/50 text-zinc-500">
                      {uniqueCompetitions} competição{uniqueCompetitions > 1 ? 'ões' : ''}
                    </Badge>
                  </div>
                </div>
                
                {/* Premium Stats Grid - number > label hierarchy */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {/* Base stats */}
                  <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                    <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.matches}</div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Jogos</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                    <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.minutes.toLocaleString()}</div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Minutos</div>
                  </div>
                  
                  {isGK ? (
                    <>
                      <div className="text-center p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                        <div className="text-2xl font-bold tabular-nums text-emerald-400/90">{careerTotals.saves}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Defesas</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/10">
                        <div className="text-2xl font-bold tabular-nums text-rose-400/80">{careerTotals.goals_conceded}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Gols Sofr</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                        <div className="text-2xl font-bold tabular-nums text-emerald-400/90">{careerTotals.clean_sheets}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Clean Sheets</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                        <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.penalties_saved}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Pên Def</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                        <div className="text-2xl font-bold tabular-nums text-emerald-400/90">{careerTotals.goals}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Gols</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
                        <div className="text-2xl font-bold tabular-nums text-blue-400/90">{careerTotals.assists}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Assist</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                        <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.shots}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Chutes</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                        <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.key_passes}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">P. Decisivos</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                        <div className="text-2xl font-bold tabular-nums text-white">{careerTotals.tackles}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Desarmes</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/15">
                        <div className="text-2xl font-bold tabular-nums text-amber-400/90">{careerTotals.yellow_cards}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-1">Amarelos</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Season Evolution Chart */}
              <SeasonEvolutionChart stats={stats} isGoalkeeper={isGK} />

              {/* Expand/Collapse All Button */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Detalhes por Temporada</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllExpanded}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-1" />
                  {allExpanded ? 'Recolher Todas' : 'Expandir Todas'}
                </Button>
              </div>

              {safeArray(sortedSeasons).map((season) => (
                <div key={season} className="w-full max-w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold px-3">
                      {season}
                    </Badge>
                    <span className="text-xs text-zinc-600">
                      {safeArray(statsBySeason[season]).length} competição{safeArray(statsBySeason[season]).length > 1 ? "ões" : ""}
                    </span>
                  </div>

                  {/* Mobile: Card layout */}
                  {isMobile ? (
                    <div className="space-y-2 w-full max-w-full min-w-0">
                      {safeArray(statsBySeason[season]).map((stat) => (
                        <SeasonStatsCard
                          key={stat.id}
                          stat={stat}
                          isGK={isGK}
                          isExpanded={expandedStats.has(stat.id)}
                          canEdit={canEdit}
                          isAdmin={isAdmin}
                          playerPosition={playerPosition}
                          onToggleExpand={() => toggleStatExpanded(stat.id)}
                          onEdit={() => handleOpenDialog(stat)}
                          onDelete={() => {
                            // For combined stats, delete only the manual portion
                            const idToDelete = stat._isCombined 
                              ? (stat._manualStats as any)?.id 
                              : stat.id;
                            if (idToDelete && !String(idToDelete).startsWith('live_')) {
                              setStatsToDelete(idToDelete);
                              setDeleteDialogOpen(true);
                            }
                          }}
                        />
                      ))}
                      {safeArray(statsBySeason[season]).length > 1 && (
                        <SeasonTotalsCard
                          seasonStats={statsBySeason[season]}
                          isGK={isGK}
                        />
                      )}
                    </div>
                  ) : (
                    /* Desktop: Premium Table layout */
                    <div className="border border-zinc-800/40 rounded-xl overflow-hidden bg-zinc-900/30">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-zinc-800/40 bg-zinc-900/50">
                            <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500">Competição</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">J</TableHead>
                            <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Min</TableHead>
                            {isGK ? (
                              <>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Def</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">GS</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">CS</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">PD</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Err</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">G</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">A</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Fin</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">NoG</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">🟨</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">🟥</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Des</TableHead>
                                <TableHead className="text-center text-[10px] uppercase tracking-wider text-zinc-500">Int</TableHead>
                              </>
                            )}
                            {canEdit && <TableHead className="w-20"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {safeArray(statsBySeason[season]).map((stat, idx) => {
                            // CRITICAL: Normalize to get correct shots_total_derived
                            const normalizedStat = normalizePlayerStats(stat as PlayerStats);
                            return (
                              <>
                              <TableRow 
                                key={stat.id} 
                                className={cn(
                                  "cursor-pointer transition-all duration-150",
                                  "hover:bg-zinc-800/30",
                                  idx % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20",
                                  "border-b border-zinc-800/20"
                                )}
                                onClick={() => toggleStatExpanded(stat.id)}
                              >
                                <TableCell className="font-medium py-3">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown 
                                      className={cn(
                                        "w-4 h-4 text-zinc-600 transition-transform duration-200",
                                        expandedStats.has(stat.id) && 'rotate-180 text-primary'
                                      )} 
                                    />
                                    <span className="text-sm text-zinc-300">{stat.competitions?.name || "Sem competição"}</span>
                                    {/* Origin Badge */}
                                    {stat._isCombined ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-400 bg-purple-500/10 gap-1">
                                              <Layers className="w-2.5 h-2.5" />
                                              Combinado
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs max-w-xs">
                                            <p className="font-medium mb-1">Live Match + Manual</p>
                                            <p className="text-muted-foreground">
                                              Valores somados de partidas ao vivo ({stat._liveStats?.matches || 0} jogos) 
                                              e entrada manual ({stat._manualStats?.matches || 0} jogos).
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : stat._isLiveData ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10 gap-1">
                                              <Zap className="w-2.5 h-2.5" />
                                              Live
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Dados de partidas ao vivo (não editável aqui)
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : stat._isManualData ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400 bg-blue-500/10 gap-1">
                                              <FileEdit className="w-2.5 h-2.5" />
                                              Manual
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Dados inseridos manualmente
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.matches}</TableCell>
                                <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.minutes}</TableCell>
                                {isGK ? (
                                  <>
                                    <TableCell className="text-center font-bold text-emerald-400/90 tabular-nums">
                                      {stat.saves || 0}
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.goals_conceded || 0}</TableCell>
                                    <TableCell className="text-center font-semibold text-emerald-400/90 tabular-nums">{stat.clean_sheets || 0}</TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.penalties_saved || 0}</TableCell>
                                    <TableCell className="text-center text-sm text-rose-400/80 tabular-nums">{stat.errors_leading_to_goal || 0}</TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell className="text-center font-bold text-emerald-400/90 tabular-nums">
                                      {stat.goals}
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-blue-400/90 tabular-nums">{stat.assists}</TableCell>
                                    {/* CRITICAL: Use shots_total_derived for correct FIN calculation */}
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{normalizedStat.shots_total_derived}</TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.shots_on_target || 0}</TableCell>
                                    <TableCell className="text-center text-sm text-amber-400/80 tabular-nums">{stat.yellow_cards}</TableCell>
                                    <TableCell className="text-center text-sm text-rose-400/80 tabular-nums">{stat.red_cards}</TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.tackles}</TableCell>
                                    <TableCell className="text-center text-sm text-zinc-400 tabular-nums">{stat.interceptions}</TableCell>
                                  </>
                                )}
                                {canEdit && (
                                  <TableCell>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      {/* Only show edit for manual or combined stats */}
                                      {(stat._isManualData || stat._isCombined) ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDialog(stat)}
                                              >
                                                <Pencil className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              {stat._isCombined 
                                                ? "Editar parte manual"
                                                : "Editar estatísticas"
                                              }
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : stat._isLiveData ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-40 cursor-not-allowed"
                                                disabled
                                              >
                                                <Lock className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              Use o Modo Revisão da partida para editar
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenDialog(stat)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                      )}
                                      {isAdmin && stat._isManualData && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setStatsToDelete(stat.id);
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                              {/* Expanded row with full stats */}
                              {expandedStats.has(stat.id) && (
                                <TableRow key={`${stat.id}-expanded`}>
                                  <TableCell 
                                    colSpan={isGK ? (canEdit ? 9 : 8) : (canEdit ? 12 : 11)}
                                    className="bg-muted/30 p-4"
                                  >
                                    <CompetitionStatsSummary
                                      stats={stat as PlayerStats}
                                      playerPosition={playerPosition}
                                      competitionName={stat.competitions?.name}
                                    />
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                            );
                          })}
                          {/* Totals row - Premium visual closure */}
                          <TableRow className="bg-gradient-to-r from-zinc-800/40 via-zinc-800/30 to-zinc-800/40 border-t-2 border-zinc-700/50">
                            <TableCell className="py-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total</span>
                            </TableCell>
                            <TableCell className="text-center font-bold text-white tabular-nums">
                              {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.matches || 0), 0)}
                            </TableCell>
                            <TableCell className="text-center font-bold text-white tabular-nums">
                              {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.minutes || 0), 0)}
                            </TableCell>
                            {isGK ? (
                              <>
                                <TableCell className="text-center font-bold text-emerald-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.saves || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-white tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.goals_conceded || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-emerald-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.clean_sheets || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-white tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.penalties_saved || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-rose-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.errors_leading_to_goal || 0), 0)}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-center font-bold text-emerald-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.goals || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-blue-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.assists || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-white tabular-nums">
                                  {/* CRITICAL: Use shots_total_derived for correct FIN calculation */}
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (normalizePlayerStats(s as PlayerStats).shots_total_derived || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-white tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.shots_on_target || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-amber-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.yellow_cards || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center font-bold text-rose-400 tabular-nums">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.red_cards || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.tackles || 0), 0)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.interceptions || 0), 0)}
                                </TableCell>
                              </>
                            )}
                            {canEdit && <TableCell></TableCell>}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estatísticas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As estatísticas serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
