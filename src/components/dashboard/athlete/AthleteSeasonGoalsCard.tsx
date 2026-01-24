import { useState, useEffect, useMemo } from "react";
import { 
  Target, 
  Trophy, 
  Loader2, 
  TrendingUp, 
  CheckCircle2,
  Plus,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  History,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeasonGoal {
  id: string;
  goal_type: string;
  target_value: number;
  season_year?: number;
}

interface AthleteSeasonGoalsCardProps {
  athleteId: string;
  currentStats: {
    goals: number;
    assists: number;
    matches: number;
    minutes: number;
    saves: number;
    clean_sheets: number;
    shots?: number;
    tackles?: number;
    yellow_cards?: number;
  };
  isGoalkeeper?: boolean;
}

interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
  minValue: number;
  maxValue: number;
  step: number;
  unit?: string;
  type: "accumulation" | "limit";
  limitLabel?: string;
  description: string; // Added for better UX
}

// Goal type keys MUST match exactly what's stored in the database
const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  gols: { 
    label: "Gols", 
    icon: "⚽", 
    color: "emerald", 
    minValue: 1, 
    maxValue: 50, 
    step: 1, 
    type: "accumulation",
    description: "Quantidade de gols marcados na temporada"
  },
  assistencias: { 
    label: "Assistências", 
    icon: "🅰️", 
    color: "blue", 
    minValue: 1, 
    maxValue: 30, 
    step: 1, 
    type: "accumulation",
    description: "Passes decisivos para gols"
  },
  partidas: { 
    label: "Partidas", 
    icon: "🏟️", 
    color: "violet", 
    minValue: 5, 
    maxValue: 60, 
    step: 5, 
    type: "accumulation",
    description: "Total de jogos disputados"
  },
  minutos: { 
    label: "Minutos", 
    icon: "⏱️", 
    color: "amber", 
    minValue: 250, 
    maxValue: 5000, 
    step: 50, 
    unit: "min", 
    type: "accumulation",
    description: "Tempo total em campo (em minutos)"
  },
  finalizacoes: { 
    label: "Finalizações", 
    icon: "🎯", 
    color: "orange", 
    minValue: 10, 
    maxValue: 150, 
    step: 5, 
    type: "accumulation",
    description: "Chutes a gol durante a temporada"
  },
  desarmes: { 
    label: "Desarmes", 
    icon: "🦵", 
    color: "cyan", 
    minValue: 10, 
    maxValue: 150, 
    step: 5, 
    type: "accumulation",
    description: "Recuperações de bola com sucesso"
  },
  cartoes_amarelos_max: { 
    label: "Amarelos", 
    icon: "🟨", 
    color: "yellow", 
    minValue: 1, 
    maxValue: 15, 
    step: 1, 
    type: "limit", 
    limitLabel: "máx.",
    description: "Limite máximo de cartões (quanto menos, melhor)"
  },
  defesas: { 
    label: "Defesas", 
    icon: "🧤", 
    color: "cyan", 
    minValue: 10, 
    maxValue: 200, 
    step: 10, 
    type: "accumulation",
    description: "Total de defesas realizadas"
  },
  clean_sheets: { 
    label: "Clean Sheets", 
    icon: "🛡️", 
    color: "green", 
    minValue: 1, 
    maxValue: 30, 
    step: 1, 
    type: "accumulation",
    description: "Jogos sem sofrer gols"
  },
};

const OUTFIELD_GOAL_TYPES = ["gols", "assistencias", "partidas", "minutos", "finalizacoes", "desarmes", "cartoes_amarelos_max"];
const GK_GOAL_TYPES = ["defesas", "clean_sheets", "partidas", "minutos", "cartoes_amarelos_max"];

// For accumulation: higher = better (green when complete)
// For limit: lower = better (green when under limit, red/warning when approaching/exceeding)
const getProgressColor = (percentage: number, isLimit: boolean): string => {
  if (isLimit) {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-emerald-500";
  }
  if (percentage >= 100) return "bg-emerald-500";
  if (percentage >= 75) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-zinc-500";
};

