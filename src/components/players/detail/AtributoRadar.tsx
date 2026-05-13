import { useEffect, useState } from "react";
import { fetchPlayerAllAttributeScores, type AttributeScoresData } from "@/lib/attributeScores";

const CX = 100;
const CY = 105;
const R = 76;

const AXES = [
  { key: "ata_score_100", label: "ATA", angleDeg: -90 },
  { key: "tec_score_100", label: "TEC", angleDeg: -18 },
  { key: "tat_score_100", label: "TAT", angleDeg: 54 },
  { key: "def_score_100", label: "DEF", angleDeg: 126 },
  { key: "cri_score_100", label: "CRI", angleDeg: 198 },
] as const;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pt(r: number, angleDeg: number) {
  return {
    x: CX + r * Math.cos(toRad(angleDeg)),
    y: CY + r * Math.sin(toRad(angleDeg)),
  };
}

function pentagonPath(scores: number[]) {
  return AXES.map((a, i) => {
    const r = ((scores[i] ?? 0) / 100) * R;
    const { x, y } = pt(r, a.angleDeg);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function gridPath(fraction: number) {
  return AXES.map((a, i) => {
    const { x, y } = pt(R * fraction, a.angleDeg);
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

      rows.forEach((r) => {
        const mins = (r.details?.minutes ?? 60);
        sumAta += (r.ata_score_100 ?? 0) * mins;
        sumTec += (r.tec_score_100 ?? 0) * mins;
        sumTat += (r.tat_score_100 ?? 0) * mins;
        sumDef += (r.def_score_100 ?? 0) * mins;
        sumCri += (r.cri_score_100 ?? 0) * mins;
        totalMinutes += mins;
      });

      const div = totalMinutes || 1;
      setScores([
        sumAta / div,
        sumTec / div,
        sumTat / div,
        sumDef / div,
        sumCri / div,
      ]);
      setLoaded(true);
    });
  }, [playerId]);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox="0 0 200 210" className="w-full" style={{ maxHeight: 220 }}>
      {/* Grid pentagons */}
      {gridLevels.map((f) => (
        <path
          key={f}
          d={gridPath(f)}
          fill="none"
          stroke="#1C1C1C"
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes */}
      {AXES.map((a) => {
        const outer = pt(R, a.angleDeg);
        return (
          <line
            key={a.key}
            x1={CX}
            y1={CY}
            x2={outer.x.toFixed(2)}
            y2={outer.y.toFixed(2)}
            stroke="#1C1C1C"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      {loaded && (
        <path
          d={pentagonPath(scores)}
          fill="rgba(229,23,63,0.18)"
          stroke="#E5173F"
          strokeWidth="1.5"
        />
      )}

      {/* Axis labels */}
      {AXES.map((a) => {
        const labelR = R + 18;
        const { x, y } = pt(labelR, a.angleDeg);
        return (
          <text
            key={`label-${a.key}`}
            x={x.toFixed(2)}
            y={(y + 4).toFixed(2)}
            textAnchor="middle"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fill="#6B6560"
            letterSpacing="1"
          >
            {a.label}
          </text>
        );
      })}

      {/* Score values at each vertex */}
      {loaded && scores.map((score, i) => {
        const a = AXES[i];
        const r = ((score) / 100) * R;
        if (r < 8) return null;
        const { x, y } = pt(r, a.angleDeg);
        return (
          <text
            key={`val-${a.key}`}
            x={x.toFixed(2)}
            y={(y + 4).toFixed(2)}
            textAnchor="middle"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            fill="#E5173F"
          >
            {Math.round(score)}
          </text>
        );
      })}
    </svg>
  );
}
