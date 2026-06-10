import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl, getResponsiveSrcSet, ATHLETE_CARD_SIZES } from "@/lib/imageUtils";
import { calculateMatchRating, type PlayerStatsInput } from "@/lib/matchRatingEngine";
import { STANDARD_MATCH_DURATION, calculateMinutesPlayed } from "@/lib/minutesPlayed";
import { Loader2, ChevronLeft, ChevronRight, Search, ArrowRight } from "lucide-react";
import { safeArray } from "@/lib/utils";
import { getPositionColor } from "@/lib/positionColors";

/* ─── DESIGN TOKENS ─── */
const RED = "#E5173F";
const CREAM = "#F2EDE4";
const BLACK = "#0A0A0A";
const WHITE_MUTED = "rgba(242,237,228,0.42)";
const BORDER_DARK = "rgba(242,237,228,0.1)";
const GREEN = "#2DCE8A";
const YELLOW = "#E8C84A";

const MONO = "'Basis Grotesque Pro', sans-serif";
const BODY = "'Basis Grotesque Pro', sans-serif";
const DISPLAY = "'Basis Grotesque Pro', sans-serif";

/* ─── POSITION DOT COLOR MAP ─── */
function getPosDotColor(position: string): string {
  const p = position?.toLowerCase() || "";
  if (p.includes("goleiro") || p === "gk") return GREEN;
  if (p.includes("zagueiro") || p === "cb") return GREEN;
  if (p.includes("lateral")) return GREEN;
  if (p.includes("volante") || p.includes("meio") || p.includes("meia") || p === "cm" || p === "cdm" || p === "cam") return YELLOW;
  if (p.includes("ponta") || p === "lw" || p === "rw") return RED;
  if (p.includes("atacante") || p.includes("centroavante") || p === "st" || p === "cf") return RED;
  return WHITE_MUTED;
}

/* ─── TYPES ─── */
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
  dominant_foot: string | null;
  height: number | null;
  auto_potential: number | null;
  physical_status: string | null;
  market_value: number | null;
  estimated_level: string | null;
  play_style: string | null;
  primary_tactical_role: string | null;
  secondary_tactical_role: string | null;
}

