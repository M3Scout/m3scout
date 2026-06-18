import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchPlayerAllAttributeScores, recalculatePlayerAllAttributes, type AttributeScoresData } from "@/lib/attributeScores";
import { recalculatePlayerScores } from "@/lib/recalculatePlayerScores";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const RED_BADGE   = "#ec4525";

// ── SVG geometry (same as AtributoRadar) ──────────────────────────────────────
const CX      = 140;
const CY      = 155;
const R       = 86;
const LABEL_R = 112;
const VIEW_W  = 280;
const VIEW_H  = 300;
const BORDER  = "#1C1C1C";

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

function getScoreColor(score: number): string {
  if (score >= 80) return "#06b6d4";
  if (score >= 70) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 50) return "#ef4444";
  return "#6b7280";
}

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
      className="font-editorial-mono text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg transition-colors"
      style={active ? activeStyle : inactiveStyle}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface AthleteRadarCardProps {
  athleteId: string;
  athletePosition: string;
}

export function AthleteRadarCard({ athleteId }: AthleteRadarCardProps) {
  const [allRows, setAllRows]             = useState<AttributeScoresData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear]   = useState<number | null>(null);
  const [compareYear, setCompareYear]     = useState<number | null>(null);
  const [scores, setScores]               = useState<number[]>([0, 0, 0, 0, 0]);
  const [compareScores, setCompareScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loaded, setLoaded]               = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const applyRows = (rows: AttributeScoresData[]) => {
    setAllRows(rows);
    const years = [...new Set(
      rows.filter(r => (r.season_year ?? 0) > 0).map(r => r.season_year as number),
    )].sort((a, b) => b - a);
    setAvailableYears(years);
    setSelectedYear(prev => prev ?? (years[0] ?? null));
    setLoaded(true);
  };

  const loadScores = async () => {
    const rows = await fetchPlayerAllAttributeScores(athleteId);
    if (!rows.length) {
      try {
        await recalculatePlayerAllAttributes(athleteId);
        const fresh = await fetchPlayerAllAttributeScores(athleteId);
        applyRows(fresh);
      } catch {
        setLoaded(true);
      }
      return;
    }
    const hasOldEngine = rows.some(r => {
      const v = (r.details as any)?.engine_version ?? "";
      return !v.startsWith("v25");
    });
    if (hasOldEngine) {
      try {
        const years = [...new Set(rows.map(r => r.season_year as number))];
        await Promise.all(years.map(yr => recalculatePlayerScores(athleteId, yr)));
        const fresh = await fetchPlayerAllAttributeScores(athleteId);
        applyRows(fresh.length ? fresh : rows);
      } catch {
        applyRows(rows);
      }
      return;
    }
    applyRows(rows);
  };

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    try {
      if (selectedYear) {
        await recalculatePlayerScores(athleteId, selectedYear);
      } else {
        await recalculatePlayerAllAttributes(athleteId);
      }
      const fresh = await fetchPlayerAllAttributeScores(athleteId);
      applyRows(fresh);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => { loadScores(); }, [athleteId]);

  // Recompute scores on selection change
  useEffect(() => {
    if (!allRows.length) return;
    const year = selectedYear ?? Math.max(...allRows.map(r => r.season_year ?? 0));
    setScores(aggregateScores(allRows.filter(r => r.season_year === year)));
    setCompareScores(
      compareYear !== null
        ? aggregateScores(allRows.filter(r => r.season_year === compareYear))
        : [0, 0, 0, 0, 0],
    );
  }, [allRows, selectedYear, compareYear]);

  const isComparing = compareYear !== null;

  const labelPositions = AXES.map(a => {
    const { x, y } = pt(LABEL_R, a.angleDeg);
    return { left: (x / VIEW_W) * 100, top: (y / VIEW_H) * 100 };
  });

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col flex-1"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: CARD_BORDER }}
      >
        <span
          className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
          style={{ color: MUTED }}
        >
          Atributos
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Recalcular atributos"
            type="button"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-zinc-800/60 transition-colors disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-zinc-800/60 transition-colors"
                style={{ color: MUTED }}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" className="max-w-[230px] text-xs leading-relaxed p-3">
              <p className="font-semibold mb-1.5">Eixos do Radar</p>
              <p className="mb-0.5"><span className="font-medium">ATA</span> — Capacidade ofensiva: gols, chutes e pênaltis</p>
              <p className="mb-0.5"><span className="font-medium">CRI</span> — Criação de chances, cruzamentos e passes decisivos</p>
              <p className="mb-0.5"><span className="font-medium">TEC</span> — Passes certos, dribles e controle de bola</p>
              <p className="mb-0.5"><span className="font-medium">DEF</span> — Desarmes, interceptações e cortes defensivos</p>
              <p className="mb-0.5"><span className="font-medium">TAT</span> — Duelos ganhos, recuperações e disciplina</p>
              <p className="mt-1.5 text-muted-foreground">Todos os índices calculados por 90 min jogados.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Season pills ────────────────────────────────────────────────────── */}
      {availableYears.length > 0 && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-1">
          {availableYears.slice(0, 4).map(year => {
            const isPrimary = year === selectedYear;
            const isComp    = year === compareYear;
            return (
              <Pill
                key={year}
                label={String(year)}
                active={isPrimary || isComp}
                color={isPrimary ? "green" : "blue"}
                onClick={() => {
                  if (!isPrimary) {
                    setCompareYear(isComp ? null : year);
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Radar SVG ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 pb-2 pt-1">
        {!loaded ? (
          <div className="py-12 flex items-center justify-center w-full">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}`, maxWidth: 300 }}
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
              {isComparing && (
                <path
                  d={polygonPath(compareScores)}
                  fill="rgba(59,130,246,0.18)"
                  stroke="#2563eb"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}

              {/* Main polygon — green */}
              <path
                d={polygonPath(scores)}
                fill="rgba(34,197,94,0.20)"
                stroke="#16a34a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Attribute labels + score badges */}
            {AXES.map((a, i) => {
              const { left, top } = labelPositions[i];
              const score    = Math.round(scores[i]);
              const cmpScore = isComparing ? Math.round(compareScores[i]) : null;
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
                  <span
                    className="font-editorial-mono text-[10px] font-bold tracking-wider uppercase leading-none"
                    style={{ color: MUTED }}
                  >
                    {a.label}
                  </span>

                  {isComparing ? (
                    <div className="flex items-center gap-0.5">
                      <span
                        className="rounded px-1 py-0.5 font-editorial-mono text-[9px] font-bold text-white leading-none"
                        style={{ background: getScoreColor(score), minWidth: 20, textAlign: "center" }}
                      >
                        {score}
                      </span>
                      <span
                        className="rounded px-1 py-0.5 font-editorial-mono text-[9px] font-bold text-white leading-none"
                        style={{ background: cmpScore !== null ? getScoreColor(cmpScore) : "#6b7280", minWidth: 20, textAlign: "center" }}
                      >
                        {cmpScore ?? "—"}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="rounded px-1 py-0.5 font-editorial-mono text-[10px] font-bold text-white leading-none"
                      style={{ background: getScoreColor(score), minWidth: 22, textAlign: "center" }}
                    >
                      {score}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Legend when comparing */}
            {isComparing && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 pb-1">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: "#16a34a" }} />
                  <span className="font-editorial-mono text-[9px] font-bold" style={{ color: "#16a34a" }}>
                    {selectedYear}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: "#2563eb" }} />
                  <span className="font-editorial-mono text-[9px] font-bold" style={{ color: "#93c5fd" }}>
                    {compareYear}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t"
        style={{ borderColor: CARD_BORDER }}
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3" style={{ color: MUTED }} />
          <span className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
            Calculado das estatísticas
          </span>
        </div>
        <Link
          to={`/dashboard/atletas/${athleteId}?tab=technical`}
          className="font-editorial-mono text-[10px] transition-opacity hover:opacity-70"
          style={{ color: RED_BADGE }}
        >
          Ver detalhes →
        </Link>
      </div>
    </div>
  );
}
