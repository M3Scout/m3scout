import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Target, Trophy, Loader2, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

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
}

const GOAL_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  goals: { label: "Gols", icon: "⚽", color: "emerald" },
  assists: { label: "Assistências", icon: "🅰️", color: "blue" },
  matches: { label: "Partidas", icon: "🏟️", color: "violet" },
  minutes: { label: "Minutos", icon: "⏱️", color: "amber" },
  saves: { label: "Defesas", icon: "🧤", color: "cyan" },
  clean_sheets: { label: "Clean Sheets", icon: "🛡️", color: "green" },
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return "bg-emerald-500";
  if (percentage >= 75) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-zinc-500";
};

export function AthleteSeasonGoalsCard({ athleteId, currentStats }: AthleteSeasonGoalsCardProps) {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<SeasonGoal[]>([]);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
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

    fetchGoals();
  }, [athleteId, currentYear]);

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

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  // If no goals configured, show empty state
  if (goals.length === 0) {
    return (
      <motion.div 
        {...fadeInUp}
        transition={{ delay: 0.5 }}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-emerald-500/20 to-green-600/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Metas da Temporada</h2>
            <p className="text-[10px] text-muted-foreground">Temporada {currentYear}</p>
          </div>
        </div>

        <div className="p-6 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            Suas metas serão configuradas pela equipe técnica
          </p>
        </div>
      </motion.div>
    );
  }

  // Calculate completion stats
  const completedGoals = goals.filter(g => getCurrentValue(g.goal_type) >= g.target_value).length;

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.5 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
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

        <Badge 
          variant={completedGoals === goals.length ? "success" : "secondary"} 
          className="text-[10px]"
        >
          {completedGoals}/{goals.length} concluídas
        </Badge>
      </div>

      {/* Goals List */}
      <div className="p-4 space-y-4">
        {goals.map((goal, index) => {
          const config = GOAL_TYPE_CONFIG[goal.goal_type] || { label: goal.goal_type, icon: "🎯", color: "zinc" };
          const current = getCurrentValue(goal.goal_type);
          const percentage = Math.min((current / goal.target_value) * 100, 100);
          const isComplete = current >= goal.target_value;

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
                  <span className={`text-sm font-bold tabular-nums ${isComplete ? 'text-emerald-400' : 'text-foreground'}`}>
                    {goal.goal_type === "minutes" ? Math.round(current / 60) : current}
                  </span>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {goal.goal_type === "minutes" ? Math.round(goal.target_value / 60) + "h" : goal.target_value}
                  </span>
                </div>
              </div>

              <div className="relative">
                <Progress 
                  value={percentage} 
                  className="h-2 bg-zinc-800"
                />
                {/* Overlay for custom color */}
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground">
                {isComplete ? (
                  <span className="text-emerald-400">Meta atingida! 🎉</span>
                ) : (
                  <>Faltam {goal.goal_type === "minutes" 
                    ? Math.round((goal.target_value - current) / 60) + " horas" 
                    : (goal.target_value - current) + ` ${config.label.toLowerCase()}`}</>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/30 bg-zinc-900/30">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>Metas atualizadas automaticamente com seus jogos</span>
        </div>
      </div>
    </motion.div>
  );
}
