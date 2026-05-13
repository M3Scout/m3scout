import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlayerMatchRatings } from "@/hooks/usePlayerMatchRatings";
import {
  usePlayerMatchStatsBySeasonCompetition,
  type SeasonCompetitionStats,
} from "@/hooks/usePlayerMatchStats";

// ─── Design tokens ────────────────────────────────────────────────────────────
const A = "#E5173F";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const AMBER = "#F59E0B";
const BORDER = "#1C1C1C";
const BG = "#0A0A0A";
const TEXT = "#F2EDE4";
const MUTED = "#6B6560";

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-jetbrains text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 border-b font-barlow font-black text-[13px] tracking-[0.2em] uppercase"
      style={{ borderColor: BORDER, color: MUTED }}
    >
      {children}
    </div>
  );
}

function NoData({ label = "Sem dados disponíveis" }: { label?: string }) {
  return (
    <div className="py-10 flex items-center justify-center">
      <span className="font-jetbrains text-[11px] tracking-wider uppercase" style={{ color: MUTED }}>
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
      className="font-jetbrains text-[11px] px-3 py-2"
      style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
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

// ─── Metric selector options for the bar chart ───────────────────────────────
const METRIC_OPTIONS = [
  { id: "ga", label: "Gols & Assistências", a: "goals", b: "assists", aLabel: "Gols", bLabel: "Assist.", aColor: GREEN, bColor: BLUE },
  { id: "shots", label: "Finalizações", a: "shots", b: "shots_on_target", aLabel: "FIN", bLabel: "No Gol", aColor: A, bColor: AMBER },
  { id: "defense", label: "Defensivos", a: "tackles", b: "interceptions", aLabel: "DES", bLabel: "INT", aColor: BLUE, bColor: GREEN },
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

  // Season/competition breakdown
  const { stats: seasonStats, bySeason, seasons, isLoading: statsLoading } =
    usePlayerMatchStatsBySeasonCompetition({ playerId, enabled: !!playerId });

  const isLoading = ratingsLoading || statsLoading;

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

  // Career totals (all seasons combined)
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
    return t;
  }, [seasonStats]);

  // Bar chart: one entry per season, aggregated
  const barData = useMemo(() => {
    return seasons.map((yr) => {
      const rows = bySeason[yr] ?? [];
      const agg: Record<string, number> = {
        goals: 0, assists: 0, shots: 0, shots_on_target: 0, tackles: 0, interceptions: 0,
      };
      rows.forEach(({ stats: s }) => {
        agg.goals += s.goals;
        agg.assists += s.assists;
        agg.shots += s.shots;
        agg.shots_on_target += s.shots_on_target;
        agg.tackles += s.tackles;
        agg.interceptions += s.interceptions;
      });
      return { season: String(yr), ...agg };
    });
  }, [seasons, bySeason]);

  const metric = METRIC_OPTIONS.find((m) => m.id === selectedMetric)!;

  // Trend icon
  const TrendIcon = recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus;
  const trendColor = recentTrend === "up" ? GREEN : recentTrend === "down" ? A : AMBER;
  const trendLabel = recentTrend === "up" ? "↑ SUBINDO" : recentTrend === "down" ? "↓ CAINDO" : "ESTÁVEL";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="border" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            {
              label: "MÉDIA DE NOTA",
              value: averageRating !== null ? averageRating.toFixed(1) : "—",
              color: A,
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
              color: GREEN,
            },
            {
              label: "TENDÊNCIA",
              value: <TrendIcon className="w-5 h-5" style={{ color: trendColor }} />,
              sub: trendLabel,
              color: trendColor,
            },
          ].map((kpi, i, arr) => (
            <div
              key={i}
              className="px-5 py-4"
              style={{ borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : undefined }}
            >
              <Label>{kpi.label}</Label>
              {"sub" in kpi ? (
                <div className="flex items-center gap-2">
                  {kpi.value}
                  <span className="font-jetbrains text-[11px] font-bold" style={{ color: kpi.color }}>
                    {kpi.sub}
                  </span>
                </div>
              ) : (
                <span className="font-jetbrains text-[22px] font-bold leading-none" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Evolução das Notas ──────────────────────────────────────────────── */}
      <div className="border" style={{ borderColor: BORDER }}>
        <SectionHead>EVOLUÇÃO DAS NOTAS M3</SectionHead>
        <div className="p-4">
          {ratingChartData.length < 2 ? (
            <NoData label="Sem partidas avaliadas" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={ratingChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={A} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={A} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                  axisLine={{ stroke: BORDER }}
                  tickLine={false}
                />
                <YAxis
                  domain={[4, 10]}
                  ticks={[5, 6, 7, 8, 9, 10]}
                  tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                  axisLine={{ stroke: BORDER }}
                  tickLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={props.payload?.map((p) => ({
                        value: p.value as number,
                        name: "Nota",
                        color: A,
                      }))}
                      label={
                        props.active && props.payload?.[0]
                          ? `${(props.payload[0].payload as { opponent: string }).opponent} — ${props.label}`
                          : props.label
                      }
                    />
                  )}
                />
                {averageRating !== null && (
                  <ReferenceLine
                    y={averageRating}
                    stroke={MUTED}
                    strokeDasharray="4 3"
                    label={{
                      value: `Média ${averageRating.toFixed(1)}`,
                      position: "right",
                      fontFamily: "JetBrains Mono",
                      fontSize: 9,
                      fill: MUTED,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="rating"
                  stroke={A}
                  strokeWidth={1.5}
                  fill="url(#ratingGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke={A}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: A, stroke: BG, strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Resumo de Carreira ──────────────────────────────────────────────── */}
      <div className="border" style={{ borderColor: BORDER }}>
        <SectionHead>RESUMO DE CARREIRA</SectionHead>
        <div className="p-4">
          {[
            { label: "JOGOS", value: careerTotals.matches },
            { label: "MINUTOS", value: careerTotals.minutes },
            { label: "GOLS", value: careerTotals.goals, color: careerTotals.goals > 0 ? GREEN : A },
            { label: "ASSIST", value: careerTotals.assists, color: careerTotals.assists > 0 ? GREEN : A },
            { label: "CHUTES", value: careerTotals.shots },
            { label: "P.DECISIVOS", value: careerTotals.key_passes },
            { label: "DESARMES", value: careerTotals.tackles },
            { label: "AMARELOS", value: careerTotals.yellow_cards, color: careerTotals.yellow_cards > 0 ? AMBER : undefined },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              className="inline-flex flex-col items-center justify-center px-3 py-4 text-center"
              style={{
                width: `${100 / 8}%`,
                borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : undefined,
              }}
            >
              <span className="font-jetbrains text-[9px] tracking-[0.16em] uppercase mb-1.5" style={{ color: MUTED }}>
                {stat.label}
              </span>
              <span
                className="font-jetbrains text-[24px] font-bold leading-none"
                style={{ color: stat.color ?? TEXT }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
        {seasons.length > 0 && (
          <div className="px-4 py-2 border-t font-jetbrains text-[10px] tracking-wider uppercase" style={{ borderColor: BORDER, color: MUTED }}>
            {seasons.length} temporada{seasons.length !== 1 ? "s" : ""}
            {" · "}
            {seasonStats.length} competiç{seasonStats.length !== 1 ? "ões" : "ão"}
          </div>
        )}
      </div>

      {/* ── Evolução por Temporada ──────────────────────────────────────────── */}
      <div className="border" style={{ borderColor: BORDER }}>
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: BORDER }}
        >
          <span className="font-barlow font-black text-[13px] tracking-[0.2em] uppercase" style={{ color: MUTED }}>
            EVOLUÇÃO POR TEMPORADA
          </span>
          {/* Metric selector */}
          <div className="flex gap-0" style={{ border: `1px solid ${BORDER}` }}>
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedMetric(opt.id)}
                className="px-3 py-1 font-jetbrains text-[10px] tracking-wider uppercase transition-colors"
                style={{
                  background: selectedMetric === opt.id ? A : BG,
                  color: selectedMetric === opt.id ? "#fff" : MUTED,
                  borderLeft: opt.id !== "ga" ? `1px solid ${BORDER}` : undefined,
                }}
              >
                {opt.label}
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
                <XAxis
                  dataKey="season"
                  tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                  axisLine={{ stroke: BORDER }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                  axisLine={{ stroke: BORDER }}
                  tickLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      active={props.active}
                      payload={props.payload?.map((p) => ({
                        value: p.value as number,
                        name: p.name as string,
                        color: p.color as string,
                      }))}
                      label={props.label ? `Temporada ${props.label}` : undefined}
                    />
                  )}
                />
                <Bar dataKey={metric.a} name={metric.aLabel} fill={metric.aColor} maxBarSize={32} radius={0} />
                <Bar dataKey={metric.b} name={metric.bLabel} fill={metric.bColor} maxBarSize={32} radius={0} />
                <Legend
                  wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 9, color: MUTED, paddingTop: 8 }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Detalhes por Temporada ──────────────────────────────────────────── */}
      <div className="border" style={{ borderColor: BORDER }}>
        <SectionHead>DETALHES POR TEMPORADA</SectionHead>
        {isLoading ? (
          <NoData label="Carregando…" />
        ) : seasons.length === 0 ? (
          <NoData label="Sem partidas registradas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] font-jetbrains text-[11px]" style={{ color: TEXT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["COMPETIÇÃO", "J", "MIN", "G", "A", "FIN", "NOG", "AM", "VE", "DES", "INT", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-jetbrains text-[9px] tracking-[0.18em] uppercase"
                      style={{ color: MUTED, borderRight: i < 11 ? `1px solid ${BORDER}` : undefined }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasons.map((yr) => {
                  const rows = bySeason[yr] ?? [];
                  return [
                    /* Season header row */
                    <tr key={`yr-${yr}`} style={{ background: BORDER }}>
                      <td
                        colSpan={12}
                        className="px-3 py-1.5 font-barlow font-black text-[11px] tracking-[0.2em] uppercase"
                        style={{ color: MUTED }}
                      >
                        {yr}
                      </td>
                    </tr>,

                    /* Competition rows */
                    ...rows.map((row: SeasonCompetitionStats) => (
                      <SeasonRow key={row.id} row={row} />
                    )),
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

// ─── Season table row ─────────────────────────────────────────────────────────
function SeasonRow({ row }: { row: SeasonCompetitionStats }) {
  const s = row.stats;
  const A_TOKEN = "#E5173F";
  const GREEN = "#22C55E";
  const AMBER = "#F59E0B";
  const BORDER = "#1C1C1C";
  const TEXT = "#F2EDE4";
  const MUTED = "#6B6560";

  const gColor = s.goals > 0 ? GREEN : A_TOKEN;
  const aColor = s.assists > 0 ? GREEN : A_TOKEN;

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: `1px solid ${BORDER}` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#111")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {/* Competição */}
      <td className="px-3 py-2.5" style={{ borderRight: `1px solid ${BORDER}`, color: TEXT }}>
        {row.competition_name ?? "—"}
      </td>

      {/* J */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: TEXT }}>
        {s.matches}
      </td>

      {/* MIN */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: MUTED }}>
        {s.minutes}
      </td>

      {/* G */}
      <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ borderRight: `1px solid ${BORDER}`, color: gColor }}>
        {s.goals}
      </td>

      {/* A */}
      <td className="px-3 py-2.5 text-right tabular-nums font-bold" style={{ borderRight: `1px solid ${BORDER}`, color: aColor }}>
        {s.assists}
      </td>

      {/* FIN */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: MUTED }}>
        {s.shots}
      </td>

      {/* NOG (shots on target) */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: MUTED }}>
        {s.shots_on_target}
      </td>

      {/* AM */}
      <td
        className="px-3 py-2.5 text-right tabular-nums"
        style={{ borderRight: `1px solid ${BORDER}`, color: s.yellow_cards > 0 ? AMBER : MUTED }}
      >
        {s.yellow_cards}
      </td>

      {/* VE */}
      <td
        className="px-3 py-2.5 text-right tabular-nums"
        style={{ borderRight: `1px solid ${BORDER}`, color: s.red_cards > 0 ? "#E5173F" : MUTED }}
      >
        {s.red_cards}
      </td>

      {/* DES */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: MUTED }}>
        {s.tackles}
      </td>

      {/* INT */}
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ borderRight: `1px solid ${BORDER}`, color: MUTED }}>
        {s.interceptions}
      </td>

      {/* Badge */}
      <td className="px-3 py-2.5">
        <span
          className="font-jetbrains text-[9px] tracking-wider uppercase px-1.5 py-0.5"
          style={{ color: "#22C55E", border: "1px solid #22C55E" }}
        >
          LIVE
        </span>
      </td>
    </tr>
  );
}
