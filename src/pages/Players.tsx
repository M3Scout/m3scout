import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AthleteCardPremium } from "@/components/players/AthleteCardPremium";
import { calculateMatchRating, type PlayerStatsInput } from "@/lib/matchRatingEngine";
import { ControlBarPremium } from "@/components/players/ControlBarPremium";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Eye, Calendar, LayoutGrid, Table2 } from "lucide-react";
import { safeArray, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { fadeInUp, staggerContainer, staggerItem, smoothTransition, buttonHover, buttonTap, pillHover } from "@/lib/animations";

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string;
  secondary_positions: string[];
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  created_at: string;
  // Scouting mode fields
  dominant_foot: string | null;
  height: number | null;
  // New scouting fields
  overall_rating: number | null;
  potential_rating: number | null;
  physical_status: string | null;
  market_value: number | null;
  estimated_level: string | null;
  // New indicator header fields
  play_style: string | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
}

interface PlayerWithCompetition extends Player {
  competition_name?: string | null;
  last_report_date?: string | null;
}

interface PlayerStatsAggregated {
  player_id: string;
  total_minutes: number;
  total_matches: number;
  averageRating: number | null;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2];

const Players = () => {
  const [players, setPlayers] = useState<PlayerWithCompetition[]>([]);
  const [playerStats, setPlayerStats] = useState<Map<string, { minutes: number; matches: number; averageRating: number | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("todos");
  const [nationalityFilter, setNationalityFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [scoutingMode, setScoutingMode] = useState(() => {
    const saved = localStorage.getItem('m3-scouting-mode');
    return saved === 'true';
  });
  const [clubMode, setClubMode] = useState(() => {
    const saved = localStorage.getItem('m3-club-mode');
    return saved === 'true';
  });

  // Persist mode preferences
  useEffect(() => {
    localStorage.setItem('m3-scouting-mode', String(scoutingMode));
    // When Scouting Mode is activated, force Club Mode ON (no Visual option)
    if (scoutingMode) {
      setClubMode(true);
    }
  }, [scoutingMode]);

  useEffect(() => {
    localStorage.setItem('m3-club-mode', String(clubMode));
  }, [clubMode]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // OPTIMIZED: Fetch players with progressive loading
  // Step 1: Load basic player data FAST (skeleton → cards)
  // Step 2: Load enrichment data (competitions, reports) in PARALLEL
  useEffect(() => {
    const fetchPlayers = async () => {
      const fetchStart = performance.now();
      if (import.meta.env.DEV) console.log("[TIMING] Players.tsx fetch start");

      // STEP 1: Core player data only (FAST - no joins)
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select(`
          id, slug, full_name, position, secondary_positions, age, nationality, 
          current_club, photo_url, auto_rating, dominant_foot, height,
          overall_rating, potential_rating, physical_status, market_value, estimated_level,
          play_style, primary_tactical_role, secondary_tactical_role,
          created_at
        `)
        .eq("is_public", true)
        .or("is_archived.is.null,is_archived.eq.false")
        .order("full_name");

      if (import.meta.env.DEV) {
        console.log("[TIMING] Players core data loaded", {
          duration: `${Math.round(performance.now() - fetchStart)}ms`,
          count: playersData?.length ?? 0
        });
      }

      if (!playersData) {
        setLoading(false);
        return;
      }

      // IMMEDIATELY show players (no enrichment yet)
      const basicPlayers: PlayerWithCompetition[] = playersData.map(player => ({
        ...player,
        competition_name: null,
        last_report_date: null,
      }));
      setPlayers(basicPlayers);
      setLoading(false);

      // STEP 2: Enrichment data in PARALLEL (non-blocking)
      const playerIds = playersData.map(p => p.id);
      
      const enrichStart = performance.now();
      
      // All enrichment queries in parallel
      const [statsResult, reportsResult] = await Promise.allSettled([
        supabase
          .from("player_stats")
          .select("player_id, competition_id")
          .in("player_id", playerIds)
          .eq("season_year", currentYear),
        supabase
          .from("scouting_reports")
          .select("player_id, match_date")
          .in("player_id", playerIds)
          .is("deleted_at", null)
          .order("match_date", { ascending: false })
      ]);

      const statsData = statsResult.status === "fulfilled" ? statsResult.value.data : null;
      const reportsData = reportsResult.status === "fulfilled" ? reportsResult.value.data : null;

      // Fetch competition names if we have stats
      let competitionMap = new Map<string, string>();
      if (statsData && statsData.length > 0) {
        const competitionIds = [...new Set(statsData.map(s => s.competition_id).filter(Boolean))];
        if (competitionIds.length > 0) {
          const { data: competitionsData } = await supabase
            .from("competitions")
            .select("id, name")
            .in("id", competitionIds);
          competitionMap = new Map(competitionsData?.map(c => [c.id, c.name]) || []);
        }
      }

      // Build enrichment maps
      const playerCompetitionMap = new Map<string, string>();
      statsData?.forEach(s => {
        if (s.competition_id && !playerCompetitionMap.has(s.player_id)) {
          playerCompetitionMap.set(s.player_id, competitionMap.get(s.competition_id) || "");
        }
      });

      const lastReportMap = new Map<string, string>();
      reportsData?.forEach(r => {
        if (!lastReportMap.has(r.player_id)) {
          lastReportMap.set(r.player_id, new Date(r.match_date).toLocaleDateString('pt-BR'));
        }
      });

      // Update players with enrichment (second render)
      const enrichedPlayers: PlayerWithCompetition[] = playersData.map(player => ({
        ...player,
        competition_name: playerCompetitionMap.get(player.id) || null,
        last_report_date: lastReportMap.get(player.id) || null,
      }));

      if (import.meta.env.DEV) {
        console.log("[TIMING] Players enrichment complete", {
          duration: `${Math.round(performance.now() - enrichStart)}ms`,
          totalDuration: `${Math.round(performance.now() - fetchStart)}ms`
        });
      }

      setPlayers(enrichedPlayers);
    };

    fetchPlayers();
  }, []);

  // Fetch season totals for the listing using the SAME merge logic as
  // "DETALHES POR TEMPORADA" on the player profile:
  // - Live stats (match_players.minutes_played) override manual stats (player_stats)
  //   for the same season + competition
  // - No derived minutes, no entered/exited calculations, no timeline
  // OPTIMIZED: Fetch live + manual stats in PARALLEL
  useEffect(() => {
    const fetchSeasonTotals = async () => {
      if (players.length === 0) return;

      const playerIds = players.map((p) => p.id);
      const fetchStart = performance.now();
      if (import.meta.env.DEV) console.log("[TIMING] Players season totals fetch start");

      // PARALLEL: Fetch both live and manual stats at the same time
      const [matchPlayersResult, manualStatsResult] = await Promise.allSettled([
        supabase
          .from("match_players")
          .select(
            `
            player_id,
            minutes_played,
            match:matches!inner (
              id,
              season_year,
              status,
              competition_id
            )
          `
          )
          .in("player_id", playerIds)
          .eq("is_removed", false)
          .eq("match.season_year", selectedYear)
          .in("match.status", ["finished", "applied"]),
        supabase
          .from("player_stats")
          .select("player_id, season_year, competition_id, matches, minutes")
          .in("player_id", playerIds)
          .eq("season_year", selectedYear)
      ]);

      const matchPlayersData = matchPlayersResult.status === "fulfilled" ? matchPlayersResult.value.data : null;
      const manualStatsData = manualStatsResult.status === "fulfilled" ? manualStatsResult.value.data : null;

      if (matchPlayersResult.status === "rejected") {
        console.error("[Players.tsx] Error fetching match_players:", matchPlayersResult.reason);
      }
      if (manualStatsResult.status === "rejected") {
        console.error("[Players.tsx] Error fetching player_stats:", manualStatsResult.reason);
      }

      // Aggregate live by (player_id, competition_id)
      const liveByPlayerComp = new Map<
        string,
        Map<string, { minutes: number; matches: number }>
      >();

      (matchPlayersData || []).forEach((mp: any) => {
        const compKey = mp.match?.competition_id ?? "none";
        const minutes = mp.minutes_played ?? 0;

        const perPlayer = liveByPlayerComp.get(mp.player_id) || new Map();
        const current = perPlayer.get(compKey) || { minutes: 0, matches: 0 };
        perPlayer.set(compKey, {
          minutes: current.minutes + minutes,
          matches: current.matches + 1,
        });
        liveByPlayerComp.set(mp.player_id, perPlayer);
      });

      const manualByPlayerComp = new Map<
        string,
        Map<string, { minutes: number; matches: number }>
      >();

      (manualStatsData || []).forEach((s: any) => {
        const compKey = s.competition_id ?? "none";
        const perPlayer = manualByPlayerComp.get(s.player_id) || new Map();
        const current = perPlayer.get(compKey) || { minutes: 0, matches: 0 };
        perPlayer.set(compKey, {
          minutes: current.minutes + (s.minutes ?? 0),
          matches: current.matches + (s.matches ?? 0),
        });
        manualByPlayerComp.set(s.player_id, perPlayer);
      });

      // 3) Ratings: calculated from live match data (same as profile's match ratings)
      const ratingsMap = new Map<string, number[]>();

      if (matchPlayersData && matchPlayersData.length > 0) {
        const matchIds = [
          ...new Set((matchPlayersData || []).map((mp: any) => mp.match?.id).filter(Boolean)),
        ];

        const { data: matchStatsData, error: statsErr2 } = await supabase
          .from("match_player_stats")
          .select("*")
          .in("player_id", playerIds)
          .in("match_id", matchIds as string[]);

        if (statsErr2) {
          console.error("[Players.tsx] Error fetching match_player_stats:", statsErr2);
        }

        const statsLookup = new Map<string, any>();
        (matchStatsData || []).forEach((stat: any) => {
          statsLookup.set(`${stat.player_id}-${stat.match_id}`, stat);
        });

        const playerPositionMap = new Map<string, string>();
        players.forEach((p) => playerPositionMap.set(p.id, p.position?.toLowerCase() || ""));

        (matchPlayersData || []).forEach((mp: any) => {
          const officialMinutes = mp.minutes_played ?? 0;
          if (officialMinutes <= 0) return;

          const matchId = mp.match?.id;
          if (!matchId) return;

          const matchStats = statsLookup.get(`${mp.player_id}-${matchId}`);
          if (!matchStats) return;

          const position = playerPositionMap.get(mp.player_id) || "";
          const isGoalkeeper =
            position === "gk" || position === "goleiro" || position === "goalkeeper";

          const statsInput: PlayerStatsInput = {
            goals: matchStats.goals || 0,
            assists: matchStats.assists || 0,
            shots_on_target: matchStats.shots_on_target || 0,
            shots: matchStats.shots || 0,
            dribbles_success: matchStats.dribbles_success || 0,
            dribbles_total: matchStats.dribbles_total || 0,
            key_passes: matchStats.key_passes || 0,
            chances_created: matchStats.chances_created || 0,
            passes_completed: matchStats.passes_completed || 0,
            passes_total: matchStats.passes_total || 0,
            interceptions: matchStats.interceptions || 0,
            recoveries: matchStats.recoveries || 0,
            clearances: matchStats.clearances || 0,
            tackles: matchStats.tackles || 0,
            yellow_cards: matchStats.yellow_cards || 0,
            red_cards: matchStats.red_cards || 0,
            // Duels (Professional Scouting v2.0)
            duels_won: matchStats.duels_won || 0,
            duels_total: matchStats.duels_total || 0,
            aerial_duels_won: matchStats.aerial_duels_won || 0,
            aerial_duels_total: matchStats.aerial_duels_total || 0,
            fouls_committed: matchStats.fouls_committed || 0,
            fouls_suffered: matchStats.fouls_suffered || 0,
            possession_lost: matchStats.possession_lost || 0,
            saves: matchStats.saves || 0,
            goals_conceded: matchStats.goals_conceded || 0,
            isGoalkeeper,
          };

          const ratingResult = calculateMatchRating(statsInput, officialMinutes);
          if (ratingResult.hasRating && ratingResult.rating !== null) {
            const current = ratingsMap.get(mp.player_id) || [];
            current.push(ratingResult.rating);
            ratingsMap.set(mp.player_id, current);
          }
        });
      }

      // 4) Build final season totals per player using the SAME precedence as profile:
      // live comps first, then manual comps that don't overlap
      const statsMap = new Map<
        string,
        { minutes: number; matches: number; averageRating: number | null }
      >();

      playerIds.forEach((playerId) => {
        const liveComps = liveByPlayerComp.get(playerId) || new Map();
        const manualComps = manualByPlayerComp.get(playerId) || new Map();

        let minutes = 0;
        let matches = 0;

        // live comps
        for (const v of liveComps.values()) {
          minutes += v.minutes;
          matches += v.matches;
        }

        // manual comps (only non-overlapping)
        for (const [compKey, v] of manualComps.entries()) {
          if (liveComps.has(compKey)) continue;
          minutes += v.minutes;
          matches += v.matches;
        }

        const ratings = ratingsMap.get(playerId) || [];
        const averageRating =
          ratings.length > 0
            ? Math.round((ratings.reduce((acc, r) => acc + r, 0) / ratings.length) * 10) / 10
            : null;

        statsMap.set(playerId, {
          minutes,
          matches,
          averageRating,
        });
      });

      setPlayerStats(statsMap);

      if (import.meta.env.DEV) {
        console.log("[TIMING] Players season totals complete", {
          duration: `${Math.round(performance.now() - fetchStart)}ms`
        });

        // DEBUG (temporary): compare sources for Joaquim
        const joaquim = players.find((p) => p.full_name?.toLowerCase().includes("joaquim"));
        if (joaquim) {
          const liveComps = liveByPlayerComp.get(joaquim.id) || new Map();
          const manualComps = manualByPlayerComp.get(joaquim.id) || new Map();
          const liveMinutes = Array.from(liveComps.values()).reduce((a, v) => a + v.minutes, 0);
          const manualMinutes = Array.from(manualComps.values()).reduce((a, v) => a + v.minutes, 0);
          const finalMinutesUsedInCard = statsMap.get(joaquim.id)?.minutes ?? 0;

          console.log("[Players.tsx][DEBUG minutes override]", {
            player: joaquim.full_name,
            selectedYear,
            liveMinutes,
            manualMinutes,
            finalMinutesUsedInCard,
            liveComps: Array.from(liveComps.entries()),
            manualComps: Array.from(manualComps.entries()),
          });
        }
      }
    };

    fetchSeasonTotals();
  }, [players, selectedYear]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "todos" || 
        player.position.toLowerCase().includes(positionFilter);
      const matchesNationality = nationalityFilter === "todos" || 
        player.nationality.toLowerCase() === nationalityFilter;
      
      return matchesSearch && matchesPosition && matchesNationality;
    });
  }, [players, searchQuery, positionFilter, nationalityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlayers, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, nationalityFilter]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: "#070910",
        fontFamily: "'Poppins', sans-serif" 
      }}
    >
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>
      
      {/* Subtle texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 md:px-6 lg:px-8">
        
        {/* Header Section - Editorial */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="pt-28 pb-10 md:pt-40 md:pb-16"
        >
          {/* Micro label */}
          <motion.p 
            className="text-[11px] uppercase tracking-[0.35em] text-neutral-500 font-medium mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Portfólio
          </motion.p>
          
          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-4 md:mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Nossos{" "}
            <span className="text-[#e52421]">Atletas</span>
          </motion.h1>
          
          {/* Subtitle - Europa level copy */}
          <motion.p 
            className="text-neutral-400 text-base md:text-xl font-light max-w-2xl leading-relaxed tracking-wide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Curadoria, dados e contexto competitivo. Portfólio pronto para decisão.
          </motion.p>
        </motion.section>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-8 md:mb-10" />

        {/* Control Bar */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 md:mb-6"
        >
          <ControlBarPremium
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            positionFilter={positionFilter}
            onPositionChange={setPositionFilter}
            nationalityFilter={nationalityFilter}
            onNationalityChange={setNationalityFilter}
          />
        </motion.section>

        {/* Results Count + Year Filter + Scouting Mode Toggle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-4 mb-8 md:mb-10"
        >
          <p className="text-sm text-neutral-500 font-light tracking-wide">
            {filteredPlayers.length} atleta{filteredPlayers.length !== 1 ? "s" : ""} no portfólio
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Filter - Pill Style */}
            <motion.div 
              className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-pill)] min-h-[var(--tap-target)]"
              style={{
                background: 'var(--bg-glass)',
                border: 'var(--border-glass)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar className="w-4 h-4 text-neutral-500" />
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger 
                  className="w-[80px] h-8 bg-transparent border-0 text-white text-sm p-0 focus:ring-0"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-white/10 rounded-[var(--radius-button)]">
                  {availableYears.map((year) => (
                    <SelectItem 
                      key={year} 
                      value={String(year)}
                      className="text-white focus:bg-white/10 focus:text-white rounded-[var(--radius-button)]"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            {/* Scouting Mode Toggle */}
            <motion.div 
              className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-pill)] min-h-[var(--tap-target)] transition-all duration-200"
              style={{
                background: scoutingMode ? 'rgba(229, 36, 33, 0.08)' : 'var(--bg-glass)',
                border: scoutingMode ? '1px solid rgba(229, 36, 33, 0.2)' : 'var(--border-glass)',
                backdropFilter: 'blur(8px)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Eye className={`w-4 h-4 transition-colors duration-200 ${scoutingMode ? 'text-[#e52421]' : 'text-neutral-500'}`} />
              <span className={`text-sm font-medium tracking-wide transition-colors duration-200 ${scoutingMode ? 'text-white' : 'text-neutral-400'}`}>
                Modo Scouting
              </span>
              <Switch
                checked={scoutingMode}
                onCheckedChange={setScoutingMode}
                className="data-[state=checked]:bg-[#e52421]"
              />
            </motion.div>

            {/* Club Mode Indicator (only visible when scouting mode is on) */}
            {/* When Scouting Mode is ON, only Club Mode is available (no Visual option) */}
            <AnimatePresence>
              {scoutingMode && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div 
                    className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-pill)]"
                    style={{
                      background: 'rgba(7, 9, 16, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Table2 className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white/80">Club Mode</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scouting Mode Microcopy */}
          <AnimatePresence>
            {scoutingMode && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] uppercase tracking-[0.15em] text-white/30"
              >
                Dados prontos para decisão
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            {/* Athletes Grid - 1 column for Club Mode, 4 columns for Visual Mode */}
            <motion.div 
              className={cn(
                "grid w-full",
                scoutingMode && clubMode 
                  ? "grid-cols-1" 
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}
              style={{ gap: scoutingMode && clubMode ? '16px' : 'clamp(24px, 2vw, 32px)' }}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              key={`grid-${scoutingMode}-${clubMode}`}
            >
              {safeArray(paginatedPlayers).map((player, index) => (
                <motion.div
                  key={player.id}
                  variants={staggerItem}
                  custom={index}
                  layout
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AthleteCardPremium
                    id={player.id}
                    slug={player.slug}
                    name={player.full_name}
                    position={player.position}
                    age={player.age || 0}
                    nationality={player.nationality}
                    currentClub={player.current_club || ""}
                    imageUrl={player.photo_url || "/placeholder.svg"}
                    isPublic={true}
                    scoutingMode={scoutingMode}
                    clubMode={clubMode}
                    dominantFoot={player.dominant_foot}
                    height={player.height}
                    totalMinutes={playerStats.get(player.id)?.minutes ?? null}
                    totalMatches={playerStats.get(player.id)?.matches ?? null}
                    overallRating={playerStats.get(player.id)?.averageRating ?? null}
                    potentialRating={player.potential_rating}
                    physicalStatus={player.physical_status}
                    marketValue={player.market_value}
                    estimatedLevel={player.estimated_level}
                    competitionName={player.competition_name}
                    lastReportDate={player.last_report_date}
                    createdAt={player.created_at}
                    playStyle={player.play_style}
                    primaryTacticalRole={player.primary_tactical_role}
                    secondaryTacticalRole={player.secondary_tactical_role}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-between gap-6 py-12 md:py-16 border-t border-white/5 mt-12 md:mt-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {/* Info & Items per page */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <p className="text-sm text-neutral-500 font-light">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredPlayers.length)} de {filteredPlayers.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-600">Itens:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-10 bg-transparent border-white/10 text-white rounded-[var(--radius-button)] focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-white/10 rounded-[var(--radius-button)]">
                        {safeArray(PAGE_SIZE_OPTIONS).map((size) => (
                          <SelectItem 
                            key={size} 
                            value={String(size)}
                            className="text-white focus:bg-white/10 focus:text-white rounded-md"
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                    whileHover={currentPage !== 1 ? buttonHover : {}}
                    whileTap={currentPage !== 1 ? buttonTap : {}}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  
                  {safeArray(getPageNumbers()).map((page, index) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-3 text-neutral-600">
                        …
                      </span>
                    ) : (
                      <motion.button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] text-sm font-medium transition-all duration-200 ${
                          currentPage === page
                            ? "bg-white text-black"
                            : "border border-white/10 text-white hover:border-white/20 hover:bg-white/5"
                        }`}
                        whileHover={buttonHover}
                        whileTap={buttonTap}
                      >
                        {page}
                      </motion.button>
                    )
                  )}
                  
                  <motion.button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 min-h-[var(--tap-target)] flex items-center justify-center rounded-[var(--radius-button)] border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                    whileHover={currentPage !== totalPages ? buttonHover : {}}
                    whileTap={currentPage !== totalPages ? buttonTap : {}}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="text-center py-32">
            <p className="text-neutral-500 font-light">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="pb-16" />
      </div>
    </div>
  );
};

export default Players;
