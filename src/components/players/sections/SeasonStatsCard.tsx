import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  Pencil,
  Loader2,
  Trophy,
  Clock,
  Target,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SeasonStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
}

interface SeasonStatsCardProps {
  playerId: string;
  onStatsChange?: () => void;
}

const currentYear = new Date().getFullYear();

export function SeasonStatsCard({ playerId, onStatsChange }: SeasonStatsCardProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [existingStatsId, setExistingStatsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState<SeasonStats>({
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
    fetchStats();
  }, [playerId]);

  const fetchStats = async () => {
    setLoading(true);

    // Fetch aggregated stats for current year (without competition)
    const { data, error } = await supabase
      .from("player_stats")
      .select("*")
      .eq("player_id", playerId)
      .eq("season_year", currentYear)
      .is("competition_id", null)
      .maybeSingle();

    if (error) {
      console.error("Error fetching stats:", error);
    }

    if (data) {
      setStats({
        matches: data.matches,
        minutes: data.minutes,
        goals: data.goals,
        assists: data.assists,
        yellow_cards: data.yellow_cards,
        red_cards: data.red_cards,
        tackles: data.tackles,
        interceptions: data.interceptions,
        recoveries: data.recoveries,
      });
      setExistingStatsId(data.id);
      setFormData({
        matches: data.matches,
        minutes: data.minutes,
        goals: data.goals,
        assists: data.assists,
        yellow_cards: data.yellow_cards,
        red_cards: data.red_cards,
        tackles: data.tackles,
        interceptions: data.interceptions,
        recoveries: data.recoveries,
      });
    } else {
      // If no stats without competition, aggregate all stats for the year
      const { data: allStats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .eq("season_year", currentYear);

      if (allStats && allStats.length > 0) {
        const aggregated = allStats.reduce(
          (acc, s) => ({
            matches: acc.matches + s.matches,
            minutes: acc.minutes + s.minutes,
            goals: acc.goals + s.goals,
            assists: acc.assists + s.assists,
            yellow_cards: acc.yellow_cards + s.yellow_cards,
            red_cards: acc.red_cards + s.red_cards,
            tackles: acc.tackles + s.tackles,
            interceptions: acc.interceptions + s.interceptions,
            recoveries: acc.recoveries + s.recoveries,
          }),
          {
            matches: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            tackles: 0,
            interceptions: 0,
            recoveries: 0,
          }
        );
        setStats(aggregated);
        setFormData(aggregated);
      } else {
        setStats(null);
      }
      setExistingStatsId(null);
    }

    setLoading(false);
  };

  const handleOpenDialog = () => {
    if (stats) {
      setFormData(stats);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Upsert using player_id + season_year + competition_id NULL
    const { error } = await supabase.from("player_stats").upsert(
      {
        id: existingStatsId || undefined,
        player_id: playerId,
        season_year: currentYear,
        competition_id: null,
        ...formData,
      },
      {
        onConflict: "player_id,season_year,competition_id",
        ignoreDuplicates: false,
      }
    );

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar estatísticas", { description: error.message });
      return;
    }

    toast.success("Estatísticas atualizadas!");
    setDialogOpen(false);
    fetchStats();
    onStatsChange?.();
  };

  const handleInputChange = (field: keyof SeasonStats, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5" />
            Estatísticas ({currentYear})
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleOpenDialog}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar Estatísticas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!stats ? (
            <div className="text-center py-6 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma estatística registrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {/* Matches */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <Trophy className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.matches}</p>
                <p className="text-xs text-muted-foreground">Jogos</p>
              </div>

              {/* Minutes */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.minutes}</p>
                <p className="text-xs text-muted-foreground">Minutos</p>
              </div>

              {/* Goals */}
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-primary">{stats.goals}</p>
                <p className="text-xs text-muted-foreground">Gols</p>
              </div>

              {/* Assists */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold">{stats.assists}</p>
                <p className="text-xs text-muted-foreground">Assistências</p>
              </div>

              {/* Yellow Cards */}
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <p className="text-2xl font-bold text-amber-600">{stats.yellow_cards}</p>
                <p className="text-xs text-muted-foreground">Amarelos</p>
              </div>

              {/* Red Cards */}
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{stats.red_cards}</p>
                <p className="text-xs text-muted-foreground">Vermelhos</p>
              </div>

              {/* Tackles */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <Shield className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.tackles}</p>
                <p className="text-xs text-muted-foreground">Desarmes</p>
              </div>

              {/* Interceptions */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold">{stats.interceptions}</p>
                <p className="text-xs text-muted-foreground">Interceptações</p>
              </div>

              {/* Recoveries */}
              <div className="text-center p-3 rounded-lg bg-secondary/30">
                <p className="text-2xl font-bold">{stats.recoveries}</p>
                <p className="text-xs text-muted-foreground">Recuperações</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Estatísticas - {currentYear}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) =>
                    handleInputChange("matches", parseInt(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    handleInputChange("minutes", parseInt(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    handleInputChange("goals", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Assistências</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.assists}
                  onChange={(e) =>
                    handleInputChange("assists", parseInt(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    handleInputChange("yellow_cards", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cartões Vermelhos</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.red_cards}
                  onChange={(e) =>
                    handleInputChange("red_cards", parseInt(e.target.value) || 0)
                  }
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
                  onChange={(e) =>
                    handleInputChange("tackles", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Interceptações</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.interceptions}
                  onChange={(e) =>
                    handleInputChange("interceptions", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Recuperações</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.recoveries}
                  onChange={(e) =>
                    handleInputChange("recoveries", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