interface PlayerWithCompetition extends Player {
  competition_name?: string | null;
  last_report_date?: string | null;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const currentYear = new Date().getFullYear();
const availableYears = [currentYear, currentYear - 1, currentYear - 2];

const positions = [
  "Todos", "Goleiro", "Zagueiro", "Lateral Direito", "Lateral Esquerdo",
  "Volante", "Meio-campo", "Meia Atacante", "Ponta Direita", "Ponta Esquerda", "Centroavante",
];
const nationalities = ["Todos", "Brasil", "Argentina", "Portugal", "Espanha", "Colômbia", "Uruguai"];

/* ─── HELPERS ─── */
function formatMinutesK(m: number | null | undefined): string {
  if (!m) return "0";
  return m >= 1000 ? `${(m / 1000).toFixed(1)}k` : String(m);
}

function getPhysicalLabel(status: string | null): { label: string; color: string } {
  const s = status?.toLowerCase() || "";
  if (s === "fit") return { label: "Apto", color: GREEN };
  if (s === "attention" || s === "recovering") return { label: "Em Transição", color: YELLOW };
  if (s === "injured") return { label: "Inapto", color: RED };
  return { label: "N/I", color: WHITE_MUTED };
}

/* ─── RESPONSIVE CSS ─── */
const RESPONSIVE_CSS = `
  /* ── TOOLBAR ── */
  .pl-toolbar-filters {
    display: grid;
    grid-template-columns: 1fr 160px 160px;
    gap: 0;
    border: 1px solid ${BORDER_DARK};
  }
  .pl-toolbar-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
  }
  .pl-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* ── NORMAL GRID ── */
  .pl-card-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: ${BORDER_DARK};
  }

  /* ── SCOUTING ROW (desktop) ── */
  .pl-scout-row-inner {
    display: grid;
    grid-template-columns: 280px 1fr 180px;
    flex: 1;
  }
  .pl-scout-col1 { display: flex; padding: 10px 16px; border-right: 1px solid ${BORDER_DARK}; gap: 12px; }
  .pl-scout-col2 { display: flex; flex-direction: column; border-right: 1px solid ${BORDER_DARK}; }
  .pl-scout-col3 { display: flex; align-items: center; justify-content: center; padding: 12px 24px; }
  .pl-scout-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 16px 2px; }
  .pl-scout-stats { display: flex; align-items: flex-end; gap: 24px; padding: 2px 16px 10px; }
  .pl-scout-photo { width: 80px; height: 90px; flex-shrink: 0; overflow: hidden; }

  /* ── PAGINATION ── */
  .pl-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid ${BORDER_DARK};
  }

  /* ════════════════════════════════════════════
     MOBILE OVERRIDES (<768px)
     ════════════════════════════════════════════ */
  @media (max-width: 767px) {
    /* Toolbar: search + position side by side, nationality hidden */
    .pl-toolbar-filters {
      grid-template-columns: 1fr 120px;
    }
    .pl-nationality-filter {
      display: none;
    }
    .pl-toolbar-filters > div {
      border-bottom: none;
    }
    .pl-toolbar-filters > div:first-child {
      border-right: 1px solid ${BORDER_DARK} !important;
    }
    /* Reduce filter bar height on mobile */
    .pl-toolbar-filters input,
    .pl-toolbar-filters select {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      font-size: 16px !important;
    }
     .pl-toolbar-bottom {
       flex-direction: row;
       align-items: center;
       justify-content: center;
       gap: 12px;
       flex-wrap: wrap;
     }
     .pl-toolbar-bottom-left {
       display: flex;
       flex-direction: row;
       align-items: center;
       gap: 10px;
     }
     .pl-toggle-row {
       display: none !important;
     }
     .pl-toolbar-bottom-left {
       display: none !important;
     }

    /* Normal grid: 2 columns */
    .pl-card-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    /* Scouting: transform each row into a stacked card */
    .pl-scout-row-inner {
      display: flex;
      flex-direction: column;
      grid-template-columns: unset;
    }
    .pl-scout-col1 {
      border-right: none;
      padding: 12px 16px;
      gap: 12px;
    }
    .pl-scout-col2 {
      border-right: none;
    }
    .pl-scout-tags {
      padding: 4px 16px 8px;
    }
    .pl-scout-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1px;
      padding: 0;
      background: ${BORDER_DARK};
    }
    .pl-scout-stat-cell {
      background: ${BLACK};
      padding: 10px 16px;
    }
    .pl-scout-col3 {
      padding: 14px 16px;
      border-top: 1px solid ${BORDER_DARK};
    }
    .pl-scout-photo {
      width: 72px;
      height: 72px;
    }

    /* Pagination: stack on very small */
    .pl-pagination {
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }
  }
`;

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT — keeps ALL data-fetching & state logic
   ════════════════════════════════════════════════════════════ */
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

