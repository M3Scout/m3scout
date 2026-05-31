import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Lightbulb,
  Clock,
  Target,
  Crosshair,
  ShieldAlert,
  Brain,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightType = "alert" | "critical" | "neutral";

interface Insight {
  id: string;
  type: InsightType;
  priority: 1 | 2 | 3 | 4 | 5;
  icon: React.ElementType;
  title: string;
  description: string;
  tooltip: string;
  link: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const cfg = {
  critical: {
    colorClass:  "text-rose-400",
    bgClass:     "bg-rose-500/10",
    borderClass: "border-rose-500/20 hover:border-rose-500/40",
  },
  alert: {
    colorClass:  "text-amber-400",
    bgClass:     "bg-amber-500/10",
    borderClass: "border-amber-500/20 hover:border-amber-500/40",
  },
  neutral: {
    colorClass:  "text-zinc-400",
    bgClass:     "bg-zinc-500/5",
    borderClass: "border-zinc-700/30 hover:border-zinc-600/50",
  },
};

// ─── RPC row shape ────────────────────────────────────────────────────────────

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
}

// ─── Insight engine (pure function — runs in useMemo) ─────────────────────────

function buildInsights(aggregates: AggregateRow[], year: number): Insight[] {
  const out: Insight[] = [];

  for (const p of aggregates) {
    const firstName  = p.full_name.split(" ")[0];
    const link       = `/dashboard/atletas/${p.player_id}`;

    // Rule 1 — Minutagem Baixa
    if (p.total_matches >= 5) {
      const avgMin = p.total_minutes / p.total_matches;
      if (avgMin <= 45) {
        out.push({
          id:          `minutes-${p.player_id}`,
          type:        "alert",
          priority:    3,
          icon:        Clock,
          ...cfg.alert,
          title:       `${firstName}: Minutagem Baixa`,
          description: `Apenas ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} partidas na temporada ${year}.`,
          tooltip:     `${p.full_name} tem média de ${avgMin.toFixed(0)} min/jogo em ${p.total_matches} jogos em ${year}. Indica falta de regularidade como titular.`,
          link,
        });
      }
    }

    // Rule 2 — Success rates
    type RateRule = { statName: string; icon: React.ElementType; success: number; total: number; minTotal: number };
    const rules: RateRule[] = [
      { statName: "Passes",      icon: Target,     success: p.total_accurate_passes,  total: p.total_accurate_passes + p.total_failed_passes,   minTotal: 50 },
      { statName: "Dribles",     icon: TrendingUp,  success: p.total_dribbles_success, total: p.total_dribbles_success + p.total_dribbles_failed, minTotal: 15 },
      { statName: "Cruzamentos", icon: Crosshair,   success: p.total_crosses_success,  total: p.total_crosses_success + p.total_crosses_failed,   minTotal: 10 },
      { statName: "Duelo Chão",  icon: ShieldAlert, success: p.total_ground_duels_won, total: p.total_ground_duels_won + p.total_ground_duels_failed, minTotal: 15 },
      { statName: "Duelo Aéreo", icon: ShieldAlert, success: p.total_aerial_duels_won, total: p.total_aerial_duels_won + p.total_aerial_duels_failed, minTotal: 10 },
    ];

    for (const r of rules) {
      if (r.total < r.minTotal) continue;
      const pct = (r.success / r.total) * 100;

      if (pct < 50) {
        out.push({
          id:          `critical-${r.statName.toLowerCase()}-${p.player_id}`,
          type:        "critical",
          priority:    1,
          icon:        r.icon,
          ...cfg.critical,
          title:       `${firstName}: Alerta Crítico em ${r.statName}`,
          description: `Aproveitamento de apenas ${pct.toFixed(0)}%. Índice preocupante para a temporada.`,
          tooltip:     `${p.full_name} — ${r.statName}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Abaixo de 50% é crítico.`,
          link,
        });
      } else if (pct <= 65) {
        out.push({
          id:          `attention-${r.statName.toLowerCase()}-${p.player_id}`,
          type:        "alert",
          priority:    2,
          icon:        r.icon,
          ...cfg.alert,
          title:       `${firstName}: Atenção em ${r.statName}`,
          description: `Aproveitamento de ${pct.toFixed(0)}%. Exige acompanhamento.`,
          tooltip:     `${p.full_name} — ${r.statName}: ${pct.toFixed(1)}% (${r.success}/${r.total}) em ${year}. Entre 50–65%, requer monitoramento.`,
          link,
        });
      }
    }
  }

  // Sort: critical (1) → attention (2) → minutes (3)
  out.sort((a, b) => a.priority - b.priority);

  // Pad with neutral cards if fewer than 5 real insights
  if (out.length === 0) {
    out.push({
      id: "no-alerts", type: "neutral", priority: 5, icon: Lightbulb, ...cfg.neutral,
      title:       "Nenhum alerta na temporada",
      description: `Todos os atletas com aproveitamentos regulares em ${year}.`,
      tooltip:     `Não foram detectados índices críticos nos dados de ${year}. Continue monitorando!`,
      link:        "/dashboard/atletas",
    });
  }
  if (out.length < 5) {
    out.push({
      id: "explore", type: "neutral", priority: 5, icon: Brain, ...cfg.neutral,
      title:       "Explore o portfólio",
      description: "Analise atletas e crie relatórios de scouting.",
      tooltip:     "Acesse a lista completa de atletas para análises detalhadas.",
      link:        "/dashboard/atletas",
    });
  }

  return out.slice(0, 5);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const InsightsCard = () => {
  const { session } = useAuth();
  const currentYear = new Date().getFullYear();

  // Single RPC call — Postgres aggregates all competitions per player in one
  // pass. React Query fires this in parallel with other dashboard queries and
  // caches the result for 5 minutes so navigating back is instant.
  const { data: aggregates = [], isLoading } = useQuery<AggregateRow[]>({
    queryKey:  ["insights-season-aggregates", currentYear],
    queryFn:   async () => {
      const { data, error } = await supabase.rpc("get_season_player_aggregates", {
        p_season_year: currentYear,
      });
      if (error) throw error;
      return (data ?? []) as AggregateRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled:   !!session?.user,
  });

  // Insight rules run synchronously on the already-aggregated RPC result
  const insights = useMemo(
    () => buildInsights(aggregates, currentYear),
    [aggregates, currentYear],
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-full h-full flex flex-col rounded-xl bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Insights da Plataforma</h2>
              <p className="text-[10px] text-zinc-500">Analisando dados...</p>
            </div>
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <div className="flex flex-col justify-between h-full gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 min-h-[52px] bg-zinc-800/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-full h-full flex flex-col rounded-xl bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/10 flex items-center justify-center relative">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Insights da Plataforma</h2>
            <p className="text-[10px] text-zinc-500">
              Análise automática · Temporada {currentYear}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col justify-between h-full gap-2">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <Tooltip key={insight.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      custom={index}
                      initial={{ opacity: 0, x: -15, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Link
                        to={insight.link}
                        className={`group flex items-center gap-3 p-3 flex-1 min-h-[52px] rounded-lg border transition-all duration-200 w-full max-w-full overflow-hidden ${insight.bgClass} ${insight.borderClass}`}
                      >
                        <motion.div
                          className={`w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center shrink-0 ${insight.colorClass}`}
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.08 + 0.1, duration: 0.3, type: "spring", stiffness: 200 }}
                        >
                          <Icon className="w-4 h-4" />
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${insight.colorClass}`}>
                            {insight.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                            {insight.description}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="max-w-xs bg-zinc-900 border-zinc-800 text-zinc-300 text-xs p-3"
                  >
                    {insight.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </motion.div>
  );
};
