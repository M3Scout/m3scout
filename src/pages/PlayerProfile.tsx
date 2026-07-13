import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useComparePlayerStats } from "@/hooks/useComparePlayerStats";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
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
      if (playerRow) {
        // Derive current club from most recent contract (same logic as ContractTab)
        const { data: contracts } = await supabase
          .from("player_contract_history")
          .select("club_name")
          .eq("player_id", playerRow.id)
          .eq("is_archived", false)
          .order("start_date", { ascending: false })
          .limit(1);
        const derivedClub = contracts?.[0]?.club_name ?? playerRow.current_club;
        setPlayer({ ...playerRow, current_club: derivedClub });
      }
      setLoading(false);
    };
    fetchPlayer();
  }, [slug]);

  // Unified stats — mesmas 3 fontes + mergeSeasonRows do StatsTab
  const { rows: mergedRows, isLoading: unifiedLoading } = useComparePlayerStats({
    playerId: player?.id ?? null,
    seasonFilter: "all",
    competitionFilter: "all",
  });

  // Career stats aggregation (por temporada)
  const careerStats: SeasonStats[] = useMemo(() => {
    const acc: Record<number, SeasonStats> = {};
    for (const s of mergedRows) {
      const year = s.season_year;
      if (!acc[year]) {
        acc[year] = {
          season_year: year,
          matches: 0, minutes: 0, goals: 0, assists: 0,
          yellow_cards: 0, red_cards: 0, steals: 0, tackles: 0, interceptions: 0,
          recoveries: 0, shots: 0, shots_on_target: 0, key_passes: 0,
          chances_created: 0, successful_dribbles: 0, total_dribbles: 0,
          accurate_passes: 0, total_passes: 0,
          long_passes_accurate: 0, long_passes_total: 0,
          clearances: 0,
          aerial_duels_won: 0, aerial_duels_total: 0,
          fouls_committed: 0,
          saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
          penalties_won: 0,
        };
      }
      const c = acc[year];
      c.matches  += s.matches;
      c.minutes  += s.minutes;
      c.goals    += s.goals;
      c.assists  += s.assists;
      c.yellow_cards      += s.yellow_cards;
      c.red_cards         += s.red_cards;
      c.tackles           += s.tackles;
      c.interceptions     += s.interceptions;
      c.recoveries        += s.recoveries;
      c.shots             += s.shots;
      c.shots_on_target   += s.shots_on_target;
      c.key_passes        += s.key_passes;
      c.chances_created   += s.chances_created;
      c.successful_dribbles += s.successful_dribbles;
      c.total_dribbles    += s.total_dribbles;
      c.accurate_passes   += s.accurate_passes;
      c.total_passes      += s.total_passes;
      c.long_passes_accurate += s.long_passes_accurate;
      c.long_passes_total += s.long_passes_total;
      c.clearances        += s.clearances;
      c.aerial_duels_won  += s.aerial_duels_won;
      c.aerial_duels_total += s.aerial_duels_total;
      c.fouls_committed   += s.fouls_committed;
      c.steals            += s.steals;
      c.penalties_won     += s.penalties_won;
      c.saves             += s.saves;
      c.goals_conceded    += s.goals_conceded;
      c.clean_sheets      += s.clean_sheets;
      c.penalties_saved   += s.penalties_saved;
    }
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [mergedRows]);

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
    const acc: Record<string, CompetitionStats> = {};
    for (const s of mergedRows) {
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
      c.goals   += s.goals;
      c.assists += s.assists;
    }
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [mergedRows]);

  // Career totals
  const careerTotals = useMemo(() => {
    return mergedRows.reduce(
      (acc, s) => ({
        matches: acc.matches + s.matches,
        minutes: acc.minutes + s.minutes,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
      }),
      { matches: 0, minutes: 0, goals: 0, assists: 0 }
    );
  }, [mergedRows]);

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

  const pageTitle = `${player.full_name} — ${player.position}${player.current_club ? ` · ${player.current_club}` : ""} | M3 Agency`;
  const pageDescription = `Perfil do atleta ${player.full_name}${player.age ? `, ${player.age} anos` : ""}${player.nationality ? `, ${player.nationality}` : ""}${player.current_club ? `, ${player.current_club}` : ""}. Estatísticas, atributos e vídeos no M3 Agency.`;
  const canonicalUrl = `https://m3scout.com/players/${player.slug}`;
  const ogImage = player.photo_url || "https://m3scout.com/og-default.png";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.full_name,
    image: ogImage,
    url: canonicalUrl,
    identifier: player.slug,
    ...(player.nationality ? { nationality: player.nationality } : {}),
    ...(player.birth_date ? { birthDate: player.birth_date } : {}),
    ...(player.current_club
      ? { memberOf: { "@type": "SportsTeam", name: player.current_club } }
      : {}),
    jobTitle: player.position,
  };

  return (
    <div className="min-h-screen bg-[#0c0b0d] overflow-x-hidden">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <div className="pt-24 sm:pt-28 pb-16">
        {/* Container aligned with header logo - uses same max-width and gutters */}
        <div className="w-full max-w-[1600px] mx-auto px-[18px] md:px-[72px]">

          
          {/* Hero Section - complete athlete header block */}
          <AthleteHeroSection 
            player={player} 
            contractStatus={player.contract_status}
          />

          {/* Highlights Section - Pontos Fortes */}
          <AthleteHighlightsSection strengths={player.strengths} playerId={player.id} />


          {/* Statistics Section */}
          {!unifiedLoading && careerStats.length > 0 && (
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
