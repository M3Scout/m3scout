import { useMemo } from "react";
import { motion } from "framer-motion";
import { User, CheckCircle2, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Goal type configuration
interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
  type: "accumulation" | "limit";
  limitLabel?: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals: { label: "Gols", icon: "⚽", color: "emerald", type: "accumulation" },
  assists: { label: "Assistências", icon: "🅰️", color: "blue", type: "accumulation" },
  matches: { label: "Partidas", icon: "🏟️", color: "violet", type: "accumulation" },
  minutes: { label: "Minutos", icon: "⏱️", color: "amber", type: "accumulation" },
  shots: { label: "Finalizações", icon: "🎯", color: "orange", type: "accumulation" },
  tackles: { label: "Desarmes", icon: "🦵", color: "cyan", type: "accumulation" },
  interceptions: { label: "Interceptações", icon: "🧲", color: "indigo", type: "accumulation" },
  pass_accuracy: { label: "Passe %", icon: "📊", color: "teal", type: "accumulation" },
  dribble_accuracy: { label: "Dribles %", icon: "🏃", color: "purple", type: "accumulation" },
  yellow_cards_max: { label: "Amarelos", icon: "🟨", color: "yellow", type: "limit", limitLabel: "máx." },
  saves: { label: "Defesas", icon: "🧤", color: "cyan", type: "accumulation" },
  saves_difficult: { label: "Defesas Difíceis", icon: "🦸", color: "rose", type: "accumulation" },
  clean_sheets: { label: "Clean Sheets", icon: "🛡️", color: "green", type: "accumulation" },
  // New goalkeeper goal types
  goals_conceded_max: { label: "Gols Sofridos", icon: "🥅", color: "red", type: "limit", limitLabel: "máx." },
  goalkeeper_claims_accuracy: { label: "Saídas Corretas", icon: "🧤", color: "teal", type: "accumulation" },
  penalty_save_rate: { label: "Pênaltis %", icon: "🥊", color: "purple", type: "accumulation" },
};

type GoalStatus = "in_progress" | "completed" | "exceeded";

interface GoalData {
  id: string;
  goal_type: string;
  target_value: number;
  season_year: number;
  currentValue: number;
  percentage: number;
  status: GoalStatus;
}

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  photo_url: string | null;
}

interface PlayerGoalsCardProps {
  player: PlayerData;
  goals: GoalData[];
  onGoalClick?: (goal: GoalData) => void;
}

// Get progress bar color based on percentage and goal type
function getProgressColor(percentage: number, isLimit: boolean): string {
  if (isLimit) {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-emerald-500";
  }
  if (percentage >= 100) return "bg-emerald-500";
  if (percentage >= 75) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-zinc-600";
}

// Compact status indicator
function StatusIndicator({ status, isLimit }: { status: GoalStatus; isLimit: boolean }) {
  if (status === "completed" && !isLimit) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (status === "exceeded") {
    return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
  }
  if (status === "completed" && isLimit) {
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  return <Clock className="w-4 h-4 text-zinc-500 shrink-0" />;
}

// Goal row inside the card
function GoalRow({ 
  goal, 
  onClick 
}: { 
  goal: GoalData; 
  onClick?: () => void;
}) {
  const config = GOAL_TYPE_CONFIG[goal.goal_type] || {
    label: goal.goal_type,
    icon: "🎯",
    type: "accumulation" as const,
  };
  const isLimit = config.type === "limit";

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="group flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg cursor-pointer transition-colors"
    >
      {/* Icon */}
      <span className="text-lg shrink-0">{config.icon}</span>
      
      {/* Label + Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm text-zinc-300 truncate">
            {config.label}
            {isLimit && <span className="text-zinc-600 ml-1 text-[10px]">(máx.)</span>}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Current value - prominent */}
            <span className="text-base font-semibold text-foreground tabular-nums">
              {goal.currentValue}
            </span>
            <span className="text-zinc-600 text-sm">/</span>
            {/* Target - secondary */}
            <span className="text-sm text-zinc-500 tabular-nums">
              {goal.target_value}
            </span>
          </div>
        </div>
        
        {/* Progress bar - thicker and shorter */}
        <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.percentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full transition-colors",
              getProgressColor(goal.percentage, isLimit)
            )}
          />
        </div>
      </div>
      
      {/* Status indicator */}
      <StatusIndicator status={goal.status} isLimit={isLimit} />
    </motion.div>
  );
}

export function PlayerGoalsCard({ player, goals, onGoalClick }: PlayerGoalsCardProps) {
  // Summary stats
  const summary = useMemo(() => {
    const completed = goals.filter(g => g.status === "completed").length;
    const exceeded = goals.filter(g => g.status === "exceeded").length;
    const inProgress = goals.filter(g => g.status === "in_progress").length;
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.percentage, 0) / goals.length)
      : 0;
    return { completed, exceeded, inProgress, avgProgress, total: goals.length };
  }, [goals]);

  // Get unique seasons
  const seasons = useMemo(() => {
    return [...new Set(goals.map(g => g.season_year))].sort((a, b) => b - a);
  }, [goals]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95",
        "border border-zinc-800/50",
        "shadow-[0_4px_24px_-6px_hsl(0_0%_0%/0.5)]",
        "hover:border-zinc-700/60 hover:shadow-[0_8px_32px_-8px_hsl(0_0%_0%/0.6)]",
        "transition-all duration-300"
      )}
    >
      {/* Top accent bar based on overall progress */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          summary.completed === summary.total && summary.total > 0
            ? "bg-emerald-500"
            : summary.exceeded > 0
              ? "bg-red-500"
              : "bg-zinc-700"
        )}
      />

      {/* Header - Player info */}
      <div className="p-4 pb-3 flex items-start gap-4">
        {/* Photo - larger */}
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.full_name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-zinc-800/50"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-700/30">
            <User className="w-7 h-7 text-zinc-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name - prominent */}
          <h3 className="text-base font-semibold text-foreground truncate leading-tight">
            {player.full_name}
          </h3>
          
          {/* Position + Age as subtitle */}
          <p className="text-sm text-muted-foreground mt-0.5">
            {player.position}
            {player.age && <span className="text-zinc-600"> • {player.age} anos</span>}
          </p>

          {/* Season badges */}
          <div className="flex items-center gap-1.5 mt-2">
            {seasons.map(year => (
              <Badge 
                key={year} 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 h-5 bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
              >
                {year}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* Average progress */}
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-lg font-semibold text-foreground tabular-nums">
              {summary.avgProgress}%
            </span>
          </div>
          
          {/* Completed count */}
          <div className="flex items-center gap-2 text-[10px]">
            {summary.completed > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {summary.completed}
              </span>
            )}
            {summary.inProgress > 0 && (
              <span className="flex items-center gap-0.5 text-zinc-500">
                <Clock className="w-3 h-3" />
                {summary.inProgress}
              </span>
            )}
            {summary.exceeded > 0 && (
              <span className="flex items-center gap-0.5 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                {summary.exceeded}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800/60 mx-4" />

      {/* Goals list - compact rows */}
      <div className="px-4 py-2">
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            onClick={() => onGoalClick?.(goal)}
          />
        ))}
      </div>
    </motion.div>
  );
}
