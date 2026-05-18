import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Trophy,
  PieChart,
  Sparkles,
  ChevronRight,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Crosshair,
  ShieldAlert,
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
import { logFetchSuccess, logFetchError, logFetchSkipped, isAbortError } from "@/lib/fetchLogger";

type TrendDirection = "up" | "down" | "stable" | "new";
type InsightType = "rising" | "alert" | "market" | "profile" | "competition" | "balance" | "neutral" | "critical";
type InsightPriority = 1 | 2 | 3 | 4 | 5;

interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  icon: React.ElementType;
  title: string;
  description: string;
  tooltip: string;
  link: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  trend?: {
    direction: TrendDirection;
    value?: number;
    label?: string;
  };
}

const insightConfig = {
  rising: {
    icon: TrendingUp,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  alert: {
    icon: AlertTriangle,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20 hover:border-amber-500/40",
  },
  critical: {
    icon: ShieldAlert,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20 hover:border-rose-500/40",
  },
  market: {
    icon: TrendingUp,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20 hover:border-blue-500/40",
  },
  profile: {
    icon: Brain,
    colorClass: "text-violet-400",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20 hover:border-violet-500/40",
  },
  competition: {
    icon: Trophy,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20 hover:border-primary/40",
  },
  balance: {
    icon: PieChart,
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20 hover:border-rose-500/40",
  },
  neutral: {
    icon: Lightbulb,
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-500/5",
    borderClass: "border-zinc-700/30 hover:border-zinc-600/50",
  },
};

// ─── Aggregated per-player stats for the current season ──────────────────────
interface PlayerAggregate {
  playerId: string;
  fullName: string;
  slug: string | null;
  matches: number;
  minutes: number;
  // passes: accurate_passes = completed; total_passes = FAILED (DB naming quirk)
  passesCompleted: number;
  passesFailed: number;
  // dribbles: successful_dribbles = success; total_dribbles = FAILED (DB naming quirk)
  dribblesSuccess: number;
  dribblesFailed: number;
  crossesSuccess: number;
  crossesFailed: number;
  // ground duels: ground_duels_total = FAILED (DB naming quirk)
  groundDuelsWon: number;
  groundDuelsFailed: number;
  // aerial duels: aerial_duels_total = FAILED (DB naming quirk)
  aerialDuelsWon: number;
  aerialDuelsFailed: number;
}

interface RateRule {
  statName: string;
  icon: React.ElementType;
  success: number;
  total: number;
  minTotal: number;
}

const TrendBadge = ({ trend }: { trend: Insight["trend"] }) => {
  if (!trend) return null;
  const config = {
    up:     { icon: ArrowUpRight,   color: "text-emerald-400", bg: "bg-emerald-500/20" },
    down:   { icon: ArrowDownRight, color: "text-rose-400",    bg: "bg-rose-500/20" },
    stable: { icon: Minus,          color: "text-zinc-400",    bg: "bg-zinc-500/20" },
    new:    { icon: Sparkles,       color: "text-amber-400",   bg: "bg-amber-500/20" },
  };
  const { icon: Icon, color, bg } = config[trend.direction];
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
      {trend.value !== undefined && (
        <span>{trend.direction === "down" ? "" : "+"}{trend.value}%</span>
      )}
      {trend.label && <span>{trend.label}</span>}
    </div>
  );
};

