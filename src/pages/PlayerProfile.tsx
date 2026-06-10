import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { usePlayerMatchStats } from "@/hooks/usePlayerMatchStats";
import { fetchUnifiedPlayerStats } from "@/hooks/useUnifiedPlayerStats";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Premium modular components
import { AthleteHeroSection } from "@/components/players/public/AthleteHeroSection";
import { AthleteHighlightsSection } from "@/components/players/public/AthleteHighlightsSection";
import { AtributoRadar } from "@/components/players/detail/AtributoRadar";
import { AthleteStatsSection } from "@/components/players/public/AthleteStatsSection";
import { AthleteGamePhasesSection } from "@/components/players/public/AthleteGamePhasesSection";
import { AthletePhysicalSection } from "@/components/players/public/AthletePhysicalSection";
import { AthleteVideoSection } from "@/components/players/public/AthleteVideoSection";

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
  steals: number;
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
  long_passes_accurate: number;
  long_passes_total: number;
  clearances: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  // GK-specific
  aerial_duels_won: number;
  aerial_duels_total: number;
  fouls_committed: number;
  penalties_won: number;
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
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch player
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!slug) return;
      const { data } = await (supabase
        .from("public_players_safe" as any)
        .select("*")
        .eq("slug", slug)
        .limit(1) as any);
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
          yellow_cards: 0, red_cards: 0, steals: 0, tackles: 0, interceptions: 0,
          recoveries: 0, shots: 0, shots_on_target: 0, key_passes: 0,
          chances_created: 0, successful_dribbles: 0, total_dribbles: 0,
          accurate_passes: 0, total_passes: 0, long_passes_accurate: 0, long_passes_total: 0, clearances: 0,
          saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
          aerial_duels_won: 0, aerial_duels_total: 0, fouls_committed: 0,
          penalties_won: 0,
        };
      }
      
      const c = acc[year];
      c.matches += s.matches;
      c.minutes += s.minutes;
      c.goals += s.goals;
      c.assists += s.assists;
      c.yellow_cards += s.yellow_cards;
      c.red_cards += s.red_cards;
      c.steals += s.steals ?? 0;
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
      c.long_passes_accurate += s.long_passes_accurate ?? 0;
      c.long_passes_total += s.long_passes_total ?? 0;
      c.saves += s.saves;
      c.goals_conceded += s.goals_conceded;
      c.clean_sheets += s.clean_sheets;
      c.penalties_saved += s.penalties_saved;
      c.aerial_duels_won += s.aerial_duels_won ?? 0;
      c.aerial_duels_total += s.aerial_duels_total ?? 0;
      c.fouls_committed += s.fouls_committed ?? 0;
      c.penalties_won += (s as any).penalties_won ?? 0;
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
      <div className="min-h-screen flex items-center justify-center bg-[#0c0b0d]">
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
      <div className="min-h-screen flex items-center justify-center bg-[#0c0b0d]">
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
    <div className="min-h-screen bg-[#0c0b0d] overflow-x-hidden">
      <div className="pt-24 sm:pt-28 pb-16">
        {/* Container aligned with header logo - uses same max-width and gutters */}
        <div className="w-full max-w-[1600px] mx-auto px-[18px] md:px-[72px]">
          
          {/* Hero Section - complete athlete header block */}
          <AthleteHeroSection 
            player={player} 
            contractStatus={player.contract_status}
          />

          {/* Highlights Section - Pontos Fortes */}
          <AthleteHighlightsSection strengths={player.strengths} />

          {/* Attribute Radar Section */}
          <section className="mt-16 md:mt-24">
            <div className="flex items-end justify-between gap-6 mb-8 md:mb-10 flex-wrap">
              <div>
                <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
                  <span className="text-[#ec4525] font-semibold">02</span>
                  <span className="w-[34px] h-px bg-white/15 flex-none" />
                  ANÁLISE TÉCNICA
                </div>
                <h2
                  className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
                  style={{ fontSize: "clamp(24px,3.4vw,44px)" }}
                >
                  Mapa de Atributos
                </h2>
              </div>
              <p className="hidden md:block font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[240px] text-right leading-relaxed">
                Temporada mais recente<br />calculado por 90 min
              </p>
            </div>
            <div className="max-w-[320px] mx-auto md:mx-0">
              <AtributoRadar playerId={player.id} filterToLatestSeason />
            </div>
          </section>

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
            playerPosition={player.position}
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

        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
