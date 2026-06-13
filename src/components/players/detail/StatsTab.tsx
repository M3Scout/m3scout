import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import {
  usePlayerMatchStatsBySeasonCompetition,
  type SeasonCompetitionStats,
  type MatchRowPreview,
} from "@/hooks/usePlayerMatchStats";
import { useManualPlayerStats } from "@/hooks/useManualPlayerStats";
import { mergeSeasonRows } from "@/lib/mergeSeasonStats";
import type { SeasonSource } from "@/lib/mergeSeasonStats";

// ─── player_stats table row (written by PlayerStatsForm) ──────────────────────
interface PlayerStatRow {
  id: string;
  player_id: string;
  season_year: number;
  competition_id: string | null;
  competition: { id: string; name: string; display_name: string | null } | null;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  shots: number;
  shots_on_target: number;
  shots_blocked: number;
  offsides: number;
  accurate_passes: number;
  total_passes: number;
  key_passes: number;
  chances_created: number;
  crosses_success: number;
  crosses_failed: number;
  successful_dribbles: number;
  total_dribbles: number;
  penalties_won: number;
  steals: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  times_dribbled_past: number;
  long_passes_accurate: number;
  long_passes_total: number;
  duels_won: number;
  total_duels: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  ground_duels_won: number;
  ground_duels_total: number;
  fouls_committed: number;
  fouls_drawn: number;
  possession_lost: number;
  saves: number;
  goals_conceded: number;
  clean_sheets: number;
  penalties_saved: number;
  is_live_correction?: boolean | null;
}

// ─── Table header definitions ─────────────────────────────────────────────────
const TABLE_HEADERS = [
  { label: "COMPETIÇÃO", tooltip: "" },
  { label: "J",   tooltip: "Jogos" },
  { label: "MIN", tooltip: "Minutos" },
  { label: "G",   tooltip: "Gols" },
  { label: "A",   tooltip: "Assistências" },
  { label: "FIN", tooltip: "Finalizações" },
  { label: "NOG", tooltip: "No Gol (Finalizações Certas)" },
  { label: "PEN", tooltip: "Pênaltis Sofridos" },
  { label: "AM",  tooltip: "Cartões Amarelos" },
  { label: "VE",  tooltip: "Cartão Vermelho" },
  { label: "ROB", tooltip: "Roubadas de Bola" },
  { label: "DES", tooltip: "Desarmes" },
  { label: "INT", tooltip: "Interceptações" },
  { label: "",    tooltip: "" },
] as const;

// ─── Rating color (Sofascore scale) ──────────────────────────────────────────
function getMatchRatingColor(rating: number): string {
  if (rating >= 9.0) return "#1e3a8a";
  if (rating >= 8.0) return "#06b6d4";
  if (rating >= 7.0) return "#22c55e";
  if (rating >= 6.5) return "#eab308";
  if (rating >= 6.0) return "#f97316";
  return "#ef4444";
}

const RatingBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === undefined) return null;
  const color = getMatchRatingColor(value);
  return (
    <text
      x={x + width / 2}
      y={y + 14}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={9}
      fontWeight="bold"
      fill="#ffffff"
    >
      {Number(value).toFixed(1)}
    </text>
  );
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const A      = "#ec4525";
const GREEN  = "#22c55e";
const BLUE   = "#3b82f6";
const AMBER  = "#f59e0b";
const BORDER = "rgba(255,255,255,0.07)";
const BG     = "#0c0b0d";
const TEXT   = "#ededee";
const MUTED  = "#62616a";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-editorial-mono text-[9.5px] tracking-[0.22em] uppercase mb-1" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

