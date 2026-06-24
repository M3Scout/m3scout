import { useMemo } from "react";
import { motion } from "framer-motion";
import { User, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
  hex: string;
  type: "accumulation" | "limit";
  limitLabel?: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals:                    { label: "Gols",            icon: "⚽", color: "emerald", hex: "#22c55e", type: "accumulation" },
  assists:                  { label: "Assistências",    icon: "🅰️", color: "blue",    hex: "#3b82f6", type: "accumulation" },
  matches:                  { label: "Partidas",        icon: "🏟️", color: "violet",  hex: "#8b5cf6", type: "accumulation" },
  minutes:                  { label: "Minutos",         icon: "⏱️", color: "amber",   hex: "#f59e0b", type: "accumulation" },
  shots:                    { label: "Finalizações",    icon: "🎯", color: "orange",  hex: "#f97316", type: "accumulation" },
  tackles:                  { label: "Desarmes",        icon: "🦵", color: "cyan",    hex: "#06b6d4", type: "accumulation" },
  interceptions:            { label: "Interceptações",  icon: "🧲", color: "indigo",  hex: "#6366f1", type: "accumulation" },
  pass_accuracy:            { label: "Passe %",         icon: "📊", color: "teal",    hex: "#14b8a6", type: "accumulation" },
  dribble_accuracy:         { label: "Dribles %",       icon: "🏃", color: "purple",  hex: "#a855f7", type: "accumulation" },
  yellow_cards_max:         { label: "Amarelos",        icon: "🟨", color: "yellow",  hex: "#eab308", type: "limit", limitLabel: "máx." },
  saves:                    { label: "Defesas",         icon: "🧤", color: "cyan",    hex: "#06b6d4", type: "accumulation" },
  saves_difficult:          { label: "Def. Difíceis",  icon: "🦸", color: "rose",    hex: "#f43f5e", type: "accumulation" },
  clean_sheets:             { label: "Clean Sheets",   icon: "🛡️", color: "green",   hex: "#22c55e", type: "accumulation" },
  goals_conceded_max:       { label: "Gols Sofridos",  icon: "🥅", color: "red",     hex: "#ef4444", type: "limit", limitLabel: "máx." },
  goalkeeper_claims_accuracy: { label: "Saídas %",     icon: "🧤", color: "teal",    hex: "#14b8a6", type: "accumulation" },
  penalty_save_rate:        { label: "Pênaltis %",     icon: "🥊", color: "purple",  hex: "#a855f7", type: "accumulation" },
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT = "#ec4525";
const FG     = "#ededee";
const MUTED  = "#62616a";
const BDR    = "rgba(255,255,255,0.07)";
const BG     = "#0f0e13";

// ─── Circular progress ring ───────────────────────────────────────────────────

function ProgressRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const r  = (size - 6) / 2;
  const c  = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusDot({ status, isLimit }: { status: GoalStatus; isLimit: boolean }) {
  if (status === "exceeded")               return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (status === "completed" && !isLimit)  return <CheckCircle2  className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "completed" && isLimit)   return <CheckCircle2  className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  return <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: MUTED }} />;
}

// ─── Goal row ─────────────────────────────────────────────────────────────────

