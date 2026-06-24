import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, TrendingUp, Sparkles, ChevronRight,
  Lightbulb, Clock, Target, Crosshair, ShieldAlert,
  Star, Trophy, FileWarning, X, ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG      = "#0f0e13";
const BDR     = "rgba(255,255,255,0.07)";
const MUTED   = "#62616a";
const FG      = "#ededee";

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightCategory = "critical" | "alert" | "positive" | "neutral";

interface Insight {
  id:          string;
  category:    InsightCategory;
  priority:    number;
  icon:        React.ElementType;
  title:       string;
  description: string;
  tooltip:     string;
  link:        string;
}

interface AggregateRow {
  player_id:              string;
  full_name:              string;
  slug:                   string | null;
  total_matches:          number;
  total_minutes:          number;
  total_accurate_passes:  number;
  total_failed_passes:    number;
  total_crosses_success:  number;
  total_crosses_failed:   number;
  total_dribbles_success: number;
  total_dribbles_failed:  number;
  total_ground_duels_won:    number;
  total_ground_duels_failed: number;
  total_aerial_duels_won:    number;
  total_aerial_duels_failed: number;
  total_goals:            number;
  total_assists:          number;
  last_match_date:        string | null;
}

interface GoalRow {
  id:           string;
  player_id:    string;
  goal_type:    string;
  target_value: number;
  season_year:  number;
  player:       { full_name: string } | null;
}

