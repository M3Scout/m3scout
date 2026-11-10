import { useMemo } from "react";
import { Av, Bar, Ring } from "@/components/dash/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
  hex: string;
  type: "accumulation" | "limit";
  unit?: string;
  limitLabel?: string;
}

const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals:                    { label: "Gols",            icon: "⚽", color: "emerald", hex: "#22c55e", type: "accumulation" },
  assists:                  { label: "Assistências",    icon: "🅰️", color: "blue",    hex: "#3b82f6", type: "accumulation" },
  key_passes:               { label: "Passes Decisivos", icon: "🔑", color: "sky",     hex: "#0ea5e9", type: "accumulation" },
  matches:                  { label: "Partidas",        icon: "🏟️", color: "violet",  hex: "#8b5cf6", type: "accumulation" },
  minutes:                  { label: "Minutos",         icon: "⏱️", color: "amber",   hex: "#f59e0b", type: "accumulation" },
  shots:                    { label: "Finalizações",    icon: "🎯", color: "orange",  hex: "#f97316", type: "accumulation" },
  tackles:                  { label: "Desarmes",        icon: "🦵", color: "cyan",    hex: "#06b6d4", type: "accumulation" },
  interceptions:            { label: "Interceptações",  icon: "🧲", color: "indigo",  hex: "#6366f1", type: "accumulation" },
  clearances:               { label: "Cortes",          icon: "🛡️", color: "slate",   hex: "#64748b", type: "accumulation" },
  pass_accuracy:            { label: "Passe %",         icon: "📊", color: "teal",    hex: "#14b8a6", type: "accumulation", unit: "%" },
  dribble_accuracy:         { label: "Dribles %",       icon: "🏃", color: "purple",  hex: "#a855f7", type: "accumulation", unit: "%" },
  yellow_cards_max:         { label: "Amarelos",        icon: "🟨", color: "yellow",  hex: "#eab308", type: "limit", limitLabel: "máx." },
  saves:                    { label: "Defesas",         icon: "🧤", color: "cyan",    hex: "#06b6d4", type: "accumulation" },
  saves_difficult:          { label: "Def. Difíceis",  icon: "🦸", color: "rose",    hex: "#f43f5e", type: "accumulation" },
  clean_sheets:             { label: "Clean Sheets",   icon: "🛡️", color: "green",   hex: "#22c55e", type: "accumulation" },
  goals_conceded_max:       { label: "Gols Sofridos",  icon: "🥅", color: "red",     hex: "#ef4444", type: "limit", limitLabel: "máx." },
  goalkeeper_claims_accuracy: { label: "Saídas %",     icon: "🧤", color: "teal",    hex: "#14b8a6", type: "accumulation", unit: "%" },
  penalty_save_rate:        { label: "Pênaltis %",     icon: "🥊", color: "purple",  hex: "#a855f7", type: "accumulation", unit: "%" },
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
  expanded: boolean;
  onToggle: () => void;
  onGoalClick?: (goal: GoalData) => void;
}

// ─── Visual do painel novo (painel.html) ─────────────────────────────────────
const STATUS_ICON: Record<GoalStatus, string> = {
  completed: '<path d="m5 12 5 5 9-10"/>',
  in_progress: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  exceeded: '<path d="M12 4 2 20h20zM12 10v4M12 17.5v.5"/>',
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

function GoalRow({ goal, i, onClick }: { goal: GoalData; i: number; onClick?: () => void }) {
  const cfg = GOAL_TYPE_CONFIG[goal.goal_type] ?? { label: goal.goal_type, icon: "🎯", hex: "#FF3B30", type: "accumulation" as const };
  const isLimit = cfg.type === "limit";
  const unit = (cfg as GoalTypeConfig).unit ?? "";
  const ok = goal.status === "completed";
  const over = goal.status === "exceeded";
  const barC = over ? "var(--red)" : ok ? "var(--green)" : cfg.hex;
  return (
    <button type="button" className="gr" style={{ ["--c" as string]: cfg.hex }} onClick={onClick}>
      <span className="gr-i" aria-hidden="true">{cfg.icon}</span>
      <div className="gr-b">
        <div className="gr-h">
          <span>{cfg.label}{isLimit && <small> (máx.)</small>}</span>
          <b className="tab">{goal.currentValue}{unit}<small> / {goal.target_value}{unit}</small></b>
        </div>
        <Bar w={Math.min(goal.percentage, 100) / 100} c={barC} d={i * 0.04} />
      </div>
      <span
        className={`gr-s ${ok ? "ok" : ""}`}
        style={over ? { background: "rgba(255,59,48,.16)", color: "var(--red)" } : undefined}
        title={ok ? "Concluída" : over ? "Excedida" : "Em andamento"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: STATUS_ICON[goal.status] }} />
      </span>
    </button>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export function PlayerGoalsCard({ player, goals, expanded, onToggle, onGoalClick }: PlayerGoalsCardProps) {
  const summary = useMemo(() => {
    const completed = goals.filter((g) => g.status === "completed").length;
    const exceeded = goals.filter((g) => g.status === "exceeded").length;
    const inProgress = goals.filter((g) => g.status === "in_progress").length;
    const avgPct = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + Math.min(g.percentage, 100), 0) / goals.length) : 0;
    return { completed, exceeded, inProgress, avgPct, total: goals.length };
  }, [goals]);

  const ringColor = summary.exceeded > 0 ? "var(--red)" : summary.avgPct >= 70 ? "var(--blue)" : summary.avgPct >= 50 ? "var(--red)" : "var(--orange)";
  const first = player.full_name.split(" ")[0];

  return (
    <article className={`mc ${expanded ? "open" : ""}`}>
      <button className="mc-h" type="button" aria-expanded={expanded} onClick={onToggle}>
        <Av name={player.full_name} photo={player.photo_url} size={56} />
        <span className="who">
          <span>
            <b>{first.toUpperCase()}</b>
            <span>{[cap(player.position), player.age ? `${player.age}a` : null].filter(Boolean).join(" · ")}</span>
            <span className="mc-st">
              <span className="pill c" style={{ ["--c" as string]: "var(--green)" }}>✓ {summary.completed}</span>
              <span className="pill">{summary.inProgress} {summary.inProgress === 1 ? "aberta" : "abertas"}</span>
              {summary.exceeded > 0 && <span className="pill c" style={{ ["--c" as string]: "var(--red)" }}>{summary.exceeded} excedida{summary.exceeded > 1 ? "s" : ""}</span>}
            </span>
          </span>
        </span>
        <Ring pct={summary.avgPct} c={ringColor} size={64} />
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="mc-list">
        <div>
          <div className="in-l">
            {goals.length === 0 ? <div className="empty">Nenhuma meta cadastrada.</div>
              : goals.map((g, i) => <GoalRow key={g.id} goal={g} i={i} onClick={onGoalClick ? () => onGoalClick(g) : undefined} />)}
          </div>
        </div>
      </div>
    </article>
  );
}
