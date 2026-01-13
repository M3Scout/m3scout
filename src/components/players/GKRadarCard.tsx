/**
 * Goalkeeper Radar Card Component
 * 
 * Displays a 5-axis radar chart for goalkeepers:
 * DEF, ANT, TAT, DIS, AER
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Info, 
  RefreshCw,
  AlertCircle,
  Shield
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  computeGKRadar, 
  GKStatRow, 
  GKRadarScores,
  GK_RADAR_LABELS,
  gkRadarToDetails 
} from "@/lib/goalkeeperRadar";

interface GKRadarCardProps {
  playerId: string;
  playerPosition: string;
  showFilters?: boolean;
  className?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

// Attribute configuration for radar
const ATTRIBUTE_CONFIG = [
  { key: "DEF", ...GK_RADAR_LABELS.DEF, pos: { top: "2%", left: "50%", transform: "translateX(-50%)" } },
  { key: "ANT", ...GK_RADAR_LABELS.ANT, pos: { top: "35%", right: "2%" } },
  { key: "AER", ...GK_RADAR_LABELS.AER, pos: { bottom: "10%", right: "12%" } },
  { key: "DIS", ...GK_RADAR_LABELS.DIS, pos: { bottom: "10%", left: "12%" } },
  { key: "TAT", ...GK_RADAR_LABELS.TAT, pos: { top: "35%", left: "2%" } },
];

// Polygon animation variants
const radarVariants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.3 + i * 0.08,
      duration: 0.3,
      ease: "easeOut" as const
    }
  })
};

export function GKRadarCard({ 
  playerId, 
  playerPosition,
  showFilters = true,
  className = ""
}: GKRadarCardProps) {
  const [loading, setLoading] = useState(true);
  const [rawStats, setRawStats] = useState<GKStatRow[]>([]);
  const [gkRadarData, setGkRadarData] = useState<{ scores: GKRadarScores | null; confidence: string; minutes_used: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<string>("all");
  const [animationKey, setAnimationKey] = useState(0);

  // Fetch GK stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Check if player has gk_radar in auto_rating_details
        const { data: player } = await supabase
          .from("players")
          .select("auto_rating_details")
          .eq("id", playerId)
          .maybeSingle();

        // Fetch raw stats
        const { data: stats, error } = await supabase
          .from("player_stats")
          .select("*, competitions(name, tier)")
          .eq("player_id", playerId)
          .order("season_year", { ascending: false });

        if (error) throw error;

        // Map to GKStatRow format
        const mappedStats: GKStatRow[] = (stats || []).map((s: any) => ({
          id: s.id,
          player_id: s.player_id,
          season_year: s.season_year,
          competition_id: s.competition_id,
          matches: s.matches || 0,
          minutes: s.minutes || 0,
          saves: s.saves || 0,
          saves_inside_box: s.saves_inside_box || 0,
          goals_conceded: s.goals_conceded || 0,
          clean_sheets: s.clean_sheets || 0,
          penalties_saved: s.penalties_saved || 0,
          errors_leading_to_goal: s.errors_leading_to_goal || 0,
          shots_on_target_against: s.shots_on_target_against || 0,
          penalty_faced: s.penalty_faced || 0,
          claims: s.claims || 0,
          punches: s.punches || 0,
          high_claims: s.high_claims || 0,
          crosses_faced: s.crosses_faced || 0,
          crosses_stopped: s.crosses_stopped || 0,
          errors_leading_to_shot: s.errors_leading_to_shot || 0,
          successful_runs_out: s.successful_runs_out || 0,
          total_runs_out: s.total_runs_out || 0,
          accurate_passes: s.accurate_passes || 0,
          total_passes: s.total_passes || 0,
          long_passes_accurate: s.long_passes_accurate || 0,
          long_passes_total: s.long_passes_total || 0,
          yellow_cards: s.yellow_cards || 0,
          red_cards: s.red_cards || 0,
          fouls_committed: s.fouls_committed || 0,
          _competitionName: s.competitions?.name,
        }));

        setRawStats(mappedStats as any);

        // Check for persisted gk_radar
        const persistedRadar = (player?.auto_rating_details as any)?.gk_radar;
        if (persistedRadar && persistedRadar.DEF !== undefined) {
          setGkRadarData({
            scores: {
              DEF: persistedRadar.DEF,
              ANT: persistedRadar.ANT,
              TAT: persistedRadar.TAT,
              DIS: persistedRadar.DIS,
              AER: persistedRadar.AER,
            },
            confidence: persistedRadar.confidence || "medium",
            minutes_used: persistedRadar.minutes_used || 0,
          });
        } else if (mappedStats.length > 0) {
          // Calculate from raw stats
          const result = computeGKRadar(mappedStats);
          setGkRadarData({
            scores: result.scores,
            confidence: result.confidence,
            minutes_used: result.minutes_used,
          });
        }

        setAnimationKey(prev => prev + 1);
      } catch (err) {
        console.error("Error fetching GK stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerId]);

  // Filter options
  const yearOptions = useMemo<FilterOption[]>(() => {
    const years = new Set(rawStats.map(s => s.season_year));
    const opts: FilterOption[] = [{ value: "all", label: "Todos os anos" }];
    [...years].sort((a, b) => (b || 0) - (a || 0)).forEach(y => {
      if (y) opts.push({ value: String(y), label: String(y) });
    });
    return opts;
  }, [rawStats]);

  const competitionOptions = useMemo<FilterOption[]>(() => {
    const comps = new Set<string>();
    rawStats.forEach(s => {
      if ((s as any)._competitionName) comps.add((s as any)._competitionName);
    });
    const opts: FilterOption[] = [{ value: "all", label: "Todas competições" }];
    [...comps].sort().forEach(c => opts.push({ value: c, label: c }));
    return opts;
  }, [rawStats]);

  // Filter stats and recalculate
  const filteredScores = useMemo(() => {
    let filtered = rawStats;
    
    if (selectedYear !== "all") {
      filtered = filtered.filter(s => String(s.season_year) === selectedYear);
    }
    if (selectedCompetition !== "all") {
      filtered = filtered.filter(s => (s as any)._competitionName === selectedCompetition);
    }

    if (filtered.length === 0) return null;
    
    const result = computeGKRadar(filtered, selectedYear === "all");
    return {
      scores: result.scores,
      confidence: result.confidence,
      minutes_used: result.minutes_used,
    };
  }, [rawStats, selectedYear, selectedCompetition]);

  // Use filtered scores or default
  const displayScores = filteredScores || gkRadarData;

  // Chart data
  const chartData = useMemo(() => {
    if (!displayScores?.scores) {
      return ATTRIBUTE_CONFIG.map(attr => ({
        attribute: attr.label,
        value: null,
        fullMark: 100,
      }));
    }
    
    return ATTRIBUTE_CONFIG.map(attr => ({
      attribute: attr.label,
      value: displayScores.scores?.[attr.key as keyof GKRadarScores] ?? null,
      fullMark: 100,
    }));
  }, [displayScores]);

  // Handle recalculate
  const handleRecalculate = async () => {
    if (rawStats.length === 0) return;
    
    setLoading(true);
    try {
      const result = computeGKRadar(rawStats);
      
      // Update player auto_rating_details with gk_radar
      const { data: player } = await supabase
        .from("players")
        .select("auto_rating_details")
        .eq("id", playerId)
        .maybeSingle();

      const existingDetails = (player?.auto_rating_details as Record<string, unknown>) || {};
      const gkDetails = gkRadarToDetails(result);
      const newDetails = {
        ...existingDetails,
        ...gkDetails,
      };

      await supabase
        .from("players")
        .update({ auto_rating_details: newDetails as any })
        .eq("id", playerId);

      setGkRadarData({
        scores: result.scores,
        confidence: result.confidence,
        minutes_used: result.minutes_used,
      });
      setAnimationKey(prev => prev + 1);
    } catch (err) {
      console.error("Error recalculating GK radar:", err);
    } finally {
      setLoading(false);
    }
  };

  // Badge color based on score
  const getBadgeStyle = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 70) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (score >= 50) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (score >= 30) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  // Check if we have any stats
  const hasAnyStats = rawStats.length > 0;
  const hasScores = displayScores?.scores !== null;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!hasAnyStats) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" />
              Radar do Goleiro
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Adicione estatísticas de goleiro para visualizar o radar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Radar do Goleiro
          </CardTitle>
          <div className="flex items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Info className="w-3.5 h-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atributos do Goleiro</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {ATTRIBUTE_CONFIG.map(attr => (
                    <div key={attr.key} className="flex gap-3">
                      <Badge variant="outline" className="w-12 justify-center shrink-0">
                        {attr.key}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{attr.label}</p>
                        <p className="text-xs text-muted-foreground">{attr.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleRecalculate}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 mb-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {competitionOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Radar Chart */}
        <div className="relative" style={{ aspectRatio: "1 / 0.85" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={animationKey}
              variants={radarVariants}
              initial="hidden"
              animate="visible"
              className="absolute inset-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} margin={{ top: 25, right: 30, bottom: 25, left: 30 }}>
                  <PolarGrid stroke="rgba(82, 82, 91, 0.5)" gridType="polygon" />
                  <PolarAngleAxis 
                    dataKey="attribute" 
                    tick={false}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="GK"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                    strokeWidth={2.5}
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>

          {/* Attribute badges */}
          {ATTRIBUTE_CONFIG.map((attr, i) => {
            const score = displayScores?.scores?.[attr.key as keyof GKRadarScores] ?? null;
            return (
              <motion.div
                key={attr.key}
                custom={i}
                variants={badgeVariants}
                initial="hidden"
                animate="visible"
                className="absolute flex flex-col items-center"
                style={attr.pos as React.CSSProperties}
              >
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground mb-0.5">
                  {attr.label}
                </span>
                <div 
                  className={`min-w-[24px] sm:min-w-[28px] h-[18px] sm:h-[20px] flex items-center justify-center rounded-md text-[10px] sm:text-xs font-bold border shadow-sm ${getBadgeStyle(score)}`}
                >
                  {score !== null ? score : "N/D"}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>
            Confiança: {displayScores?.confidence === "high" ? "Alta" : 
                        displayScores?.confidence === "medium" ? "Média" : 
                        displayScores?.confidence === "low" ? "Baixa" : "—"}
          </span>
          <span>{Math.round(displayScores?.minutes_used || 0)} min</span>
        </div>
      </CardContent>
    </Card>
  );
}
