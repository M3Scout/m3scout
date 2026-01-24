import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  Flame,
  Award,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface AthleteInsightsCardProps {
  athleteId: string;
  athletePosition: string;
  averageRating: number | null;
  recentTrend: "up" | "down" | "stable";
  goals: number;
  assists: number;
  matches: number;
  minutes: number;
  yellowCards?: number;
  redCards?: number;
  strengths?: string[];
  areasToImprove?: string[];
}

interface Insight {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  tooltip: string;
  priority: number;
  iconBg: string;
  iconColor: string;
}

export function AthleteInsightsCard({
  athleteId,
  athletePosition,
  averageRating,
  recentTrend,
  goals,
  assists,
  matches,
  minutes,
  yellowCards = 0,
  redCards = 0,
  strengths = [],
  areasToImprove = [],
}: AthleteInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [attributeData, setAttributeData] = useState<{
    ata: number | null;
    tec: number | null;
    tat: number | null;
    def: number | null;
    cri: number | null;
  } | null>(null);

  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const { data } = await supabase
          .from("player_attribute_scores")
          .select("ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100")
          .eq("player_id", athleteId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setAttributeData({
            ata: data[0].ata_score_100,
            tec: data[0].tec_score_100,
            tat: data[0].tat_score_100,
            def: data[0].def_score_100,
            cri: data[0].cri_score_100,
          });
        }
      } catch (error) {
        console.error("Error fetching attributes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttributes();
  }, [athleteId]);

  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];

    // 1. Strongest attribute (from radar)
    if (attributeData) {
      const attrs = [
        { key: "ata", label: "Ataque", value: attributeData.ata },
        { key: "tec", label: "Técnica", value: attributeData.tec },
        { key: "tat", label: "Tática", value: attributeData.tat },
        { key: "def", label: "Defesa", value: attributeData.def },
        { key: "cri", label: "Criatividade", value: attributeData.cri },
      ].filter(a => a.value !== null);

      if (attrs.length > 0) {
        const strongest = attrs.reduce((a, b) => ((a.value ?? 0) > (b.value ?? 0) ? a : b));
        result.push({
          id: "strength",
          icon: Flame,
          title: `Ponto Forte: ${strongest.label}`,
          description: `Índice de ${Math.round(strongest.value ?? 0)}/100 em ${strongest.label}`,
          tooltip: `Seu maior destaque técnico baseado em estatísticas`,
          priority: 1,
          iconBg: "bg-emerald-500/20",
          iconColor: "text-emerald-400",
        });

        // 2. Area to develop
        const weakest = attrs.reduce((a, b) => ((a.value ?? 100) < (b.value ?? 100) ? a : b));
        if (weakest.key !== strongest.key) {
          result.push({
            id: "develop",
            icon: Target,
            title: `A Desenvolver: ${weakest.label}`,
            description: `Índice de ${Math.round(weakest.value ?? 0)}/100 - espaço para evoluir`,
            tooltip: `Área com maior potencial de crescimento`,
            priority: 2,
            iconBg: "bg-amber-500/20",
            iconColor: "text-amber-400",
          });
        }
      }
    } else if (strengths.length > 0) {
      // Fallback to player.strengths if no attribute data
      result.push({
        id: "strength",
        icon: Flame,
        title: `Ponto Forte: ${strengths[0]}`,
        description: `Característica destacada no perfil`,
        tooltip: `Habilidade principal do atleta`,
        priority: 1,
        iconBg: "bg-emerald-500/20",
        iconColor: "text-emerald-400",
      });
    }

    if (areasToImprove.length > 0 && result.length < 2) {
      result.push({
        id: "develop",
        icon: Target,
        title: `A Desenvolver: ${areasToImprove[0]}`,
        description: `Área identificada para evolução`,
        tooltip: `Ponto de atenção para treinamento`,
        priority: 2,
        iconBg: "bg-amber-500/20",
        iconColor: "text-amber-400",
      });
    }

    // 3. Rating trend
    if (averageRating !== null) {
      const trendIcon = recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Zap;
      const trendLabel = recentTrend === "up" ? "Em Alta" : recentTrend === "down" ? "Em Baixa" : "Estável";
      const trendColor = recentTrend === "up" ? "emerald" : recentTrend === "down" ? "red" : "blue";
      
      result.push({
        id: "trend",
        icon: trendIcon,
        title: `Tendência: ${trendLabel}`,
        description: `Nota média: ${averageRating.toFixed(1)} nos últimos jogos`,
        tooltip: `Baseado na evolução das suas últimas 5 partidas`,
        priority: 3,
        iconBg: `bg-${trendColor}-500/20`,
        iconColor: `text-${trendColor}-400`,
      });
    }

    // 4. Offensive contribution (G+A per 90 or per match)
    if (matches > 0 && minutes > 0) {
      const contributions = goals + assists;
      const per90 = minutes >= 90 ? (contributions / minutes) * 90 : null;
      const perMatch = contributions / matches;

      if (contributions > 0) {
        result.push({
          id: "offensive",
          icon: Award,
          title: `Participação Ofensiva`,
          description: per90 !== null 
            ? `${per90.toFixed(2)} G+A por 90 min` 
            : `${perMatch.toFixed(2)} G+A por jogo`,
          tooltip: `${goals} gols + ${assists} assistências em ${matches} partidas`,
          priority: 4,
          iconBg: "bg-violet-500/20",
          iconColor: "text-violet-400",
        });
      } else {
        result.push({
          id: "offensive",
          icon: Award,
          title: `Participação Ofensiva`,
          description: `Nenhuma participação direta em gols ainda`,
          tooltip: `Continue trabalhando para contribuir com gols e assistências`,
          priority: 4,
          iconBg: "bg-zinc-500/20",
          iconColor: "text-zinc-400",
        });
      }
    }

    // 5. Discipline indicator
    const cards = yellowCards + (redCards * 2);
    if (matches > 0) {
      const cardsPerMatch = cards / matches;
      const isGoodDiscipline = cardsPerMatch < 0.3;
      
      result.push({
        id: "discipline",
        icon: isGoodDiscipline ? Shield : AlertTriangle,
        title: isGoodDiscipline ? "Disciplina Exemplar" : "Atenção à Disciplina",
        description: isGoodDiscipline 
          ? `${yellowCards} amarelos em ${matches} jogos`
          : `${yellowCards} amarelos${redCards > 0 ? `, ${redCards} vermelhos` : ""} em ${matches} jogos`,
        tooltip: isGoodDiscipline 
          ? "Excelente controle disciplinar"
          : "Taxa de cartões acima da média - atenção necessária",
        priority: 5,
        iconBg: isGoodDiscipline ? "bg-blue-500/20" : "bg-red-500/20",
        iconColor: isGoodDiscipline ? "text-blue-400" : "text-red-400",
      });
    }

    // Ensure we have exactly 5 insights (add fallbacks if needed)
    while (result.length < 5) {
      const fallbackIndex = result.length;
      const fallbacks: Insight[] = [
        {
          id: `fallback-${fallbackIndex}`,
          icon: Zap,
          title: "Continue Treinando",
          description: "Mais dados serão gerados conforme você joga",
          tooltip: "Insights aparecem com mais partidas registradas",
          priority: 10 + fallbackIndex,
          iconBg: "bg-zinc-500/20",
          iconColor: "text-zinc-400",
        },
      ];
      result.push(fallbacks[0]);
    }

    return result.slice(0, 5).sort((a, b) => a.priority - b.priority);
  }, [attributeData, averageRating, recentTrend, goals, assists, matches, minutes, yellowCards, redCards, strengths, areasToImprove]);

  if (loading) {
    return (
      <motion.div 
        {...fadeInUp}
        className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex-1 flex items-center justify-center min-h-[300px]"
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.3 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col flex-1"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-primary/20 to-red-600/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Insights do Atleta</h2>
          <p className="text-[10px] text-muted-foreground">Análise personalizada</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <Tooltip key={insight.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="group flex items-center gap-3 p-2.5 rounded-[var(--radius-button)] bg-zinc-900/30 hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg ${insight.iconBg} flex items-center justify-center shrink-0`}>
                    <insight.icon className={`w-4 h-4 ${insight.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {insight.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {insight.description}
                    </p>
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">{insight.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800/30 bg-zinc-900/30">
        <Link 
          to={`/app/players/${athleteId}?tab=technical`}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Ver perfil técnico completo →
        </Link>
      </div>
    </motion.div>
  );
}
