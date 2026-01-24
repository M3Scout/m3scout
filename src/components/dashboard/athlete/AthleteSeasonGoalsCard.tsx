import { useState, useEffect } from "react";
import { 
  Target, 
  Trophy, 
  Loader2, 
  TrendingUp, 
  CheckCircle2,
  Plus,
  Pencil,
  X,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeasonGoal {
  id: string;
  goal_type: string;
  target_value: number;
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
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals: { label: "Gols", icon: "⚽", color: "emerald", minValue: 1, maxValue: 50, step: 1 },
  assists: { label: "Assistências", icon: "🅰️", color: "blue", minValue: 1, maxValue: 30, step: 1 },
  matches: { label: "Partidas", icon: "🏟️", color: "violet", minValue: 5, maxValue: 60, step: 5 },
  minutes: { label: "Minutos", icon: "⏱️", color: "amber", minValue: 500, maxValue: 5000, step: 100, unit: "min" },
  saves: { label: "Defesas", icon: "🧤", color: "cyan", minValue: 10, maxValue: 200, step: 10 },
  clean_sheets: { label: "Clean Sheets", icon: "🛡️", color: "green", minValue: 1, maxValue: 30, step: 1 },
};

const OUTFIELD_GOAL_TYPES = ["goals", "assists", "matches", "minutes"];
const GK_GOAL_TYPES = ["saves", "clean_sheets", "matches", "minutes"];

const getProgressColor = (percentage: number): string => {
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
  const [isEditing, setIsEditing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGoalType, setNewGoalType] = useState<string>("");
  const [newGoalValue, setNewGoalValue] = useState<number>(0);
  const [editingGoal, setEditingGoal] = useState<SeasonGoal | null>(null);
  
  const currentYear = new Date().getFullYear();
  const availableGoalTypes = isGoalkeeper ? GK_GOAL_TYPES : OUTFIELD_GOAL_TYPES;

  useEffect(() => {
    fetchGoals();
  }, [athleteId, currentYear]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("player_season_goals")
        .select("id, goal_type, target_value")
        .eq("player_id", athleteId)
        .eq("season_year", currentYear);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching season goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentValue = (goalType: string): number => {
    switch (goalType) {
      case "goals": return currentStats.goals;
      case "assists": return currentStats.assists;
      case "matches": return currentStats.matches;
      case "minutes": return currentStats.minutes;
      case "saves": return currentStats.saves;
      case "clean_sheets": return currentStats.clean_sheets;
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

  const completedGoals = goals.filter(g => getCurrentValue(g.goal_type) >= g.target_value).length;

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
      <div className="p-4 flex-1">
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
                step: 1
              };
              const current = getCurrentValue(goal.goal_type);
              const percentage = Math.min((current / goal.target_value) * 100, 100);
              const isComplete = current >= goal.target_value;
              const isEditingThis = editingGoal?.id === goal.id;

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
                      <span className="text-xs font-medium text-foreground">{config.label}</span>
                      {isComplete && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
                          <span className={`text-sm font-bold tabular-nums ${isComplete ? 'text-emerald-400' : 'text-foreground'}`}>
                            {goal.goal_type === "minutes" ? Math.round(current / 60) : current}
                          </span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {goal.goal_type === "minutes" ? Math.round(goal.target_value / 60) + "h" : goal.target_value}
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
                      className="h-2 bg-zinc-800"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {isComplete ? (
                        <span className="text-emerald-400">Meta atingida! 🎉</span>
                      ) : (
                        <>Faltam {goal.goal_type === "minutes" 
                          ? Math.round((goal.target_value - current) / 60) + " horas" 
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

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((type) => {
                    const config = GOAL_TYPE_CONFIG[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {newGoalType && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Valor da Meta 
                  <span className="text-xs text-muted-foreground ml-2">
                    (mín: {GOAL_TYPE_CONFIG[newGoalType]?.minValue}, máx: {GOAL_TYPE_CONFIG[newGoalType]?.maxValue})
                  </span>
                </label>
                <Input
                  type="number"
                  value={newGoalValue}
                  onChange={(e) => setNewGoalValue(Number(e.target.value))}
                  min={GOAL_TYPE_CONFIG[newGoalType]?.minValue}
                  max={GOAL_TYPE_CONFIG[newGoalType]?.maxValue}
                  step={GOAL_TYPE_CONFIG[newGoalType]?.step}
                  className="text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground">
                  {newGoalType === "minutes" 
                    ? `${Math.round(newGoalValue / 60)} horas de jogo`
                    : `${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType]?.label.toLowerCase()}`}
                </p>
              </div>
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
