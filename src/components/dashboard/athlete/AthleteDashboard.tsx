import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { AdminSkeletonDashboard } from "@/components/admin/AdminSkeleton";
import { AthleteHero } from "./AthleteHero";
import { AthleteKPICards } from "./AthleteKPICards";
import { AthleteInsightsCard } from "./AthleteInsightsCard";
import { AthleteRatingEvolutionCard } from "./AthleteRatingEvolutionCard";
import { AthleteRadarCard } from "./AthleteRadarCard";
import { AthleteBodyMetricsCard } from "./AthleteBodyMetricsCard";
import { AthleteReportsCard } from "./AthleteReportsCard";
import { AthleteSeasonGoalsCard } from "./AthleteSeasonGoalsCard";
import { AthleteAchievementsCard } from "./AthleteAchievementsCard";
import { EliteInsights } from "./EliteInsights";
import { MarketScoreCard } from "@/components/players/sections/MarketScoreCard";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";
import { useMergedSeasonTotals } from "@/hooks/useMergedSeasonTotals";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

const CURRENT_YEAR = new Date().getFullYear();

interface AthleteData {
  id: string;
  full_name: string;
  position: string;
  secondary_positions: string[];
  current_club: string | null;
  birth_date: string | null;
  age: number | null;
  strengths: string[];
  areas_to_develop: string[];
}

interface ScoutingReport {
  id: string;
  match_date: string;
  final_score: number;
  rating: number;
  competition_name: string | null;
}

