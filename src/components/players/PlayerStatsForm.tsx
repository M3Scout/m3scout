import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  BarChart3, 
  Save,
  ChevronDown,
  Shield,
  Target,
  Crosshair
} from "lucide-react";
import { toast } from "sonner";
import { safeArray } from "@/lib/utils";

interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  final_coefficient: number;
}

interface PlayerStat {
  id: string;
  player_id: string;
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
  // GK specific
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  errors_leading_to_goal: number;
  aerial_duels_won: number;
  // Passing
  accurate_passes: number;
  total_passes: number;
  // Duels
  duels_won: number;
  total_duels: number;
  // Offensive
  chances_created: number;
  key_passes: number;
  shots: number;
  shots_on_target: number;
}

const emptyStatRow: Omit<PlayerStat, "id" | "player_id"> = {
  season_year: new Date().getFullYear(),
  competition_id: null,
  matches: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
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
  aerial_duels_won: 0,
  accurate_passes: 0,
  total_passes: 0,
  duels_won: 0,
  total_duels: 0,
  chances_created: 0,
  key_passes: 0,
  shots: 0,
  shots_on_target: 0,
};

interface PlayerStatsFormProps {
  playerId: string;
  playerPosition: string;
}

export function PlayerStatsForm({ playerId, playerPosition }: PlayerStatsFormProps) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isGoalkeeper = playerPosition === "Goleiro";
  const isDefender = ["Zagueiro", "Lateral Direito", "Lateral Esquerdo", "Volante"].includes(playerPosition);
  const isForward = ["Atacante", "Centroavante", "Ponta Direita", "Ponta Esquerda", "Segundo Atacante"].includes(playerPosition);

  useEffect(() => {
    fetchData();
  }, [playerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes] = await Promise.all([
        supabase
          .from("player_stats")
          .select("*")
          .eq("player_id", playerId)
          .order("season_year", { ascending: false }),
        supabase
          .from("competitions")
          .select("id, name, display_name, final_coefficient")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (compRes.error) throw compRes.error;

      setStats(statsRes.data || []);
      setCompetitions(compRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addStatRow = () => {
    const newRow: PlayerStat = {
      id: `new-${Date.now()}`,
      player_id: playerId,
      ...emptyStatRow,
    };
    setStats([newRow, ...stats]);
    setExpandedRows(new Set([...expandedRows, newRow.id]));
  };

  const updateStatField = (id: string, field: keyof PlayerStat, value: any) => {
    setStats(stats.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteStatRow = async (id: string) => {
    if (id.startsWith("new-")) {
      setStats(stats.filter(s => s.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from("player_stats").delete().eq("id", id);
      if (error) throw error;
      setStats(stats.filter(s => s.id !== id));
      toast.success("Estatística removida");
    } catch (error: any) {
      toast.error("Erro ao remover estatística");
    }
  };

  const saveStats = async () => {
    // Validate all stats before saving
    for (const stat of stats) {
      if (!stat.season_year || stat.season_year < 1900) {
        toast.error("Temporada inválida", { description: "Por favor, informe um ano de temporada válido." });
        return;
      }
      if (!stat.competition_id) {
        toast.error("Competição obrigatória", { description: "Por favor, selecione uma competição para cada registro de estatísticas." });
        return;
      }
    }

    setSaving(true);
    try {
      for (const stat of stats) {
        const data = {
          player_id: playerId,
          season_year: stat.season_year,
          competition_id: stat.competition_id, // Already validated as required
          matches: stat.matches,
          minutes: stat.minutes,
          goals: stat.goals,
          assists: stat.assists,
          yellow_cards: stat.yellow_cards,
          red_cards: stat.red_cards,
          tackles: stat.tackles,
          interceptions: stat.interceptions,
          recoveries: stat.recoveries,
          saves: stat.saves,
          goals_conceded: stat.goals_conceded,
          clean_sheets: stat.clean_sheets,
          penalties_saved: stat.penalties_saved,
          errors_leading_to_goal: stat.errors_leading_to_goal,
          aerial_duels_won: stat.aerial_duels_won,
          accurate_passes: stat.accurate_passes,
          total_passes: stat.total_passes,
          duels_won: stat.duels_won,
          total_duels: stat.total_duels,
          chances_created: stat.chances_created,
          key_passes: stat.key_passes,
          shots: stat.shots,
          shots_on_target: stat.shots_on_target,
        };

        if (stat.id.startsWith("new-")) {
          const { error } = await supabase.from("player_stats").insert(data);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("player_stats").update(data).eq("id", stat.id);
          if (error) throw error;
        }
      }

      toast.success("Estatísticas salvas com sucesso!");
      fetchData(); // Refresh to get real IDs
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar estatísticas");
    } finally {
      setSaving(false);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getCompetitionName = (compId: string | null) => {
    if (!compId) return "Sem competição";
    const comp = competitions.find(c => c.id === compId);
    return comp?.display_name || comp?.name || "Desconhecida";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Estatísticas por Temporada
            </CardTitle>
            <CardDescription>
              Gerencie as estatísticas do atleta por competição e temporada
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addStatRow}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
            <Button type="button" size="sm" onClick={saveStats} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(stats?.length ?? 0) === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma estatística registrada</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addStatRow}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar primeira
            </Button>
          </div>
        ) : (
          safeArray(stats).map((stat) => (
            <Collapsible 
              key={stat.id} 
              open={expandedRows.has(stat.id)} 
              onOpenChange={() => toggleRow(stat.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{stat.season_year}</Badge>
                      <span className="font-medium">{getCompetitionName(stat.competition_id)}</span>
                      <span className="text-sm text-muted-foreground">
                        {stat.matches} jogos • {stat.minutes} min • {stat.goals}G {stat.assists}A
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); deleteStatRow(stat.id); }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(stat.id) ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-6">
                    <Separator />
                    
                    {/* Basic Info Row */}
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Temporada</Label>
                        <Input 
                          type="number" 
                          value={stat.season_year} 
                          onChange={(e) => updateStatField(stat.id, "season_year", parseInt(e.target.value) || new Date().getFullYear())}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-3">
                        <Label className="text-xs">Competição *</Label>
                        <Select 
                          value={stat.competition_id || ""} 
                          onValueChange={(val) => updateStatField(stat.id, "competition_id", val || null)}
                        >
                          <SelectTrigger className={!stat.competition_id ? "border-destructive/50" : ""}>
                            <SelectValue placeholder="Selecione uma competição..." />
                          </SelectTrigger>
                          <SelectContent>
                            {safeArray(competitions).map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.display_name || c.name} (coef: {c.final_coefficient})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!stat.competition_id && (
                          <p className="text-xs text-destructive">Competição é obrigatória</p>
                        )}
                      </div>
                    </div>

                    {/* General Stats */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Estatísticas Gerais
                      </h4>
                      <div className="grid gap-3 grid-cols-3 sm:grid-cols-6">
                        <div className="space-y-1">
                          <Label className="text-xs">Jogos</Label>
                          <Input type="number" min="0" value={stat.matches} onChange={(e) => updateStatField(stat.id, "matches", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Minutos</Label>
                          <Input type="number" min="0" value={stat.minutes} onChange={(e) => updateStatField(stat.id, "minutes", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gols</Label>
                          <Input type="number" min="0" value={stat.goals} onChange={(e) => updateStatField(stat.id, "goals", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Assists</Label>
                          <Input type="number" min="0" value={stat.assists} onChange={(e) => updateStatField(stat.id, "assists", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Amarelos</Label>
                          <Input type="number" min="0" value={stat.yellow_cards} onChange={(e) => updateStatField(stat.id, "yellow_cards", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vermelhos</Label>
                          <Input type="number" min="0" value={stat.red_cards} onChange={(e) => updateStatField(stat.id, "red_cards", parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    {/* Defensive Stats */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Ações Defensivas
                      </h4>
                      <div className="grid gap-3 grid-cols-3 sm:grid-cols-6">
                        <div className="space-y-1">
                          <Label className="text-xs">Desarmes</Label>
                          <Input type="number" min="0" value={stat.tackles} onChange={(e) => updateStatField(stat.id, "tackles", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Interceptações</Label>
                          <Input type="number" min="0" value={stat.interceptions} onChange={(e) => updateStatField(stat.id, "interceptions", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Recuperações</Label>
                          <Input type="number" min="0" value={stat.recoveries} onChange={(e) => updateStatField(stat.id, "recoveries", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duelos Ganhos</Label>
                          <Input type="number" min="0" value={stat.duels_won} onChange={(e) => updateStatField(stat.id, "duels_won", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duelos Totais</Label>
                          <Input type="number" min="0" value={stat.total_duels} onChange={(e) => updateStatField(stat.id, "total_duels", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duelos Aéreos</Label>
                          <Input type="number" min="0" value={stat.aerial_duels_won} onChange={(e) => updateStatField(stat.id, "aerial_duels_won", parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    {/* Passing Stats */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Passes</h4>
                      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Passes Certos</Label>
                          <Input type="number" min="0" value={stat.accurate_passes} onChange={(e) => updateStatField(stat.id, "accurate_passes", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Passes Totais</Label>
                          <Input type="number" min="0" value={stat.total_passes} onChange={(e) => updateStatField(stat.id, "total_passes", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Passes Decisivos</Label>
                          <Input type="number" min="0" value={stat.key_passes} onChange={(e) => updateStatField(stat.id, "key_passes", parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Chances Criadas</Label>
                          <Input type="number" min="0" value={stat.chances_created} onChange={(e) => updateStatField(stat.id, "chances_created", parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>

                    {/* Offensive Stats (mainly for forwards/midfielders) */}
                    {!isGoalkeeper && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Crosshair className="w-4 h-4" />
                          Finalizações
                        </h4>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Chutes</Label>
                            <Input type="number" min="0" value={stat.shots} onChange={(e) => updateStatField(stat.id, "shots", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Chutes no Gol</Label>
                            <Input type="number" min="0" value={stat.shots_on_target} onChange={(e) => updateStatField(stat.id, "shots_on_target", parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Goalkeeper Stats */}
                    {isGoalkeeper && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Estatísticas de Goleiro
                        </h4>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                          <div className="space-y-1">
                            <Label className="text-xs">Defesas</Label>
                            <Input type="number" min="0" value={stat.saves} onChange={(e) => updateStatField(stat.id, "saves", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Gols Sofridos</Label>
                            <Input type="number" min="0" value={stat.goals_conceded} onChange={(e) => updateStatField(stat.id, "goals_conceded", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Clean Sheets</Label>
                            <Input type="number" min="0" value={stat.clean_sheets} onChange={(e) => updateStatField(stat.id, "clean_sheets", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Pênaltis Salvos</Label>
                            <Input type="number" min="0" value={stat.penalties_saved} onChange={(e) => updateStatField(stat.id, "penalties_saved", parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Erros p/ Gol</Label>
                            <Input type="number" min="0" value={stat.errors_leading_to_goal} onChange={(e) => updateStatField(stat.id, "errors_leading_to_goal", parseInt(e.target.value) || 0)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}

        {(stats?.length ?? 0) > 0 && (
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={saveStats} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Todas as Estatísticas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