function GoalRow({ goal, onClick }: { goal: GoalData; onClick?: () => void }) {
  const cfg = GOAL_TYPE_CONFIG[goal.goal_type] ?? { label: goal.goal_type, icon: "🎯", hex: ACCENT, type: "accumulation" as const };
  const isLimit = cfg.type === "limit";

  const barColor = (() => {
    if (isLimit) {
      if (goal.percentage >= 100) return "#ef4444";
      if (goal.percentage >= 75)  return "#f59e0b";
      return "#22c55e";
    }
    if (goal.percentage >= 100) return "#22c55e";
    if (goal.percentage >= 75)  return "#3b82f6";
    if (goal.percentage >= 40)  return cfg.hex;
    return MUTED;
  })();

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg cursor-pointer transition-colors"
    >
      {/* Category dot */}
      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-none text-[13px]"
        style={{ background: `${cfg.hex}12`, border: `1px solid ${cfg.hex}25` }}>
        {cfg.icon}
      </div>

      {/* Label + bar */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-mono leading-none truncate" style={{ color: FG }}>
            {cfg.label}
            {isLimit && <span className="ml-1 text-[10px]" style={{ color: MUTED }}>(máx.)</span>}
          </span>
          <div className="flex items-center gap-1 flex-none tabular-nums">
            <span className="text-[13px] font-semibold font-display" style={{ color: FG }}>
              {goal.currentValue}
            </span>
            <span className="text-[11px]" style={{ color: MUTED }}>/</span>
            <span className="text-[11px]" style={{ color: MUTED }}>{goal.target_value}</span>
          </div>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(goal.percentage, 100)}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: barColor }}
          />
        </div>
      </div>

      {/* Status */}
      <StatusDot status={goal.status} isLimit={isLimit} />
    </motion.div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function PlayerGoalsCard({ player, goals, onGoalClick }: PlayerGoalsCardProps) {
  const summary = useMemo(() => {
    const completed  = goals.filter(g => g.status === "completed").length;
    const exceeded   = goals.filter(g => g.status === "exceeded").length;
    const inProgress = goals.filter(g => g.status === "in_progress").length;
    const avgPct     = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.percentage, 0) / goals.length)
      : 0;
    return { completed, exceeded, inProgress, avgPct, total: goals.length };
  }, [goals]);

  const seasons = useMemo(() =>
    [...new Set(goals.map(g => g.season_year))].sort((a, b) => b - a),
    [goals]
  );

  const ringColor = summary.exceeded > 0 ? "#ef4444"
    : summary.avgPct >= 100 ? "#22c55e"
    : summary.avgPct >= 75  ? "#3b82f6"
    : summary.avgPct >= 40  ? ACCENT
    : MUTED;

  const topBarColor = summary.exceeded > 0 ? "#ef4444"
    : summary.completed === summary.total && summary.total > 0 ? "#22c55e"
    : "transparent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{ background: BG, border: `1px solid ${BDR}` }}
    >
      {/* Top accent line */}
      {topBarColor !== "transparent" && (
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${topBarColor}, transparent)` }} />
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Photo */}
        <div className="relative flex-none">
          <div className="w-14 h-14 rounded-xl overflow-hidden"
            style={{ border: `1px solid ${BDR}`, background: "rgba(255,255,255,0.04)" }}>
            {player.photo_url ? (
              <img
                src={getOptimizedImageUrl(player.photo_url, { width: 200, quality: 85, format: "avif" }) || player.photo_url}
                alt={player.full_name}
                className="w-full h-full object-cover object-top"
                onError={e => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-6 h-6" style={{ color: MUTED }} />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-display font-bold text-[13px] uppercase leading-tight truncate" style={{ color: FG }}>
            {player.full_name}
          </p>
          <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>
            {player.position}{player.age ? ` · ${player.age}a` : ""}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {seasons.map(y => (
              <span key={y} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                style={{ color: MUTED, border: `1px solid ${BDR}`, background: "rgba(255,255,255,0.025)" }}>
                {y}
              </span>
            ))}
            {/* mini counters */}
            <div className="ml-auto flex items-center gap-1.5">
              {summary.completed > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[9px]" style={{ color: "#22c55e" }}>
                  <CheckCircle2 className="w-2.5 h-2.5" />{summary.completed}
                </span>
              )}
              {summary.inProgress > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[9px]" style={{ color: MUTED }}>
                  <Clock className="w-2.5 h-2.5" />{summary.inProgress}
                </span>
              )}
              {summary.exceeded > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[9px]" style={{ color: "#ef4444" }}>
                  <AlertTriangle className="w-2.5 h-2.5" />{summary.exceeded}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ring + percentage */}
        <div className="relative flex-none flex items-center justify-center">
          <ProgressRing pct={summary.avgPct} color={ringColor} size={52} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-bold text-[12px] leading-none" style={{ color: ringColor }}>
              {summary.avgPct}
            </span>
            <span className="font-mono text-[8px] leading-none mt-0.5" style={{ color: MUTED }}>%</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-4" style={{ background: BDR }} />

      {/* ── GOALS LIST ─────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex-1">
        {goals.map(g => (
          <GoalRow key={g.id} goal={g} onClick={() => onGoalClick?.(g)} />
        ))}
      </div>
    </motion.div>
  );
}
