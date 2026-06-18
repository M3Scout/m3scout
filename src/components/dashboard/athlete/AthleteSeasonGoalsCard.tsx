import { useState, useEffect, useMemo } from "react";
import {
  Target, Trophy, Loader2, Plus, Pencil, X, Save,
  History, Calendar, ChevronDown, Lightbulb, CheckCircle2,
  AlertTriangle, Zap, TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG      = "#0f0f10";
const CARD_BORDER  = "rgba(255,255,255,0.07)";
const MUTED        = "#62616a";
const TEXT         = "#ededee";
const GREEN        = "#22c55e";
const AMBER        = "#f59e0b";
const RED          = "#ec4525";
const INPUT_BG     = "#0c0b0d";
const INPUT_BORDER = "rgba(255,255,255,0.12)";

// ── Types ─────────────────────────────────────────────────────────────────────
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
    interceptions?: number;
    passes_completed?: number;
    passes_total?: number;
    dribbles_success?: number;
    dribbles_total?: number;
    goals_conceded?: number;
    claims_success?: number;
    claims_total?: number;
    penalties_saved?: number;
    penalties_faced?: number;
  };
  isGoalkeeper?: boolean;
}

interface GoalTypeConfig {
  label: string;
  icon: string;
  minValue: number;
  maxValue: number;
  step: number;
  unit?: string;
  type: "accumulation" | "limit";
  limitLabel?: string;
  description: string;
}