let _sectionCounter = 0;
function SectionHead({ n, children }: { n?: string; children: React.ReactNode }) {
  return (
    <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase px-5 pt-5 pb-3" style={{ color: MUTED }}>
      {n && <><span style={{ color: A }} className="font-semibold">{n}</span><span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" /></>}
      {children}
    </div>
  );
}

function NoData({ label = "Sem dados disponíveis" }: { label?: string }) {
  return (
    <div className="py-10 flex items-center justify-center">
      <span className="font-editorial-mono text-[11px] tracking-wider uppercase" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="font-editorial-mono text-[11px] px-3 py-2 rounded-lg"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}
    >
      {label && <p style={{ color: MUTED }} className="mb-1 text-[10px]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? TEXT }}>
          {p.name ? `${p.name}: ` : ""}{typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Extended season row type with source ─────────────────────────────────────
// "mixed" is produced by mergeSeasonRows() when LIVE + MANUAL rows coexist for
// the same (year × competition). Only the public view uses merged rows.
type SeasonRowData = SeasonCompetitionStats & { source: SeasonSource };

// ─── Metric selector options for the bar chart ───────────────────────────────
const METRIC_OPTIONS = [
  { id: "ga", label: "Gols & Assistências", shortLabel: "G&A", a: "goals", b: "assists", aLabel: "Gols", bLabel: "Assist.", aColor: GREEN, bColor: BLUE },
  { id: "shots", label: "Finalizações", shortLabel: "FIN", a: "shots", b: "shots_on_target", aLabel: "FIN", bLabel: "No Gol", aColor: A, bColor: AMBER },
  { id: "defense", label: "Defensivos", shortLabel: "DEF", a: "tackles", b: "interceptions", aLabel: "DES", bLabel: "INT", aColor: BLUE, bColor: GREEN },
] as const;
type MetricId = typeof METRIC_OPTIONS[number]["id"];

// ─── Main component ───────────────────────────────────────────────────────────
interface StatsTabProps {
  playerId: string;
  playerPosition?: string;
}

export function StatsTab({ playerId, playerPosition }: StatsTabProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricId>("ga");

  // Ratings data
  const { matches: ratedMatches, averageRating, bestMatch, recentTrend, isLoading: ratingsLoading } =
    usePlayerMatchRatings({ playerId, playerPosition, enabled: !!playerId });

  // Season/competition breakdown (live data)
  const { stats: seasonStats, bySeason, seasons, matchesByKey, isLoading: statsLoading } =
    usePlayerMatchStatsBySeasonCompetition({ playerId, enabled: !!playerId });

  // Manual stats (external games not tracked via Live Match)
  const { manualStats, isLoading: manualLoading } = useManualPlayerStats({ playerId, enabled: !!playerId });

  // Stats entered via PlayerStatsForm (writes to player_stats table, different from manual_player_stats)
  const { data: playerStats = [], isLoading: psLoading } = useQuery<PlayerStatRow[]>({
    queryKey: ["player-stats", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*, competition:competitions(id, name, display_name)")
        .eq("player_id", playerId)
        .order("season_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerStatRow[];
    },
    enabled: !!playerId,
  });

  const isLoading = ratingsLoading || statsLoading || manualLoading || psLoading;

  // Merged season/competition breakdown (live + manual_player_stats + player_stats)
  const mergedBySeason = useMemo((): Record<number, SeasonRowData[]> => {
    const merged: Record<number, SeasonRowData[]> = {};
    seasons.forEach(yr => {
      merged[yr] = (bySeason[yr] ?? []).map(s => ({ ...s, source: "live" as const }));
    });
    manualStats.forEach(ms => {
      const yr = ms.season_year;
      if (!merged[yr]) merged[yr] = [];
      const comp = ms.competition;
      merged[yr].push({
        id: `manual_${ms.id}`,
        season_year: yr,
        competition_id: ms.competition_id,
        competition_name: comp?.display_name || comp?.name || null,
        source: "manual" as const,
        stats: {
          matches: ms.games,
          minutes: ms.minutes,
          goals: ms.goals,
          assists: ms.assists,
          shots: ms.shots,
          shots_on_target: ms.shots_on_target,
          shots_off_target: Math.max(0, ms.shots - ms.shots_on_target),
          shots_blocked: 0,
          shots_on_post: 0,
          offsides: 0,
          passes_completed: ms.passes_completed,
          passes_failed: ms.passes_failed,
          progressive_passes: 0,
          passes_total: ms.passes_completed + ms.passes_failed,
          key_passes: ms.key_passes,
          chances_created: ms.chances_created,
          crosses_success: 0,
          crosses_failed: 0,
          ball_actions: 0,
          dribbles_success: ms.dribbles_success,
          dribbles_failed: ms.dribbles_failed,
          dribbles_total: ms.dribbles_success + ms.dribbles_failed,
          penalties_won: 0,
          steals: 0,
          tackles: ms.tackles,
          interceptions: ms.interceptions,
          recoveries: ms.recoveries,
          clearances: ms.clearances,
          blocked_shots: 0,
          was_dribbled: 0,
          duels_won: ms.duels_won,
          duels_total: ms.duels_won + ms.duels_lost,
          aerial_duels_won: ms.aerial_duels_won,
          aerial_duels_total: ms.aerial_duels_won + ms.aerial_duels_lost,
          ground_duels_won: ms.duels_won - ms.aerial_duels_won,
          ground_duels_total: (ms.duels_won + ms.duels_lost) - (ms.aerial_duels_won + ms.aerial_duels_lost),
          yellow_cards: ms.yellow_cards,
          red_cards: ms.red_cards,
          fouls_committed: ms.fouls_committed,
          fouls_suffered: ms.fouls_suffered,
          possession_lost: 0,
          long_passes_accurate: 0,
          long_passes_failed: 0,
          long_passes_total: 0,
          saves: ms.saves,
          goals_conceded: ms.goals_conceded,
          clean_sheets: ms.clean_sheets,
          penalties_saved: ms.penalties_saved,
        },
      });
    });
    playerStats.forEach(ps => {
      const yr = ps.season_year;
      if (!merged[yr]) merged[yr] = [];
      const comp = ps.competition;
      merged[yr].push({
        id: `ps_${ps.id}`,
        season_year: yr,
        competition_id: ps.competition_id,
        competition_name: comp?.display_name || comp?.name || null,
        source: (ps.is_live_correction ? "live_correction" : "player_stats") as SeasonSource,
        stats: {
          matches: ps.matches,
          minutes: ps.minutes,
          goals: ps.goals,
          assists: ps.assists,
          shots: ps.shots,
          shots_on_target: ps.shots_on_target,
          shots_off_target: Math.max(0, ps.shots - ps.shots_on_target - ps.shots_blocked),
          shots_blocked: ps.shots_blocked,
          shots_on_post: (ps as any).shots_on_post ?? 0,
          offsides: ps.offsides,
          passes_completed: ps.accurate_passes,
          passes_failed: ps.total_passes,
          progressive_passes: (ps as any).progressive_passes ?? 0,
          passes_total: ps.accurate_passes + ps.total_passes + ((ps as any).progressive_passes ?? 0),
          key_passes: ps.key_passes,
          chances_created: ps.chances_created,
          crosses_success: ps.crosses_success,
          crosses_failed: ps.crosses_failed,
          ball_actions: 0,
          dribbles_success: ps.successful_dribbles,
          // total_dribbles stores FAILED count
          dribbles_failed: ps.total_dribbles,
          dribbles_total: ps.successful_dribbles + ps.total_dribbles,
          penalties_won: (ps as any).penalties_won ?? 0,
          steals: (ps as any).steals ?? 0,
          tackles: ps.tackles,
          interceptions: ps.interceptions,
          recoveries: ps.recoveries,
          clearances: ps.clearances,
          blocked_shots: ps.shots_blocked,
          was_dribbled: ps.times_dribbled_past,
          duels_won: ps.duels_won,
          duels_total: ps.total_duels,
          aerial_duels_won: ps.aerial_duels_won,
          // aerial/ground _total store FAILED counts — derive real total
          aerial_duels_total: ps.aerial_duels_won + ps.aerial_duels_total,
          ground_duels_won: ps.ground_duels_won,
          ground_duels_total: ps.ground_duels_won + ps.ground_duels_total,
          yellow_cards: ps.yellow_cards,
          red_cards: ps.red_cards,
          fouls_committed: ps.fouls_committed,
          fouls_suffered: ps.fouls_drawn,
          possession_lost: ps.possession_lost,
          long_passes_accurate: ps.long_passes_accurate,
          long_passes_failed: ps.long_passes_total,
          long_passes_total: ps.long_passes_accurate + ps.long_passes_total,
          saves: ps.saves,
          goals_conceded: ps.goals_conceded,
          clean_sheets: ps.clean_sheets,
          penalties_saved: ps.penalties_saved,
        },
      });
    });
    return merged;
  }, [bySeason, seasons, manualStats, playerStats]);

  const allSeasons = useMemo(() => {
    const manualYears = manualStats.map(ms => ms.season_year);
    const psYears = playerStats.map(ps => ps.season_year);
    return Array.from(new Set([...seasons, ...manualYears, ...psYears])).sort((a, b) => b - a);
  }, [seasons, manualStats, playerStats]);

  // Chart data: match ratings sorted chronologically
  const ratingChartData = useMemo(() => {
    return [...ratedMatches]
      .filter((m) => m.rating.hasRating)
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .map((m) => ({
        date: format(new Date(m.match_date), "dd MMM", { locale: ptBR }),
        rating: m.rating.rating ?? 0,
        opponent: m.opponent_name,
      }));
  }, [ratedMatches]);

  // Career totals (all seasons, live + manual_player_stats + player_stats)
  const careerTotals = useMemo(() => {
    const t = { matches: 0, minutes: 0, goals: 0, assists: 0, shots: 0, key_passes: 0, tackles: 0, yellow_cards: 0 };
    seasonStats.forEach(({ stats: s }) => {
      t.matches += s.matches;
      t.minutes += s.minutes;
      t.goals += s.goals;
      t.assists += s.assists;
      t.shots += s.shots;
      t.key_passes += s.key_passes;
      t.tackles += s.tackles;
      t.yellow_cards += s.yellow_cards;
    });
    manualStats.forEach(ms => {
      t.matches += ms.games;
      t.minutes += ms.minutes;
      t.goals += ms.goals;
      t.assists += ms.assists;
      t.shots += ms.shots;
      t.key_passes += ms.key_passes;
      t.tackles += ms.tackles;
      t.yellow_cards += ms.yellow_cards;
    });
    playerStats.forEach(ps => {
      t.matches += ps.matches;
      t.minutes += ps.minutes;
      t.goals += ps.goals;
      t.assists += ps.assists;
      t.shots += ps.shots;
      t.key_passes += ps.key_passes;
      t.tackles += ps.tackles;
      t.yellow_cards += ps.yellow_cards;
    });
    return t;
  }, [seasonStats, manualStats, playerStats]);

  // Bar chart: one entry per season, live + manual_player_stats + player_stats aggregated
  const barData = useMemo(() => {
    return allSeasons.map((yr) => {
      const agg: Record<string, number> = {
        goals: 0, assists: 0, shots: 0, shots_on_target: 0, tackles: 0, interceptions: 0,
      };
      (bySeason[yr] ?? []).forEach(({ stats: s }) => {
        agg.goals += s.goals;
        agg.assists += s.assists;
        agg.shots += s.shots;
        agg.shots_on_target += s.shots_on_target;
        agg.tackles += s.tackles;
        agg.interceptions += s.interceptions;
      });
      manualStats.filter(ms => ms.season_year === yr).forEach(ms => {
        agg.goals += ms.goals;
        agg.assists += ms.assists;
        agg.shots += ms.shots;
        agg.shots_on_target += ms.shots_on_target;
        agg.tackles += ms.tackles;
        agg.interceptions += ms.interceptions;
      });
      playerStats.filter(ps => ps.season_year === yr).forEach(ps => {
        agg.goals += ps.goals;
        agg.assists += ps.assists;
        agg.shots += ps.shots;
        agg.shots_on_target += ps.shots_on_target;
        agg.tackles += ps.tackles;
        agg.interceptions += ps.interceptions;
      });
      return { season: String(yr), ...agg };
    });
  }, [allSeasons, bySeason, manualStats, playerStats]);

  const metric = METRIC_OPTIONS.find((m) => m.id === selectedMetric)!;

  // Trend icon
  const TrendIcon = recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus;
  const trendColor = recentTrend === "up" ? GREEN : recentTrend === "down" ? A : AMBER;
  const trendLabel = recentTrend === "up" ? "↑ SUBINDO" : recentTrend === "down" ? "↓ CAINDO" : "ESTÁVEL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "MÉDIA DE NOTA",
            value: averageRating !== null ? averageRating.toFixed(1) : "—",
            color: averageRating !== null ? getMatchRatingColor(averageRating) : MUTED,
          },
          {
            label: "JOGOS AVALIADOS",
            value: ratedMatches.filter((m) => m.rating.hasRating).length || "—",
            color: TEXT,
          },
          {
            label: "MELHOR NOTA",
            value: bestMatch?.rating.rating !== null && bestMatch?.rating.rating !== undefined
              ? bestMatch.rating.rating.toFixed(1)
              : "—",
            color: bestMatch?.rating.rating !== null && bestMatch?.rating.rating !== undefined
              ? getMatchRatingColor(bestMatch.rating.rating)
              : MUTED,
          },
          {
            label: "TENDÊNCIA",
            value: <TrendIcon className="w-5 h-5" style={{ color: trendColor }} />,
            sub: trendLabel,
            color: trendColor,
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="relative rounded-xl border px-5 py-4 transition-colors duration-200 hover:bg-zinc-800/50"
            style={{ background: CARD_BG, borderColor: CARD_BORDER }}
          >
            <Label>{kpi.label}</Label>
            {"sub" in kpi ? (
              <div className="flex items-center gap-2 mt-1">
                {kpi.value}
                <span className="font-editorial-mono text-[11px] font-bold" style={{ color: kpi.color }}>
                  {kpi.sub}
                </span>
              </div>
            ) : (
              <span className="font-display font-bold leading-none tabular-nums" style={{ fontSize: 28, color: kpi.color }}>
                {kpi.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Evolução das Notas ──────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-2">
            <span className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase" style={{ color: MUTED }}>
              EVOLUÇÃO DAS NOTAS M3
            </span>
            {averageRating !== null && (
              <span
                className="font-editorial-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: getMatchRatingColor(averageRating), color: "#fff" }}
              >
                {averageRating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {[
              { label: "< 6.0",   color: "#ef4444" },
              { label: "6.0–6.4", color: "#f97316" },
              { label: "6.5–6.9", color: "#eab308" },
              { label: "7.0–7.9", color: "#22c55e" },
              { label: "8.0–8.9", color: "#06b6d4" },
              { label: "9.0+",    color: "#1e3a8a" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
                <span className="font-editorial-mono text-[9px]" style={{ color: MUTED }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          {ratingChartData.length < 2 ? (
            <NoData label="Sem partidas avaliadas" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ratingChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                  axisLine={{ stroke: CARD_BORDER }}
                  tickLine={false}
                />
                <YAxis domain={[3, 10]} hide />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={(props) => {
                    if (!props.active || !props.payload?.length) return null;
                    const val = props.payload[0].value as number;
                    const opp = (props.payload[0].payload as { opponent: string }).opponent;
                    return (
                      <div className="font-editorial-mono rounded-lg" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, padding: "5px 10px", fontSize: 10, fontWeight: "bold", color: getMatchRatingColor(val) }}>
                        {val.toFixed(1)}{" "}
                        <span style={{ color: MUTED, fontWeight: "normal" }}>vs {opp}</span>
                      </div>
                    );
                  }}
                />
                {averageRating !== null && (
                  <ReferenceLine y={averageRating} stroke={getMatchRatingColor(averageRating!)} strokeDasharray="5 5" strokeWidth={1} />
                )}
                <Bar dataKey="rating" radius={[4, 4, 4, 4]} barSize={28} label={<RatingBarLabel />} isAnimationActive={false}>
                  {ratingChartData.map((entry, i) => (
                    <Cell key={i} fill={getMatchRatingColor(entry.rating)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Resumo de Carreira ──────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <SectionHead n="01">RESUMO DE CARREIRA</SectionHead>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 px-4 pb-4">
          {[
            { label: "JOGOS",    value: careerTotals.matches,                      highlight: false },
            { label: "MINUTOS",  value: careerTotals.minutes,                      highlight: false },
            { label: "GOLS",     value: careerTotals.goals,                        highlight: true  },
            { label: "ASSIST",   value: careerTotals.assists,                      highlight: true  },
            { label: "CHUTES",   value: careerTotals.shots,                        highlight: false },
            { label: "CHANCES",  value: careerTotals.key_passes,                   highlight: false },
            { label: "DESARMES", value: careerTotals.tackles,                      highlight: false },
            { label: "AMARELOS", value: careerTotals.yellow_cards,                 highlight: false },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="relative rounded-xl border py-4 px-3 transition-colors duration-[250ms] hover:bg-zinc-800/50"
              style={stat.highlight
                ? { background: "linear-gradient(165deg, rgba(236,69,37,0.14), rgba(20,19,24,1) 70%)", borderColor: "rgba(236,69,37,0.25)" }
                : { background: "#0c0b0d", borderColor: CARD_BORDER }
              }
            >
              <span className="absolute top-2 right-2 font-editorial-mono text-[9px]" style={{ color: MUTED }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="font-display font-bold leading-[0.9] tracking-[-0.03em] tabular-nums mb-2"
                style={{ fontSize: "clamp(18px,2.5vw,28px)", color: stat.highlight ? A : TEXT }}
              >
                {typeof stat.value === "number" ? stat.value.toLocaleString("pt-BR") : stat.value}
              </div>
              <div className="font-editorial-mono text-[9px] tracking-[0.16em] uppercase" style={{ color: MUTED }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        {allSeasons.length > 0 && (
          <div className="px-5 py-2 border-t font-editorial-mono text-[10px] tracking-wider uppercase" style={{ borderColor: CARD_BORDER, color: MUTED }}>
            {allSeasons.length} temporada{allSeasons.length !== 1 ? "s" : ""}
            {" · "}
            {seasonStats.length + manualStats.length + playerStats.length} competiç{(seasonStats.length + manualStats.length + playerStats.length) !== 1 ? "ões" : "ão"}
          </div>
        )}
      </div>

      {/* ── Evolução por Temporada ──────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <span className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase" style={{ color: MUTED }}>
            EVOLUÇÃO POR TEMPORADA
          </span>
          <div className="flex gap-1 self-start md:self-auto">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedMetric(opt.id)}
                className="px-3 py-1 font-editorial-mono text-[10px] tracking-wider uppercase rounded-lg transition-colors whitespace-nowrap border"
                style={{
                  background: selectedMetric === opt.id ? A : "transparent",
                  color: selectedMetric === opt.id ? "#fff" : MUTED,
                  borderColor: selectedMetric === opt.id ? A : CARD_BORDER,
                }}
              >
                <span className="md:hidden">{opt.shortLabel}</span>
                <span className="hidden md:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {barData.length === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2}>
                <XAxis dataKey="season" tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }} axisLine={{ stroke: CARD_BORDER }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }} axisLine={{ stroke: CARD_BORDER }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={props.payload?.map((p) => ({ value: p.value as number, name: p.name as string, color: p.color as string }))}
                      label={props.label ? `Temporada ${props.label}` : undefined}
                    />
                  )}
                />
                <Bar dataKey={metric.a} name={metric.aLabel} fill={metric.aColor} maxBarSize={32} radius={[4,4,4,4]} />
                <Bar dataKey={metric.b} name={metric.bLabel} fill={metric.bColor} maxBarSize={32} radius={[4,4,4,4]} />
                <Legend wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 9, color: MUTED, paddingTop: 8 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Detalhes por Temporada ──────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <SectionHead n="02">DETALHES POR TEMPORADA</SectionHead>
        {isLoading ? (
          <NoData label="Carregando…" />
        ) : allSeasons.length === 0 ? (
          <NoData label="Sem partidas registradas" />
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[640px] font-editorial-mono text-[11px]" style={{ color: TEXT }}>
              <thead>
                <UiTooltipProvider delayDuration={0}>
                  <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    {TABLE_HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className="px-1.5 sm:px-3 py-2 text-left font-editorial-mono text-[9px] tracking-[0.18em] uppercase whitespace-nowrap"
                        style={{ color: MUTED, borderRight: i < TABLE_HEADERS.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}
                      >
                        {h.tooltip ? (
                          <UiTooltip>
                            <UiTooltipTrigger asChild>
                              <span style={{ borderBottom: `1px dotted ${MUTED}`, cursor: "default" }}>{h.label}</span>
                            </UiTooltipTrigger>
                            <UiTooltipContent
                              side="top"
                              className="font-editorial-mono text-[11px] px-2 py-1 rounded-lg"
                              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}
                            >
                              {h.tooltip}
                            </UiTooltipContent>
                          </UiTooltip>
                        ) : h.label}
                      </th>
                    ))}
                  </tr>
                </UiTooltipProvider>
              </thead>
              <tbody>
                {allSeasons.map((yr) => {
                  const rows = mergeSeasonRows(mergedBySeason[yr] ?? []);
                  const totals = rows.reduce(
                    (acc, row) => ({
                      matches:         acc.matches         + row.stats.matches,
                      minutes:         acc.minutes         + row.stats.minutes,
                      goals:           acc.goals           + row.stats.goals,
                      assists:         acc.assists         + row.stats.assists,
                      shots:           acc.shots           + row.stats.shots,
                      shots_on_target: acc.shots_on_target + row.stats.shots_on_target,
                      penalties_won:   acc.penalties_won   + (row.stats.penalties_won ?? 0),
                      yellow_cards:    acc.yellow_cards    + row.stats.yellow_cards,
                      red_cards:       acc.red_cards       + row.stats.red_cards,
                      steals:          acc.steals          + row.stats.steals,
                      tackles:         acc.tackles         + row.stats.tackles,
                      interceptions:   acc.interceptions   + row.stats.interceptions,
                    }),
                    { matches: 0, minutes: 0, goals: 0, assists: 0, shots: 0, shots_on_target: 0, penalties_won: 0, yellow_cards: 0, red_cards: 0, steals: 0, tackles: 0, interceptions: 0 }
                  );

                  const minBracket =
                    totals.minutes > 4200  ? "risk" :
                    totals.minutes >= 2500 ? "protagonist" :
                    totals.minutes >= 1200 ? "regular" : "low";

                  const minColor =
                    minBracket === "risk"        ? "#b91c1c" :
                    minBracket === "protagonist" ? "#34d399" :
                    minBracket === "regular"     ? "#fbbf24" :
                                                   "#fb7185";

                  const minTooltip =
                    minBracket === "risk"        ? "Zona de Risco. Atleta desgastado. Propensão altíssima a queda de rendimento e lesões." :
                    minBracket === "protagonist" ? "Protagonista. Titular absoluto. Dados altamente confiáveis para análise de mercado." :
                    minBracket === "regular"     ? "Jogador de elenco. Reserva imediato ou titular que perdeu metade da temporada por lesão." :
                                                   "Amostragem baixa. Dados pouco confiáveis. Ritmo de jogo prejudicado.";

                  return [
                    <tr key={`yr-${yr}`} style={{ background: "rgba(255,255,255,0.03)" }}>
                      <td
                        colSpan={14}
                        className="px-4 py-1.5 font-editorial-mono text-[10px] tracking-[0.22em] uppercase"
                        style={{ color: MUTED }}
                      >
                        {yr}
                      </td>
                    </tr>,

                    ...rows.map((row: SeasonRowData) => (
                      <SeasonRow
                        key={row.id}
                        row={row}
                        matches={row.source === "live" ? (matchesByKey[row.id] ?? []) : undefined}
                        isGoalkeeper={playerPosition === "Goleiro" || playerPosition === "GK"}
                      />
                    )),

                    ...(rows.length > 1 ? [
                      <tr key={`total-${yr}`} style={{ borderTop: `2px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.02)" }}>
                        <td className="px-3 py-2 font-editorial-mono text-[10px] tracking-[0.15em] uppercase" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>
                          TOTAL {yr}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums font-bold text-[13px]${minBracket === "risk" ? " animate-pulse" : ""}`} style={{ borderRight: `1px solid ${CARD_BORDER}`, color: minColor }}>{totals.matches}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-bold text-[13px]${minBracket === "risk" ? " animate-pulse" : ""}`} style={{ borderRight: `1px solid ${CARD_BORDER}`, color: minColor }}>
                          <UiTooltipProvider>
                            <UiTooltip>
                              <UiTooltipTrigger asChild>
                                <span style={{ borderBottom: `1px dotted ${minColor}`, cursor: "default" }}>{totals.minutes}</span>
                              </UiTooltipTrigger>
                              <UiTooltipContent side="top" className="font-editorial-mono text-[11px] px-2 py-1 max-w-[260px] text-center rounded-lg" style={{ background: CARD_BG, border: `1px solid ${minColor}`, color: TEXT }}>
                                {minTooltip}
                              </UiTooltipContent>
                            </UiTooltip>
                          </UiTooltipProvider>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: totals.goals   > 0 ? GREEN : A    }}>{totals.goals}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: totals.assists > 0 ? GREEN : A    }}>{totals.assists}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.shots}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.shots_on_target}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.penalties_won}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: totals.yellow_cards > 0 ? AMBER : MUTED }}>{totals.yellow_cards}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: totals.red_cards > 0 ? A : MUTED }}>{totals.red_cards}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.steals}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.tackles}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[13px]" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>{totals.interceptions}</td>
                        <td className="px-3 py-2" />
                      </tr>
                    ] : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat category block (expanded detail panel) ─────────────────────────────
interface StatDef {
  label: string;
  value: number;
  positive?: boolean;
  negative?: boolean;
  /** success rate: null = total is 0 (show "0%" in gray), number = (success/total)*100 */
  pct?: number | null;
}

function StatBlock({ title, titleColor, stats }: { title: string; titleColor: string; stats: StatDef[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 3, height: 14, background: titleColor, borderRadius: 2, flexShrink: 0 }} />
        <span className="font-editorial-mono text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: titleColor }}>
          {title}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {stats.map((st) => (
          <div
            key={st.label}
            className="rounded-lg px-3 py-2.5 flex flex-col gap-1"
            style={{ background: "#0c0b0d", border: `1px solid ${CARD_BORDER}` }}
          >
            <div className="flex justify-between items-center">
              <span className="font-editorial-mono text-[8.5px] tracking-[0.16em] uppercase" style={{ color: MUTED }}>
                {st.label}
              </span>
              {st.pct !== undefined && (
                <span
                  className="font-editorial-mono text-[8.5px] font-bold rounded px-1"
                  style={{
                    color:      st.pct === null ? MUTED : st.pct >= 60 ? "#34D399" : st.pct >= 50 ? "#F59E0B" : "#FB7185",
                    background: st.pct === null ? "rgba(98,97,106,0.12)" : st.pct >= 60 ? "rgba(52,211,153,0.15)" : st.pct >= 50 ? "rgba(245,158,11,0.15)" : "rgba(251,113,133,0.15)",
                    border: `1px solid ${st.pct === null ? "rgba(98,97,106,0.25)" : st.pct >= 60 ? "rgba(52,211,153,0.3)" : st.pct >= 50 ? "rgba(245,158,11,0.3)" : "rgba(251,113,133,0.3)"}`,
                  }}
                >
                  {st.pct === null ? "0%" : `${Math.round(st.pct)}%`}
                </span>
              )}
            </div>
            <span
              className="font-display font-bold leading-none tabular-nums"
              style={{
                fontSize: 18,
                color: st.positive && st.value > 0 ? "#34D399" : st.negative && st.value > 0 ? "#FB7185" : TEXT,
              }}
            >
              {st.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Season table row ─────────────────────────────────────────────────────────
function SeasonRow({ row, isGoalkeeper = false }: { row: SeasonRowData; matches?: MatchRowPreview[]; isGoalkeeper?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const s = row.stats;

  const ACC = A;
  const G   = GREEN;
  const AMB = AMBER;
  const BRD = CARD_BORDER;
  const TXT = TEXT;
  const MUT = MUTED;
  const BLU = BLUE;

  const badge =
    row.source === "manual" || row.source === "player_stats" || row.source === "live_correction"
      ? { label: "MANUAL",        shortLabel: "M",   color: BLU }
      : row.source === "mixed"
      ? { label: "LIVE + MANUAL", shortLabel: "M+L", color: AMB }
      : /* live */ { label: "LIVE", shortLabel: "L", color: G };

  const ataqueStats: StatDef[] = [
    { label: "Gols",        value: s.goals,            positive: true },
    { label: "Assistências", value: s.assists,          positive: true },
    { label: "Finalizações", value: s.shots },
    { label: "No Gol",      value: s.shots_on_target,  positive: true },
    { label: "Fora",        value: s.shots_off_target },
    { label: "Bloqueadas",  value: s.shots_blocked },
    { label: "Na Trave",    value: (s as any).shots_on_post ?? 0, positive: true },
    { label: "Pên. Sofrido", value: s.penalties_won ?? 0, positive: true },
    { label: "Impedimentos", value: s.offsides ?? 0,      negative: true },
  ];

  const passesStats: StatDef[] = [
    { label: "Certos",        value: s.passes_completed, positive: true },
    { label: "Errados",       value: s.passes_failed,    negative: true },
    { label: "Progressivos",  value: (s as any).progressive_passes ?? 0, positive: true },
    { label: "Total",         value: s.passes_total,     pct: s.passes_total > 0 ? (s.passes_completed / s.passes_total) * 100 : null },
    { label: "Decisivos",     value: s.key_passes,       positive: true },
    { label: "Chances",       value: s.chances_created,  positive: true },
    { label: "Cruz. Certos",  value: s.crosses_success,  positive: true, pct: (s.crosses_success + s.crosses_failed) > 0 ? (s.crosses_success / (s.crosses_success + s.crosses_failed)) * 100 : null },
    { label: "Cruz. Errados", value: s.crosses_failed,   negative: true },
    { label: "P.Longo ✓",     value: s.long_passes_accurate, positive: true, pct: s.long_passes_total > 0 ? (s.long_passes_accurate / s.long_passes_total) * 100 : null },
    { label: "P.Longo ✗",     value: s.long_passes_failed,   negative: true },
    { label: "P.Longo Tot.",  value: s.long_passes_total },
  ];

  const drilesStats: StatDef[] = [
    { label: "Drible ✓",   value: s.dribbles_success, positive: true, pct: s.dribbles_total > 0 ? (s.dribbles_success / s.dribbles_total) * 100 : null },
    { label: "Drible ✗",   value: s.dribbles_failed,  negative: true },
    { label: "Falta Sof.", value: s.fouls_suffered },
    { label: "Posse Perd.", value: s.possession_lost,  negative: true },
  ];

  const defesaStats: StatDef[] = [
    { label: "Roubada Bola",    value: s.steals,                                                                      positive: true },
    { label: "Desarmes",        value: s.tackles,                                                                     positive: true },
    { label: "Intercep.",       value: s.interceptions,                                                               positive: true },
    { label: "Cortes",          value: s.clearances,                                                                  positive: true },
    { label: "Recuper.",        value: s.recoveries,                                                                  positive: true },
    { label: "Chute Bloq.",     value: s.blocked_shots,                                                               positive: true },
    { label: "Dribles Sofridos", value: s.was_dribbled,                                                               negative: true },
    { label: "Duelo Chão ✓",    value: s.ground_duels_won,                                                            positive: true },
    { label: "Duelo Chão ✗",    value: Math.max(0, s.ground_duels_total - s.ground_duels_won),                        negative: true },
    { label: "Duelo Chão Tot.", value: s.ground_duels_total,                                                          pct: s.ground_duels_total > 0 ? (s.ground_duels_won / s.ground_duels_total) * 100 : null },
    { label: "Duelo Aéreo ✓",   value: s.aerial_duels_won,                                                            positive: true },
    { label: "Duelo Aéreo ✗",   value: Math.max(0, s.aerial_duels_total - s.aerial_duels_won),                        negative: true },
    { label: "Duelo Aéreo Tot.", value: s.aerial_duels_total,                                                         pct: s.aerial_duels_total > 0 ? (s.aerial_duels_won / s.aerial_duels_total) * 100 : null },
    { label: "Faltas Com.",     value: s.fouls_committed,                                                             negative: true },
    { label: "Amarelos",        value: s.yellow_cards,                                                                negative: true },
    { label: "Vermelhos",       value: s.red_cards,                                                                   negative: true },
    ...(isGoalkeeper ? [
      { label: "Defesas",      value: s.saves,                                      positive: true },
      { label: "Gols Sof.",    value: s.goals_conceded,                             negative: true },
      { label: "Clean Sheets", value: s.clean_sheets,                               positive: true },
      { label: "Pen. Salvos",  value: s.penalties_saved,                            positive: true },
    ] as StatDef[] : []),
  ];

  return (
    <>
      <tr
        className="transition-colors"
        style={{ borderBottom: `1px solid ${BRD}`, cursor: "pointer" }}
        onClick={() => setExpanded((e) => !e)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        {/* Competição */}
        <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${BRD}`, color: TXT }}>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block text-[12px] leading-none select-none"
              style={{
                color: MUT,
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 150ms",
                display: "inline-block",
              }}
            >
              ›
            </span>
            {row.competition_name ?? "—"}
          </div>
        </td>

        {/* J */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: TXT }}>
          {s.matches}
        </td>
        {/* MIN */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.minutes}
        </td>
        {/* G */}
        <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ borderRight: `1px solid ${BRD}`, color: s.goals > 0 ? G : ACC }}>
          {s.goals}
        </td>
        {/* A */}
        <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ borderRight: `1px solid ${BRD}`, color: s.assists > 0 ? G : ACC }}>
          {s.assists}
        </td>
        {/* FIN */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.shots}
        </td>
        {/* NOG */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.shots_on_target}
        </td>
        {/* PEN */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.penalties_won ?? 0}
        </td>
        {/* AM */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: s.yellow_cards > 0 ? AMB : MUT }}>
          {s.yellow_cards}
        </td>
        {/* VE */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: s.red_cards > 0 ? ACC : MUT }}>
          {s.red_cards}
        </td>
        {/* ROB */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.steals}
        </td>
        {/* DES */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.tackles}
        </td>
        {/* INT */}
        <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BRD}`, color: MUT }}>
          {s.interceptions}
        </td>
        {/* Badge */}
        <td className="px-3 py-2.5">
          <span
            className="font-editorial-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap inline-block"
            style={{ color: badge.color, border: `1px solid ${badge.color}` }}
          >
            <span className="md:hidden">{badge.shortLabel}</span>
            <span className="hidden md:inline">{badge.label}</span>
          </span>
        </td>
      </tr>

      {/* Expanded stats panel — 4 category blocks, Live and Manual */}
      {expanded && (
        <tr style={{ borderBottom: `1px solid ${BRD}` }}>
          <td colSpan={13} style={{ background: CARD_BG, padding: "20px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <StatBlock title="Ataque"          titleColor="#E5173F" stats={ataqueStats} />
              <StatBlock title="Passes"          titleColor="#F59E0B" stats={passesStats} />
              <StatBlock title="Dribles / Posse" titleColor="#3B82F6" stats={drilesStats} />
              <StatBlock title="Defesa"          titleColor="#6B9EE5" stats={defesaStats} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
