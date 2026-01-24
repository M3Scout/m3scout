import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminSkeletonDashboard } from "@/components/admin/AdminSkeleton";
import { AthleteHero } from "./AthleteHero";
import { AthleteKPICards } from "./AthleteKPICards";
import { AthleteInsightsCard } from "./AthleteInsightsCard";
import { AthleteRatingEvolutionCard } from "./AthleteRatingEvolutionCard";
import { AthleteRadarCard } from "./AthleteRadarCard";
import { AthleteReportsCard } from "./AthleteReportsCard";
import { AthleteSeasonGoalsCard } from "./AthleteSeasonGoalsCard";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AthleteData {
  id: string;
  full_name: string;
  position: string;
  current_club: string | null;
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

  // Fetch match ratings using the centralized hook
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
          .select("id, full_name, position, current_club, strengths, areas_to_develop")
          .eq("id", linkedPlayerId)
          .single();

        if (playerError) throw playerError;
        
        setAthlete({
          id: playerData.id,
          full_name: playerData.full_name,
          position: playerData.position,
          current_club: playerData.current_club,
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
      rating: m.rating?.rating ?? null,
      hasRating: m.rating?.hasRating ?? false,
    }));
  }, [matchesWithRatings]);

  // Calculate cards and discipline stats
  const yellowCards = totals?.yellow_cards ?? 0;
  const redCards = totals?.red_cards ?? 0;

  if (loading || ratingsLoading) {
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
      className="space-y-[var(--gap-mobile)] md:space-y-6 pb-8 px-[var(--padding-mobile)] md:px-0 w-full max-w-full overflow-x-hidden"
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
          matches={totals?.matches ?? 0}
          minutes={totals?.minutes ?? 0}
          goals={totals?.goals ?? 0}
          assists={totals?.assists ?? 0}
          averageRating={averageRating}
          athleteId={athlete.id}
        />
      </motion.div>

      {/* Insights + Rating Evolution Grid */}
      <motion.div 
        variants={staggerItem} 
        className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--gap-mobile)] md:gap-6 items-stretch w-full max-w-full"
      >
        <div className="lg:col-span-1 flex min-w-0 w-full">
          <AthleteInsightsCard 
            athleteId={athlete.id}
            athletePosition={athlete.position}
            averageRating={averageRating}
            recentTrend={recentTrend}
            goals={totals?.goals ?? 0}
            assists={totals?.assists ?? 0}
            matches={totals?.matches ?? 0}
            minutes={totals?.minutes ?? 0}
            yellowCards={yellowCards}
            redCards={redCards}
            strengths={athlete.strengths}
            areasToImprove={athlete.areas_to_develop}
          />
        </div>

        <div className="lg:col-span-2 flex min-w-0 w-full">
          <AthleteRatingEvolutionCard 
            matches={matchesForChart}
            athleteId={athlete.id}
            averageRating={averageRating}
            recentTrend={recentTrend}
          />
        </div>
      </motion.div>

      {/* Season Goals + Radar Grid */}
      <motion.div 
        variants={staggerItem} 
        className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--gap-mobile)] md:gap-6 items-stretch w-full max-w-full"
      >
        <div className="flex min-w-0 w-full">
          <AthleteSeasonGoalsCard 
            athleteId={athlete.id}
            currentStats={{
              goals: totals?.goals ?? 0,
              assists: totals?.assists ?? 0,
              matches: totals?.matches ?? 0,
              minutes: totals?.minutes ?? 0,
              saves: totals?.saves ?? 0,
              clean_sheets: totals?.clean_sheets ?? 0,
            }}
          />
        </div>

        <div className="flex min-w-0 w-full">
          <AthleteRadarCard 
            athleteId={athlete.id}
            athletePosition={athlete.position}
          />
        </div>
      </motion.div>

      {/* Reports */}
      <motion.div variants={staggerItem}>
        <AthleteReportsCard 
          reports={reports}
          athleteId={athlete.id}
        />
      </motion.div>
    </motion.div>
  );
}