export const InsightsCard = () => {
  const { session } = useAuth();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const generateInsights = useCallback(async () => {
    if (!session?.user) { logFetchSkipped("InsightsCard", "no session"); return; }
    if (hasFetched) return;
    setHasFetched(true);

    const fetchStart = performance.now();
    const currentYear = new Date().getFullYear();

    try {
      // Fetch all player_stats rows for the current season, with player details
      const { data: rows, error } = await supabase
        .from("player_stats")
        .select(`
          player_id,
          matches, minutes,
          accurate_passes, total_passes,
          crosses_success, crosses_failed,
          successful_dribbles, total_dribbles,
          ground_duels_won, ground_duels_total,
          aerial_duels_won, aerial_duels_total,
          player:players!player_id(id, full_name, slug, is_archived)
        `)
        .eq("season_year", currentYear);

      if (error) throw error;

      // ── Aggregate per player (sum across all competitions) ──────────────────
      const map = new Map<string, PlayerAggregate>();

      for (const row of (rows ?? [])) {
        const p = (row.player as any);
        if (!p || p.is_archived) continue;

        const existing = map.get(row.player_id) ?? {
          playerId:        row.player_id,
          fullName:        p.full_name ?? "Atleta",
          slug:            p.slug ?? null,
          matches:         0,
          minutes:         0,
          passesCompleted: 0,
          passesFailed:    0,
          dribblesSuccess: 0,
          dribblesFailed:  0,
          crossesSuccess:  0,
          crossesFailed:   0,
          groundDuelsWon:  0,
          groundDuelsFailed: 0,
          aerialDuelsWon:  0,
          aerialDuelsFailed: 0,
        };

        existing.matches          += row.matches          ?? 0;
        existing.minutes          += row.minutes          ?? 0;
        existing.passesCompleted  += row.accurate_passes  ?? 0;
        existing.passesFailed     += row.total_passes     ?? 0; // column stores FAILED
        existing.dribblesSuccess  += row.successful_dribbles ?? 0;
        existing.dribblesFailed   += row.total_dribbles   ?? 0; // column stores FAILED
        existing.crossesSuccess   += row.crosses_success  ?? 0;
        existing.crossesFailed    += row.crosses_failed   ?? 0;
        existing.groundDuelsWon   += row.ground_duels_won   ?? 0;
        existing.groundDuelsFailed += row.ground_duels_total ?? 0; // column stores FAILED
        existing.aerialDuelsWon   += row.aerial_duels_won   ?? 0;
        existing.aerialDuelsFailed += row.aerial_duels_total ?? 0; // column stores FAILED

        map.set(row.player_id, existing);
      }

      const players = Array.from(map.values());
      const generatedInsights: Insight[] = [];

      for (const p of players) {
        const firstName = p.fullName.split(" ")[0];
        const playerLink = `/app/players/${p.playerId}`;

        // ── Rule 1: Minutagem Baixa ─────────────────────────────────────────
        if (p.matches >= 5) {
          const avgMin = p.minutes / p.matches;
          if (avgMin <= 45) {
            generatedInsights.push({
              id:          `minutes-${p.playerId}`,
              type:        "alert",
              priority:    3,
              icon:        Clock,
              colorClass:  insightConfig.alert.colorClass,
              bgClass:     insightConfig.alert.bgClass,
              borderClass: insightConfig.alert.borderClass,
              title:       `${firstName}: Minutagem Baixa`,
              description: `Apenas ${avgMin.toFixed(0)} min/jogo em ${p.matches} partidas. Precisa buscar a titularidade ou mais regularidade.`,
              tooltip:     `${p.fullName} tem média de ${avgMin.toFixed(0)} minutos por jogo em ${p.matches} partidas na temporada ${currentYear}. Isso indica falta de regularidade como titular.`,
              link:        playerLink,
            });
          }
        }

        // ── Rule 2: Success Rates ───────────────────────────────────────────
        const rateRules: RateRule[] = [
          {
            statName: "Passes",
            icon:     Target,
            success:  p.passesCompleted,
            total:    p.passesCompleted + p.passesFailed,
            minTotal: 50,
          },
          {
            statName: "Dribles",
            icon:     TrendingUp,
            success:  p.dribblesSuccess,
            total:    p.dribblesSuccess + p.dribblesFailed,
            minTotal: 15,
          },
          {
            statName: "Cruzamentos",
            icon:     Crosshair,
            success:  p.crossesSuccess,
            total:    p.crossesSuccess + p.crossesFailed,
            minTotal: 10,
          },
          {
            statName: "Duelo Chão",
            icon:     ShieldAlert,
            success:  p.groundDuelsWon,
            total:    p.groundDuelsWon + p.groundDuelsFailed,
            minTotal: 15,
          },
          {
            statName: "Duelo Aéreo",
            icon:     ShieldAlert,
            success:  p.aerialDuelsWon,
            total:    p.aerialDuelsWon + p.aerialDuelsFailed,
            minTotal: 10,
          },
        ];

        for (const rule of rateRules) {
          if (rule.total < rule.minTotal) continue;
          const pct = (rule.success / rule.total) * 100;

          if (pct < 50) {
            generatedInsights.push({
              id:          `critical-${rule.statName.toLowerCase()}-${p.playerId}`,
              type:        "critical",
              priority:    1,
              icon:        rule.icon,
              colorClass:  insightConfig.critical.colorClass,
              bgClass:     insightConfig.critical.bgClass,
              borderClass: insightConfig.critical.borderClass,
              title:       `${firstName}: Alerta Crítico em ${rule.statName}`,
              description: `Aproveitamento de apenas ${pct.toFixed(0)}%. Índice preocupante para a temporada.`,
              tooltip:     `${p.fullName} tem aproveitamento de ${pct.toFixed(1)}% em ${rule.statName} (${rule.success}/${rule.total}) na temporada ${currentYear}. Índice abaixo de 50% é considerado crítico.`,
              link:        playerLink,
            });
          } else if (pct <= 65) {
            generatedInsights.push({
              id:          `attention-${rule.statName.toLowerCase()}-${p.playerId}`,
              type:        "alert",
              priority:    2,
              icon:        rule.icon,
              colorClass:  insightConfig.alert.colorClass,
              bgClass:     insightConfig.alert.bgClass,
              borderClass: insightConfig.alert.borderClass,
              title:       `${firstName}: Atenção em ${rule.statName}`,
              description: `Aproveitamento de ${pct.toFixed(0)}%. Exige acompanhamento para melhorar a regularidade.`,
              tooltip:     `${p.fullName} tem aproveitamento de ${pct.toFixed(1)}% em ${rule.statName} (${rule.success}/${rule.total}) na temporada ${currentYear}. Entre 50–65%, exige monitoramento.`,
              link:        playerLink,
            });
          }
        }
      }

      // ── Sort: critical (1) → attention (2) → minutes (3) ─────────────────
      generatedInsights.sort((a, b) => a.priority - b.priority);

      // ── Pad to 5 if needed ────────────────────────────────────────────────
      const TARGET = 5;
      if (generatedInsights.length === 0) {
        generatedInsights.push({
          id:          "no-alerts",
          type:        "neutral",
          priority:    5,
          icon:        Lightbulb,
          colorClass:  insightConfig.neutral.colorClass,
          bgClass:     insightConfig.neutral.bgClass,
          borderClass: insightConfig.neutral.borderClass,
          title:       "Nenhum alerta na temporada",
          description: `Todos os atletas estão com aproveitamentos regulares em ${currentYear}.`,
          tooltip:     `Não foram detectados índices críticos nos dados de ${currentYear}. Continue monitorando!`,
          link:        "/app/players",
        });
      }
      if (generatedInsights.length < TARGET) {
        generatedInsights.push({
          id:          "explore",
          type:        "neutral",
          priority:    5,
          icon:        Brain,
          colorClass:  insightConfig.neutral.colorClass,
          bgClass:     insightConfig.neutral.bgClass,
          borderClass: insightConfig.neutral.borderClass,
          title:       "Explore o portfólio",
          description: "Analise atletas e crie relatórios de scouting.",
          tooltip:     "Acesse a lista completa de atletas para análises detalhadas.",
          link:        "/app/players",
        });
      }

      logFetchSuccess({ endpoint: "InsightsCard" }, performance.now() - fetchStart);
      setInsights(generatedInsights.slice(0, TARGET));
    } catch (error) {
      if (isAbortError(error)) {
        if (import.meta.env.DEV) console.log("[FETCH ABORT] InsightsCard");
        setHasFetched(false);
        return;
      }
      logFetchError(error, { endpoint: "InsightsCard" });
    } finally {
      setLoading(false);
    }
  }, [session?.user, hasFetched]);

  useEffect(() => {
    if (session?.user && !hasFetched) generateInsights();
  }, [session?.user, hasFetched, generateInsights]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-full h-full flex flex-col rounded-xl bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/10 flex items-center justify-center relative">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Insights da Plataforma</h2>
            <p className="text-[10px] text-zinc-500">
              Análise automática · Temporada {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Insight list */}
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
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${insight.colorClass}`}>
                              {insight.title}
                            </p>
                            {insight.trend && <TrendBadge trend={insight.trend} />}
                          </div>
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
