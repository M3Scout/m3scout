import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Flame, 
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
  ArrowDownRight
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TrendDirection = "up" | "down" | "stable" | "new";
type InsightType = "rising" | "alert" | "market" | "profile" | "competition" | "balance" | "neutral";
type InsightPriority = 1 | 2 | 3 | 4 | 5; // 1 = highest priority

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
    icon: Flame,
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

// Fallback insights when we don't have enough real data
const getFallbackInsights = (
  existingCount: number,
  stats: { avgAge?: number; positionBalance?: boolean; hasAlerts?: boolean }
): Insight[] => {
  const fallbacks: Insight[] = [];

  if (!stats.hasAlerts) {
    fallbacks.push({
      id: "fallback-no-alerts",
      type: "neutral",
      priority: 5,
      ...insightConfig.neutral,
      title: "Nenhum atleta em alerta",
      description: "Todos os atletas estão com performance estável.",
      tooltip: "Não há atletas com queda significativa de desempenho ou em situação crítica no momento.",
      link: "/app/players",
    });
  }

  if (stats.avgAge && stats.avgAge < 22) {
    fallbacks.push({
      id: "fallback-young-base",
      type: "neutral",
      priority: 5,
      ...insightConfig.neutral,
      icon: TrendingUp,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/5",
      borderClass: "border-blue-500/20 hover:border-blue-500/30",
      title: "Base jovem promissora",
      description: `Média de idade de ${stats.avgAge.toFixed(0)} anos no elenco.`,
      tooltip: "A média de idade dos atletas indica um portfólio com alto potencial de valorização a longo prazo.",
      link: "/app/players",
    });
  }

  if (stats.positionBalance) {
    fallbacks.push({
      id: "fallback-balanced",
      type: "neutral",
      priority: 5,
      ...insightConfig.neutral,
      icon: PieChart,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/5",
      borderClass: "border-emerald-500/20 hover:border-emerald-500/30",
      title: "Elenco bem distribuído",
      description: "Posições equilibradas no portfólio.",
      tooltip: "A distribuição de posições está equilibrada, reduzindo riscos de concentração em áreas específicas.",
      link: "/app/players",
    });
  }

  // Generic fallbacks
  fallbacks.push({
    id: "fallback-explore",
    type: "neutral",
    priority: 5,
    ...insightConfig.neutral,
    icon: Brain,
    title: "Explore o portfólio",
    description: "Analise atletas e crie relatórios.",
    tooltip: "Acesse a lista completa de atletas para análises detalhadas e criação de novos relatórios de scouting.",
    link: "/app/players",
  });

  fallbacks.push({
    id: "fallback-reports",
    type: "neutral",
    priority: 5,
    ...insightConfig.neutral,
    icon: Trophy,
    title: "Acompanhe competições",
    description: "Veja as competições mais utilizadas.",
    tooltip: "Monitore quais competições estão gerando os melhores relatórios e insights sobre atletas.",
    link: "/app/competitions",
  });

  return fallbacks;
};

