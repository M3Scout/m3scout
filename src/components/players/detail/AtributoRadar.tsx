import { useEffect, useState } from "react";
import { fetchPlayerAllAttributeScores, type AttributeScoresData } from "@/lib/attributeScores";

const CX = 115;
const CY = 130;
const R  = 86;
const LABEL_R = R + 20;

const ACCENT = "#E5173F";
const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";
const TEXT   = "#F2EDE4";

const AXES = [
  { key: "ata_score_100", label: "ATA", angleDeg: -90 },
  { key: "tec_score_100", label: "TEC", angleDeg: -18 },
  { key: "tat_score_100", label: "TAT", angleDeg:  54 },
  { key: "def_score_100", label: "DEF", angleDeg: 126 },
  { key: "cri_score_100", label: "CRI", angleDeg: 198 },
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

interface AtributoRadarProps {
  playerId: string;
}

export function AtributoRadar({ playerId }: AtributoRadarProps) {
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchPlayerAllAttributeScores(playerId).then((rows: AttributeScoresData[]) => {
      if (!rows.length) { setLoaded(true); return; }

      let sumAta = 0, sumTec = 0, sumTat = 0, sumDef = 0, sumCri = 0;
      let totalMinutes = 0;

      rows.forEach(r => {
        const mins = (r.details?.minutes ?? 60);
        sumAta += (r.ata_score_100 ?? 0) * mins;
        sumTec += (r.tec_score_100 ?? 0) * mins;
        sumTat += (r.tat_score_100 ?? 0) * mins;
        sumDef += (r.def_score_100 ?? 0) * mins;
        sumCri += (r.cri_score_100 ?? 0) * mins;
        totalMinutes += mins;
      });

      const div = totalMinutes || 1;
      setScores([sumAta / div, sumTec / div, sumTat / div, sumDef / div, sumCri / div]);
      setLoaded(true);
    });
  }, [playerId]);

  return (
    <svg viewBox="0 0 230 270" className="w-full" style={{ maxHeight: 280 }}>
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

      {/* Data polygon */}
      {loaded && (
        <path d={polygonPath(scores)} fill="rgba(229,23,63,0.18)" stroke={ACCENT} strokeWidth="1.5" />
      )}

      {/* Vertex dots */}
      {loaded && AXES.map((a, i) => {
        const r = ((scores[i] ?? 0) / 100) * R;
        const { x, y } = pt(r, a.angleDeg);
        return <circle key={`dot-${a.key}`} cx={x.toFixed(2)} cy={y.toFixed(2)} r="3" fill={ACCENT} />;
      })}

      {/* Axis labels + values — entirely outside the polygon */}
      {AXES.map((a, i) => {
        const { x, y } = pt(LABEL_R, a.angleDeg);
        return (
          <text key={`lv-${a.key}`} textAnchor="middle">
            <tspan
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              fontSize="10"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="400"
              fill={MUTED}
              letterSpacing="1"
            >
              {a.label}
            </tspan>
            <tspan
              x={x.toFixed(2)}
              dy="13"
              fontSize="18"
              fontFamily="Barlow Condensed, sans-serif"
              fontWeight="900"
              fill={TEXT}
            >
              {loaded ? String(Math.round(scores[i])) : "—"}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
