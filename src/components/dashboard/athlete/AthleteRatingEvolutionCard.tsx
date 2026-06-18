import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MatchWithRating {
  id: string;
  match_date: string;
  opponent_name: string;
  team_name_display?: string | null;
  rating: number | null;
  hasRating: boolean;
}

interface AthleteRatingEvolutionCardProps {
  matches: MatchWithRating[];
  athleteId: string;
  averageRating: number | null;
  recentTrend: "up" | "down" | "stable";
}

function getMatchupLabel(teamName: string | null | undefined, opponent: string): string {
  return teamName ? `${teamName} vs ${opponent}` : `vs ${opponent}`;
}

// ── Design tokens (matches StatsTab.tsx) ──────────────────────────────────────
const MUTED      = "#62616a";
const TEXT       = "#ededee";
const CARD_BG    = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";

function getRatingColor(rating: number): string {
  if (rating >= 9.0) return "#1e3a8a";
  if (rating >= 8.0) return "#06b6d4";
  if (rating >= 7.0) return "#22c55e";
  if (rating >= 6.5) return "#eab308";
  if (rating >= 6.0) return "#f97316";
  return "#ef4444";
}

const COLOR_LEGEND = [
  { label: "< 6.0",   color: "#ef4444" },
  { label: "6.0–6.4", color: "#f97316" },
  { label: "6.5–6.9", color: "#eab308" },
  { label: "7.0–7.9", color: "#22c55e" },
  { label: "8.0–8.9", color: "#06b6d4" },
  { label: "9.0+",    color: "#1e3a8a" },
];

const RatingBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === undefined) return null;
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

export function AthleteRatingEvolutionCard({
  matches,
  averageRating,
  recentTrend,
}: AthleteRatingEvolutionCardProps) {
  const ratedMatches = useMemo(
    () => matches.filter((m) => m.hasRating && m.rating !== null),
    [matches],
  );

  const chartData = useMemo(() => {
    return [...ratedMatches]
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .map((m) => ({
        date: format(new Date(m.match_date), "dd MMM", { locale: ptBR }),
        rating: m.rating as number,
        opponent: m.opponent_name,
      }));
  }, [ratedMatches]);

  const bestRating = useMemo(() => {
    if (!ratedMatches.length) return null;
    return Math.max(...ratedMatches.map((m) => m.rating as number));
  }, [ratedMatches]);

  const TrendIcon =
    recentTrend === "up" ? TrendingUp : recentTrend === "down" ? TrendingDown : Minus;
  const trendLabel =
    recentTrend === "up" ? "+ SUBINDO" : recentTrend === "down" ? "- CAINDO" : "ESTÁVEL";
  const trendColor =
    recentTrend === "up" ? "#22c55e" : recentTrend === "down" ? "#ef4444" : MUTED;

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col flex-1"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b" style={{ borderColor: CARD_BORDER }}>
        {[
          {
            label: "MÉDIA DE NOTA",
            content: averageRating !== null ? (
              <span
                className="font-display font-bold leading-none tabular-nums"
                style={{ fontSize: 28, color: averageRating !== null ? getRatingColor(averageRating) : MUTED }}
              >
                {averageRating.toFixed(1)}
              </span>
            ) : (
              <span className="font-display font-bold leading-none" style={{ fontSize: 28, color: MUTED }}>—</span>
            ),
          },
          {
            label: "JOGOS AVALIADOS",
            content: (
              <span className="font-display font-bold leading-none tabular-nums" style={{ fontSize: 28, color: TEXT }}>
                {ratedMatches.length || "—"}
              </span>
            ),
          },
          {
            label: "MELHOR NOTA",
            content: bestRating !== null ? (
              <span
                className="font-display font-bold leading-none tabular-nums"
                style={{ fontSize: 28, color: getRatingColor(bestRating) }}
              >
                {bestRating.toFixed(1)}
              </span>
            ) : (
              <span className="font-display font-bold leading-none" style={{ fontSize: 28, color: MUTED }}>—</span>
            ),
          },
          {
            label: "TENDÊNCIA",
            content: (
              <div className="flex items-center gap-1.5 mt-0.5">
                <TrendIcon className="w-5 h-5 flex-shrink-0" style={{ color: trendColor }} />
                <span
                  className="font-editorial-mono text-[11px] font-bold tracking-[0.08em]"
                  style={{ color: trendColor }}
                >
                  {trendLabel}
                </span>
              </div>
            ),
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="px-3 py-3 sm:px-4 sm:py-4"
            style={{ borderColor: CARD_BORDER }}
          >
            <span
              className="block font-editorial-mono text-[8.5px] sm:text-[9.5px] tracking-[0.18em] sm:tracking-[0.22em] uppercase mb-1 sm:mb-1.5"
              style={{ color: MUTED }}
            >
              {kpi.label}
            </span>
            {kpi.content}
          </div>
        ))}
      </div>

      {/* ── Chart Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CARD_BORDER }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
            style={{ color: MUTED }}
          >
            EVOLUÇÃO DAS NOTAS M3
          </span>
          {averageRating !== null && (
            <span
              className="font-editorial-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: getRatingColor(averageRating), color: "#fff" }}
            >
              {averageRating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3">
          {COLOR_LEGEND.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} />
              <span className="font-editorial-mono text-[9px]" style={{ color: MUTED }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bar Chart ────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        {chartData.length < 2 ? (
          <div className="py-10 flex items-center justify-center">
            <span
              className="font-editorial-mono text-[11px] tracking-wider uppercase"
              style={{ color: MUTED }}
            >
              Sem partidas avaliadas
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="date"
                tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: MUTED }}
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
                    <div
                      className="font-editorial-mono rounded-lg"
                      style={{
                        background: CARD_BG,
                        border: `1px solid ${CARD_BORDER}`,
                        padding: "5px 10px",
                        fontSize: 10,
                        fontWeight: "bold",
                        color: getRatingColor(val),
                      }}
                    >
                      {val.toFixed(1)}{" "}
                      <span style={{ color: MUTED, fontWeight: "normal" }}>vs {opp}</span>
                    </div>
                  );
                }}
              />
              {averageRating !== null && (
                <ReferenceLine
                  y={averageRating}
                  stroke={getRatingColor(averageRating)}
                  strokeDasharray="5 5"
                  strokeWidth={1}
                />
              )}
              <Bar
                dataKey="rating"
                radius={[4, 4, 4, 4]}
                barSize={28}
                label={<RatingBarLabel />}
                isAnimationActive={false}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getRatingColor(entry.rating)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Últimos 4 jogos em grid 2×2 ──────────────────────────────────────── */}
      {ratedMatches.length > 0 && (
        <div className="px-4 pb-4">
          <p
            className="font-editorial-mono text-[9px] tracking-[0.2em] uppercase mb-2"
            style={{ color: MUTED }}
          >
            Últimos jogos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ratedMatches.slice(0, 4).map((m) => {
              const color = getRatingColor(m.rating!);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CARD_BORDER}` }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-editorial-mono text-[9px] truncate"
                      style={{ color: MUTED }}
                    >
                      {format(new Date(m.match_date), "dd MMM", { locale: ptBR })}
                    </p>
                    <p
                      className="font-editorial-mono text-[9.5px] truncate"
                      style={{ color: TEXT }}
                    >
                      {getMatchupLabel(m.team_name_display, m.opponent_name)}
                    </p>
                  </div>
                  <span
                    className="font-display font-bold text-[15px] tabular-nums ml-2 flex-shrink-0"
                    style={{ color }}
                  >
                    {m.rating!.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