const TrendBadge = ({ trend }: { trend: Insight["trend"] }) => {
  if (!trend) return null;

  const config = {
    up: {
      icon: ArrowUpRight,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
    },
    down: {
      icon: ArrowDownRight,
      color: "text-rose-400",
      bg: "bg-rose-500/20",
    },
    stable: {
      icon: Minus,
      color: "text-zinc-400",
      bg: "bg-zinc-500/20",
    },
    new: {
      icon: Sparkles,
      color: "text-amber-400",
      bg: "bg-amber-500/20",
    },
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      try {
        const generatedInsights: Insight[] = [];

        // Fetch all necessary data in parallel
        const [
          playersResult,
          statsResult,
          reportsResult,
          competitionsResult,
          ratingHistoryResult,
        ] = await Promise.all([
          supabase
            .from("players")
            .select("id, full_name, position, age, auto_rating, current_club, slug")
            .or("is_archived.is.null,is_archived.eq.false")
            .not("auto_rating", "is", null)
            .order("auto_rating", { ascending: false })
            .limit(50),
          supabase
            .from("player_stats")
            .select("player_id, goals, assists, minutes, matches, season_year, competition_id")
            .order("season_year", { ascending: false })
            .limit(200),
          supabase
            .from("scouting_reports")
            .select("id, player_id, final_score, match_date, competition_id, created_at, players(full_name, slug), competitions(name)")
            .is("deleted_at", null)
            .order("match_date", { ascending: false })
            .limit(100),
          supabase
            .from("competitions")
            .select("id, name, tier, final_coefficient")
            .eq("is_active", true),
          supabase
            .from("player_rating_history")
            .select("player_id, rating, recorded_at")
            .order("recorded_at", { ascending: false })
            .limit(100),
        ]);

        const players = playersResult.data || [];
        const stats = statsResult.data || [];
        const reports = reportsResult.data || [];
        const competitions = competitionsResult.data || [];
        const ratingHistory = ratingHistoryResult.data || [];

        // Helper: Calculate trend from rating history
        const calculatePlayerTrend = (playerId: string): { direction: TrendDirection; value: number } => {
          const playerRatings = ratingHistory
            .filter(r => r.player_id === playerId)
            .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
          
          if (playerRatings.length < 2) {
            return { direction: "new", value: 0 };
          }

          const current = playerRatings[0].rating;
          const previous = playerRatings[Math.min(1, playerRatings.length - 1)].rating;
          const change = ((current - previous) / previous) * 100;

          if (Math.abs(change) < 2) return { direction: "stable", value: 0 };
          return {
            direction: change > 0 ? "up" : "down",
            value: Math.round(Math.abs(change)),
          };
        };

        // Helper: Calculate reports trend (compare last 30 days vs previous 30 days)
        const calculateReportsTrend = (): { direction: TrendDirection; value: number } => {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

          const recentReports = reports.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length;
          const previousReports = reports.filter(r => {
            const date = new Date(r.created_at);
            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
          }).length;

          if (previousReports === 0) {
            return recentReports > 0 ? { direction: "new", value: recentReports } : { direction: "stable", value: 0 };
          }

          const change = ((recentReports - previousReports) / previousReports) * 100;
          if (Math.abs(change) < 5) return { direction: "stable", value: 0 };
          return {
            direction: change > 0 ? "up" : "down",
            value: Math.round(Math.abs(change)),
          };
        };

        // Calculate stats for fallback insights
        const avgAge = players.length > 0 
          ? players.filter(p => p.age).reduce((sum, p) => sum + (p.age || 0), 0) / players.filter(p => p.age).length
          : 0;

        const positionCounts: Record<string, number> = {};
        players.forEach(p => {
          positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
        });
        const sortedPositions = Object.entries(positionCounts).sort((a, b) => b[1] - a[1]);
        const topPosition = sortedPositions[0];
        const concentration = players.length > 0 && topPosition ? (topPosition[1] / players.length) * 100 : 0;
        const isBalanced = concentration <= 30;

        const lowRatedPlayers = players.filter(p => p.auto_rating && p.auto_rating < 3.0);
        const hasAlerts = lowRatedPlayers.length > 0;

        // 1. 🔥 Player Rising - Best performing player with trend (Priority 2)
        if (players.length > 0) {
          const topPlayer = players[0];
          if (topPlayer.auto_rating && topPlayer.auto_rating >= 4.0) {
            const trend = calculatePlayerTrend(topPlayer.id);
            generatedInsights.push({
              id: "rising-1",
              type: "rising",
              priority: 2,
              ...insightConfig.rising,
              title: `${topPlayer.full_name.split(' ')[0]} está em alta`,
              description: `Nota ${topPlayer.auto_rating.toFixed(1)} — melhor do portfólio atual.`,
              tooltip: `${topPlayer.full_name} tem a melhor nota automática entre todos os atletas. Posição: ${topPlayer.position}. Clube: ${topPlayer.current_club || 'N/D'}.`,
              link: `/app/players/${topPlayer.id}`,
              trend: trend.direction !== "stable" ? trend : undefined,
            });
          }
        }

        // 2. ⚠️ Player Alert - Players with low ratings (Priority 1 - highest)
        if (hasAlerts) {
          const alertPlayer = lowRatedPlayers[0];
          const trend = calculatePlayerTrend(alertPlayer.id);
          generatedInsights.push({
            id: "alert-1",
            type: "alert",
            priority: 1,
            ...insightConfig.alert,
            title: `${alertPlayer.full_name.split(' ')[0]} precisa de atenção`,
            description: `Nota ${alertPlayer.auto_rating?.toFixed(1)} — abaixo do esperado.`,
            tooltip: `${alertPlayer.full_name} está com performance abaixo da média. Considere revisar estatísticas ou criar novo relatório de scouting.`,
            link: `/app/players/${alertPlayer.id}`,
            trend: trend.direction === "down" ? trend : undefined,
          });
        }

        // 3. 📈 Market Potential - Young players with good ratings (Priority 3)
        const youngTalents = players.filter(p => 
          p.age && p.age <= 23 && p.auto_rating && p.auto_rating >= 3.5
        );
        if (youngTalents.length > 0) {
          const talent = youngTalents[0];
          const trend = calculatePlayerTrend(talent.id);
          generatedInsights.push({
            id: "market-1",
            type: "market",
            priority: 3,
            ...insightConfig.market,
            title: `${talent.full_name.split(' ')[0]} tem potencial de mercado`,
            description: `${talent.age} anos + nota ${talent.auto_rating?.toFixed(1)} = valorização.`,
            tooltip: `${talent.full_name} combina juventude (${talent.age} anos) com boa performance (${talent.auto_rating?.toFixed(1)}). Alto potencial de valorização no mercado.`,
            link: `/app/players/${talent.id}`,
            trend: trend.direction === "up" ? trend : { direction: "new" as TrendDirection, value: 0 },
          });
        }

        // 4. 🧠 Profile Highlight - Player excelling in specific area (Priority 3)
        if (stats.length > 0 && players.length > 0) {
          const playerGoals: Record<string, number> = {};
          stats.forEach(s => {
            playerGoals[s.player_id] = (playerGoals[s.player_id] || 0) + (s.goals || 0);
          });
          
          const topScorerId = Object.entries(playerGoals)
            .sort((a, b) => b[1] - a[1])[0];
          
          if (topScorerId && topScorerId[1] > 3) {
            const topScorer = players.find(p => p.id === topScorerId[0]);
            if (topScorer) {
              generatedInsights.push({
                id: "profile-1",
                type: "profile",
                priority: 3,
                ...insightConfig.profile,
                title: `${topScorer.full_name.split(' ')[0]} lidera em gols`,
                description: `${topScorerId[1]} gols no período — destaque ofensivo.`,
                tooltip: `${topScorer.full_name} é o artilheiro do portfólio com ${topScorerId[1]} gols. Perfil atacante de alto nível.`,
                link: `/app/players/${topScorer.id}`,
              });
            }
          }
        }

        // 5. 🏆 Strategic Competition - Most used competition (Priority 4)
        if (reports.length > 0) {
          const compCounts: Record<string, { count: number; totalScore: number; name: string }> = {};
          reports.forEach((r: any) => {
            if (r.competition_id && r.competitions?.name) {
              if (!compCounts[r.competition_id]) {
                compCounts[r.competition_id] = { count: 0, totalScore: 0, name: r.competitions.name };
              }
              compCounts[r.competition_id].count++;
              compCounts[r.competition_id].totalScore += r.final_score || 0;
            }
          });

          const topComp = Object.entries(compCounts)
            .map(([id, data]) => ({ id, ...data, avgScore: data.totalScore / data.count }))
            .sort((a, b) => b.count - a.count)[0];

          if (topComp && topComp.count >= 3) {
            const reportsTrend = calculateReportsTrend();
            generatedInsights.push({
              id: "competition-1",
              type: "competition",
              priority: 4,
              ...insightConfig.competition,
              title: `${topComp.name.split(' ').slice(0, 3).join(' ')} é estratégica`,
              description: `${topComp.count} relatórios — média ${topComp.avgScore.toFixed(1)}.`,
              tooltip: `${topComp.name} é a competição mais utilizada com ${topComp.count} relatórios e média de score ${topComp.avgScore.toFixed(1)}.`,
              link: `/app/competitions`,
              trend: reportsTrend.direction !== "stable" ? reportsTrend : undefined,
            });
          }
        }

        // 6. 📊 Unbalanced Portfolio - Position concentration (Priority 4)
        if (players.length >= 5 && !isBalanced && topPosition[1] >= 3) {
          generatedInsights.push({
            id: "balance-1",
            type: "balance",
            priority: 4,
            ...insightConfig.balance,
            title: `Portfólio concentrado`,
            description: `${topPosition[1]} atletas são ${topPosition[0]}s (${concentration.toFixed(0)}%).`,
            tooltip: `O portfólio tem ${concentration.toFixed(0)}% de concentração na posição ${topPosition[0]}. Considere diversificar para reduzir riscos.`,
            link: `/app/players`,
          });
        }

        // Sort by priority and take top insights
        generatedInsights.sort((a, b) => a.priority - b.priority);

        // If we have less than 5 insights, add fallbacks
        const TARGET_INSIGHTS = 5;
        if (generatedInsights.length < TARGET_INSIGHTS) {
          const fallbacks = getFallbackInsights(generatedInsights.length, {
            avgAge: avgAge || undefined,
            positionBalance: isBalanced,
            hasAlerts,
          });

          // Add fallbacks until we reach 5
          for (const fallback of fallbacks) {
            if (generatedInsights.length >= TARGET_INSIGHTS) break;
            // Don't add duplicate types
            if (!generatedInsights.some(i => i.id === fallback.id)) {
              generatedInsights.push(fallback);
            }
          }
        }

        // Always set exactly 5 insights
        setInsights(generatedInsights.slice(0, TARGET_INSIGHTS));
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, []);

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
            <p className="text-[10px] text-zinc-500">Leituras automáticas baseadas nos dados atuais</p>
          </div>
        </div>
      </div>

      {/* Content - Always exactly 5 insights with flex-1 to fill height */}
      <div className="p-3 flex-1 flex flex-col">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col justify-between h-full gap-2">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <Tooltip key={insight.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={insight.link}
                      className={`group flex items-center gap-3 p-3 flex-1 min-h-[52px] rounded-lg border transition-all duration-200 hover:scale-[1.01] w-full max-w-full overflow-hidden ${insight.bgClass} ${insight.borderClass}`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center shrink-0 ${insight.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
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

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
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
