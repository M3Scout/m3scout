import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { fetchUnifiedPlayerStats } from "@/hooks/useUnifiedPlayerStats";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Premium modular components
import { AthleteHeroSection } from "@/components/players/public/AthleteHeroSection";
import { AthleteHighlightsSection } from "@/components/players/public/AthleteHighlightsSection";
import { AthleteStatsSection } from "@/components/players/public/AthleteStatsSection";
import { AthleteGamePhasesSection } from "@/components/players/public/AthleteGamePhasesSection";
import { AthletePhysicalSection } from "@/components/players/public/AthletePhysicalSection";
import { AthleteVideoSection } from "@/components/players/public/AthleteVideoSection";
import { AthleteCTASection, StickyMobileCTA } from "@/components/players/public/AthleteCTASection";

// =============== INTERFACES ===============

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[] | null;
  age: number | null;
  birth_date: string | null;
  nationality: string;
  current_club: string | null;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
  dominant_foot: string | null;
  photo_url: string | null;
  bio_public: string | null;
  highlight_video_url: string | null;
  auto_rating: number | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
  play_style: string | null;
  strengths: string[] | null;
  areas_to_develop: string[] | null;
  contract_status: string | null;
  country: string | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
}

interface SeasonStats {
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots: number;
  shots_on_target: number;
  key_passes: number;
  chances_created: number;
  successful_dribbles: number;
  total_dribbles: number;
  accurate_passes: number;
  total_passes: number;
  clearances: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
}

interface CompetitionStats {
  competition_id: string;
  competition_name: string;
  competition_type: string;
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
}

type TabValue = "current" | "per90" | "competition" | "career";

// =============== MAIN COMPONENT ===============

