/**
 * Goalkeeper Radar Card Component
 * 
 * Displays a 5-axis radar chart for goalkeepers:
 * DEF, ANT, TAT, DIS, AER
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  computeGKRadar, 
  GKStatRow, 
  GKRadarScores,
  GK_RADAR_LABELS,
} from "@/lib/goalkeeperRadar";
import { calculateAndSaveGKRadar } from "@/lib/goalkeeperRadarService";

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

// Animation variants no longer needed - using inline animations

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
        const { data: playerArr } = await supabase
          .from("players")
          .select("auto_rating_details")
          .eq("id", playerId)
          .limit(1);

        const player = Array.isArray(playerArr) ? playerArr[0] ?? null : null;

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

  // Handle recalculate with percentile normalization
  const handleRecalculate = async () => {
    if (rawStats.length === 0) return;
    
    setLoading(true);
    try {
      // Use the service to calculate with percentile and save
      const result = await calculateAndSaveGKRadar(playerId, true);
      
      if (result?.scores) {
        setGkRadarData({
          scores: result.scores,
          confidence: result.confidence,
          minutes_used: result.minutes_used,
        });
        setAnimationKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error recalculating GK radar:", err);
    } finally {
      setLoading(false);
    }
  };


  // Check if we have any stats
  const hasAnyStats = rawStats.length > 0;
  const hasScores = displayScores?.scores !== null;

  if (loading) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden ${className}`}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!hasAnyStats) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden ${className}`}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
          <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Radar do Goleiro
          </span>
        </div>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-6 h-6 text-zinc-600 mb-2" />
          <p className="text-xs text-zinc-500">Sem dados suficientes</p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Adicione estatísticas de goleiro
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden ${className}`}>
      {/* Compact header - matching SofaScoreRadarCard style */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Radar do Goleiro
        </span>
        <div className="flex items-center gap-0.5">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-zinc-800">
                <Info className="h-3 w-3 text-zinc-500" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Atributos do Goleiro</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {ATTRIBUTE_CONFIG.map(attr => (
                  <div key={attr.key} className="flex gap-3 border-b border-zinc-800 pb-2">
                    <Badge variant="outline" className="w-12 justify-center shrink-0 text-xs font-bold text-orange-500">
                      {attr.key}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-zinc-200">{attr.label}</p>
                      <p className="text-xs text-zinc-500">{attr.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 hover:bg-zinc-800"
            onClick={handleRecalculate}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Compact Filters - inline, matching SofaScoreRadarCard */}
        {showFilters && (
          <div className="flex gap-1.5 px-2 py-1.5 bg-zinc-800/40">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-6 text-[10px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {yearOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="h-6 text-[10px] flex-1 bg-zinc-800 border-zinc-700 text-zinc-300 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {competitionOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Radar Chart - matching SofaScoreRadarCard visual style */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative mx-auto w-full overflow-hidden"
          style={{ aspectRatio: "1 / 0.85" }}
        >
          <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(82, 82, 91, 0.5)" strokeWidth={1} gridType="polygon" />
                <PolarAngleAxis dataKey="attribute" tick={false} />
                <Radar
                  name="Goleiro"
                  dataKey="value"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Labels + Badges - absolute positioned at vertices */}
          <AnimatePresence>
            {ATTRIBUTE_CONFIG.map((attr, i) => {
              const score = displayScores?.scores?.[attr.key as keyof GKRadarScores] ?? null;
              const displayValue = score !== null ? Math.round(score) : "N/D";
              
              // Badge color based on score - matching SofaScoreRadarCard
              const getBadgeColor = (v: number | null) => {
                if (v === null) return "bg-zinc-700 text-zinc-400";
                if (v >= 70) return "bg-emerald-500 text-white shadow-emerald-500/30";
                if (v >= 50) return "bg-orange-500 text-white shadow-orange-500/30";
                if (v >= 30) return "bg-amber-500 text-zinc-900 shadow-amber-500/30";
                return "bg-red-500 text-white shadow-red-500/30";
              };

              return (
                <motion.div
                  key={attr.key}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: 0.2 + i * 0.08,
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute flex flex-col items-center gap-0 pointer-events-none"
                  style={{ 
                    ...attr.pos,
                    transform: attr.pos.left === "50%" ? "translateX(-50%)" : "translateX(0)"
                  } as React.CSSProperties}
                >
                  {/* Label */}
                  <span className="text-[8px] sm:text-[9px] font-semibold text-zinc-500 uppercase tracking-wider leading-none">
                    {attr.key}
                  </span>
                  {/* Value badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      delay: 0.35 + i * 0.08,
                      duration: 0.25,
                      type: "spring",
                      stiffness: 300,
                      damping: 20
                    }}
                    className={`min-w-[20px] sm:min-w-[24px] h-[16px] sm:h-[18px] flex items-center justify-center mt-0.5 text-[9px] sm:text-[10px] font-bold rounded shadow-md ${getBadgeColor(score)}`}
                  >
                    {displayValue}
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Compact confidence footer - matching SofaScoreRadarCard */}
        {hasScores && displayScores && (
          <div className="flex items-center justify-center gap-1 py-1.5 text-[8px] sm:text-[9px] text-zinc-500 border-t border-zinc-800/50">
            <span className="text-zinc-600">Confiança:</span>
            <span className={`font-semibold ${
              displayScores.confidence === "high" ? "text-emerald-400" :
              displayScores.confidence === "medium" ? "text-blue-400" :
              displayScores.confidence === "low" ? "text-amber-400" : "text-zinc-500"
            }`}>
              {displayScores.confidence === "high" ? "Alta" : 
               displayScores.confidence === "medium" ? "Média" : 
               displayScores.confidence === "low" ? "Baixa" : "—"}
            </span>
            <span className="text-zinc-600">
              • {Math.round(displayScores.minutes_used || 0)} min
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
