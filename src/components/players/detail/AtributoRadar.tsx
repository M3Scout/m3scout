import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchPlayerAllAttributeScores, type AttributeScoresData } from "@/lib/attributeScores";

// ── SVG geometry ─────────────────────────────────────────────────────────────
const CX = 140;
const CY = 155;
const R  = 86;
const LABEL_R = 112;
const VIEW_W  = 280;
const VIEW_H  = 300;

const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";

const AXES = [
  { key: "ata_score_100", label: "ATA", fullLabel: "Ataque",       angleDeg: -90  },
  { key: "tec_score_100", label: "TEC", fullLabel: "Técnica",      angleDeg: -18  },
  { key: "tat_score_100", label: "TAT", fullLabel: "Tática",       angleDeg:  54  },
  { key: "def_score_100", label: "DEF", fullLabel: "Defesa",       angleDeg: 126  },
  { key: "cri_score_100", label: "CRI", fullLabel: "Criatividade", angleDeg: 198  },
] as const;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, angleDeg: number) => ({
  x: CX + r * Math.cos(toRad(angleDeg)),
  y: CY + r * Math.sin(toRad(angleDeg)),
});

function polygonPath(scores: number[]) {
  return AXES.map((a, i) => {
    const r = ((scores[i] ?? 0) / 100) * R;
    const { x, y } = pt(r, a.angleDeg);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function gridPath(f: number) {
  return AXES.map((a, i) => {
    const { x, y } = pt(R * f, a.angleDeg);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

// ── Score color (Sofascore-style) ─────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 80) return "#06b6d4";
  if (score >= 70) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 50) return "#ef4444";
  return "#6b7280";
}

// ── Data helpers ──────────────────────────────────────────────────────────────
function aggregateScores(rows: AttributeScoresData[]): number[] {
  if (!rows.length) return [0, 0, 0, 0, 0];
  let sumAta = 0, sumTec = 0, sumTat = 0, sumDef = 0, sumCri = 0;
  let totalWeight = 0;
  rows.forEach(r => {
    const mins = Math.max(Number(r.details?.minutes ?? 0), 1);
    sumAta += (r.ata_score_100 ?? 0) * mins;
    sumTec += (r.tec_score_100 ?? 0) * mins;
    sumTat += (r.tat_score_100 ?? 0) * mins;
    sumDef += (r.def_score_100 ?? 0) * mins;
    sumCri += (r.cri_score_100 ?? 0) * mins;
    totalWeight += mins;
  });
  const div = totalWeight || 1;
  return [sumAta / div, sumTec / div, sumTat / div, sumDef / div, sumCri / div];
}

// ── Pill button ───────────────────────────────────────────────────────────────
function Pill({
  label,
  active,
  color = "green",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: "green" | "blue";
  onClick: () => void;
}) {
  const activeStyle =
    color === "blue"
      ? { color: "#93c5fd", background: "#1e3a5f", border: "1px solid #2563eb" }
      : { color: "#F2EDE4", background: "#2A2A2A", border: "1px solid #3A3A3A" };
  const inactiveStyle = { color: MUTED, background: "transparent", border: "1px solid transparent" };
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded transition-colors"
      style={active ? activeStyle : inactiveStyle}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface AtributoRadarProps {
  playerId: string;
  filterToLatestSeason?: boolean;
  showHeader?: boolean;
}

export function AtributoRadar({
  playerId,
  filterToLatestSeason,
  showHeader = true,
}: AtributoRadarProps) {
  const [allRows, setAllRows]               = useState<AttributeScoresData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear]     = useState<number | null>(null);
  const [compareYear, setCompareYear]       = useState<number | null>(null);
  const [scores, setScores]                 = useState<number[]>([0, 0, 0, 0, 0]);
  const [compareScores, setCompareScores]   = useState<number[]>([0, 0, 0, 0, 0]);
  const [loaded, setLoaded]                 = useState(false);

  // Fetch all rows once
  useEffect(() => {
    fetchPlayerAllAttributeScores(playerId).then((rows: AttributeScoresData[]) => {
      if (!rows.length) { setLoaded(true); return; }
      setAllRows(rows);
      const years = [...new Set(
        rows.filter(r => (r.season_year ?? 0) > 0).map(r => r.season_year as number)
      )].sort((a, b) => b - a);
      setAvailableYears(years);
      setSelectedYear(years[0] ?? null);
    });
  }, [playerId]);

  // Recompute scores whenever selection changes
  useEffect(() => {
    if (!allRows.length) return;
    const year = selectedYear ?? Math.max(...allRows.map(r => r.season_year ?? 0));
    const mainRows = (filterToLatestSeason || selectedYear !== null)
      ? allRows.filter(r => r.season_year === year)
      : allRows;
    setScores(aggregateScores(mainRows));

    if (compareYear !== null) {
      const cmpRows = allRows.filter(r => r.season_year === compareYear);
      setCompareScores(aggregateScores(cmpRows));
    } else {
      setCompareScores([0, 0, 0, 0, 0]);
    }

    setLoaded(true);
  }, [allRows, selectedYear, compareYear, filterToLatestSeason]);

  const showYearSelector = availableYears.length > 1;
  const isComparing      = compareYear !== null;

  // Badge label positions (percentages of SVG viewBox)
  const labelPositions = AXES.map(a => {
    const { x, y } = pt(LABEL_R, a.angleDeg);
    return { left: (x / VIEW_W) * 100, top: (y / VIEW_H) * 100 };
  });

  return (
    <div className="w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      {showHeader && (
        <div className="mb-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] tracking-[0.18em] uppercase font-bold"
              style={{ color: MUTED }}
            >
              Atributos
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center" type="button">
                  <Info className="w-3.5 h-3.5" style={{ color: MUTED }} />
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" className="max-w-[220px] text-xs leading-relaxed p-3">
                <p className="font-semibold mb-1.5">Eixos do Radar</p>
                <p className="mb-0.5"><span className="font-medium">ATA</span> — Capacidade ofensiva (gols, chutes, pênaltis)</p>
                <p className="mb-0.5"><span className="font-medium">CRI</span> — Criação de chances e cruzamentos</p>
                <p className="mb-0.5"><span className="font-medium">TEC</span> — Passes, dribles e controle de bola</p>
                <p className="mb-0.5"><span className="font-medium">DEF</span> — Desarmes, interceptações e cortes</p>
                <p className="mb-0.5"><span className="font-medium">TAT</span> — Duelos, recuperações e disciplina</p>
                <p className="mt-1.5 text-muted-foreground">Calculado por 90 min jogados.</p>
              </PopoverContent>
            </Popover>
          </div>

          {/* Year pills — primary always green, others toggle comparison */}
          {showYearSelector && (
            <div className="flex gap-1.5">
              {availableYears.map(year => {
                const isPrimary = year === selectedYear;
                return (
                  <Pill
                    key={year}
                    label={String(year)}
                    active={isPrimary || year === compareYear}
                    color={isPrimary ? "green" : "blue"}
                    onClick={() => {
                      if (!isPrimary) setCompareYear(compareYear === year ? null : year);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Radar + badges ──────────────────────────────────────────────── */}
      <div
        className="relative w-full"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full">
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(f => (
            <path key={f} d={gridPath(f)} fill="none" stroke={BORDER} strokeWidth="1" />
          ))}

          {/* Axis spokes */}
          {AXES.map(a => {
            const outer = pt(R, a.angleDeg);
            return (
              <line
                key={a.key}
                x1={CX} y1={CY}
                x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
                stroke={BORDER} strokeWidth="1"
              />
            );
          })}

          {/* Comparison polygon — blue, behind main */}
          {loaded && isComparing && (
            <path
              d={polygonPath(compareScores)}
              fill="rgba(59,130,246,0.18)"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}

          {/* Main polygon — green */}
          {loaded && (
            <path
              d={polygonPath(scores)}
              fill="rgba(34,197,94,0.20)"
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Badges HTML sobrepostos */}
        {AXES.map((a, i) => {
          const { left, top } = labelPositions[i];
          const score    = loaded ? Math.round(scores[i])        : null;
          const cmpScore = loaded && isComparing ? Math.round(compareScores[i]) : null;
          return (
            <div
              key={a.key}
              className="absolute flex flex-col items-center gap-0.5"
              style={{
                left: `${left}%`,
                top:  `${top}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Axis label */}
              <span
                className="text-[10px] font-bold tracking-wider uppercase leading-none"
                style={{ color: MUTED }}
              >
                {a.label}
              </span>

              {/* Single badge or dual badges */}
              {isComparing ? (
                <div className="flex items-center gap-0.5">
                  {/* Main score — green */}
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold text-white leading-none"
                    style={{ background: score !== null ? getScoreColor(score) : "#6b7280", minWidth: 20, textAlign: "center" }}
                  >
                    {score ?? "—"}
                  </span>
                  {/* Compare score — blue */}
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-bold text-white leading-none"
                    style={{ background: "#2563eb", minWidth: 20, textAlign: "center" }}
                  >
                    {cmpScore ?? "—"}
                  </span>
                </div>
              ) : (
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-bold text-white leading-none"
                  style={{ background: score !== null ? getScoreColor(score) : "#6b7280", minWidth: 22, textAlign: "center" }}
                >
                  {score ?? "—"}
                </span>
              )}
            </div>
          );
        })}

        {/* Legend overlay when comparing */}
        {isComparing && (
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 pb-1"
          >
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ background: "#16a34a" }} />
              <span className="text-[9px] font-bold" style={{ color: "#16a34a" }}>{selectedYear}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block rounded" style={{ background: "#2563eb" }} />
              <span className="text-[9px] font-bold" style={{ color: "#2563eb" }}>{compareYear}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