export function AthleteSeasonGoalsCard({ 
  athleteId, 
  currentStats,
  isGoalkeeper = false 
}: AthleteSeasonGoalsCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<SeasonGoal[]>([]);
  const [previousSeasonGoals, setPreviousSeasonGoals] = useState<Record<number, SeasonGoal[]>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGoalType, setNewGoalType] = useState<string>("");
  const [newGoalValue, setNewGoalValue] = useState<number>(0);
  const [editingGoal, setEditingGoal] = useState<SeasonGoal | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const availableGoalTypes = isGoalkeeper ? GK_GOAL_TYPES : OUTFIELD_GOAL_TYPES;

  useEffect(() => {
    fetchGoals();
  }, [athleteId, currentYear]);

  const fetchGoals = async () => {
    try {
      // Fetch current year goals
      const { data: currentData, error: currentError } = await supabase
        .from("player_season_goals")
        .select("id, goal_type, target_value, season_year")
        .eq("player_id", athleteId)
        .eq("season_year", currentYear);

      if (currentError) throw currentError;
      setGoals(currentData || []);

      // Fetch previous seasons (last 3 years)
      const { data: historyData, error: historyError } = await supabase
        .from("player_season_goals")
        .select("id, goal_type, target_value, season_year")
        .eq("player_id", athleteId)
        .lt("season_year", currentYear)
        .gte("season_year", currentYear - 3)
        .order("season_year", { ascending: false });

      if (historyError) throw historyError;

      // Group by season year
      const grouped: Record<number, SeasonGoal[]> = {};
      (historyData || []).forEach((goal) => {
        if (goal.season_year) {
          if (!grouped[goal.season_year]) {
            grouped[goal.season_year] = [];
          }
          grouped[goal.season_year].push(goal);
        }
      });
      setPreviousSeasonGoals(grouped);
    } catch (error) {
      console.error("Error fetching season goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentValue = (goalType: string): number => {
    switch (goalType) {
      case "gols": return currentStats.goals;
      case "assistencias": return currentStats.assists;
      case "partidas": return currentStats.matches;
      case "minutos": return currentStats.minutes;
      case "defesas": return currentStats.saves;
      case "clean_sheets": return currentStats.clean_sheets;
      case "finalizacoes": return currentStats.shots ?? 0;
      case "desarmes": return currentStats.tackles ?? 0;
      case "cartoes_amarelos_max": return currentStats.yellow_cards ?? 0;
      default: return 0;
    }
  };

  const handleAddGoal = async () => {
    if (!newGoalType || newGoalValue <= 0) {
      toast.error("Selecione um tipo e valor válido para a meta");
      return;
    }

    const config = GOAL_TYPE_CONFIG[newGoalType];
    if (newGoalValue < config.minValue || newGoalValue > config.maxValue) {
      toast.error(`O valor deve estar entre ${config.minValue} e ${config.maxValue}`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_season_goals")
        .upsert({
          player_id: athleteId,
          season_year: currentYear,
          goal_type: newGoalType,
          target_value: newGoalValue,
        }, {
          onConflict: "player_id,season_year,goal_type"
        });

      if (error) throw error;

      toast.success("Meta adicionada com sucesso!");
      setShowAddDialog(false);
      setNewGoalType("");
      setNewGoalValue(0);
      await fetchGoals();
    } catch (error) {
      console.error("Error adding goal:", error);
      toast.error("Erro ao adicionar meta");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGoal = async (goalId: string, newValue: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const config = GOAL_TYPE_CONFIG[goal.goal_type];
    if (newValue < config.minValue || newValue > config.maxValue) {
      toast.error(`O valor deve estar entre ${config.minValue} e ${config.maxValue}`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_season_goals")
        .update({ target_value: newValue })
        .eq("id", goalId);

      if (error) throw error;

      toast.success("Meta atualizada!");
      setEditingGoal(null);
      await fetchGoals();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Erro ao atualizar meta");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("player_season_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      toast.success("Meta removida");
      await fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Erro ao remover meta");
    } finally {
      setSaving(false);
    }
  };

  const existingGoalTypes = goals.map(g => g.goal_type);
  const availableToAdd = availableGoalTypes.filter(t => !existingGoalTypes.includes(t));
  const previousYears = Object.keys(previousSeasonGoals).map(Number).sort((a, b) => b - a);

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex items-center justify-center min-h-[200px] flex-1"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  const completedGoals = goals.filter(g => {
    const config = GOAL_TYPE_CONFIG[g.goal_type];
    const current = getCurrentValue(g.goal_type);
    if (config?.type === "limit") {
      return current <= g.target_value;
    }
    return current >= g.target_value;
  }).length;

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.5 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex flex-col"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Metas da Temporada</h2>
            <p className="text-[10px] text-muted-foreground">Temporada {currentYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {goals.length > 0 && (
            <Badge 
              variant={completedGoals === goals.length ? "success" : "secondary"} 
              className="text-[10px]"
            >
              {completedGoals}/{goals.length}
            </Badge>
          )}
          
          {previousYears.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-7 px-2 text-xs"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              Histórico
            </Button>
          )}
          
          {availableToAdd.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-7 px-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Meta
            </Button>
          )}
        </div>
      </div>

      {/* Goals List */}
      <div className="p-4 flex-1 overflow-auto">
        {goals.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
            <p className="text-[11px] text-zinc-600 mt-1 mb-4">
              Defina suas metas pessoais para a temporada
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Criar primeira meta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, index) => {
              const config = GOAL_TYPE_CONFIG[goal.goal_type] || { 
                label: goal.goal_type, 
                icon: "🎯", 
                color: "zinc",
                minValue: 1,
                maxValue: 100,
                step: 1,
                type: "accumulation" as const,
                description: "",
              };
              const current = getCurrentValue(goal.goal_type);
              const percentage = Math.min((current / goal.target_value) * 100, 100);
              const isLimit = config.type === "limit";
              const isComplete = isLimit 
                ? current <= goal.target_value
                : current >= goal.target_value;
              const isEditingThis = editingGoal?.id === goal.id;
              const isOverLimit = isLimit && current > goal.target_value;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{config.icon}</span>
                      <span className="text-xs font-medium text-foreground">
                        {config.label}
                        {isLimit && <span className="text-zinc-500 ml-1">({config.limitLabel})</span>}
                      </span>
                      {isComplete && !isLimit && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {isLimit && !isOverLimit && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {isOverLimit && (
                        <span className="text-[10px] text-red-400 font-medium">Excedido!</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editingGoal.target_value}
                            onChange={(e) => setEditingGoal({ ...editingGoal, target_value: Number(e.target.value) })}
                            className="w-16 h-6 text-xs px-2"
                            min={config.minValue}
                            max={config.maxValue}
                            step={config.step}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateGoal(goal.id, editingGoal.target_value)}
                            disabled={saving}
                            className="h-6 w-6 p-0"
                          >
                            <Save className="w-3 h-3 text-emerald-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGoal(null)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className={`text-sm font-bold tabular-nums ${
                            isLimit 
                              ? (isOverLimit ? 'text-red-400' : 'text-emerald-400')
                              : (isComplete ? 'text-emerald-400' : 'text-foreground')
                          }`}>
                            {current}
                          </span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {goal.target_value}{goal.goal_type === "minutos" ? " min" : ""}
                            {isLimit && " máx."}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGoal(goal)}
                            className="h-5 w-5 p-0 ml-1 opacity-50 hover:opacity-100"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isLimit ? 'bg-emerald-900/30' : 'bg-zinc-800'}`}
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(percentage, isLimit)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {isLimit ? (
                        isOverLimit ? (
                          <span className="text-red-400">Limite excedido em {current - goal.target_value}!</span>
                        ) : current === goal.target_value ? (
                          <span className="text-amber-400">No limite exato ⚠️</span>
                        ) : (
                          <span className="text-emerald-400">
                            Restam {goal.target_value - current} cartões ✓
                          </span>
                        )
                      ) : isComplete ? (
                        <span className="text-emerald-400">Meta atingida! 🎉</span>
                      ) : (
                        <>Faltam {goal.goal_type === "minutos" 
                          ? (goal.target_value - current) + " minutos" 
                          : (goal.target_value - current) + ` ${config.label.toLowerCase()}`}</>
                      )}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                      disabled={saving}
                      className="h-5 px-1.5 text-[10px] text-zinc-600 hover:text-red-400"
                    >
                      Remover
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Previous Seasons History */}
        <AnimatePresence>
          {showHistory && previousYears.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-4 border-t border-zinc-800/40"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Temporadas Anteriores
                </h3>
              </div>

              <div className="space-y-4">
                {previousYears.map((year) => (
                  <Collapsible key={year}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-medium text-foreground">Temporada {year}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {previousSeasonGoals[year]?.length || 0} metas
                        </Badge>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 px-3">
                      <div className="space-y-2">
                        {previousSeasonGoals[year]?.map((goal) => {
                          const config = GOAL_TYPE_CONFIG[goal.goal_type] || {
                            label: goal.goal_type,
                            icon: "🎯",
                            type: "accumulation",
                          };
                          return (
                            <div
                              key={goal.id}
                              className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-900/50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{config.icon}</span>
                                <span className="text-xs text-foreground">{config.label}</span>
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                Meta: {goal.target_value}
                                {goal.goal_type === "minutos" ? " min" : ""}
                                {config.type === "limit" ? " máx." : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {goals.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800/30 bg-zinc-900/30">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Clique no lápis para editar suas metas</span>
          </div>
        </div>
      )}

      {/* Add Goal Dialog with Enhanced Select */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
            <DialogDescription>
              Defina uma meta pessoal para a temporada {currentYear}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Meta</label>
              <Select value={newGoalType} onValueChange={(v) => {
                setNewGoalType(v);
                const config = GOAL_TYPE_CONFIG[v];
                if (config) {
                  setNewGoalValue(config.minValue);
                }
              }}>
                <SelectTrigger className="h-auto py-2">
                  <SelectValue placeholder="Selecione o tipo de meta">
                    {newGoalType && GOAL_TYPE_CONFIG[newGoalType] && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{GOAL_TYPE_CONFIG[newGoalType].icon}</span>
                        <div className="text-left">
                          <span className="font-medium">{GOAL_TYPE_CONFIG[newGoalType].label}</span>
                          {GOAL_TYPE_CONFIG[newGoalType].type === "limit" && (
                            <span className="text-xs text-amber-500 ml-1">(limite)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableToAdd.map((type) => {
                    const config = GOAL_TYPE_CONFIG[type];
                    return (
                      <SelectItem 
                        key={type} 
                        value={type}
                        className="py-3 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{config.icon}</span>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{config.label}</span>
                              {config.type === "limit" && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-500">
                                  limite
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                              {config.description}
                            </span>
                            <span className="text-[10px] text-zinc-500 mt-1">
                              {config.type === "limit" ? "Quanto menos, melhor" : `${config.minValue} – ${config.maxValue}`}
                              {config.unit ? ` ${config.unit}` : ""}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {newGoalType && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{GOAL_TYPE_CONFIG[newGoalType]?.icon}</span>
                  <span className="font-medium text-foreground">{GOAL_TYPE_CONFIG[newGoalType]?.label}</span>
                  {GOAL_TYPE_CONFIG[newGoalType]?.type === "limit" && (
                    <Badge variant="outline" className="text-[9px] px-1.5 border-amber-500/50 text-amber-500">
                      limite máximo
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Valor da Meta</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {GOAL_TYPE_CONFIG[newGoalType]?.minValue} – {GOAL_TYPE_CONFIG[newGoalType]?.maxValue}
                      {GOAL_TYPE_CONFIG[newGoalType]?.unit ? ` ${GOAL_TYPE_CONFIG[newGoalType]?.unit}` : ""}
                    </span>
                  </label>
                  <Input
                    type="number"
                    value={newGoalValue}
                    onChange={(e) => setNewGoalValue(Number(e.target.value))}
                    min={GOAL_TYPE_CONFIG[newGoalType]?.minValue}
                    max={GOAL_TYPE_CONFIG[newGoalType]?.maxValue}
                    step={GOAL_TYPE_CONFIG[newGoalType]?.step}
                    className="text-lg font-bold h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    {GOAL_TYPE_CONFIG[newGoalType]?.type === "limit" ? (
                      <span className="text-amber-400">
                        ⚠️ Meta de limite: você quer ficar abaixo de {newGoalValue} {GOAL_TYPE_CONFIG[newGoalType]?.label.toLowerCase()}
                      </span>
                    ) : newGoalType === "minutos" ? (
                      `${newGoalValue} minutos em campo`
                    ) : (
                      `Alcançar ${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType]?.label.toLowerCase()}`
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddGoal} disabled={saving || !newGoalType || newGoalValue <= 0}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar Meta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