interface ContractRow {
  id:            string;
  full_name:     string;
  contract_end:  string | null;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT: Record<InsightCategory, { color: string; bg: string; border: string; label: string }> = {
  critical: {
    color:  "#f43f5e",
    bg:     "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.2)",
    label:  "Crítico",
  },
  alert: {
    color:  "#f59e0b",
    bg:     "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    label:  "Atenção",
  },
  positive: {
    color:  "#22c55e",
    bg:     "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    label:  "Positivo",
  },
  neutral: {
    color:  MUTED,
    bg:     "rgba(255,255,255,0.03)",
    border: BDR,
    label:  "Info",
  },
};

const GOAL_TYPE_LABELS: Record<string, string> = {
  goals:    "Gols", assists: "Assistências", matches: "Partidas",
  minutes:  "Minutos", shots: "Finalizações", tackles: "Desarmes",
  interceptions: "Interceptações", clearances: "Cortes",
  pass_accuracy: "Passe %", dribble_accuracy: "Dribles %",
};

// ─── LocalStorage dismiss ─────────────────────────────────────────────────────

const LS_KEY = "dismissed_insights_v2";

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveDismissed(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

// ─── Insight engine ───────────────────────────────────────────────────────────

function buildInsights(
  aggregates: AggregateRow[],
  goals: GoalRow[],
  contracts: ContractRow[],
  year: number,
): Insight[] {
  const out: Insight[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Contract alerts ───────────────────────────────────────────────────────
  for (const c of contracts) {
    if (!c.contract_end) continue;
    const end  = new Date(c.contract_end);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
    if (days < 0) continue;

    const firstName = c.full_name.split(" ")[0];
    if (days <= 30) {
      out.push({
        id: `contract-critical-${c.id}`, category: "critical", priority: 1,
        icon: FileWarning,
        title: `${firstName}: Contrato Expirando`,
        description: `Vence em ${days} dia${days === 1 ? "" : "s"}. Ação urgente necessária.`,
        tooltip: `${c.full_name} — contrato com o clube expira em ${days} dias (${end.toLocaleDateString("pt-BR")}).`,
        link: `/dashboard/atletas/${c.id}`,
      });
    } else if (days <= 90) {
      out.push({
        id: `contract-alert-${c.id}`, category: "alert", priority: 2,
        icon: FileWarning,
        title: `${firstName}: Contrato a Vencer`,
        description: `Expira em ${days} dias. Avalie renovação ou transferência.`,
        tooltip: `${c.full_name} — contrato expira em ${days} dias (${end.toLocaleDateString("pt-BR")}).`,
        link: `/dashboard/atletas/${c.id}`,
      });
    }
  }

  // ── Per-player stats rules ────────────────────────────────────────────────
  for (const p of aggregates) {
    const firstName = p.full_name.split(" ")[0];
    const link      = `/dashboard/atletas/${p.player_id}`;

    // Rule: Atleta parado (sem jogo registrado há > 21 dias)
    if (p.last_match_date) {
      const last     = new Date(p.last_match_date);
      const daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (daysSince > 21) {
        out.push({
          id: `idle-${p.player_id}`, category: "alert", priority: 3,
          icon: Clock,
          title: `${firstName}: Sem Jogo Registrado`,
          description: `Último jogo há ${daysSince} dias. Verifique a situação.`,
          tooltip: `${p.full_name} — último jogo registrado no sistema foi em ${last.toLocaleDateString("pt-BR")} (${daysSince} dias atrás).`,
          link,
        });
      }
    }

    // Rule: Minutagem Baixa
    if (p.total_matches >= 5) {
      const avgMin = p.total_minutes / p.total_matches;
      if (avgMin <= 45) {
        out.push({
          id: `minutes-${p.player_id}`, category: "alert", priority: 4,
          icon: Clock,
          title: `${firstName}: Minutagem Baixa`,
          description: `Média de ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} partidas.`,
          tooltip: `${p.full_name} — ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} jogos na temporada ${year}. Pode indicar falta de regularidade como titular.`,
          link,
        });
      }
    }

    // Rule: Success rates (critical / alert / positive)
    type RateRule = {
      key: string; icon: React.ElementType;
      success: number; total: number; minTotal: number;
      positiveThreshold: number;
    };
    const rateRules: RateRule[] = [
      {
        key: "Passes", icon: Target,
        success: p.total_accurate_passes,
        total:   p.total_accurate_passes + p.total_failed_passes,
        minTotal: 50, positiveThreshold: 82,
      },
      {
        key: "Dribles", icon: TrendingUp,
        success: p.total_dribbles_success,
        total:   p.total_dribbles_success + p.total_dribbles_failed,
        minTotal: 15, positiveThreshold: 70,
      },
      {
        key: "Cruzamentos", icon: Crosshair,
        success: p.total_crosses_success,
        total:   p.total_crosses_success + p.total_crosses_failed,
        minTotal: 10, positiveThreshold: 75,
      },
      {
        key: "Duelo Chão", icon: ShieldAlert,
        success: p.total_ground_duels_won,
        total:   p.total_ground_duels_won + p.total_ground_duels_failed,
        minTotal: 15, positiveThreshold: 65,
      },
      {
        key: "Duelo Aéreo", icon: ShieldAlert,
        success: p.total_aerial_duels_won,
        total:   p.total_aerial_duels_won + p.total_aerial_duels_failed,
        minTotal: 10, positiveThreshold: 65,
      },
    ];

    for (const r of rateRules) {
      if (r.total < r.minTotal) continue;
      const pct = (r.success / r.total) * 100;

      if (pct < 50) {
        out.push({
          id: `critical-${r.key.toLowerCase()}-${p.player_id}`, category: "critical", priority: 1,
          icon: r.icon,
          title: `${firstName}: Alerta Crítico em ${r.key}`,
          description: `Aproveitamento de apenas ${pct.toFixed(0)}%. Exige intervenção.`,
          tooltip: `${p.full_name} — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Abaixo de 50% é crítico.`,
          link,
        });
      } else if (pct <= 65) {
        out.push({
          id: `alert-${r.key.toLowerCase()}-${p.player_id}`, category: "alert", priority: 3,
          icon: r.icon,
          title: `${firstName}: Atenção em ${r.key}`,
          description: `Aproveitamento de ${pct.toFixed(0)}%. Monitoramento necessário.`,
          tooltip: `${p.full_name} — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Entre 50–65%, requer acompanhamento.`,
          link,
        });
      } else if (pct >= r.positiveThreshold) {
        out.push({
          id: `positive-${r.key.toLowerCase()}-${p.player_id}`, category: "positive", priority: 6,
          icon: Star,
          title: `${firstName}: Em Alta em ${r.key}`,
          description: `${pct.toFixed(0)}% de aproveitamento. Excelente desempenho.`,
          tooltip: `${p.full_name} — ${r.key}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Acima do benchmark de referência.`,
          link,
        });
      }
    }
  }

  // ── Goal meta progress ────────────────────────────────────────────────────
  const aggregateMap = new Map(aggregates.map(a => [a.player_id, a]));

  for (const g of goals) {
    if (g.season_year !== year) continue;
    if (!g.player) continue;
    const agg = aggregateMap.get(g.player_id);
    if (!agg) continue;

    // Compute current value for types we have in the aggregate
    let currentValue: number | null = null;
    if (g.goal_type === "goals")   currentValue = agg.total_goals;
    if (g.goal_type === "assists") currentValue = agg.total_assists;
    if (g.goal_type === "matches") currentValue = agg.total_matches;
    if (g.goal_type === "minutes") currentValue = agg.total_minutes;
    if (currentValue === null || g.target_value <= 0) continue;

    const pct       = (currentValue / g.target_value) * 100;
    const firstName = g.player.full_name.split(" ")[0];
    const typeLabel = GOAL_TYPE_LABELS[g.goal_type] ?? g.goal_type;
    const link      = `/dashboard/atletas/${g.player_id}`;

    if (pct >= 100) {
      out.push({
        id: `goal-achieved-${g.id}`, category: "positive", priority: 5,
        icon: Trophy,
        title: `${firstName}: Meta Batida! 🎯`,
        description: `Meta de ${typeLabel} alcançada (${currentValue}/${g.target_value}).`,
        tooltip: `${g.player.full_name} atingiu a meta de ${typeLabel} na temporada ${year}: ${currentValue} de ${g.target_value} (${pct.toFixed(0)}%).`,
        link,
      });
    } else if (pct >= 80) {
      out.push({
        id: `goal-near-${g.id}`, category: "positive", priority: 6,
        icon: Target,
        title: `${firstName}: Perto da Meta`,
        description: `${pct.toFixed(0)}% da meta de ${typeLabel} (${currentValue}/${g.target_value}).`,
        tooltip: `${g.player.full_name} está a ${g.target_value - currentValue} de atingir a meta de ${typeLabel} na temporada ${year}.`,
        link,
      });
    } else if (pct < 30 && agg.total_matches >= 8) {
      out.push({
        id: `goal-behind-${g.id}`, category: "alert", priority: 4,
        icon: AlertTriangle,
        title: `${firstName}: Meta em Risco`,
        description: `Apenas ${pct.toFixed(0)}% da meta de ${typeLabel} com ${agg.total_matches} jogos.`,
        tooltip: `${g.player.full_name} — meta de ${typeLabel}: ${currentValue}/${g.target_value} (${pct.toFixed(0)}%). Ritmo abaixo do necessário com ${agg.total_matches} partidas disputadas.`,
        link,
      });
    }
  }

  // Sort: priority ascending (1 = most urgent)
  out.sort((a, b) => a.priority - b.priority);

  return out;
}

// ─── Category filter pill ─────────────────────────────────────────────────────

type FilterValue = "all" | InsightCategory;

function FilterPill({
  label, count, active, color, onClick,
}: { label: string; count: number; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all duration-200 shrink-0"
      style={{
        background: active ? `${color}22` : "rgba(255,255,255,0.04)",
        border:     `1px solid ${active ? color : BDR}`,
        color:      active ? color : MUTED,
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
          style={{ background: active ? color : "rgba(255,255,255,0.08)", color: active ? "#111" : MUTED }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightChip({
  insight, index, onDismiss,
}: { insight: Insight; index: number; onDismiss: (id: string) => void }) {
  const cat  = CAT[insight.category];
  const Icon = insight.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      className="relative shrink-0 w-[210px] rounded-xl flex flex-col gap-2.5 p-3.5 group"
      style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
    >
      {/* Dismiss */}
      <button
        onClick={(e) => { e.preventDefault(); onDismiss(insight.id); }}
        className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(255,255,255,0.08)", color: MUTED }}
        title="Dispensar"
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}
      >
        <Icon className="w-4 h-4" style={{ color: cat.color }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-3">
        <p className="font-display font-semibold text-[12px] leading-tight mb-1 line-clamp-2"
          style={{ color: cat.color }}>
          {insight.title}
        </p>
        <p className="font-mono text-[10px] leading-relaxed line-clamp-3" style={{ color: MUTED }}>
          {insight.description}
        </p>
      </div>

      {/* Link arrow */}
      <Link
        to={insight.link}
        className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-all duration-150 w-fit"
        style={{ color: cat.color }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        Ver atleta <ChevronRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const InsightsCard = () => {
  const { session } = useAuth();
  const currentYear = new Date().getFullYear();

  const [filter,    setFilter]    = useState<FilterValue>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync dismissed to localStorage
  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  const handleDismiss = (id: string) =>
    setDismissed(prev => new Set([...prev, id]));

  // ── Query 1: season aggregates (extended RPC) ───────────────────────────
  const { data: aggregates = [], isLoading: loadingAgg } = useQuery<AggregateRow[]>({
    queryKey:  ["insights-season-aggregates-v2", currentYear],
    queryFn:   async () => {
      const { data, error } = await supabase.rpc("get_season_player_aggregates", { p_season_year: currentYear });
      if (error) throw error;
      return (data ?? []) as AggregateRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled:   !!session?.user,
  });

  // ── Query 2: player season goals (meta progress) ────────────────────────
  const { data: goals = [], isLoading: loadingGoals } = useQuery<GoalRow[]>({
    queryKey:  ["insights-goals", currentYear],
    queryFn:   async () => {
      const { data, error } = await supabase
        .from("player_season_goals")
        .select("id, player_id, goal_type, target_value, season_year, player:players(full_name)")
        .eq("season_year", currentYear);
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled:   !!session?.user,
  });

  // ── Query 3: contracts expiring ─────────────────────────────────────────
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<ContractRow[]>({
    queryKey:  ["insights-contracts"],
    queryFn:   async () => {
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, contract_end")
        .not("contract_end", "is", null)
        .lte("contract_end", ninetyDays.toISOString().split("T")[0])
        .eq("is_archived", false);
      if (error) throw error;
      return (data ?? []) as ContractRow[];
    },
    staleTime: 10 * 60 * 1000,
    enabled:   !!session?.user,
  });

  const isLoading = loadingAgg || loadingGoals || loadingContracts;

  // ── Build and filter insights ───────────────────────────────────────────
  const allInsights = useMemo(
    () => buildInsights(aggregates, goals, contracts, currentYear),
    [aggregates, goals, contracts, currentYear],
  );

  const visible = useMemo(
    () => allInsights.filter(i => !dismissed.has(i.id)),
    [allInsights, dismissed],
  );

  const filtered = useMemo(
    () => filter === "all" ? visible : visible.filter(i => i.category === filter),
    [visible, filter],
  );

  const counts = useMemo(() => ({
    critical: visible.filter(i => i.category === "critical").length,
    alert:    visible.filter(i => i.category === "alert").length,
    positive: visible.filter(i => i.category === "positive").length,
  }), [visible]);

  // ── Scroll helpers ──────────────────────────────────────────────────────
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full rounded-xl overflow-hidden" style={{ background: BG, border: `1px solid ${BDR}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: BDR }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)" }}>
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[13px] font-display font-semibold" style={{ color: FG }}>Insights da Plataforma</p>
              <p className="text-[10px] font-mono" style={{ color: MUTED }}>Analisando dados...</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[210px] h-[130px] rounded-xl animate-pulse shrink-0"
              style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl overflow-hidden flex flex-col"
      style={{ background: BG, border: `1px solid ${BDR}` }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-4 border-b shrink-0"
        style={{ borderColor: BDR }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center relative"
            style={{ background: "rgba(245,158,11,0.12)" }}>
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <Sparkles className="w-2 h-2 text-amber-300 absolute -top-0.5 -right-0.5" />
          </div>
          <div>
            <p className="text-[12px] font-display font-semibold uppercase tracking-wide" style={{ color: FG }}>
              // Insights da Plataforma
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <FilterPill
            label="Todos" count={visible.length}
            active={filter === "all"} color="#ededee"
            onClick={() => setFilter("all")}
          />
          {counts.critical > 0 && (
            <FilterPill
              label="Crítico" count={counts.critical}
              active={filter === "critical"} color={CAT.critical.color}
              onClick={() => setFilter(f => f === "critical" ? "all" : "critical")}
            />
          )}
          {counts.alert > 0 && (
            <FilterPill
              label="Atenção" count={counts.alert}
              active={filter === "alert"} color={CAT.alert.color}
              onClick={() => setFilter(f => f === "alert" ? "all" : "alert")}
            />
          )}
          {counts.positive > 0 && (
            <FilterPill
              label="Positivo" count={counts.positive}
              active={filter === "positive"} color={CAT.positive.color}
              onClick={() => setFilter(f => f === "positive" ? "all" : "positive")}
            />
          )}
        </div>

        {/* Scroll arrows */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BDR}`, color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BDR}`, color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards row */}
      <div
        ref={scrollRef}
        className="flex gap-3 p-4 overflow-x-auto scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center justify-center py-8 gap-2"
            >
              <Sparkles className="w-5 h-5 text-amber-400/60" />
              <p className="font-mono text-[11px]" style={{ color: MUTED }}>
                {filter === "all"
                  ? "Nenhum insight ativo no momento."
                  : `Nenhum insight "${CAT[filter as InsightCategory]?.label ?? filter}" ativo.`}
              </p>
              {dismissed.size > 0 && (
                <button
                  onClick={() => { setDismissed(new Set()); saveDismissed(new Set()); }}
                  className="font-mono text-[10px] underline"
                  style={{ color: MUTED }}
                >
                  Restaurar {dismissed.size} dispensado{dismissed.size > 1 ? "s" : ""}
                </button>
              )}
            </motion.div>
          ) : (
            filtered.map((insight, i) => (
              <div key={insight.id} style={{ scrollSnapAlign: "start" }}>
                <InsightChip insight={insight} index={i} onDismiss={handleDismiss} />
              </div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Restore dismissed link (footer) */}
      {dismissed.size > 0 && filtered.length > 0 && (
        <div className="px-5 pb-3 flex justify-end">
          <button
            onClick={() => { setDismissed(new Set()); saveDismissed(new Set()); }}
            className="font-mono text-[9px] uppercase tracking-wider transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            Restaurar {dismissed.size} dispensado{dismissed.size > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </motion.div>
  );
};