export function AthleteDashboard() {
  const { linkedPlayerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [reports, setReports] = useState<ScoutingReport[]>([]);

  // Fetch match ratings (for averageRating, evolution chart, trend)
  const {
    matches: matchesWithRatings,
    totals,
    averageRating,
    recentTrend: rawRecentTrend,
    isLoading: ratingsLoading,
  } = usePlayerMatchRatings({
    playerId: linkedPlayerId || "",
    playerPosition: athlete?.position,
    enabled: !!linkedPlayerId && !!athlete,
  });

  // Type-safe trend casting
  const recentTrend: "up" | "down" | "stable" =
    rawRecentTrend === "up" || rawRecentTrend === "down" ? rawRecentTrend : "stable";

  // All matches stats (live system) — used for merged season totals
  const { totals: liveTotals, byCompetition: liveByCompetition, isLoading: liveStatsLoading } = usePlayerMatchStats({
    playerId: linkedPlayerId || "",
    seasonYear: CURRENT_YEAR,
    enabled: !!linkedPlayerId,
  });

  // Manual/external stats (games not tracked via live match)
  const { manualStats, isLoading: manualLoading } = useManualPlayerStats({
    playerId: linkedPlayerId || "",
    enabled: !!linkedPlayerId,
  });

  // Historical player_stats rows (corrections + non-live competitions)
  const { data: playerStatsRows = [], isLoading: psLoading } = useQuery({
    queryKey: ["athlete-dashboard-player-stats", linkedPlayerId, CURRENT_YEAR],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("matches, minutes, goals, assists, shots, shots_on_target, shots_blocked, crosses_success, crosses_failed, successful_dribbles, total_dribbles, is_live_correction, competition_id")
        .eq("player_id", linkedPlayerId!)
        .eq("season_year", CURRENT_YEAR);
      if (error) throw error;
      return (data ?? []) as {
        matches: number;
        minutes: number;
        goals: number;
        assists: number;
        shots: number;
        shots_on_target: number;
        shots_blocked: number;
        crosses_success: number;
        crosses_failed: number;
        successful_dribbles: number;
        total_dribbles: number; // stores FAILED count
        is_live_correction: boolean | null;
        competition_id: string | null;
      }[];
    },
    enabled: !!linkedPlayerId,
  });

  // Full 3-source merge for EliteInsights (live + player_stats manual/correction)
  const { data: mergedTotals, isLoading: mergedLoading } = useMergedSeasonTotals(
    linkedPlayerId || null,
    CURRENT_YEAR
  );

  // Merge live + manual + historical into season totals (same logic as PlayerDetail/StatsTab)
  const seasonTotals = useMemo(() => {
    const correctedCompIds = new Set(
      playerStatsRows
        .filter(ps => ps.is_live_correction)
        .map(ps => ps.competition_id)
        .filter((c): c is string => !!c),
    );
    let matches          = liveTotals?.matches          ?? 0;
    let minutes          = liveTotals?.minutes          ?? 0;
    let goals            = liveTotals?.goals            ?? 0;
    let assists          = liveTotals?.assists          ?? 0;
    let shots            = liveTotals?.shots            ?? 0;
    let shots_on_target  = liveTotals?.shots_on_target  ?? 0;
    let crosses_success  = liveTotals?.crosses_success  ?? 0;
    let crosses_failed   = liveTotals?.crosses_failed   ?? 0;
    let dribbles_success = liveTotals?.dribbles_success ?? 0;
    let dribbles_total   = liveTotals?.dribbles_total   ?? 0;

    for (const compId of correctedCompIds) {
      const live = liveByCompetition[compId];
      if (live) {
        matches          -= live.stats.matches;
        minutes          -= live.stats.minutes;
        goals            -= live.stats.goals;
        assists          -= live.stats.assists;
        shots            -= live.stats.shots            ?? 0;
        shots_on_target  -= live.stats.shots_on_target  ?? 0;
        crosses_success  -= live.stats.crosses_success  ?? 0;
        crosses_failed   -= live.stats.crosses_failed   ?? 0;
        dribbles_success -= live.stats.dribbles_success ?? 0;
        dribbles_total   -= live.stats.dribbles_total   ?? 0;
      }
    }

    manualStats
      .filter(ms => ms.season_year === CURRENT_YEAR)
      .forEach(ms => {
        matches          += ms.games;
        minutes          += ms.minutes;
        goals            += ms.goals            ?? 0;
        assists          += ms.assists          ?? 0;
        shots            += ms.shots            ?? 0;
        shots_on_target  += ms.shots_on_target  ?? 0;
        dribbles_success += ms.dribbles_success ?? 0;
        dribbles_total   += (ms.dribbles_success ?? 0) + (ms.dribbles_failed ?? 0);
      });

    playerStatsRows.forEach(ps => {
      const isCorrected = !ps.is_live_correction && correctedCompIds.has(ps.competition_id ?? "___none");
      if (!isCorrected) {
        matches          += ps.matches            ?? 0;
        minutes          += ps.minutes            ?? 0;
        goals            += ps.goals              ?? 0;
        assists          += ps.assists            ?? 0;
        shots            += ps.shots              ?? 0;
        shots_on_target  += ps.shots_on_target    ?? 0;
        crosses_success  += ps.crosses_success    ?? 0;
        crosses_failed   += ps.crosses_failed     ?? 0;
        dribbles_success += ps.successful_dribbles ?? 0;
        // total_dribbles in player_stats stores FAILED count
        dribbles_total   += (ps.successful_dribbles ?? 0) + (ps.total_dribbles ?? 0);
      }
    });

    return {
      matches:          Math.max(0, matches),
      minutes:          Math.max(0, minutes),
      goals:            Math.max(0, goals),
      assists:          Math.max(0, assists),
      shots:            Math.max(0, shots),
      shots_on_target:  Math.max(0, shots_on_target),
      shots_off_target: Math.max(0, shots - shots_on_target),
      crosses_success:  Math.max(0, crosses_success),
      crosses_failed:   Math.max(0, crosses_failed),
      dribbles_success: Math.max(0, dribbles_success),
      dribbles_total:   Math.max(0, dribbles_total),
    };
  }, [liveTotals, liveByCompetition, manualStats, playerStatsRows]);

  // Fetch athlete data and reports
  useEffect(() => {
    if (!linkedPlayerId) {
      setLoading(false);
      return;
    }

    const fetchAthleteData = async () => {
      if (import.meta.env.DEV) console.log("[ATHLETE-DASHBOARD] Fetching data for", linkedPlayerId);
      
      try {
        // Fetch athlete profile
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("id, full_name, position, secondary_positions, current_club, birth_date, age, strengths, areas_to_develop")
          .eq("id", linkedPlayerId)
          .single();

        if (playerError) throw playerError;
        
        setAthlete({
          id: playerData.id,
          full_name: playerData.full_name,
          position: playerData.position,
          secondary_positions: playerData.secondary_positions || [],
          current_club: playerData.current_club,
          birth_date: playerData.birth_date,
          age: playerData.age,
          strengths: playerData.strengths || [],
          areas_to_develop: playerData.areas_to_develop || [],
        });

        // Fetch scouting reports for this athlete
        const { data: reportsData, error: reportsError } = await supabase
          .from("scouting_reports")
          .select(`
            id,
            match_date,
            final_score,
            rating,
            competitions (name)
          `)
          .eq("player_id", linkedPlayerId)
          .is("deleted_at", null)
          .order("match_date", { ascending: false })
          .limit(5);

        if (reportsError) throw reportsError;

        setReports(
          (reportsData || []).map((r: any) => ({
            id: r.id,
            match_date: r.match_date,
            final_score: r.final_score,
            rating: r.rating,
            competition_name: r.competitions?.name || null,
          }))
        );

        if (import.meta.env.DEV) console.log("[ATHLETE-DASHBOARD] Data loaded successfully");
      } catch (error) {
        console.error("[ATHLETE-DASHBOARD] Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAthleteData();
  }, [linkedPlayerId]);

  // Transform matches for evolution card
  const matchesForChart = useMemo(() => {
    return matchesWithRatings.map((m) => ({
      id: m.match_id,
      match_date: m.match_date,
      opponent_name: m.opponent_name,
      team_name_display: m.team_name_display,
      rating: m.rating?.rating ?? null,
      hasRating: m.rating?.hasRating ?? false,
    }));
  }, [matchesWithRatings]);

  // Calculate cards and discipline stats
  const yellowCards = totals?.yellow_cards ?? 0;
  const redCards = totals?.red_cards ?? 0;

  // Check if goalkeeper
  const isGoalkeeper = useMemo(() => {
    const pos = athlete?.position?.toLowerCase() ?? '';
    return pos === 'gk' || pos === 'goleiro' || pos === 'goalkeeper';
  }, [athlete?.position]);

  if (loading || ratingsLoading || liveStatsLoading || manualLoading || psLoading) {
    return <AdminSkeletonDashboard />;
  }

  if (!athlete || !linkedPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Atleta não encontrado</p>
          <p className="text-sm text-zinc-600 mt-1">Verifique se sua conta está vinculada corretamente</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-[var(--gap-mobile)] md:space-y-6 pb-8 w-full max-w-full overflow-x-hidden"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div variants={staggerItem}>
        <AthleteHero 
          athleteName={athlete.full_name}
          athletePosition={athlete.position}
          athleteClub={athlete.current_club}
          athleteId={athlete.id}
        />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={staggerItem}>
        <AthleteKPICards
          matches={seasonTotals.matches}
          minutes={seasonTotals.minutes}
          goals={seasonTotals.goals}
          assists={seasonTotals.assists}
          averageRating={averageRating}
          athleteId={athlete.id}
        />
      </motion.div>

      {/* Row 1: Insights (50%) + Rating Evolution (50%) */}
      <motion.div 
        variants={staggerItem} 
        className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--gap-mobile)] md:gap-6 items-stretch w-full max-w-full"
      >
        <div className="flex min-w-0 w-full">
          <AthleteInsightsCard
            athleteId={athlete.id}
            athletePosition={athlete.position}
            averageRating={averageRating}
            recentTrend={recentTrend}
            goals={seasonTotals.goals}
            assists={seasonTotals.assists}
            matches={seasonTotals.matches}
            minutes={seasonTotals.minutes}
            yellowCards={yellowCards}
            redCards={redCards}
            liveStats={{
              shots_on_target:  seasonTotals.shots_on_target,
              shots_off_target: seasonTotals.shots_off_target,
              shots_blocked:    0,
              shots_on_post:    0,
              crosses_success:  seasonTotals.crosses_success,
              crosses_failed:   seasonTotals.crosses_failed,
              dribbles_success: seasonTotals.dribbles_success,
              dribbles_total:   seasonTotals.dribbles_total,
              chances_created:  totals?.chances_created ?? 0,
              key_passes:       totals?.key_passes      ?? 0,
            }}
          />
        </div>

        <div className="flex min-w-0 w-full">
          <AthleteRatingEvolutionCard 
            matches={matchesForChart}
            athleteId={athlete.id}
            averageRating={averageRating}
            recentTrend={recentTrend}
          />
        </div>
      </motion.div>

      {/* Row 2: Market Score (50%) + Radar (50%) */}
      <motion.div 
        variants={staggerItem} 
        className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--gap-mobile)] md:gap-6 items-stretch w-full max-w-full"
      >
        <div className="flex min-w-0 w-full">
          <MarketScoreCard
            athleteId={athlete.id}
            athleteName={athlete.full_name}
            position={athlete.position}
            secondaryPositions={athlete.secondary_positions}
            birthDate={athlete.birth_date}
            age={athlete.age}
          />
        </div>

        <div className="flex min-w-0 w-full">
          <AthleteRadarCard 
            athleteId={athlete.id}
            athletePosition={athlete.position}
          />
        </div>
      </motion.div>

      {/* Row 3: Body Metrics (100% width) */}
      <motion.div variants={staggerItem} className="w-full">
        <AthleteBodyMetricsCard athleteId={athlete.id} />
      </motion.div>

      {/* Row 5: Elite Insights */}
      <motion.div variants={staggerItem} className="w-full">
        <EliteInsights
          athletePosition={athlete.position}
          totals={mergedTotals}
          isLoading={mergedLoading}
        />
      </motion.div>

      {/* Row 6: Achievements + Reports */}
      <motion.div 
        variants={staggerItem} 
        className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--gap-mobile)] md:gap-6 items-stretch w-full max-w-full"
      >
        <div className="flex min-w-0 w-full">
          <AthleteAchievementsCard athleteId={athlete.id} />
        </div>

        <div className="flex min-w-0 w-full">
          <AthleteReportsCard 
            reports={reports}
            athleteId={athlete.id}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
