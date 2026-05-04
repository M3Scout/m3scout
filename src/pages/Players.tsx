import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { calculateMatchRating, type PlayerStatsInput } from "@/lib/matchRatingEngine";
import { STANDARD_MATCH_DURATION, calculateMinutesPlayed } from "@/lib/minutesPlayed";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Search, ArrowRight } from "lucide-react";
import { safeArray } from "@/lib/utils";
import { getShortPosition } from "@/lib/positionColors";

/* ─── DESIGN TOKENS ─── */
const RED = "#E5173F";
const CREAM = "#F2EDE4";
const BLACK = "#0A0A0A";
const WHITE_MUTED = "rgba(242,237,228,0.42)";
const BORDER_DARK = "rgba(242,237,228,0.1)";
const GREEN = "#2DCE8A";
const YELLOW = "#E8C84A";

const MONO = "'JetBrains Mono', monospace";
const BODY = "'Barlow', sans-serif";
const DISPLAY = "'Barlow Condensed', sans-serif";

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
  overall_rating: number | null;
  potential_rating: number | null;
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
     RENDER — NEW BRUTALIST DESIGN
     ════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: BLACK }}>

      {/* ━━━ S1 — HERO ━━━ */}
      <section style={{ backgroundColor: BLACK, padding: "72px 64px 64px", borderBottom: `1px solid ${BORDER_DARK}` }}>
        <div style={{ maxWidth: 1600 }}>
          {/* Top micro labels */}
          <div className="flex items-center gap-4 mb-8">
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: WHITE_MUTED, textTransform: "uppercase" }}>— PORTFÓLIO</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: "rgba(242,237,228,0.18)", textTransform: "uppercase" }}>· M3 AGENCY</span>
          </div>

          {/* H1 */}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(72px, 8vw, 120px)", lineHeight: 0.87, color: CREAM, margin: 0 }}>
            NOSSOS<br />
            <span style={{ fontStyle: "italic", fontWeight: 300, color: RED }}>ATLETAS.</span>
          </h1>

          {/* Body */}
          <p style={{ fontFamily: BODY, fontWeight: 300, fontSize: 16, color: WHITE_MUTED, maxWidth: 480, marginTop: 32, lineHeight: 1.6 }}>
            Curadoria, dados e contexto competitivo. Portfólio pronto para decisão.
          </p>
        </div>
      </section>

      {/* ━━━ S2 — TOOLBAR (Sticky) ━━━ */}
      <section className="sticky top-0 z-40" style={{ backgroundColor: BLACK, padding: "0 64px 16px", borderBottom: `1px solid ${BORDER_DARK}` }}>
        {/* Top Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px", gap: 1, background: "#1A1A1A" }}>
          {/* Search */}
          <div className="flex items-center gap-3" style={{ backgroundColor: BLACK, padding: "0 20px" }}>
            <Search style={{ width: 12, height: 12, color: "rgba(242,237,228,0.2)", flexShrink: 0, strokeWidth: 1.5 }} />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontFamily: BODY, fontWeight: 300, fontSize: 14, color: CREAM, background: "transparent", border: "none", outline: "none", width: "100%", padding: "14px 0" }}
              className="placeholder:text-[rgba(242,237,228,0.2)]"
            />
          </div>

          {/* Position Filter */}
          <div style={{ backgroundColor: BLACK }}>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full h-full border-0 focus:ring-0 rounded-none" style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.2em", background: "transparent", padding: "0 16px", borderRadius: 0 }}>
                <div className="flex items-center justify-between w-full">
                  <span>Posição</span>
                  <span style={{ fontSize: 14 }}>↓</span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-none" style={{ background: BLACK, border: `1px solid ${BORDER_DARK}`, borderRadius: 0 }}>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos.toLowerCase()} className="text-white/70 focus:bg-white/5 focus:text-white" style={{ fontFamily: MONO, fontSize: 11 }}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nationality Filter */}
          <div style={{ backgroundColor: BLACK }}>
            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger className="w-full h-full border-0 focus:ring-0 rounded-none" style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.2em", background: "transparent", padding: "0 16px", borderRadius: 0 }}>
                <div className="flex items-center justify-between w-full">
                  <span>Nacion.</span>
                  <span style={{ fontSize: 14 }}>↓</span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-none" style={{ background: BLACK, border: `1px solid ${BORDER_DARK}`, borderRadius: 0 }}>
                {nationalities.map((nat) => (
                  <SelectItem key={nat} value={nat.toLowerCase()} className="text-white/70 focus:bg-white/5 focus:text-white" style={{ fontFamily: MONO, fontSize: 11 }}>
                    {nat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          {/* Left: count + year */}
          <div className="flex items-center gap-4">
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {filteredPlayers.length} ATLETAS NO PORTFÓLIO
            </span>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-auto h-auto border-0 p-0 focus:ring-0 rounded-none" style={{ fontFamily: MONO, fontSize: 10, color: CREAM, textTransform: "uppercase", borderBottom: `1px solid ${CREAM}`, paddingBottom: 2, borderRadius: 0 }}>
                <SelectValue />
                <span style={{ marginLeft: 4, fontSize: 12 }}>↓</span>
              </SelectTrigger>
              <SelectContent className="border-0 rounded-none" style={{ background: BLACK, border: `1px solid ${BORDER_DARK}`, borderRadius: 0 }}>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)} className="text-white/70 focus:bg-white/5 focus:text-white" style={{ fontFamily: MONO, fontSize: 11 }}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Scouting Toggle */}
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {scoutingMode ? "Modo Scouting" : "Normal"}
            </span>
            <button
              onClick={() => setScoutingMode(!scoutingMode)}
              style={{
                width: 36, height: 20,
                backgroundColor: scoutingMode ? RED : BORDER_DARK,
                position: "relative",
                cursor: "pointer",
                border: "none",
                borderRadius: 0,
                transition: "background-color 0.2s",
                outline: "none",
              }}
            >
              <div style={{
                width: 14, height: 14,
                backgroundColor: CREAM,
                position: "absolute",
                top: 3,
                left: scoutingMode ? 19 : 3,
                transition: "left 0.2s",
                borderRadius: 0,
              }} />
            </button>
          </div>
        </div>
      </section>

      {/* ━━━ S3 — CONTENT ━━━ */}
      <section style={{ backgroundColor: BLACK, padding: "48px 64px 96px" }}>
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
            <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 24 }}>
              // TALENTOS MONITORADOS
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: BORDER_DARK }}>
              {safeArray(paginatedPlayers).map((player, index) => {
                const href = `/players/${player.slug}`;
                const imgUrl = getOptimizedImageUrl(player.photo_url, { width: 400, quality: 75 }) || "/placeholder.svg";
                const shortPos = getShortPosition(player.position);
                const dotColor = getPosDotColor(player.position);
                const cardNum = String(index + 1 + (currentPage - 1) * itemsPerPage).padStart(2, "0");

                return (
                  <Link key={player.id} to={href} className="group block" style={{ backgroundColor: BLACK }}>
                    <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      {/* Image */}
                      <img
                        src={imgUrl}
                        alt={player.full_name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-top transition-all duration-500"
                        style={{ filter: "grayscale(10%)" }}
                        onMouseOver={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1.03)"; (e.target as HTMLImageElement).style.filter = "grayscale(0%)"; }}
                        onMouseOut={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1)"; (e.target as HTMLImageElement).style.filter = "grayscale(10%)"; }}
                      />

                      {/* Top overlay */}
                      <div className="absolute top-0 left-0 right-0 flex items-start justify-between" style={{ padding: "16px 16px 0" }}>
                        {/* Position tag */}
                        <div className="flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 9, color: CREAM, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 }} />
                          {shortPos}
                        </div>
                        {/* Card number */}
                        <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(242,237,228,0.3)" }}>/{cardNum}</span>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.5) 30%, transparent 50%)", padding: "48px 16px 16px" }}>
                        <h3 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 22, color: CREAM, textTransform: "uppercase", lineHeight: 0.95, marginBottom: 6 }}>
                          {player.full_name}
                        </h3>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {player.age && <span>{player.age} anos</span>}
                          <span>{player.nationality}</span>
                          {player.current_club && <span style={{ color: "rgba(242,237,228,0.25)" }}>{player.current_club}</span>}
                        </div>
                        {/* Ver perfil link aligned left with name */}
                        <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: CREAM, borderBottom: `1px solid ${RED}`, paddingBottom: 2, gap: 8, marginTop: 10, width: "fit-content" }}>
                          Ver perfil <ArrowRight style={{ width: 14, height: 14 }} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* ━━━ S3B — MODO SCOUTING (List) ━━━ */
          <div>
            <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: 24 }}>
              // DADOS PRONTOS PARA DECISÃO
            </span>
            <div>
              {safeArray(paginatedPlayers).map((player) => {
                const href = `/players/${player.slug}`;
                const imgUrl = getOptimizedImageUrl(player.photo_url, { width: 160, quality: 75 }) || "/placeholder.svg";
                const shortPos = getShortPosition(player.position);
                const dotColor = getPosDotColor(player.position);
                const stats = playerStats.get(player.id);
                const physical = getPhysicalLabel(player.physical_status);
                const rating = stats?.averageRating;

                return (
                  <Link key={player.id} to={href} className="group block" style={{ borderBottom: `1px solid ${BORDER_DARK}` }}>
                    <div className="flex items-stretch transition-colors duration-200" style={{ minHeight: 72 }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                    >
                      {/* Left accent bar */}
                      <div style={{ width: 4, backgroundColor: dotColor, flexShrink: 0 }} />

                      {/* Col 1: Photo */}
                      <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 0, overflow: "hidden" }}>
                        <img
                          src={imgUrl}
                          alt={player.full_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          style={{ filter: "grayscale(15%)", borderRadius: 0 }}
                        />
                      </div>

                      {/* Col 2: Name/Info */}
                      <div className="flex flex-col justify-center" style={{ width: 220, flexShrink: 0, padding: "8px 16px" }}>
                        <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, color: CREAM, textTransform: "uppercase", lineHeight: 1.2, marginBottom: 2 }}>
                          {player.full_name}
                        </h3>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: WHITE_MUTED, display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
                          {player.age && <span>{player.age} anos</span>}
                          <span>{player.nationality}</span>
                        </div>
                        {player.current_club && (
                          <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(242,237,228,0.22)", marginTop: 1 }}>{player.current_club}</span>
                        )}
                      </div>

                      {/* Col 3: Data */}
                      <div className="flex-1 flex items-center gap-4 flex-wrap" style={{ padding: "8px 16px" }}>
                        {/* Tags */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, border: `1px solid ${BORDER_DARK}`, padding: "3px 8px", textTransform: "uppercase" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: dotColor }} />
                            {shortPos}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: physical.color, border: `1px solid ${BORDER_DARK}`, padding: "3px 8px", textTransform: "uppercase" }}>
                            Físico: {physical.label}
                          </span>
                          {player.play_style && (
                            <span style={{ fontFamily: MONO, fontSize: 9, color: WHITE_MUTED, border: `1px solid ${BORDER_DARK}`, padding: "3px 8px", textTransform: "uppercase" }}>
                              {player.play_style}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                          <div>
                            <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.25, textTransform: "uppercase", display: "block" }}>Nota</span>
                            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{rating != null ? rating.toFixed(1) : "—"}</span>
                          </div>
                          <div>
                            <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.25, textTransform: "uppercase", display: "block" }}>Jogos</span>
                            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{stats?.matches ?? 0}</span>
                          </div>
                          <div>
                            <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.25, textTransform: "uppercase", display: "block" }}>Min</span>
                            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: CREAM }}>{formatMinutesK(stats?.minutes)}</span>
                          </div>
                          {player.play_style && (
                            <div>
                              <span style={{ fontFamily: MONO, fontSize: 8, color: WHITE_MUTED, opacity: 0.25, textTransform: "uppercase", display: "block" }}>Estilo</span>
                              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: CREAM }}>{player.play_style}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Col 4: CTA */}
                      <div className="flex items-center" style={{ padding: "8px 24px 8px 16px", flexShrink: 0 }}>
                        <span
                          className="flex items-center transition-all duration-200"
                          style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: CREAM, borderBottom: `1px solid ${BORDER_DARK}`, paddingBottom: 2, gap: 8 }}
                          onMouseOver={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = RED; (e.currentTarget as HTMLSpanElement).style.gap = "14px"; }}
                          onMouseOut={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = BORDER_DARK; (e.currentTarget as HTMLSpanElement).style.gap = "8px"; }}
                        >
                          Ver perfil <ArrowRight style={{ width: 14, height: 14 }} />
                        </span>
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
          <div className="flex items-center justify-between" style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${BORDER_DARK}` }}>
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
