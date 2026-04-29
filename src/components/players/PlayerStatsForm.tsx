import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Loader2,
  BarChart3,
  Save,
  ChevronDown,
  Target,
  AlertTriangle,
  Info,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { safeArray } from "@/lib/utils";
import {
  ScoutCategoryStats,
  OUTFIELD_SCOUT_CATEGORIES,
  GOALKEEPER_SCOUT_CATEGORIES,
  type StatValues,
} from "@/components/players/stats/ScoutCategoryStats";
import { clampStatValue, validateSeasonStats, getStatLimit } from "@/lib/statLimits";

/**
 * Converte um PlayerStat (com possíveis valores "" / null) em um
 * StatValues numérico para alimentar o ScoutCategoryStats.
 */
function statToScoutValues(stat: Record<string, unknown>): StatValues {
  const out: StatValues = {};
  for (const [k, v] of Object.entries(stat)) {
    if (v === "" || v === null || v === undefined) {
      out[k] = 0;
    } else if (typeof v === "number") {
      out[k] = isNaN(v) ? 0 : v;
    } else if (typeof v === "string") {
      const parsed = Number(v);
      out[k] = isNaN(parsed) ? 0 : parsed;
    }
  }
  return out;
}


interface Competition {
  id: string;
  name: string;
  display_name: string | null;
  final_coefficient: number;
}

// Type for numeric stat fields - can be number, null, or empty string for form handling
type StatValue = number | null | "";

interface PlayerStat {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  matches: StatValue;
  minutes: StatValue;
  goals: StatValue;
  assists: StatValue;
  yellow_cards: StatValue;
  red_cards: StatValue;
  tackles: StatValue;
  interceptions: StatValue;
  recoveries: StatValue;
  // GK specific
  saves: StatValue;
  goals_conceded: StatValue;
  clean_sheets: StatValue;
  penalties_saved: StatValue;
  errors_leading_to_goal: StatValue;
  aerial_duels_won: StatValue;
  aerial_duels_total: StatValue;
  // Passing
  accurate_passes: StatValue;
  total_passes: StatValue;
  // Duels
  duels_won: StatValue;
  total_duels: StatValue;
  ground_duels_won: StatValue;
  ground_duels_total: StatValue;
  // Offensive
  chances_created: StatValue;
  key_passes: StatValue;
  shots: StatValue;
  shots_on_target: StatValue;
  shots_blocked: StatValue;
  // Additional GK
  saves_inside_box: StatValue;
  punches: StatValue;
  high_claims: StatValue;
  successful_runs_out: StatValue;
  total_runs_out: StatValue;
  // Other
  fouls_committed: StatValue;
  fouls_drawn: StatValue;
  offsides: StatValue;
  clearances: StatValue;
  times_dribbled_past: StatValue;
  possession_lost: StatValue;
  long_passes_accurate: StatValue;
  long_passes_total: StatValue;
  successful_dribbles: StatValue;
  total_dribbles: StatValue;
  // Crosses
  crosses_success: StatValue;
  crosses_failed: StatValue;
}

// Helper to normalize stat value to number for saving.
// When `key` is provided, we also clamp it to the configured min/max
// (see src/lib/statLimits.ts) so we never persist negative or absurd values.
const normalizeStatValue = (value: StatValue, key?: string): number => {
  if (value === null || value === "" || value === undefined) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  const safe = isNaN(num) ? 0 : num;
  return key ? clampStatValue(key, safe) : Math.max(0, safe);
};

const emptyStatRow: Omit<PlayerStat, "id" | "player_id"> = {
  season_year: new Date().getFullYear(),
  competition_id: null,
  matches: "",
  minutes: "",
  goals: "",
  assists: "",
  yellow_cards: "",
  red_cards: "",
  tackles: "",
  interceptions: "",
  recoveries: "",
  saves: "",
  goals_conceded: "",
  clean_sheets: "",
  penalties_saved: "",
  errors_leading_to_goal: "",
  aerial_duels_won: "",
  aerial_duels_total: "",
  accurate_passes: "",
  total_passes: "",
  duels_won: "",
  total_duels: "",
  ground_duels_won: "",
  ground_duels_total: "",
  chances_created: "",
  key_passes: "",
  shots: "",
  shots_on_target: "",
  shots_blocked: "",
  saves_inside_box: "",
  punches: "",
  high_claims: "",
  successful_runs_out: "",
  total_runs_out: "",
  fouls_committed: "",
  fouls_drawn: "",
  offsides: "",
  clearances: "",
  times_dribbled_past: "",
  possession_lost: "",
  long_passes_accurate: "",
  long_passes_total: "",
  successful_dribbles: "",
  total_dribbles: "",
  crosses_success: "",
  crosses_failed: "",
};

