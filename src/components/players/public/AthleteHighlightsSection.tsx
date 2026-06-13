import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
  playerId?: string;
}

// 5 eixos — mesma ordem do AtributoRadar
const AXES = [
  { key: "ata", label: "Ataque" },
  { key: "tec", label: "Técnica" },
  { key: "tat", label: "Tática" },
  { key: "def", label: "Defesa" },
  { key: "cri", label: "Criatividade" },
] as const;

type AxisKey = typeof AXES[number]["key"];

function useLatestAttributeScores(playerId: string | undefined) {
  return useQuery({
    queryKey: ["public-attribute-scores", playerId],
    enabled: !!playerId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_attribute_scores")
        .select("season_year, ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, details")
        .eq("player_id", playerId!)
        .order("season_year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function buildScores(rows: any[]): { label: string; key: AxisKey; value: number }[] {
  if (!rows.length) return AXES.map(a => ({ ...a, value: 0 }));

  const latestYear = Math.max(...rows.map((r: any) => r.season_year ?? 0));
  const yearRows = rows.filter((r: any) => r.season_year === latestYear);

  // Weight by minutes
  let sumAta = 0, sumTec = 0, sumTat = 0, sumDef = 0, sumCri = 0, w = 0;
  yearRows.forEach((r: any) => {
    const mins = Math.max(Number(r.details?.minutes ?? 0), 1);
    sumAta += (r.ata_score_100 ?? 0) * mins;
    sumTec += (r.tec_score_100 ?? 0) * mins;
    sumTat += (r.tat_score_100 ?? 0) * mins;
    sumDef += (r.def_score_100 ?? 0) * mins;
    sumCri += (r.cri_score_100 ?? 0) * mins;
    w += mins;
  });
  const d = w || 1;

  const values: Record<AxisKey, number> = {
    ata: Math.round(sumAta / d),
    tec: Math.round(sumTec / d),
    tat: Math.round(sumTat / d),
    def: Math.round(sumDef / d),
    cri: Math.round(sumCri / d),
  };

  return AXES.map(a => ({ ...a, value: values[a.key] }));
}

// ── Radar SVG ──────────────────────────────────────────────────────────────
function RadarChart({
  data,
  hoveredAxis,
  onAxisEnter,
  onAxisLeave,
}: {
  data: { label: string; value: number }[];
  hoveredAxis: number | null;
  onAxisEnter: (i: number) => void;
  onAxisLeave: () => void;
}) {
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 62;
  const N = data.length;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * r,
    cy + Math.sin(angle(i)) * r,
  ];

  const valuePts = data.map((d, i) => pt(i, R * (d.value / 100)));
  const valuePoints = valuePts.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[420px] h-auto overflow-visible"
    >
      {/* Background rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const pts = data.map((_, i) => pt(i, R * f).join(",")).join(" ");
        return (
          <polygon
            key={f}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        );
      })}

      {/* Spokes */}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        );
      })}

      {/* Value polygon */}
      <polygon
        points={valuePoints}
        fill="rgba(239,68,68,0.18)"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {valuePts.map(([vx, vy], i) => (
        <circle
          key={i}
          cx={vx} cy={vy}
          r={hoveredAxis === i ? 5.5 : 3.5}
          fill="#ef4444"
          style={{ transition: "r 0.2s" }}
        />
      ))}

      {/* Axis labels */}
      {data.map((d, i) => {
        const [lx, ly] = pt(i, R + 32);
        const anchor =
          Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
        const isHot = hoveredAxis === i;

        return (
          <g
            key={i}
            onMouseEnter={() => onAxisEnter(i)}
            onMouseLeave={onAxisLeave}
            style={{ cursor: "default" }}
          >
            <circle cx={lx} cy={ly} r="30" fill="transparent" />
            <text
              x={lx} y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={isHot ? "#ec4525" : "#62616a"}
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: "11px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition: "fill 0.2s",
              }}
            >
              {d.label}
            </text>
            <text
              x={lx} y={ly + 14}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#ec4525"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: "11px",
                fontWeight: 600,
                opacity: isHot ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export function AthleteHighlightsSection({ strengths, playerId }: AthleteHighlightsSectionProps) {
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);
  const { data: rows = [] } = useLatestAttributeScores(playerId);

  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;
  const hasScores = rows.length > 0;

  if (!hasStrengths && !hasScores) return null;

  const techData = buildScores(rows);
  const hasAnyValue = techData.some(d => d.value > 0);
  if (!hasAnyValue) return null;

  return (
    <section className="py-12 md:py-20 relative border-b border-zinc-800/50" id="tecnico">

      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-11 flex-wrap">
        <div>
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">02</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Perfil Técnico
          </div>
          <h2
            className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
            style={{ fontSize: "clamp(28px,3.4vw,44px)" }}
          >
            Mapa de atributos
          </h2>
        </div>
        <p className="hidden md:block font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          Escala 0–100 · calculado por 90 min jogados.
        </p>
      </div>

      {/* Radar + List */}
      <div className="grid md:grid-cols-[420px_1fr] gap-12 items-center">

        {/* Radar */}
        <div className="flex justify-center">
          <RadarChart
            data={techData}
            hoveredAxis={hoveredAxis}
            onAxisEnter={(i) => setHoveredAxis(i)}
            onAxisLeave={() => setHoveredAxis(null)}
          />
        </div>

        {/* List sorted by value */}
        <div className="forcas flex flex-col">
          {[...techData]
            .sort((a, b) => b.value - a.value)
            .map((item, i) => {
              const axisIdx = techData.findIndex((d) => d.key === item.key);
              const isActive = hoveredAxis === axisIdx;

              return (
                <div
                  key={item.key}
                  className="forca group flex items-center gap-5 py-6 border-b border-zinc-800 first:border-t first:border-zinc-800 cursor-default pl-0 hover:pl-4 transition-all duration-[250ms]"
                  onMouseEnter={() => setHoveredAxis(axisIdx)}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <span
                    className={cn(
                      "fn font-editorial-mono text-[13px] font-semibold w-8 flex-none transition-colors duration-200",
                      isActive ? "text-[#ec4525]" : "text-zinc-600",
                      "group-hover:text-[#ec4525]"
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="ft flex-1 min-w-0">
                    <h3
                      className={cn(
                        "font-display text-xl font-bold leading-tight transition-colors duration-200",
                        isActive ? "text-[#ec4525]" : "text-[#ededee]",
                        "group-hover:text-[#ec4525]"
                      )}
                    >
                      {item.label}
                    </h3>
                  </div>

                  <span
                    className={cn(
                      "fv font-display text-3xl font-bold tabular-nums flex-none transition-colors duration-200",
                      isActive ? "text-[#ec4525]" : "text-zinc-400",
                      "group-hover:text-[#ec4525]"
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
        </div>

      </div>
    </section>
  );
}
