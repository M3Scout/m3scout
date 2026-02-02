/**
 * TargetsAccordionMobile
 * 
 * Vertical accordion layout for Targets on mobile devices.
 * Replaces horizontal tabs/scroll with collapsible sections.
 */

import { useMemo } from "react";
import { ChevronDown, User, Sparkles, TrendingUp, TrendingDown, Minus, Eye, Users, Handshake, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Target as TargetType, MarketScoreTrend } from "@/types/marketScore";

interface TargetWithScore extends TargetType {
  market_score: {
    score_total: number;
    confidence_level: number;
    trend_30d: MarketScoreTrend;
  } | null;
}

interface TargetsAccordionMobileProps {
  targetsByStatus: Record<string, TargetWithScore[]>;
  onOpenDetail: (target: TargetWithScore) => void;
}

// Status configuration
const STATUS_CONFIG = {
  MONITORING: {
    label: "Monitorando",
    icon: Eye,
    color: "text-blue-400",
    borderColor: "border-l-blue-500",
    pillBg: "bg-blue-500/15",
  },
  APPROACH: {
    label: "Abordagem",
    icon: Users,
    color: "text-purple-400",
    borderColor: "border-l-purple-500",
    pillBg: "bg-purple-500/15",
  },
  NEGOTIATION: {
    label: "Negociação",
    icon: Handshake,
    color: "text-amber-400",
    borderColor: "border-l-amber-500",
    pillBg: "bg-amber-500/15",
  },
  SIGNED: {
    label: "Contratado",
    icon: CheckCircle2,
    color: "text-emerald-400",
    borderColor: "border-l-emerald-500",
    pillBg: "bg-emerald-500/15",
  },
  DROPPED: {
    label: "Descartado",
    icon: XCircle,
    color: "text-zinc-500",
    borderColor: "border-l-zinc-600",
    pillBg: "bg-zinc-500/15",
  },
};

const PRIORITY_COLORS = {
  HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

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

// Order for mobile accordion - most important first
const STATUS_ORDER = ["MONITORING", "APPROACH", "NEGOTIATION", "SIGNED", "DROPPED"] as const;

export function TargetsAccordionMobile({ 
  targetsByStatus, 
  onOpenDetail 
}: TargetsAccordionMobileProps) {
  
  // Determine which section to open by default
  const defaultOpenSection = useMemo(() => {
    for (const status of STATUS_ORDER) {
      if (targetsByStatus[status]?.length > 0) {
        return status;
      }
    }
    return "MONITORING"; // Default fallback
  }, [targetsByStatus]);

  return (
    <Accordion 
      type="single" 
      collapsible 
      defaultValue={defaultOpenSection}
      className="space-y-2 overflow-x-hidden"
    >
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const statusTargets = targetsByStatus[status] || [];
        
        return (
          <AccordionItem 
            key={status} 
            value={status}
            className={cn(
              "border-l-4 rounded-lg overflow-hidden",
              "bg-zinc-900/60 border border-white/[0.06]",
              config.borderColor
            )}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/[0.02]">
              <div className="flex items-center gap-3 w-full">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.pillBg)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <span className={cn("font-medium", config.color)}>{config.label}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-auto mr-2 text-xs px-2.5",
                    config.pillBg,
                    config.color
                  )}
                >
                  {statusTargets.length}
                </Badge>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-3 pb-3">
              {statusTargets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
                  <User className="w-6 h-6 mb-2 opacity-40" />
                  <span className="text-sm">Nenhum target ainda</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {statusTargets.map((target) => {
                    const hasScore = target.market_score !== null;
                    const scoreColor = hasScore ? getScoreColor(target.market_score!.score_total) : null;

                    return (
                      <Card
                        key={target.id}
                        className={cn(
                          "bg-zinc-800/50 border border-white/[0.06] cursor-pointer",
                          "transition-all duration-150 ease-out active:scale-[0.98]",
                          "hover:border-white/10"
                        )}
                        onClick={() => onOpenDetail(target)}
                      >
                        <CardContent className="p-3 space-y-2">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{target.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                              className={cn("text-[10px] flex-shrink-0", PRIORITY_COLORS[target.priority])}
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
                                <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-700/50">
                                  {tag}
                                </Badge>
                              ))}
                              {target.tags.length > 3 && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-700/50">
                                  +{target.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