// ── Goal type registry ────────────────────────────────────────────────────────
const GOAL_TYPE_CONFIG: Record<string, GoalTypeConfig> = {
  goals:                   { label: "Gols",                    icon: "⚽", minValue: 1,   maxValue: 50,   step: 1,  type: "accumulation", description: "Quantidade de gols marcados na temporada" },
  assists:                 { label: "Assistências",             icon: "🅰️", minValue: 1,   maxValue: 30,   step: 1,  type: "accumulation", description: "Passes decisivos para gols" },
  matches:                 { label: "Partidas",                 icon: "🏟️", minValue: 5,   maxValue: 60,   step: 5,  type: "accumulation", description: "Total de jogos disputados" },
  minutes:                 { label: "Minutos",                  icon: "⏱️", minValue: 250, maxValue: 5000, step: 50, unit: "min", type: "accumulation", description: "Tempo total em campo" },
  shots:                   { label: "Finalizações",             icon: "🎯", minValue: 10,  maxValue: 150,  step: 5,  type: "accumulation", description: "Chutes a gol durante a temporada" },
  tackles:                 { label: "Desarmes",                 icon: "🦵", minValue: 10,  maxValue: 150,  step: 5,  type: "accumulation", description: "Recuperações de bola com sucesso" },
  interceptions:           { label: "Interceptações",           icon: "🧲", minValue: 1,   maxValue: 200,  step: 5,  type: "accumulation", description: "Quantidade de interceptações na temporada" },
  pass_accuracy:           { label: "Aproveitamento de Passe",  icon: "📊", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de acerto de passe" },
  dribble_accuracy:        { label: "Aproveitamento de Dribles",icon: "🏃", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de acerto de dribles" },
  yellow_cards_max:        { label: "Amarelos",                 icon: "🟨", minValue: 1,   maxValue: 15,   step: 1,  type: "limit", limitLabel: "máx.", description: "Limite máximo de cartões amarelos" },
  saves:                   { label: "Defesas Totais",           icon: "🧤", minValue: 1,   maxValue: 300,  step: 10, type: "accumulation", description: "Total de defesas na temporada" },
  saves_difficult:         { label: "Defesas Difíceis",         icon: "🦸", minValue: 1,   maxValue: 120,  step: 5,  type: "accumulation", description: "Defesas difíceis na temporada" },
  clean_sheets:            { label: "Clean Sheets",             icon: "🛡️", minValue: 1,   maxValue: 30,   step: 1,  type: "accumulation", description: "Jogos sem sofrer gols" },
  goals_conceded_max:      { label: "Gols Sofridos",            icon: "🥅", minValue: 0,   maxValue: 80,   step: 1,  type: "limit", limitLabel: "máx.", description: "Limite máximo de gols sofridos" },
  goalkeeper_claims_accuracy: { label: "Saídas Corretas",       icon: "🧤", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de saídas bem-sucedidas" },
  penalty_save_rate:       { label: "Pênaltis Defendidos",      icon: "🥊", minValue: 1,   maxValue: 100,  step: 1,  unit: "%", type: "accumulation", description: "Percentual de pênaltis defendidos" },
};

const OUTFIELD_GOAL_TYPES = ["goals","assists","matches","minutes","shots","tackles","interceptions","pass_accuracy","dribble_accuracy","yellow_cards_max"];
const GK_GOAL_TYPES = ["saves","saves_difficult","clean_sheets","matches","minutes","interceptions","pass_accuracy","dribble_accuracy","yellow_cards_max","goals_conceded_max","goalkeeper_claims_accuracy","penalty_save_rate"];

// ── Progress bar color ─────────────────────────────────────────────────────────
function getBarColor(pct: number, isLimit: boolean): string {
  if (isLimit) {
    if (pct >= 100) return RED;
    if (pct >= 75)  return AMBER;
    return GREEN;
  }
  if (pct >= 100) return GREEN;
  if (pct >= 75)  return "#3b82f6"; // blue
  if (pct >= 40)  return AMBER;
  return MUTED;
}

// ── Contextual tip generator ──────────────────────────────────────────────────
function getGoalTip(goalType: string, current: number, target: number, pct: number, isLimit: boolean): string {
  if (isLimit) {
    const remaining = target - current;
    if (current > target) return `Limite ultrapassado em ${current - target}. Foco total na disciplina.`;
    if (pct >= 80) return `Atenção: apenas ${remaining} restante${remaining !== 1 ? "s" : ""}. Controle emocional é prioridade.`;
    if (pct >= 50) return `Metade do limite usada. Mantenha a cabeça fria nas disputas.`;
    return `Ótima disciplina até aqui. Continue assim.`;
  }
  const remaining = target - current;
  if (pct >= 100) return `Meta conquistada! Considere elevar o desafio para a próxima fase.`;
  if (pct >= 75)  return `Faltam apenas ${remaining}. Você está muito perto — não baixe o ritmo!`;
  if (pct >= 50)  return `Boa metade do caminho. Mantenha a constância nas próximas rodadas.`;
  switch (goalType) {
    case "goals":       return `Foque na qualidade das finalizações. Menos é mais quando a bola entra.`;
    case "assists":     return `Tomadas de decisão rápidas no último terço aumentam seu índice de assistências.`;
    case "matches":     return `Presença constante mostra ao treinador que você está disponível e comprometido.`;
    case "minutes":     return `Cada minuto em campo é uma vitrine. Entrega total mesmo quando entra no segundo tempo.`;
    case "shots":       return `Busque mais situações de chute. Jogadores que finalizam mais criam mais gols.`;
    case "tackles":     return `Posicionamento tático antecipado melhora sua taxa de desarmes.`;
    case "interceptions": return `Leitura de jogo é a chave. Estude os padrões de passe do adversário.`;
    case "pass_accuracy": return `Simplicidade é precisão. Prefira o passe seguro ao arriscado.`;
    case "dribble_accuracy": return `Drible no momento certo, com velocidade de decisão. Menos tentativas, mais sucesso.`;
    default:            return `Trabalho consistente e foco diário levam à conquista.`;
  }
}

// ── Styled Input ──────────────────────────────────────────────────────────────
function DarkInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min} max={max} step={step}
      className="font-editorial-mono text-[13px] w-20 px-2.5 py-1.5 rounded-lg outline-none text-center"
      style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}
      onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
      onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)}
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AthleteSeasonGoalsCard({
  athleteId,
  currentStats,
  isGoalkeeper = false,
}: AthleteSeasonGoalsCardProps) {
  const [loading, setLoading]                       = useState(true);
  const [saving, setSaving]                         = useState(false);
  const [goals, setGoals]                           = useState<SeasonGoal[]>([]);
  const [previousSeasonGoals, setPreviousSeasonGoals] = useState<Record<number, SeasonGoal[]>>({});
  const [showAddDialog, setShowAddDialog]           = useState(false);
  const [newGoalType, setNewGoalType]               = useState<string>("");
  const [newGoalValue, setNewGoalValue]             = useState<number>(0);
  const [editingGoal, setEditingGoal]               = useState<SeasonGoal | null>(null);
  const [showHistory, setShowHistory]               = useState(false);

  const currentYear = new Date().getFullYear();
  const availableGoalTypes = isGoalkeeper ? GK_GOAL_TYPES : OUTFIELD_GOAL_TYPES;

  useEffect(() => { fetchGoals(); }, [athleteId, currentYear]);

  const fetchGoals = async () => {
    try {
      const { data: cur, error: e1 } = await supabase
        .from("player_season_goals")
        .select("id, goal_type, target_value, season_year")
        .eq("player_id", athleteId)
        .eq("season_year", currentYear);
      if (e1) throw e1;
      setGoals(cur || []);

      const { data: hist, error: e2 } = await supabase
        .from("player_season_goals")
        .select("id, goal_type, target_value, season_year")
        .eq("player_id", athleteId)
        .lt("season_year", currentYear)
        .gte("season_year", currentYear - 3)
        .order("season_year", { ascending: false });
      if (e2) throw e2;

      const grouped: Record<number, SeasonGoal[]> = {};
      (hist || []).forEach(g => {
        if (g.season_year) {
          if (!grouped[g.season_year]) grouped[g.season_year] = [];
          grouped[g.season_year].push(g);
        }
      });
      setPreviousSeasonGoals(grouped);
    } catch (err) {
      console.error("[SeasonGoals] fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentValue = (goalType: string): number => {
    switch (goalType) {
      case "goals":       return currentStats.goals;
      case "assists":     return currentStats.assists;
      case "matches":     return currentStats.matches;
      case "minutes":     return currentStats.minutes;
      case "saves":       return currentStats.saves;
      case "clean_sheets":return currentStats.clean_sheets;
      case "shots":       return currentStats.shots ?? 0;
      case "tackles":     return currentStats.tackles ?? 0;
      case "yellow_cards_max": return currentStats.yellow_cards ?? 0;
      case "interceptions": return currentStats.interceptions ?? 0;
      case "pass_accuracy": {
        const c = currentStats.passes_completed ?? 0, t = currentStats.passes_total ?? 0;
        return t === 0 ? 0 : Math.round((c / t) * 1000) / 10;
      }
      case "dribble_accuracy": {
        const s = currentStats.dribbles_success ?? 0, t = currentStats.dribbles_total ?? 0;
        return t === 0 ? 0 : Math.round((s / t) * 1000) / 10;
      }
      case "saves_difficult": return 0;
      case "goals_conceded_max": return currentStats.goals_conceded ?? 0;
      case "goalkeeper_claims_accuracy": {
        const s = currentStats.claims_success ?? 0, t = currentStats.claims_total ?? 0;
        return t === 0 ? 0 : Math.round((s / t) * 1000) / 10;
      }
      case "penalty_save_rate": {
        const s = currentStats.penalties_saved ?? 0, f = currentStats.penalties_faced ?? 0;
        return f === 0 ? 0 : Math.round((s / f) * 1000) / 10;
      }
      default: return 0;
    }
  };

  const handleAddGoal = async () => {
    if (!newGoalType || newGoalValue <= 0) { toast.error("Selecione um tipo e valor válido"); return; }
    const config = GOAL_TYPE_CONFIG[newGoalType];
    if (newGoalValue < config.minValue || newGoalValue > config.maxValue) {
      toast.error(`Valor entre ${config.minValue} e ${config.maxValue}`); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("player_season_goals").upsert({
        player_id: athleteId, season_year: currentYear, goal_type: newGoalType, target_value: newGoalValue,
      }, { onConflict: "player_id,season_year,goal_type" });
      if (error) throw error;
      toast.success("Meta criada!");
      setShowAddDialog(false); setNewGoalType(""); setNewGoalValue(0);
      await fetchGoals();
    } catch { toast.error("Erro ao criar meta"); }
    finally { setSaving(false); }
  };

  const handleUpdateGoal = async (goalId: string, newValue: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const config = GOAL_TYPE_CONFIG[goal.goal_type];
    if (newValue < config.minValue || newValue > config.maxValue) {
      toast.error(`Valor entre ${config.minValue} e ${config.maxValue}`); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("player_season_goals").update({ target_value: newValue }).eq("id", goalId);
      if (error) throw error;
      toast.success("Meta atualizada!"); setEditingGoal(null); await fetchGoals();
    } catch { toast.error("Erro ao atualizar meta"); }
    finally { setSaving(false); }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("player_season_goals").delete().eq("id", goalId);
      if (error) throw error;
      toast.success("Meta removida"); await fetchGoals();
    } catch { toast.error("Erro ao remover meta"); }
    finally { setSaving(false); }
  };

  const existingGoalTypes = goals.map(g => g.goal_type);
  const availableToAdd = availableGoalTypes.filter(t => !existingGoalTypes.includes(t));
  const previousYears = Object.keys(previousSeasonGoals).map(Number).sort((a, b) => b - a);

  const completedGoals = useMemo(() => goals.filter(g => {
    const config = GOAL_TYPE_CONFIG[g.goal_type];
    const cur = getCurrentValue(g.goal_type);
    return config?.type === "limit" ? cur <= g.target_value : cur >= g.target_value;
  }).length, [goals, currentStats]);

  if (loading) {
    return (
      <div className="rounded-xl border flex items-center justify-center min-h-[220px]"
        style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden flex flex-col"
        style={{ background: CARD_BG, borderColor: CARD_BORDER }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-5 py-3 sm:py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-editorial-mono text-[10px] sm:text-[11px] tracking-[0.18em] sm:tracking-[0.22em] uppercase" style={{ color: MUTED }}>
              // Metas da Temporada
            </span>
            <span className="font-editorial-mono text-[9px] sm:text-[9.5px]" style={{ color: MUTED }}>
              {currentYear}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {goals.length > 0 && (
              <span
                className="font-editorial-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap"
                style={{
                  background: completedGoals === goals.length ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                  color: completedGoals === goals.length ? GREEN : MUTED,
                  border: `1px solid ${completedGoals === goals.length ? "rgba(34,197,94,0.25)" : CARD_BORDER}`,
                }}
              >
                {completedGoals}/{goals.length}
                <span className="hidden sm:inline"> completas</span>
              </span>
            )}
            {previousYears.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors"
                style={{ border: `1px solid ${CARD_BORDER}`, color: MUTED, background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <History className="w-3 h-3" />
                <span className="font-editorial-mono text-[9px] sm:text-[10px] hidden sm:inline">Histórico</span>
              </button>
            )}
            {availableToAdd.length > 0 && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center self-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-opacity font-editorial-mono text-[9px] sm:text-[10px] font-bold tracking-wider"
                style={{ background: RED, color: "#fff" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                META
              </button>
            )}
          </div>
        </div>

        {/* ── Goals list ─────────────────────────────────────────────────── */}
        <div className="flex flex-col divide-y" style={{ borderColor: CARD_BORDER }}>
          {goals.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${CARD_BORDER}` }}>
                <Target className="w-6 h-6" style={{ color: MUTED }} />
              </div>
              <div>
                <p className="font-display font-semibold text-[15px]" style={{ color: TEXT }}>Nenhuma meta definida</p>
                <p className="font-editorial-mono text-[10.5px] mt-1 leading-snug" style={{ color: MUTED }}>
                  Defina metas pessoais para acompanhar seu crescimento na temporada.
                </p>
              </div>
              {availableToAdd.length > 0 && (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-editorial-mono text-[10px] font-bold tracking-wider transition-opacity"
                  style={{ background: RED, color: "#fff" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  CRIAR PRIMEIRA META
                </button>
              )}
            </div>
          ) : (
            goals.map((goal, idx) => {
              const config = GOAL_TYPE_CONFIG[goal.goal_type] ?? {
                label: goal.goal_type, icon: "🎯", type: "accumulation" as const,
                minValue: 1, maxValue: 100, step: 1, description: "",
              };
              const current     = getCurrentValue(goal.goal_type);
              const pct         = Math.min((current / goal.target_value) * 100, 100);
              const isLimit     = config.type === "limit";
              const isComplete  = isLimit ? current <= goal.target_value : current >= goal.target_value;
              const isOverLimit = isLimit && current > goal.target_value;
              const isEditing   = editingGoal?.id === goal.id;
              const barColor    = getBarColor(pct, isLimit);
              const tip         = getGoalTip(goal.goal_type, current, goal.target_value, pct, isLimit);
              const isPct       = goal.goal_type === "pass_accuracy" || goal.goal_type === "dribble_accuracy";
              const isMin       = goal.goal_type === "minutes";

              const formatValue = (v: number) => isPct ? `${v.toFixed(1)}%` : isMin ? `${v.toLocaleString("pt-BR")} min` : String(v);

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * idx }}
                  className="px-5 py-4 group"
                  style={{ borderColor: CARD_BORDER }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  {/* Row 1: icon + label + status + counter */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px] flex-shrink-0">{config.icon}</span>
                      <div className="min-w-0">
                        <span className="font-editorial-mono text-[11px] font-semibold tracking-[0.04em]" style={{ color: TEXT }}>
                          {config.label}
                          {isLimit && (
                            <span className="font-editorial-mono text-[9px] ml-1.5" style={{ color: MUTED }}>({config.limitLabel})</span>
                          )}
                        </span>
                        {/* Status indicators */}
                        {isComplete && !isOverLimit && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 inline" style={{ color: GREEN }} />
                            <span className="font-editorial-mono text-[9px]" style={{ color: GREEN }}>
                              {isLimit ? "Dentro do limite" : "Meta atingida!"}
                            </span>
                          </span>
                        )}
                        {isOverLimit && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 inline" style={{ color: RED }} />
                            <span className="font-editorial-mono text-[9px]" style={{ color: RED }}>Limite excedido</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Counter + edit */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <DarkInput
                            value={editingGoal.target_value}
                            onChange={v => setEditingGoal({ ...editingGoal, target_value: v })}
                            min={config.minValue} max={config.maxValue} step={config.step}
                          />
                          <button onClick={() => handleUpdateGoal(goal.id, editingGoal.target_value)} disabled={saving}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: GREEN }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,197,94,0.12)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingGoal(null)}
                            className="p-1.5 rounded-lg transition-colors" style={{ color: MUTED }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="font-display font-bold tabular-nums" style={{ fontSize: 20, color: isOverLimit ? RED : (isComplete ? GREEN : TEXT) }}>
                              {isPct ? current.toFixed(1) : current}
                            </span>
                            <span className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>/</span>
                            <span className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>
                              {isPct ? `${goal.target_value}%` : isMin ? `${goal.target_value} min` : goal.target_value}
                              {isLimit && !isPct && !isMin && " máx."}
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: MUTED }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <Pencil className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[3px] rounded-full mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.7, delay: 0.1 * idx, ease: "easeOut" }}
                      style={{ backgroundColor: barColor }}
                    />
                  </div>

                  {/* Coach tip + remove */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-1.5">
                      <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: isComplete ? GREEN : isOverLimit ? RED : AMBER }} />
                      <p className="font-editorial-mono text-[10px] leading-snug" style={{ color: MUTED }}>
                        {tip}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      disabled={saving}
                      className="font-editorial-mono text-[9px] tracking-wider uppercase flex-shrink-0 transition-colors"
                      style={{ color: MUTED }}
                      onMouseEnter={e => (e.currentTarget.style.color = RED)}
                      onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
                    >
                      Remover
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ── Previous seasons (collapsible) ─────────────────────────────── */}
        <AnimatePresence>
          {showHistory && previousYears.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t overflow-hidden"
              style={{ borderColor: CARD_BORDER }}
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5" style={{ color: MUTED }} />
                  <span className="font-editorial-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>
                    Temporadas anteriores
                  </span>
                </div>
                <div className="space-y-2">
                  {previousYears.map(year => (
                    <Collapsible key={year}>
                      <CollapsibleTrigger className="w-full">
                        <div
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        >
                          <div className="flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5" style={{ color: AMBER }} />
                            <span className="font-editorial-mono text-[11px] font-semibold" style={{ color: TEXT }}>
                              Temporada {year}
                            </span>
                            <span className="font-editorial-mono text-[9.5px] px-2 py-0.5 rounded-md"
                              style={{ background: "rgba(255,255,255,0.06)", color: MUTED }}>
                              {previousSeasonGoals[year]?.length || 0} metas
                            </span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5" style={{ color: MUTED }} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-1 pl-2">
                          {previousSeasonGoals[year]?.map(g => {
                            const cfg = GOAL_TYPE_CONFIG[g.goal_type] ?? { label: g.goal_type, icon: "🎯", type: "accumulation" as const };
                            return (
                              <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                                style={{ background: "rgba(255,255,255,0.02)" }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px]">{cfg.icon}</span>
                                  <span className="font-editorial-mono text-[10.5px]" style={{ color: MUTED }}>{cfg.label}</span>
                                </div>
                                <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                                  Meta: {g.target_value}
                                  {g.goal_type === "minutes" ? " min" : ""}
                                  {g.goal_type === "pass_accuracy" || g.goal_type === "dribble_accuracy" ? "%" : ""}
                                  {cfg.type === "limit" ? " máx." : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer tip ─────────────────────────────────────────────────── */}
        {goals.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: CARD_BORDER }}>
            <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: MUTED }} />
            <span className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
              {completedGoals === goals.length
                ? "Todas as metas atingidas — eleve o desafio para a próxima fase!"
                : `${goals.length - completedGoals} meta${goals.length - completedGoals > 1 ? "s" : ""} em aberto · Clique no lápis para editar valores`}
            </span>
          </div>
        )}
      </div>

      {/* ── Add Goal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <DialogHeader className="px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
            <DialogTitle className="font-editorial-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
              // Nova Meta — {currentYear}
            </DialogTitle>
            <DialogDescription className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
              Defina uma meta pessoal para acompanhar na temporada.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5 space-y-4">
            {/* Type select */}
            <div className="space-y-1.5">
              <label className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                Tipo de meta
              </label>
              <Select value={newGoalType} onValueChange={v => {
                setNewGoalType(v);
                const cfg = GOAL_TYPE_CONFIG[v];
                if (cfg) setNewGoalValue(cfg.minValue);
              }}>
                <SelectTrigger className="font-editorial-mono text-[11px] h-auto py-2.5"
                  style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}>
                  <SelectValue placeholder="Selecione o tipo de meta">
                    {newGoalType && GOAL_TYPE_CONFIG[newGoalType] && (
                      <div className="flex items-center gap-2">
                        <span>{GOAL_TYPE_CONFIG[newGoalType].icon}</span>
                        <span>{GOAL_TYPE_CONFIG[newGoalType].label}</span>
                        {GOAL_TYPE_CONFIG[newGoalType].type === "limit" && (
                          <span className="text-[9px]" style={{ color: AMBER }}>(limite)</span>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]" style={{ background: "#111", border: `1px solid ${CARD_BORDER}` }}>
                  {availableToAdd.map(type => {
                    const cfg = GOAL_TYPE_CONFIG[type];
                    return (
                      <SelectItem key={type} value={type} className="py-3 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{cfg.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-editorial-mono text-[11px] font-semibold" style={{ color: TEXT }}>{cfg.label}</span>
                              {cfg.type === "limit" && (
                                <span className="font-editorial-mono text-[9px] px-1.5 py-0.5 rounded border" style={{ color: AMBER, borderColor: AMBER }}>limite</span>
                              )}
                            </div>
                            <p className="font-editorial-mono text-[10px] mt-0.5" style={{ color: MUTED }}>{cfg.description}</p>
                            <p className="font-editorial-mono text-[9px] mt-0.5" style={{ color: MUTED }}>
                              {cfg.type === "limit" ? "Quanto menos, melhor" : `${cfg.minValue} – ${cfg.maxValue}`}
                              {cfg.unit ? ` ${cfg.unit}` : ""}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Value input */}
            {newGoalType && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-2 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
                <div className="flex items-center justify-between">
                  <label className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                    Valor alvo
                  </label>
                  <span className="font-editorial-mono text-[9px]" style={{ color: MUTED }}>
                    {GOAL_TYPE_CONFIG[newGoalType]?.minValue} – {GOAL_TYPE_CONFIG[newGoalType]?.maxValue}
                    {GOAL_TYPE_CONFIG[newGoalType]?.unit ? ` ${GOAL_TYPE_CONFIG[newGoalType]?.unit}` : ""}
                  </span>
                </div>
                <input
                  type="number"
                  value={newGoalValue}
                  onChange={e => setNewGoalValue(Number(e.target.value))}
                  min={GOAL_TYPE_CONFIG[newGoalType]?.minValue}
                  max={GOAL_TYPE_CONFIG[newGoalType]?.maxValue}
                  step={GOAL_TYPE_CONFIG[newGoalType]?.step}
                  className="w-full font-display font-bold text-center text-[32px] py-3 rounded-xl outline-none"
                  style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
                  onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)}
                />
                <p className="font-editorial-mono text-[10px] text-center" style={{ color: MUTED }}>
                  {GOAL_TYPE_CONFIG[newGoalType]?.type === "limit"
                    ? `⚠ Meta de limite: ficar abaixo de ${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType]?.label.toLowerCase()}`
                    : newGoalType === "minutes"
                      ? `${newGoalValue} minutos totais em campo`
                      : `Alcançar ${newGoalValue} ${GOAL_TYPE_CONFIG[newGoalType]?.label.toLowerCase()}`}
                </p>
              </motion.div>
            )}
          </div>

          <div className="px-5 py-4 flex gap-3 border-t" style={{ borderColor: CARD_BORDER }}>
            <button onClick={() => setShowAddDialog(false)}
              className="flex-1 font-editorial-mono text-[10px] uppercase tracking-[0.18em] py-2.5 border rounded-lg transition-colors"
              style={{ borderColor: CARD_BORDER, color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}>
              CANCELAR
            </button>
            <button
              onClick={handleAddGoal}
              disabled={saving || !newGoalType || newGoalValue <= 0}
              className="flex-[2] flex items-center justify-center gap-2 font-editorial-mono text-[10px] uppercase tracking-[0.18em] py-2.5 rounded-lg transition-opacity"
              style={{ background: RED, color: "#fff", opacity: (saving || !newGoalType || newGoalValue <= 0) ? 0.5 : 1 }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              CRIAR META
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
