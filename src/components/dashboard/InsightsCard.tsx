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

interface Insight {
  id: string;
  type: "rising" | "alert" | "market" | "profile" | "competition" | "balance";
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

        // 1. 🔥 Player Rising - Best performing player with trend
        if (players.length > 0) {
          const topPlayer = players[0];
          if (topPlayer.auto_rating && topPlayer.auto_rating >= 4.0) {
            const trend = calculatePlayerTrend(topPlayer.id);
            generatedInsights.push({
              id: "rising-1",
              type: "rising",
              ...insightConfig.rising,
              title: `${topPlayer.full_name.split(' ')[0]} está em alta`,
              description: `Nota ${topPlayer.auto_rating.toFixed(1)} — melhor do portfólio atual.`,
              tooltip: `${topPlayer.full_name} tem a melhor nota automática entre todos os atletas. Posição: ${topPlayer.position}. Clube: ${topPlayer.current_club || 'N/D'}.`,
              link: `/app/players/${topPlayer.id}`,
              trend: trend.direction !== "stable" ? trend : undefined,
            });
          }
        }

        // 2. ⚠️ Player Alert - Players with low ratings
        const lowRatedPlayers = players.filter(p => p.auto_rating && p.auto_rating < 3.0);
        if (lowRatedPlayers.length > 0) {
          const alertPlayer = lowRatedPlayers[0];
          const trend = calculatePlayerTrend(alertPlayer.id);
          generatedInsights.push({
            id: "alert-1",
            type: "alert",
            ...insightConfig.alert,
            title: `${alertPlayer.full_name.split(' ')[0]} precisa de atenção`,
            description: `Nota ${alertPlayer.auto_rating?.toFixed(1)} — abaixo do esperado.`,
            tooltip: `${alertPlayer.full_name} está com performance abaixo da média. Considere revisar estatísticas ou criar novo relatório de scouting.`,
            link: `/app/players/${alertPlayer.id}`,
            trend: trend.direction === "down" ? trend : undefined,
          });
        }

        // 3. 📈 Market Potential - Young players with good ratings
        const youngTalents = players.filter(p => 
          p.age && p.age <= 23 && p.auto_rating && p.auto_rating >= 3.5
        );
        if (youngTalents.length > 0) {
          const talent = youngTalents[0];
          const trend = calculatePlayerTrend(talent.id);
          generatedInsights.push({
            id: "market-1",
            type: "market",
            ...insightConfig.market,
            title: `${talent.full_name.split(' ')[0]} tem potencial de mercado`,
            description: `${talent.age} anos + nota ${talent.auto_rating?.toFixed(1)} = valorização.`,
            tooltip: `${talent.full_name} combina juventude (${talent.age} anos) com boa performance (${talent.auto_rating?.toFixed(1)}). Alto potencial de valorização no mercado.`,
            link: `/app/players/${talent.id}`,
            trend: trend.direction === "up" ? trend : { direction: "new" as TrendDirection, value: 0 },
          });
        }

        // 4. 🧠 Profile Highlight - Player excelling in specific area
        if (stats.length > 0 && players.length > 0) {
          // Find player with most goals
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
                ...insightConfig.profile,
                title: `${topScorer.full_name.split(' ')[0]} lidera em gols`,
                description: `${topScorerId[1]} gols no período — destaque ofensivo.`,
                tooltip: `${topScorer.full_name} é o artilheiro do portfólio com ${topScorerId[1]} gols. Perfil atacante de alto nível.`,
                link: `/app/players/${topScorer.id}`,
              });
            }
          }
        }

        // 5. 🏆 Strategic Competition - Most used competition with trend
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
              ...insightConfig.competition,
              title: `${topComp.name.split(' ').slice(0, 3).join(' ')} é estratégica`,
              description: `${topComp.count} relatórios — média ${topComp.avgScore.toFixed(1)}.`,
              tooltip: `${topComp.name} é a competição mais utilizada com ${topComp.count} relatórios e média de score ${topComp.avgScore.toFixed(1)}.`,
              link: `/app/competitions`,
              trend: reportsTrend.direction !== "stable" ? reportsTrend : undefined,
            });
          }
        }

        // 6. 📊 Unbalanced Portfolio - Position concentration
        if (players.length >= 5) {
          const positionCounts: Record<string, number> = {};
          players.forEach(p => {
            positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
          });

          const sortedPositions = Object.entries(positionCounts)
            .sort((a, b) => b[1] - a[1]);

          const topPosition = sortedPositions[0];
          const concentration = (topPosition[1] / players.length) * 100;

          if (concentration > 30 && topPosition[1] >= 3) {
            generatedInsights.push({
              id: "balance-1",
              type: "balance",
              ...insightConfig.balance,
              title: `Portfólio concentrado`,
              description: `${topPosition[1]} atletas são ${topPosition[0]}s (${concentration.toFixed(0)}%).`,
              tooltip: `O portfólio tem ${concentration.toFixed(0)}% de concentração na posição ${topPosition[0]}. Considere diversificar para reduzir riscos.`,
              link: `/app/players`,
            });
          }
        }

        // Limit to 5 insights max
        setInsights(generatedInsights.slice(0, 5));
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
        className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
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
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-800/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
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

      {/* Content */}
      <div className="p-3">
        {insights.length > 0 ? (
          <TooltipProvider delayDuration={300}>
            <div className="space-y-2">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Tooltip key={insight.id}>
                    <TooltipTrigger asChild>
                      <Link
                        to={insight.link}
                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.01] ${insight.bgClass} ${insight.borderClass}`}
                      >
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center shrink-0 ${insight.colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${insight.colorClass}`}>
                              {insight.title}
                            </p>
                            {insight.trend && <TrendBadge trend={insight.trend} />}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                            {insight.description}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
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
        ) : (
          <div className="py-8 text-center">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Sem insights relevantes no momento</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Adicione mais dados para gerar análises automáticas
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