interface PlayerStatsFormProps {
  playerId: string;
  playerPosition: string;
}

// Stat input with tooltip - supports empty values for better UX
interface StatInputProps {
  label: string;
  value: StatValue;
  onChange: (value: StatValue) => void;
  tooltip?: string;
  warning?: string;
  min?: number;
  step?: number;
}

function StatInput({ label, value, onChange, tooltip, warning, min = 0, step = 1 }: StatInputProps) {
  // Display empty string when value is null, undefined, or empty string
  const displayValue = value === null || value === undefined || value === "" ? "" : value;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // If empty, keep as empty string (will be normalized to 0 on save)
    if (rawValue === "") {
      onChange("");
      return;
    }
    // Parse the number
    const parsed = step < 1 ? parseFloat(rawValue) : parseInt(rawValue, 10);
    onChange(isNaN(parsed) ? "" : parsed);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input 
        type="number" 
        min={min}
        step={step}
        value={displayValue} 
        onChange={handleChange}
        placeholder="0"
        className={warning ? "border-amber-400" : ""}
      />
      {warning && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {warning}
        </p>
      )}
    </div>
  );
}

// Summary badge component - handles StatValue type
function SummaryBadge({ label, value, highlight = false }: { label: string; value: StatValue; highlight?: boolean }) {
  const displayValue = value === null || value === undefined || value === "" ? 0 : value;
  return (
    <div className={`text-center px-2 py-1 rounded ${highlight ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
      <div className={`text-sm font-semibold ${highlight ? 'text-primary' : ''}`}>{displayValue}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

export function PlayerStatsForm({ playerId, playerPosition }: PlayerStatsFormProps) {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isGoalkeeper = playerPosition === "Goleiro" || playerPosition === "GK";

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
    setStats(currentStats => currentStats.map(s => {
      if (s.id !== id) return s;
      
      const updated = { ...s, [field]: value };
      
      // Auto-correct: shots_on_target > shots → adjust shots
      if (field === "shots_on_target") {
        const shotsOnTarget = normalizeStatValue(value);
        const shots = normalizeStatValue(s.shots);
        if (shotsOnTarget > shots) {
          updated.shots = value;
        }
      }
      
      return updated;
    }));
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

  const STAT_KEYS = [
    "matches", "minutes", "goals", "assists", "yellow_cards", "red_cards",
    "tackles", "interceptions", "recoveries", "saves", "goals_conceded",
    "clean_sheets", "penalties_saved", "errors_leading_to_goal",
    "aerial_duels_won", "aerial_duels_total", "accurate_passes", "total_passes",
    "duels_won", "total_duels", "ground_duels_won", "ground_duels_total",
    "chances_created", "key_passes", "shots", "shots_on_target", "shots_blocked",
    "saves_inside_box", "punches", "high_claims", "successful_runs_out",
    "total_runs_out", "fouls_committed", "fouls_drawn", "offsides",
    "clearances", "times_dribbled_past", "possession_lost",
    "long_passes_accurate", "long_passes_total", "successful_dribbles",
    "total_dribbles", "crosses_success", "crosses_failed",
  ] as const;

  const buildStatPayload = (stat: PlayerStat): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const key of STAT_KEYS) {
      out[key] = normalizeStatValue(stat[key as keyof PlayerStat] as StatValue, key);
    }
    return out;
  };

  const saveStats = async () => {
    // 1) Validate metadata first
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

    // 2) Validate numeric ranges + success/total pairs
    for (const stat of stats) {
      const payload = buildStatPayload(stat);
      const issues = validateSeasonStats(payload);
      if (issues.length > 0) {
        const compName = getCompetitionName(stat.competition_id);
        toast.error(`Valores inválidos em ${compName} (${stat.season_year})`, {
          description: issues.slice(0, 3).map((i) => `• ${i.message}`).join("\n"),
        });
        return;
      }
    }

    setSaving(true);
    try {
      for (const stat of stats) {
        const data = {
          player_id: playerId,
          season_year: stat.season_year,
          competition_id: stat.competition_id,
          ...buildStatPayload(stat),
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

  // Validation warnings
  const getValidationWarnings = (stat: PlayerStat) => {
    const warnings: string[] = [];
    const minutes = normalizeStatValue(stat.minutes);
    const matches = normalizeStatValue(stat.matches);
    const shotsOnTarget = normalizeStatValue(stat.shots_on_target);
    const shots = normalizeStatValue(stat.shots);
    
    if (minutes === 0 && matches > 0) {
      warnings.push("Jogos > 0 mas minutos = 0");
    }
    if (shotsOnTarget > shots) {
      warnings.push("Chutes no gol > chutes totais (ajustado automaticamente)");
    }
    return warnings;
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
          safeArray(stats).map((stat) => {
            const warnings = getValidationWarnings(stat);
            
            return (
              <Collapsible 
                key={stat.id} 
                open={expandedRows.has(stat.id)} 
                onOpenChange={() => toggleRow(stat.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-wrap">
                        <Badge variant="outline">{stat.season_year}</Badge>
                        <span className="font-medium">{getCompetitionName(stat.competition_id)}</span>
                        <span className="text-sm text-muted-foreground">
                          {normalizeStatValue(stat.matches)} jogos • {normalizeStatValue(stat.minutes)} min • {normalizeStatValue(stat.goals)}G {normalizeStatValue(stat.assists)}A
                        </span>
                        {warnings.length > 0 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {warnings.length} aviso(s)
                          </Badge>
                        )}
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

                      {/* Validation Warnings */}
                      {warnings.length > 0 && (
                        <Alert variant="default" className="border-amber-300 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            {warnings.map((w, i) => (
                              <div key={i}>{w}</div>
                            ))}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Quick Summary */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Resumo Automático
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <SummaryBadge label="Jogos" value={stat.matches} />
                          <SummaryBadge label="Min" value={stat.minutes} />
                          <SummaryBadge label="Gols" value={stat.goals} highlight />
                          <SummaryBadge label="Assist" value={stat.assists} highlight />
                          <SummaryBadge label="Chutes" value={stat.shots} />
                          <SummaryBadge label="No Gol" value={stat.shots_on_target} />
                          <SummaryBadge label="P.Dec" value={stat.key_passes} />
                          <SummaryBadge label="Chances" value={stat.chances_created} />
                          <SummaryBadge label="Amar" value={stat.yellow_cards} />
                          <SummaryBadge label="Verm" value={stat.red_cards} />
                        </div>
                      </div>

                      {/* === SEÇÃO: GERAIS === */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          Gerais
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">Informações básicas da temporada/competição</p>
                        
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Temporada</Label>
                            <Input 
                              type="number" 
                              value={stat.season_year} 
                              onChange={(e) => updateStatField(stat.id, "season_year", parseInt(e.target.value) || new Date().getFullYear())}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <Label className="text-xs text-muted-foreground">Competição *</Label>
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

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                          <StatInput 
                            label="Jogos" 
                            value={stat.matches} 
                            onChange={(v) => updateStatField(stat.id, "matches", v)}
                            tooltip="Total de partidas disputadas"
                          />
                          <StatInput 
                            label="Minutos" 
                            value={stat.minutes} 
                            onChange={(v) => updateStatField(stat.id, "minutes", v)}
                            tooltip="Total de minutos em campo"
                            warning={normalizeStatValue(stat.minutes) === 0 && normalizeStatValue(stat.matches) > 0 ? "Sem minutos registrados" : undefined}
                          />
                        </div>
                      </div>

                      {/* === SCOUT CATEGORIES (mesmo layout do Live Match) === */}
                      <ScoutCategoryStats
                        mode="edit"
                        categories={isGoalkeeper ? GOALKEEPER_SCOUT_CATEGORIES : OUTFIELD_SCOUT_CATEGORIES}
                        values={statToScoutValues(stat as unknown as Record<string, unknown>)}
                        onChange={(key, next) => updateStatField(stat.id, key as keyof PlayerStat, next)}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
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