  useEffect(() => {
    localStorage.setItem('m3-scouting-mode', String(scoutingMode));
  }, [scoutingMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // ─── FETCH PLAYERS (unchanged logic) ───
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data: playersData } = await (supabase
        .from("public_players_safe" as any)
        .select(`id, slug, full_name, position, secondary_positions, age, nationality, current_club, photo_url, auto_rating, dominant_foot, height, overall_rating, potential_rating, physical_status, market_value, estimated_level, play_style, primary_tactical_role, secondary_tactical_role, created_at`)
        .order("full_name") as any);

      if (!playersData) { setLoading(false); return; }

      const basicPlayers: PlayerWithCompetition[] = playersData.map((player: any) => ({
        ...player, competition_name: null, last_report_date: null,
      }));
      setPlayers(basicPlayers);
      setLoading(false);

      const playerIds = playersData.map((p: any) => p.id);
      const [statsResult, reportsResult] = await Promise.allSettled([
        supabase.from("player_stats").select("player_id, competition_id").in("player_id", playerIds).eq("season_year", currentYear),
        supabase.from("scouting_reports").select("player_id, match_date").in("player_id", playerIds).is("deleted_at", null).order("match_date", { ascending: false }),
      ]);

      const statsData = statsResult.status === "fulfilled" ? statsResult.value.data : null;
      const reportsData = reportsResult.status === "fulfilled" ? reportsResult.value.data : null;

      let competitionMap = new Map<string, string>();
      if (statsData && statsData.length > 0) {
        const competitionIds = [...new Set(statsData.map((s: any) => s.competition_id).filter(Boolean))];
        if (competitionIds.length > 0) {
          const { data: competitionsData } = await supabase.from("competitions").select("id, name").in("id", competitionIds);
          competitionMap = new Map(competitionsData?.map((c: any) => [c.id, c.name]) || []);
        }
      }

      const playerCompetitionMap = new Map<string, string>();
      statsData?.forEach((s: any) => {
        if (s.competition_id && !playerCompetitionMap.has(s.player_id)) {
          playerCompetitionMap.set(s.player_id, competitionMap.get(s.competition_id) || "");
        }
      });

      const lastReportMap = new Map<string, string>();
      reportsData?.forEach((r: any) => {
        if (!lastReportMap.has(r.player_id)) {
          lastReportMap.set(r.player_id, new Date(r.match_date).toLocaleDateString('pt-BR'));
        }
      });

      setPlayers(playersData.map((player: any) => ({
        ...player,
        competition_name: playerCompetitionMap.get(player.id) || null,
        last_report_date: lastReportMap.get(player.id) || null,
      })));
    };
    fetchPlayers();
  }, []);

  // ─── FETCH SEASON TOTALS (unchanged logic) ───
  useEffect(() => {
    const fetchSeasonTotals = async () => {
      if (players.length === 0) return;
      const playerIds = players.map((p) => p.id);

      const [matchPlayersResult, manualStatsResult] = await Promise.allSettled([
        supabase.from("match_players").select(`player_id, started, entered_minute, exited_minute, minutes_played, match:matches!inner (id, season_year, status, competition_id, added_time_first_half, added_time_second_half)`).in("player_id", playerIds).eq("is_removed", false).eq("match.season_year", selectedYear).eq("match.status", "applied"),
        supabase.from("player_stats").select("player_id, season_year, competition_id, matches, minutes").in("player_id", playerIds).eq("season_year", selectedYear),
      ]);

      const matchPlayersData = matchPlayersResult.status === "fulfilled" ? matchPlayersResult.value.data : null;
      const manualStatsData = manualStatsResult.status === "fulfilled" ? manualStatsResult.value.data : null;

      const liveByPlayerComp = new Map<string, Map<string, { minutes: number; matches: number }>>();
      (matchPlayersData || []).forEach((mp: any) => {
        const compKey = mp.match?.competition_id ?? "none";
        const addedTime1H = mp.match?.added_time_first_half ?? 0;
        const addedTime2H = mp.match?.added_time_second_half ?? 0;
        let minutes: number;
        if (mp.started || mp.entered_minute !== null) {
          const info = calculateMinutesPlayed({ started: mp.started ?? false, entered_minute: mp.entered_minute, exited_minute: mp.exited_minute, minutes_played: null }, { baseDuration: STANDARD_MATCH_DURATION, addedTime1H, addedTime2H });
          minutes = info.minutesPlayed;
        } else {
          minutes = Math.min(mp.minutes_played ?? 0, STANDARD_MATCH_DURATION);
        }
        const perPlayer = liveByPlayerComp.get(mp.player_id) || new Map();
        const current = perPlayer.get(compKey) || { minutes: 0, matches: 0 };
        perPlayer.set(compKey, { minutes: current.minutes + minutes, matches: current.matches + 1 });
        liveByPlayerComp.set(mp.player_id, perPlayer);
      });

      const manualByPlayerComp = new Map<string, Map<string, { minutes: number; matches: number }>>();
      (manualStatsData || []).forEach((s: any) => {
        const compKey = s.competition_id ?? "none";
        const perPlayer = manualByPlayerComp.get(s.player_id) || new Map();
        const current = perPlayer.get(compKey) || { minutes: 0, matches: 0 };
        perPlayer.set(compKey, { minutes: current.minutes + (s.minutes ?? 0), matches: current.matches + (s.matches ?? 0) });
        manualByPlayerComp.set(s.player_id, perPlayer);
      });

      const ratingsMap = new Map<string, number[]>();
      if (matchPlayersData && matchPlayersData.length > 0) {
        const matchIds = [...new Set((matchPlayersData || []).map((mp: any) => mp.match?.id).filter(Boolean))];
        const { data: matchStatsData } = await supabase.from("match_player_stats").select("*").in("player_id", playerIds).in("match_id", matchIds as string[]);
        const statsLookup = new Map<string, any>();
        (matchStatsData || []).forEach((stat: any) => statsLookup.set(`${stat.player_id}-${stat.match_id}`, stat));
        const playerPositionMap = new Map<string, string>();
        players.forEach((p) => playerPositionMap.set(p.id, p.position?.toLowerCase() || ""));

        (matchPlayersData || []).forEach((mp: any) => {
          const addedTime1H = mp.match?.added_time_first_half ?? 0;
          const addedTime2H = mp.match?.added_time_second_half ?? 0;
          let officialMinutes: number;
          if (mp.started || mp.entered_minute !== null) {
            const info = calculateMinutesPlayed({ started: mp.started ?? false, entered_minute: mp.entered_minute, exited_minute: mp.exited_minute, minutes_played: null }, { baseDuration: STANDARD_MATCH_DURATION, addedTime1H, addedTime2H });
            officialMinutes = info.minutesPlayed;
          } else {
            officialMinutes = Math.min(mp.minutes_played ?? 0, STANDARD_MATCH_DURATION);
          }
          if (officialMinutes <= 0) return;
          const matchId = mp.match?.id;
          if (!matchId) return;
          const matchStats = statsLookup.get(`${mp.player_id}-${matchId}`);
          if (!matchStats) return;
          const position = playerPositionMap.get(mp.player_id) || "";
          const isGoalkeeper = position === "gk" || position === "goleiro" || position === "goalkeeper";
          const statsInput: PlayerStatsInput = {
            goals: matchStats.goals || 0, assists: matchStats.assists || 0, shots_on_target: matchStats.shots_on_target || 0, shots: matchStats.shots || 0,
            dribbles_success: matchStats.dribbles_success || 0, dribbles_total: matchStats.dribbles_total || 0, key_passes: matchStats.key_passes || 0,
            chances_created: matchStats.chances_created || 0, crosses_success: matchStats.crosses_success || 0, crosses_failed: matchStats.crosses_failed || 0,
            passes_completed: matchStats.passes_completed || 0, passes_total: matchStats.passes_total || 0, interceptions: matchStats.interceptions || 0,
            recoveries: matchStats.recoveries || 0, clearances: matchStats.clearances || 0, tackles: matchStats.tackles || 0,
            yellow_cards: matchStats.yellow_cards || 0, red_cards: matchStats.red_cards || 0, duels_won: matchStats.duels_won || 0,
            duels_total: matchStats.duels_total || 0, aerial_duels_won: matchStats.aerial_duels_won || 0, aerial_duels_total: matchStats.aerial_duels_total || 0,
            fouls_committed: matchStats.fouls_committed || 0, fouls_suffered: matchStats.fouls_suffered || 0, possession_lost: matchStats.possession_lost || 0,
            saves: matchStats.saves || 0, goals_conceded: matchStats.goals_conceded || 0, isGoalkeeper,
          };
          const ratingResult = calculateMatchRating(statsInput, officialMinutes);
          if (ratingResult.hasRating && ratingResult.rating !== null) {
            const current = ratingsMap.get(mp.player_id) || [];
            current.push(ratingResult.rating);
            ratingsMap.set(mp.player_id, current);
          }
        });
      }

      const statsMap = new Map<string, { minutes: number; matches: number; averageRating: number | null }>();
      playerIds.forEach((playerId) => {
        const liveComps = liveByPlayerComp.get(playerId) || new Map();
        const manualComps = manualByPlayerComp.get(playerId) || new Map();
        let minutes = 0, matches = 0;
        for (const v of liveComps.values()) { minutes += v.minutes; matches += v.matches; }
        for (const [compKey, v] of manualComps.entries()) { if (liveComps.has(compKey)) continue; minutes += v.minutes; matches += v.matches; }
        const ratings = ratingsMap.get(playerId) || [];
        const averageRating = ratings.length > 0 ? Math.round((ratings.reduce((acc, r) => acc + r, 0) / ratings.length) * 10) / 10 : null;
        statsMap.set(playerId, { minutes, matches, averageRating });
      });
      setPlayerStats(statsMap);
    };
    fetchSeasonTotals();
  }, [players, selectedYear]);

  /* ─── FILTERING & PAGINATION (unchanged) ─── */
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === "todos" || player.position.toLowerCase().includes(positionFilter);
      const matchesNationality = nationalityFilter === "todos" || player.nationality.toLowerCase() === nationalityFilter;
      return matchesSearch && matchesPosition && matchesNationality;
    });
  }, [players, searchQuery, positionFilter, nationalityFilter]);

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPlayers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPlayers, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, positionFilter, nationalityFilter]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ════════════════════════════════════════════
     RENDER — BRUTALIST DESIGN (RESPONSIVE)
     ════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: BLACK }}>
      <style>{RESPONSIVE_CSS}</style>


      {/* ━━━ S1 — HERO ━━━ */}
      <section className="hidden md:block" style={{ backgroundColor: BLACK, padding: `136px clamp(24px, 5.625vw, 72px) 64px` }}>
        <div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(72px, 8vw, 120px)", lineHeight: 0.87, color: CREAM, margin: 0 }}>
            NOSSOS<br />
            <span style={{ fontFamily: "'Basis Grotesque Pro', sans-serif", fontStyle: "italic", fontWeight: 300, color: RED }}>ATLETAS.</span>
          </h1>
        </div>
      </section>

      {/* ━━━ S2 — TOOLBAR (Sticky) ━━━ */}
      <section className="sticky top-[52px] md:top-0 z-40" style={{ backgroundColor: BLACK, padding: "36px clamp(24px, 5.625vw, 72px) 16px", borderBottom: `1px solid ${BORDER_DARK}` }}>
        {/* Filters Grid */}
        <div className="pl-toolbar-filters">
          {/* Search */}
          <div className="flex items-center gap-3" style={{ backgroundColor: BLACK, padding: "0 20px", borderRight: `1px solid ${BORDER_DARK}` }}>
            <Search style={{ width: 14, height: 14, color: "rgba(242,237,228,0.6)", flexShrink: 0, strokeWidth: 1.5 }} />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontFamily: BODY, fontWeight: 300, fontSize: 14, color: CREAM, background: "transparent", border: "none", outline: "none", width: "100%", padding: "14px 0" }}
              className="placeholder:text-[rgba(242,237,228,0.55)]"
            />
          </div>

          {/* Position Filter */}
          <div className="relative flex items-center" style={{ backgroundColor: BLACK, padding: "0 16px", borderRight: `1px solid ${BORDER_DARK}` }}>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              style={{
                fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase",
                letterSpacing: "0.1em", background: "transparent", border: "none", outline: "none",
                appearance: "none", WebkitAppearance: "none", width: "100%", cursor: "pointer",
                padding: "14px 0",
              }}
            >
              {positions.map((pos) => (
                <option key={pos} value={pos.toLowerCase()} style={{ background: BLACK, color: CREAM }}>{pos}</option>
              ))}
            </select>
            <span style={{ fontFamily: MONO, fontSize: 12, color: WHITE_MUTED, pointerEvents: "none", flexShrink: 0 }}>↓</span>
          </div>

          {/* Nationality Filter */}
          <div className="pl-nationality-filter relative flex items-center" style={{ backgroundColor: BLACK, padding: "0 16px" }}>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              style={{
                fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase",
                letterSpacing: "0.1em", background: "transparent", border: "none", outline: "none",
                appearance: "none", WebkitAppearance: "none", width: "100%", cursor: "pointer",
                padding: "14px 0",
              }}
            >
              {nationalities.map((nat) => (
                <option key={nat} value={nat.toLowerCase()} style={{ background: BLACK, color: CREAM }}>{nat}</option>
              ))}
            </select>
            <span style={{ fontFamily: MONO, fontSize: 12, color: WHITE_MUTED, pointerEvents: "none", flexShrink: 0 }}>↓</span>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pl-toolbar-bottom">
          {/* Left: count + year — desktop only */}
          <div className="pl-toolbar-bottom-left hidden md:flex" style={{ alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {filteredPlayers.length} ATLETAS NO PORTFÓLIO
            </span>
            <div className="relative flex items-center" style={{ borderBottom: `1px solid ${CREAM}`, paddingBottom: 2 }}>
              <select
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  fontFamily: MONO, fontSize: 10, color: CREAM, textTransform: "uppercase",
                  background: "transparent", border: "none", outline: "none",
                  appearance: "none", WebkitAppearance: "none", cursor: "pointer",
                  paddingRight: 16,
                }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={String(year)} style={{ background: BLACK, color: CREAM }}>{year}</option>
                ))}
              </select>
              <span style={{ fontFamily: MONO, fontSize: 11, color: CREAM, pointerEvents: "none", position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>↓</span>
            </div>
          </div>

          {/* Right: Scouting Toggle — desktop only */}
          <div className="pl-toggle-row hidden md:flex">
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              NORMAL
            </span>
             <button
               onClick={() => setScoutingMode(!scoutingMode)}
               style={{
                 width: 36, height: 20, flexShrink: 0,
                 backgroundColor: scoutingMode ? RED : BORDER_DARK,
                 position: "relative",
                 cursor: "pointer",
                 border: "none",
                 borderRadius: 0,
                 transition: "background-color 0.2s",
                 outline: "none",
                 display: "flex",
                 alignItems: "center",
               }}
            >
              <div style={{
                width: 14, height: 14,
                backgroundColor: CREAM,
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                left: scoutingMode ? 19 : 3,
                transition: "left 0.2s",
                borderRadius: 0,
              }} />
            </button>
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              MODO SCOUTING
            </span>
          </div>
        </div>
      </section>

      {/* ━━━ S3 — CONTENT ━━━ */}
      <section style={{ backgroundColor: BLACK, padding: "48px clamp(24px, 5.625vw, 72px) 96px" }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: "128px 0" }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: WHITE_MUTED }} />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div style={{ padding: "128px 0", textAlign: "center" }}>
            <p style={{ fontFamily: MONO, fontSize: 12, color: WHITE_MUTED }}>Nenhum atleta encontrado.</p>
          </div>
        ) : !scoutingMode ? (
          /* ━━━ S3A — MODO NORMAL (Grid) ━━━ */
          <div>
            <span className="hidden md:block" style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 24 }}>
              // TALENTOS MONITORADOS
            </span>
            <div className="pl-card-grid">
              {safeArray(paginatedPlayers).map((player, index) => {
                const href = `/players/${player.slug}`;
                const imgUrl = getOptimizedImageUrl(player.photo_url, { width: 1200, quality: 85, format: "avif" }) || "/placeholder.svg";
                const imgSrcSet = getResponsiveSrcSet(player.photo_url, [400, 800, 1200, 1600], 85);
                const posColors = getPositionColor(player.position);
                const cardNum = String(index + 1 + (currentPage - 1) * itemsPerPage).padStart(2, "0");

                return (
                  <Link key={player.id} to={href} className="group block" style={{ backgroundColor: BLACK }}>
                    <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      <img
                        src={imgUrl}
                        srcSet={imgSrcSet || undefined}
                        sizes={ATHLETE_CARD_SIZES}
                        alt={player.full_name}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : undefined}
                        decoding="async"
                        width={900}
                        height={1200}
                        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500"
                        style={{ filter: "grayscale(10%)", willChange: "transform" }}
                        onMouseOver={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1.03)"; (e.target as HTMLImageElement).style.filter = "grayscale(0%)"; }}
                        onMouseOut={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1)"; (e.target as HTMLImageElement).style.filter = "grayscale(10%)"; }}
                        onError={(e) => { if (player.photo_url) (e.target as HTMLImageElement).src = player.photo_url; }}
                      />

                      {/* Top overlay */}
                      <div className="absolute top-0 left-0 right-0 flex items-start justify-between" style={{ padding: "20px 20px 0", zIndex: 2 }}>
                        <div
                          className="hidden md:flex items-center gap-2"
                          style={{
                            fontFamily: MONO, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                            color: CREAM,
                            padding: "6px 12px",
                            background: "rgba(255,255,255,0.10)",
                            backdropFilter: "blur(10px)",
                            WebkitBackdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.18)",
                            borderRadius: 999,
                          }}
                        >
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#ec4525", flexShrink: 0 }} />
                          {player.position}
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.6)", zIndex: 2 }}>/{cardNum}</span>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0" style={{ background: "linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.92) 35%, rgba(10,10,10,0.6) 55%, transparent 75%)", padding: "64px 16px 16px" }}>
                        <h3 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(18px, 3vw, 24px)", color: "#fff", textTransform: "uppercase", lineHeight: 0.9, marginBottom: 8 }}>
                          {player.full_name}
                        </h3>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: "#fff", display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                          {player.age && <span>{player.age} anos</span>}
                          <span>· {player.nationality}</span>
                          {player.current_club && <span>· {player.current_club}</span>}
                        </div>
                        <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: CREAM, textTransform: "uppercase", borderBottom: `1px solid ${RED}`, paddingBottom: 2, gap: 8, marginTop: 10, width: "fit-content" }}>
                          VER PERFIL <ArrowRight style={{ width: 14, height: 14, color: RED }} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* ━━━ S3B — MODO SCOUTING (List) — desktop only ━━━ */
          <div className="hidden md:block">
            <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 24 }}>
              // DADOS PRONTOS PARA DECISÃO
            </span>
            <div style={{ borderBottom: `1px solid ${BORDER_DARK}` }}>
              {safeArray(paginatedPlayers).map((player, index) => {
                const href = `/players/${player.slug}`;
                const imgUrl = getOptimizedImageUrl(player.photo_url, { width: 800, quality: 85, format: "avif" }) || "/placeholder.svg";
                const posColors = getPositionColor(player.position);
                const stats = playerStats.get(player.id);
                const physical = getPhysicalLabel(player.physical_status);
                const rating = stats?.averageRating;

                return (
                  <Link key={player.id} to={href} className="group block">
                    <div style={{ display: "flex", borderTop: `1px solid ${BORDER_DARK}` }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                    >
                      {/* Left accent bar */}
                      <div style={{ width: 4, background: `hsl(${posColors.color})`, flexShrink: 0 }} />

                      {/* Row content */}
                      <div className="pl-scout-row-inner">
                        {/* COL 1: Photo + Identity */}
                        <div className="pl-scout-col1">
                          <div className="pl-scout-photo" style={{ position: "relative" }}>
                            <img
                              src={imgUrl}
                              alt={player.full_name}
                              loading={index === 0 ? "eager" : "lazy"}
                              fetchPriority={index === 0 ? "high" : undefined}
                              decoding="async"
                              width={800}
                              height={1067}
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{ objectPosition: "center top", filter: "grayscale(15%)", transition: "filter 0.3s" }}
                            />
                          </div>
                          <div className="flex flex-col justify-start" style={{ minWidth: 0 }}>
                            <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: CREAM, textTransform: "uppercase", lineHeight: 1.15, marginBottom: 4 }}>
                              {player.full_name}
                            </h3>
                            <div style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                              {player.age && <span>{player.age} anos</span>}
                              <span>· {player.nationality}</span>
                            </div>
                            {player.current_club && (
                              <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(242,237,228,0.22)", marginTop: 2 }}>{player.current_club}</span>
                            )}
                          </div>
                        </div>

                        {/* COL 2: Tags + Stats */}
                        <div className="pl-scout-col2">
                          {/* Tags */}
                          <div className="pl-scout-tags">
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              fontFamily: MONO, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                              color: CREAM,
                              padding: "5px 10px",
                              background: "rgba(255,255,255,0.10)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              border: "1px solid rgba(255,255,255,0.18)",
                              borderRadius: 999,
                            }}>
                              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ec4525", flexShrink: 0, display: "inline-block" }} />
                              {player.position}
                            </span>
                            {player.dominant_foot && (
                              <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, border: `1px solid ${BORDER_DARK}`, padding: "3px 8px", textTransform: "uppercase" }}>
                                Pé: {player.dominant_foot === "right" ? "Direito" : player.dominant_foot === "left" ? "Esquerdo" : player.dominant_foot}
                              </span>
                            )}
                            {player.height && (
                              <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, border: `1px solid ${BORDER_DARK}`, padding: "3px 8px", textTransform: "uppercase" }}>
                                {(player.height / 100).toFixed(2).replace(".", ",")}M
                              </span>
                            )}
                            <span style={{ fontFamily: MONO, fontSize: 9, color: physical.color, border: `1px solid ${physical.color}4D`, padding: "3px 8px", textTransform: "uppercase" }}>
                              Físico: {physical.label}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="pl-scout-stats">
                            <div className="pl-scout-stat-cell">
                              <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.45, textTransform: "uppercase", display: "block", marginBottom: 2, letterSpacing: "0.05em" }}>Nota</span>
                              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{rating != null ? rating.toFixed(1) : "—"}</span>
                            </div>
                            <div className="pl-scout-stat-cell">
                              <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.45, textTransform: "uppercase", display: "block", marginBottom: 2, letterSpacing: "0.05em" }}>Jogos</span>
                              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{stats?.matches ?? 0}</span>
                            </div>
                            <div className="pl-scout-stat-cell">
                              <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.45, textTransform: "uppercase", display: "block", marginBottom: 2, letterSpacing: "0.05em" }}>Min.</span>
                              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{formatMinutesK(stats?.minutes)}</span>
                            </div>
                            {player.play_style && (
                              <div className="pl-scout-stat-cell">
                                <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.45, textTransform: "uppercase", display: "block", marginBottom: 2, letterSpacing: "0.05em" }}>Estilo</span>
                                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: CREAM }}>{player.play_style}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COL 3: CTA */}
                        <div className="pl-scout-col3">
                          <span
                            className="flex items-center transition-all duration-200"
                            style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: CREAM, textTransform: "uppercase", borderBottom: `1px solid ${RED}`, paddingBottom: 2, gap: 8 }}
                            onMouseOver={(e) => { (e.currentTarget as HTMLSpanElement).style.gap = "14px"; }}
                            onMouseOut={(e) => { (e.currentTarget as HTMLSpanElement).style.gap = "8px"; }}
                          >
                            VER PERFIL <ArrowRight style={{ width: 14, height: 14, color: RED }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ━━━ PAGINATION ━━━ */}
        {!loading && totalPages > 1 && (
          <div className="pl-pagination">
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED }}>
              {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredPlayers.length)} de {filteredPlayers.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ width: 32, height: 32, border: `1px solid ${BORDER_DARK}`, background: "transparent", color: CREAM, cursor: "pointer", opacity: currentPage === 1 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => goToPage(page)} style={{ width: 32, height: 32, border: `1px solid ${currentPage === page ? CREAM : BORDER_DARK}`, background: currentPage === page ? CREAM : "transparent", color: currentPage === page ? BLACK : CREAM, cursor: "pointer", fontFamily: MONO, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {page}
                </button>
              ))}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ width: 32, height: 32, border: `1px solid ${BORDER_DARK}`, background: "transparent", color: CREAM, cursor: "pointer", opacity: currentPage === totalPages ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Players;
