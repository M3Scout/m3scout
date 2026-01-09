import { useState, useEffect } from "react";
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

interface Competition {
  id: string;
  name: string;
  computed_coefficient: number;
}

interface PlayerStatsSectionProps {
  playerId: string;
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

export function PlayerStatsSection({ playerId, onStatsChange }: PlayerStatsSectionProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [stats, setStats] = useState<StatsWithCompetition[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStats, setSelectedStats] = useState<StatsWithCompetition | null>(null);
  const [statsToDelete, setStatsToDelete] = useState<string | null>(null);

  // Form state
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
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data, error } = await upsertPlayerStats({
      player_id: playerId,
      season_year: formData.season_year,
      competition_id: formData.competition_id || null,
      matches: formData.matches,
      minutes: formData.minutes,
      goals: formData.goals,
      assists: formData.assists,
      yellow_cards: formData.yellow_cards,
      red_cards: formData.red_cards,
      tackles: formData.tackles,
      interceptions: formData.interceptions,
      recoveries: formData.recoveries,
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
                          {seasonOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Competição</Label>
                      <Select
                        value={formData.competition_id}
                        onValueChange={(v) => handleInputChange("competition_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {competitions.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          {stats.length === 0 ? (
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
              {sortedSeasons.map((season) => (
                <div key={season}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">{season}</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({statsBySeason[season].length} competição{statsBySeason[season].length > 1 ? "ões" : ""})
                    </span>
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competição</TableHead>
                          <TableHead className="text-center">J</TableHead>
                          <TableHead className="text-center">Min</TableHead>
                          <TableHead className="text-center">G</TableHead>
                          <TableHead className="text-center">A</TableHead>
                          <TableHead className="text-center">🟨</TableHead>
                          <TableHead className="text-center">🟥</TableHead>
                          <TableHead className="text-center">Des</TableHead>
                          <TableHead className="text-center">Int</TableHead>
                          <TableHead className="text-center">Rec</TableHead>
                          {canEdit && <TableHead className="w-20"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsBySeason[season].map((stat) => (
                          <TableRow key={stat.id}>
                            <TableCell className="font-medium">
                              {stat.competitions?.name || "Sem competição"}
                            </TableCell>
                            <TableCell className="text-center">{stat.matches}</TableCell>
                            <TableCell className="text-center">{stat.minutes}</TableCell>
                            <TableCell className="text-center font-semibold text-primary">
                              {stat.goals}
                            </TableCell>
                            <TableCell className="text-center">{stat.assists}</TableCell>
                            <TableCell className="text-center">{stat.yellow_cards}</TableCell>
                            <TableCell className="text-center">{stat.red_cards}</TableCell>
                            <TableCell className="text-center">{stat.tackles}</TableCell>
                            <TableCell className="text-center">{stat.interceptions}</TableCell>
                            <TableCell className="text-center">{stat.recoveries}</TableCell>
                            {canEdit && (
                              <TableCell>
                                <div className="flex gap-1">
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
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.matches, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.minutes, 0)}
                          </TableCell>
                          <TableCell className="text-center text-primary">
                            {statsBySeason[season].reduce((sum, s) => sum + s.goals, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.assists, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.yellow_cards, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.red_cards, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.tackles, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.interceptions, 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statsBySeason[season].reduce((sum, s) => sum + s.recoveries, 0)}
                          </TableCell>
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