const PlayerProfile = () => {
  const { slug } = useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("current");
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Track scroll for sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 300);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch player
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .limit(1);
      const playerRow = Array.isArray(data) ? data[0] ?? null : null;
      if (playerRow) setPlayer(playerRow);
      setLoading(false);
    };
    fetchPlayer();
  }, [slug]);

  // Match-derived stats
  const {
    matches: matchDerivedMatches,
    isLoading: statsLoading,
  } = usePlayerMatchStats({
    playerId: player?.id ?? "",
    enabled: !!player?.id,
  });

  // Unified stats (Live + Manual)
  const { data: unifiedStatsData } = useQuery({
    queryKey: ["unified-player-stats-public", player?.id],
    queryFn: () => fetchUnifiedPlayerStats(player?.id ?? ""),
    enabled: !!player?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Career stats aggregation
  const careerStats: SeasonStats[] = useMemo(() => {
    const stats = unifiedStatsData || [];
    const acc: Record<number, SeasonStats> = {};
    
    for (const s of stats) {
      const year = s.season_year;
      if (!acc[year]) {
        acc[year] = {
          season_year: year,
          matches: 0, minutes: 0, goals: 0, assists: 0,
          yellow_cards: 0, red_cards: 0, tackles: 0, interceptions: 0,
          recoveries: 0, shots: 0, shots_on_target: 0, key_passes: 0,
          chances_created: 0, successful_dribbles: 0, total_dribbles: 0,
          accurate_passes: 0, total_passes: 0, clearances: 0,
          saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
        };
      }
      
      const c = acc[year];
      c.matches += s.matches;
      c.minutes += s.minutes;
      c.goals += s.goals;
      c.assists += s.assists;
      c.yellow_cards += s.yellow_cards;
      c.red_cards += s.red_cards;
      c.tackles += s.tackles;
      c.interceptions += s.interceptions;
      c.recoveries += s.recoveries;
      c.shots += s.shots;
      c.shots_on_target += s.shots_on_target;
      c.key_passes += s.key_passes;
      c.chances_created += s.chances_created;
      c.successful_dribbles += s.successful_dribbles;
      c.total_dribbles += s.total_dribbles;
      c.accurate_passes += s.accurate_passes;
      c.total_passes += s.total_passes;
      c.saves += s.saves;
      c.goals_conceded += s.goals_conceded;
      c.clean_sheets += s.clean_sheets;
      c.penalties_saved += s.penalties_saved;
    }
    
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [unifiedStatsData]);

  const latestAvailableSeasonYear: number | null = useMemo(() => {
    if (careerStats.length === 0) return null;
    return careerStats[0].season_year;
  }, [careerStats]);

  const currentSeasonStats: SeasonStats | null = useMemo(() => {
    if (careerStats.length === 0) return null;
    return careerStats[0] || null;
  }, [careerStats]);

  // Competition stats
  const competitionStats: CompetitionStats[] = useMemo(() => {
    const stats = unifiedStatsData || [];
    const acc: Record<string, CompetitionStats> = {};
    
    for (const s of stats) {
      if (!s.competition_id) continue;
      
      const key = `${s.competition_id}-${s.season_year}`;
      if (!acc[key]) {
        acc[key] = {
          competition_id: s.competition_id,
          competition_name: s.competition_name || "Competição",
          competition_type: "league",
          season_year: s.season_year,
          matches: 0, minutes: 0, goals: 0, assists: 0,
        };
      }
      
      const c = acc[key];
      c.matches += s.matches;
      c.minutes += s.minutes;
      c.goals += s.goals;
      c.assists += s.assists;
    }
    
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [unifiedStatsData]);

  // Career totals
  const careerTotals = useMemo(() => {
    const stats = unifiedStatsData || [];
    return stats.reduce(
      (acc, s) => ({
        matches: acc.matches + s.matches,
        minutes: acc.minutes + s.minutes,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
      }),
      { matches: 0, minutes: 0, goals: 0, assists: 0 }
    );
  }, [unifiedStatsData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando atleta...</span>
        </motion.div>
      </div>
    );
  }

  // Not found state
  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-4">Atleta não encontrado</h1>
          <Link to="/players">
            <Button variant="outline">Voltar para atletas</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Premium background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-primary/3 blur-[120px] rounded-full" />
      </div>

      <div className="relative pt-24 sm:pt-28 pb-16">
        <div className="max-w-6xl mx-auto" style={{ paddingLeft: 'var(--page-gutter)', paddingRight: 'var(--page-gutter)' }}>
          
          {/* Back Button */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10 mb-6"
          >
            <Link 
              to="/players" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-foreground transition-colors group py-2"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
          </motion.div>

          {/* Hero Section */}
          <AthleteHeroSection player={player} />

          {/* Highlights Section */}
          <AthleteHighlightsSection
            strengths={player.strengths}
            playStyle={player.play_style}
            primaryTacticalRole={player.primary_tactical_role}
            secondaryTacticalRole={player.secondary_tactical_role}
            contractStatus={player.contract_status}
            currentClub={player.current_club}
          />

          {/* Statistics Section */}
          {!statsLoading && careerStats.length > 0 && (
            <AthleteStatsSection
              careerTotals={careerTotals}
              careerStats={careerStats}
              competitionStats={competitionStats}
              currentSeasonStats={currentSeasonStats}
              latestAvailableSeasonYear={latestAvailableSeasonYear}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Game Phases Section */}
          <AthleteGamePhasesSection
            currentSeasonStats={currentSeasonStats}
            latestAvailableSeasonYear={latestAvailableSeasonYear}
          />

          {/* Physical Data Section */}
          <AthletePhysicalSection
            height={player.height}
            weight={player.weight}
            wingspan={player.wingspan}
            body_fat_percentage={player.body_fat_percentage}
            muscle_mass={player.muscle_mass}
            max_speed={player.max_speed}
            sprint_30m={player.sprint_30m}
            vo2_max={player.vo2_max}
          />

          {/* Video Section */}
          <AthleteVideoSection videoUrl={player.highlight_video_url} />

          {/* Final CTA */}
          <AthleteCTASection 
            playerName={player.full_name} 
            playerSlug={player.slug} 
          />

          {/* Spacer for sticky CTA on mobile */}
          <div className="h-20 md:hidden" />
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA 
        playerSlug={player.slug} 
        playerName={player.full_name}
        visible={showStickyCTA}
      />
    </div>
  );
};

export default PlayerProfile;
