import { useState, useEffect } from "react";
import { safeArray } from "@/lib/utils";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  getAllPlayerStats, 
  upsertPlayerStats, 
  deletePlayerStats,
  type PlayerStats,
  type AggregatedStats,
} from "@/lib/playerStats";
import { isGoalkeeper } from "@/lib/positionUtils";
import { CompetitionStatsSummary, SeasonEvolutionChart } from "@/components/players/stats";

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
}

const currentYear = new Date().getFullYear();
const seasonOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

export function PlayerStatsSection({ playerId, playerPosition, onStatsChange }: PlayerStatsSectionProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;
  const isGK = isGoalkeeper(playerPosition);

  const [stats, setStats] = useState<StatsWithCompetition[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStats, setSelectedStats] = useState<StatsWithCompetition | null>(null);
  const [statsToDelete, setStatsToDelete] = useState<string | null>(null);
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set());

  // Toggle expanded state for a stat row
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

  // Form state - includes goalkeeper stats
  const [formData, setFormData] = useState({
    season_year: currentYear,
    competition_id: "",
    matches: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
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

  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    
    const [statsRes, competitionsRes] = await Promise.all([
      getAllPlayerStats(playerId),
      supabase.from("competitions").select("id, name, computed_coefficient").eq("is_active", true).order("name"),
    ]);

    if (statsRes.data) {
      setStats(statsRes.data as StatsWithCompetition[]);
    }
    if (competitionsRes.data) {
      setCompetitions(competitionsRes.data);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      season_year: currentYear,
      competition_id: "",
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
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
      setSelectedStats(stat);
      setFormData({
        season_year: stat.season_year,
        competition_id: stat.competition_id || "",
        matches: stat.matches,
        minutes: stat.minutes,
        goals: stat.goals,
        assists: stat.assists,
        yellow_cards: stat.yellow_cards,
        red_cards: stat.red_cards,
        tackles: stat.tackles,
        interceptions: stat.interceptions,
        recoveries: stat.recoveries,
        // Goalkeeper-specific stats
        saves: stat.saves || 0,
        goals_conceded: stat.goals_conceded || 0,
        clean_sheets: stat.clean_sheets || 0,
        penalties_saved: stat.penalties_saved || 0,
        errors_leading_to_goal: stat.errors_leading_to_goal || 0,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const { data, error } = await upsertPlayerStats({
      player_id: playerId,
      season_year: formData.season_year,
      competition_id: formData.competition_id,
      matches: formData.matches,
      minutes: formData.minutes,
      goals: formData.goals,
      assists: formData.assists,
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
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar estatísticas", { description: error.message });
      return;
    }

    toast.success(selectedStats ? "Estatísticas atualizadas!" : "Estatísticas adicionadas!");
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

  // Career totals aggregation
  const careerTotals = stats.reduce((acc, stat) => {
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
    acc.shots += stat.shots || 0;
    acc.shots_on_target += stat.shots_on_target || 0;
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
    shots: 0, shots_on_target: 0, key_passes: 0, chances_created: 0,
    successful_dribbles: 0, total_dribbles: 0, accurate_passes: 0, total_passes: 0,
    ground_duels_won: 0, ground_duels_total: 0, aerial_duels_won: 0, aerial_duels_total: 0,
    fouls_committed: 0, fouls_drawn: 0,
    saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0, errors_leading_to_goal: 0,
  });

  const uniqueSeasons = sortedSeasons.length;
  const uniqueCompetitions = new Set(stats.map(s => s.competition_id)).size;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Estatísticas por Temporada
          </CardTitle>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
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
                      <Select
                        value={formData.competition_id}
                        onValueChange={(v) => handleInputChange("competition_id", v)}
                        required
                      >
                        <SelectTrigger className={!formData.competition_id ? "border-destructive/50" : ""}>
                          <SelectValue placeholder="Selecione uma competição..." />
                        </SelectTrigger>
                        <SelectContent>
                          {safeArray(competitions).map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              {/* Career Summary Card */}
              <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Resumo de Carreira
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{uniqueSeasons} temporada{uniqueSeasons > 1 ? 's' : ''}</Badge>
                    <Badge variant="secondary">{uniqueCompetitions} competição{uniqueCompetitions > 1 ? 'ões' : ''}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  <div className="text-center px-3 py-2 rounded-lg bg-background border">
                    <div className="text-lg font-bold tabular-nums">{careerTotals.matches}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Jogos</div>
                  </div>
                  <div className="text-center px-3 py-2 rounded-lg bg-background border">
                    <div className="text-lg font-bold tabular-nums">{careerTotals.minutes}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Minutos</div>
                  </div>
                  {isGK ? (
                    <>
                      <div className="text-center px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-bold tabular-nums text-emerald-600">{careerTotals.saves}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Defesas</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-background border">
                        <div className="text-lg font-bold tabular-nums">{careerTotals.goals_conceded}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Gols Sofr</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-bold tabular-nums text-emerald-600">{careerTotals.clean_sheets}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Clean Sheets</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-background border">
                        <div className="text-lg font-bold tabular-nums">{careerTotals.penalties_saved}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Pên Def</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-bold tabular-nums text-emerald-600">{careerTotals.goals}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Gols</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="text-lg font-bold tabular-nums text-blue-600">{careerTotals.assists}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Assist</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-background border">
                        <div className="text-lg font-bold tabular-nums">{careerTotals.shots}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Chutes</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-background border">
                        <div className="text-lg font-bold tabular-nums">{careerTotals.key_passes}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">P. Decisivos</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-background border">
                        <div className="text-lg font-bold tabular-nums">{careerTotals.tackles}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Desarmes</div>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-lg font-bold tabular-nums text-amber-600">{careerTotals.yellow_cards}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Amarelos</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Season Evolution Chart */}
              <SeasonEvolutionChart stats={stats} isGoalkeeper={isGK} />

              {/* Expand/Collapse All Button */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-muted-foreground">Detalhes por Temporada</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllExpanded}
                  className="text-xs"
                >
                  <ChevronsUpDown className="w-4 h-4 mr-1" />
                  {allExpanded ? 'Recolher Todas' : 'Expandir Todas'}
                </Button>
              </div>

              {safeArray(sortedSeasons).map((season) => (
                <div key={season}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">{season}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({safeArray(statsBySeason[season]).length} competição{safeArray(statsBySeason[season]).length > 1 ? "ões" : ""})
                    </span>
                  </h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competição</TableHead>
                          <TableHead className="text-center">J</TableHead>
                          <TableHead className="text-center">Min</TableHead>
                          {isGK ? (
                            <>
                              <TableHead className="text-center">Def</TableHead>
                              <TableHead className="text-center">GS</TableHead>
                              <TableHead className="text-center">CS</TableHead>
                              <TableHead className="text-center">PD</TableHead>
                              <TableHead className="text-center">Err</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-center">G</TableHead>
                              <TableHead className="text-center">A</TableHead>
                              <TableHead className="text-center">🟨</TableHead>
                              <TableHead className="text-center">🟥</TableHead>
                              <TableHead className="text-center">Des</TableHead>
                              <TableHead className="text-center">Int</TableHead>
                              <TableHead className="text-center">Rec</TableHead>
                            </>
                          )}
                          {canEdit && <TableHead className="w-20"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeArray(statsBySeason[season]).map((stat) => (
                          <>
                            <TableRow 
                              key={stat.id} 
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleStatExpanded(stat.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <ChevronDown 
                                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                                      expandedStats.has(stat.id) ? 'rotate-180' : ''
                                    }`} 
                                  />
                                  {stat.competitions?.name || "Sem competição"}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{stat.matches}</TableCell>
                              <TableCell className="text-center">{stat.minutes}</TableCell>
                              {isGK ? (
                                <>
                                  <TableCell className="text-center font-semibold text-blue-500">
                                    {stat.saves || 0}
                                  </TableCell>
                                  <TableCell className="text-center">{stat.goals_conceded || 0}</TableCell>
                                  <TableCell className="text-center text-emerald-500">{stat.clean_sheets || 0}</TableCell>
                                  <TableCell className="text-center">{stat.penalties_saved || 0}</TableCell>
                                  <TableCell className="text-center text-red-500">{stat.errors_leading_to_goal || 0}</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="text-center font-semibold text-blue-500">
                                    {stat.goals}
                                  </TableCell>
                                  <TableCell className="text-center">{stat.assists}</TableCell>
                                  <TableCell className="text-center">{stat.yellow_cards}</TableCell>
                                  <TableCell className="text-center">{stat.red_cards}</TableCell>
                                  <TableCell className="text-center">{stat.tackles}</TableCell>
                                  <TableCell className="text-center">{stat.interceptions}</TableCell>
                                  <TableCell className="text-center">{stat.recoveries}</TableCell>
                                </>
                              )}
                              {canEdit && (
                                <TableCell>
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenDialog(stat)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    {isAdmin && (
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
                                  colSpan={isGK ? (canEdit ? 9 : 8) : (canEdit ? 11 : 10)}
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
                        ))}
                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-center">
                            {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.matches || 0), 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.minutes || 0), 0)}
                          </TableCell>
                          {isGK ? (
                            <>
                              <TableCell className="text-center text-blue-500">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.saves || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.goals_conceded || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center text-emerald-500">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.clean_sheets || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.penalties_saved || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center text-red-500">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.errors_leading_to_goal || 0), 0)}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center text-blue-500">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.goals || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.assists || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.yellow_cards || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.red_cards || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.tackles || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.interceptions || 0), 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {safeArray(statsBySeason[season]).reduce((sum, s) => sum + (s.recoveries || 0), 0)}
                              </TableCell>
                            </>
                          )}
                          {canEdit && <TableCell></TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
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
    </>
  );
}
