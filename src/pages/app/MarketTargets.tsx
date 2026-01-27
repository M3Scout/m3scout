/**
 * Market Targets Page
 * 
 * Recruitment funnel with Market Score (TARGET) + confidence
 * Uses Kanban-style layout organized by status
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Plus,
  Target,
  Eye,
  Users,
  Handshake,
  XCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";
import { TargetFormModal } from "@/components/market/TargetFormModal";
import { TargetDetailModal } from "@/components/market/TargetDetailModal";

interface TargetWithScore extends TargetType {
  market_score: {
    score_total: number;
    confidence_level: number;
    trend_30d: MarketScoreTrend;
  } | null;
}

// Status configuration with top-border colors for premium look
const STATUS_CONFIG = {
  MONITORING: {
    label: "Monitorando",
    icon: Eye,
    color: "text-blue-400",
    topBorder: "border-t-blue-500/60",
    pillBg: "bg-blue-500/15",
  },
  APPROACH: {
    label: "Abordagem",
    icon: Users,
    color: "text-purple-400",
    topBorder: "border-t-purple-500/60",
    pillBg: "bg-purple-500/15",
  },
  NEGOTIATION: {
    label: "Negociação",
    icon: Handshake,
    color: "text-amber-400",
    topBorder: "border-t-amber-500/80",
    pillBg: "bg-amber-500/15",
    isHighlight: true, // Visual priority
  },
  DROPPED: {
    label: "Descartado",
    icon: XCircle,
    color: "text-zinc-500",
    topBorder: "border-t-zinc-600/60",
    pillBg: "bg-zinc-500/15",
  },
  SIGNED: {
    label: "Contratado",
    icon: CheckCircle2,
    color: "text-emerald-400",
    topBorder: "border-t-emerald-500/60",
    pillBg: "bg-emerald-500/15",
  },
};

const PRIORITY_COLORS = {
  HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

// Score color helper
function getScoreColor(score: number) {
  if (score >= 85) return { text: "text-emerald-400" };
  if (score >= 70) return { text: "text-green-400" };
  if (score >= 50) return { text: "text-yellow-400" };
  return { text: "text-red-400" };
}

function TrendIcon({ trend }: { trend: MarketScoreTrend }) {
  if (trend === "UP") return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (trend === "DOWN") return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export default function MarketTargets() {
  const queryClient = useQueryClient();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetWithScore | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetWithScore | null>(null);

  // Fetch targets with their market scores
  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["market-targets"],
    queryFn: async () => {
      const { data: targetsData, error: targetsError } = await supabase
        .from("targets")
        .select("*")
        .order("created_at", { ascending: false });

      if (targetsError) throw targetsError;

      // Fetch TARGET market scores
      const { data: scoresData, error: scoresError } = await supabase
        .from("market_scores")
        .select("target_id, score_total, confidence_level, trend_30d")
        .eq("type", "TARGET");

      if (scoresError) throw scoresError;

      // Map scores to targets
      const scoreMap = new Map<string, typeof scoresData[0]>();
      scoresData?.forEach(s => {
        if (s.target_id) scoreMap.set(s.target_id, s);
      });

      return (targetsData || []).map(t => ({
        ...t,
        tags: t.tags || [],
        market_score: scoreMap.get(t.id) ? {
          score_total: scoreMap.get(t.id)!.score_total,
          confidence_level: scoreMap.get(t.id)!.confidence_level,
          trend_30d: scoreMap.get(t.id)!.trend_30d as MarketScoreTrend,
        } : null,
      })) as TargetWithScore[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Group by status
  const targetsByStatus = useMemo(() => {
    const grouped: Record<string, TargetWithScore[]> = {
      MONITORING: [],
      APPROACH: [],
      NEGOTIATION: [],
      DROPPED: [],
      SIGNED: [],
    };
    targets.forEach(t => {
      if (grouped[t.status]) {
        grouped[t.status].push(t);
      }
    });
    // Sort each group by score desc
    Object.values(grouped).forEach(arr => {
      arr.sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0));
    });
    return grouped;
  }, [targets]);

  // Summary counts
  const statusCounts = useMemo(() => {
    return {
      MONITORING: targetsByStatus.MONITORING.length,
      APPROACH: targetsByStatus.APPROACH.length,
      NEGOTIATION: targetsByStatus.NEGOTIATION.length,
      SIGNED: targetsByStatus.SIGNED.length,
    };
  }, [targetsByStatus]);

  // Top 5 by score
  const top5 = useMemo(() => {
    return [...targets]
      .filter(t => t.market_score)
      .sort((a, b) => (b.market_score?.score_total ?? 0) - (a.market_score?.score_total ?? 0))
      .slice(0, 5);
  }, [targets]);

  const handleOpenDetail = (target: TargetWithScore) => {
    setSelectedTarget(target);
    setDetailModalOpen(true);
  };

  const handleEdit = (target: TargetWithScore) => {
    setEditTarget(target);
    setFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setFormModalOpen(false);
    setEditTarget(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["market-targets"] });
    handleCloseForm();
    setDetailModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Mercado → Targets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Funil de captação com Market Score
          </p>
        </div>
        <Button onClick={() => setFormModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Target
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["MONITORING", "APPROACH", "NEGOTIATION", "SIGNED"] as const).map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <Card key={status} className="bg-zinc-900/80 border border-white/[0.06]">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.pillBg)}>
                    <Icon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statusCounts[status]}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top 5 */}
      {top5.length > 0 && (
        <Card className="bg-zinc-900/80 border border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Top 5 por Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {top5.map((target, idx) => {
                const scoreColor = getScoreColor(target.market_score?.score_total ?? 0);
                return (
                  <div
                    key={target.id}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                      "bg-zinc-800/50 border border-white/[0.06]",
                      "transition-all duration-150 ease-out",
                      "hover:translate-y-[-1px] hover:shadow-md hover:shadow-black/20 hover:border-white/10"
                    )}
                    onClick={() => handleOpenDetail(target)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate max-w-[120px]">{target.name}</p>
                      <p className="text-xs text-muted-foreground">{target.position}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn("text-lg font-bold", scoreColor.text)}>
                        {target.market_score?.score_total.toFixed(0)}
                      </span>
                      <TrendIcon trend={target.market_score?.trend_30d ?? "FLAT"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const statusTargets = targetsByStatus[status];
              const isHighlight = 'isHighlight' in config && config.isHighlight;

              return (
                <div
                  key={status}
                  className={cn(
                    "w-[280px] flex-shrink-0",
                    isHighlight && "relative"
                  )}
                >
                  {/* Column with top border accent */}
                  <div className={cn(
                    "border-t-2 rounded-t-sm",
                    config.topBorder
                  )}>
                    {/* Column Header - compact and elegant */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
                      <Badge 
                        variant="secondary" 
                        className={cn("ml-auto text-[10px] px-2", config.pillBg)}
                      >
                        {statusTargets.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Content - transparent background */}
                  <div className="p-1.5 space-y-2 min-h-[300px]">
                    {statusTargets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/60">
                        <User className="w-5 h-5 mb-1 opacity-40" />
                        <span className="text-[11px]">Nenhum target ainda</span>
                      </div>
                    ) : (
                      statusTargets.map((target) => {
                        const hasScore = target.market_score !== null;
                        const scoreColor = hasScore ? getScoreColor(target.market_score!.score_total) : null;

                        return (
                          <Card
                            key={target.id}
                            className={cn(
                              "bg-zinc-900/80 border border-white/[0.06] cursor-pointer",
                              "transition-all duration-150 ease-out",
                              "hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/30 hover:border-white/10"
                            )}
                            onClick={() => handleOpenDetail(target)}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{target.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="text-[10px] border-white/[0.06]">
                                      {target.position}
                                    </Badge>
                                    {(target.age_estimate || target.birth_date) && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {target.age_estimate ?? new Date().getFullYear() - new Date(target.birth_date!).getFullYear()} anos
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px]", PRIORITY_COLORS[target.priority])}
                                >
                                  {target.priority}
                                </Badge>
                              </div>

                              {/* Club/Competition */}
                              {(target.current_club || target.league_competition) && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {target.current_club}{target.league_competition && ` • ${target.league_competition}`}
                                </p>
                              )}

                              {/* Score & Confidence */}
                              {hasScore ? (
                                <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    <span className={cn("text-sm font-bold", scoreColor?.text)}>
                                      {target.market_score!.score_total.toFixed(0)}
                                    </span>
                                    <TrendIcon trend={target.market_score!.trend_30d} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    Conf: {target.market_score!.confidence_level.toFixed(0)}%
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/[0.04]">
                                  <Sparkles className="w-3 h-3 text-muted-foreground/50" />
                                  <span className="text-[10px] text-muted-foreground/60">
                                    Score não calculado
                                  </span>
                                </div>
                              )}

                              {/* Tags */}
                              {target.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {target.tags.slice(0, 3).map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-800/50">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {target.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-800/50">
                                      +{target.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Modals */}
      <TargetFormModal
        open={formModalOpen}
        onOpenChange={handleCloseForm}
        target={editTarget}
        onSuccess={handleSuccess}
      />

      <TargetDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        target={selectedTarget}
        onEdit={handleEdit}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
