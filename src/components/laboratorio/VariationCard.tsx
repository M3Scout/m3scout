import type { Subtype } from "./types";
import { arrowHeadPoints } from "./arrow";

interface VariationCardProps {
  subtype: Subtype;
  index: number;
  isActive: boolean;
  isPreview: boolean;
  accent: string;
  topAttribute: { label: string; value: number };
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function MiniDiagram({ subtype, accent }: { subtype: Subtype; accent: string }) {
  const sx = 220 / 1000;
  const sy = 132 / 660;
  const pts = subtype.movement.points.map(([x, y]) => [x * sx, y * sy] as const);
  const n = pts.length;
  const d =
    n === 2
      ? `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`
      : `M ${pts[0][0]} ${pts[0][1]} Q ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]}`;
  const tip = pts[n - 1];
  const from = pts[n - 2];
  const arrowHead = arrowHeadPoints(tip, from, 6, 3);
  const zx = pts.reduce((sum, p) => sum + p[0], 0) / n;
  const zy = pts.reduce((sum, p) => sum + p[1], 0) / n;
  const gradientId = `vc-zone-${subtype.id}`;

  return (
    <svg viewBox="0 0 220 132" className="w-full block">
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={accent} stopOpacity={0.42} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={220} height={132} fill="#0b1310" />
      <g fill="none" stroke="rgba(222,236,228,0.13)" strokeWidth={1}>
        <rect x={6} y={6} width={208} height={120} rx={3} />
        <line x1={110} y1={6} x2={110} y2={126} />
        <circle cx={110} cy={66} r={15} />
        <rect x={6} y={40} width={26} height={52} />
        <rect x={188} y={40} width={26} height={52} />
      </g>
      <ellipse cx={zx} cy={zy} rx={58} ry={44} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={accent} strokeWidth={2.6} strokeLinecap="butt" />
      <circle cx={pts[0][0]} cy={pts[0][1]} r={3.6} fill={accent} />
      <polygon points={arrowHead} fill={accent} />
    </svg>
  );
}

export function VariationCard({
  subtype,
  index,
  isActive,
  isPreview,
  accent,
  topAttribute,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: VariationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="text-left flex flex-col rounded-2xl p-4 md:px-[18px] md:py-4 font-archivo transition-[border-color,box-shadow,background] duration-200"
      style={{
        background: isActive ? `linear-gradient(160deg, ${accent}18, ${accent}06)` : "#0f1311",
        border: `1px solid ${isActive ? `${accent}70` : isPreview ? `${accent}45` : "#1c2120"}`,
        boxShadow: isActive ? `0 14px 30px -16px ${accent}cc` : "none",
      }}
    >
      <div className="flex items-center justify-between gap-2.5 mb-3.5">
        <span className="font-tactical-mono text-[11px] tracking-[0.12em]" style={{ color: "#6f7a73" }}>
          VAR {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: isActive ? accent : "transparent",
            border: `1.5px solid ${isActive ? accent : "#39413b"}`,
            boxShadow: isActive ? `0 0 9px ${accent}` : "none",
          }}
        />
      </div>

      <div
        className="relative rounded-[11px] overflow-hidden mb-3.5"
        style={{ border: `1px solid ${isActive ? `${accent}33` : "#1a201d"}`, background: "#0b1310" }}
      >
        <div
          className="absolute top-2 left-[9px] z-[2] font-tactical-mono text-[9px] tracking-[0.18em]"
          style={{ color: isActive ? accent : "rgba(222,236,228,0.4)" }}
        >
          MOVIMENTO
        </div>
        <MiniDiagram subtype={subtype} accent={accent} />
      </div>

      <div className="font-tactical-mono text-[11px] tracking-[0.1em]" style={{ color: isActive ? accent : "#7a857d" }}>
        {subtype.tag}
      </div>
      <div className="font-archivo font-bold text-[21px] my-[3px] mb-2" style={{ letterSpacing: "-0.01em", color: "#f1f4f0" }}>
        {subtype.name}
      </div>
      <p className="text-[13.5px] leading-relaxed flex-1" style={{ color: "#97a199" }}>
        {subtype.description}
      </p>

      <div
        className="flex items-center justify-between gap-2.5 mt-3.5 pt-[13px]"
        style={{ borderTop: "1px solid #1a1f1d" }}
      >
        <span
          className="inline-flex items-center px-[11px] py-[5px] rounded-lg text-xs font-semibold"
          style={{
            color: isActive ? accent : "#aab2ab",
            background: isActive ? `${accent}16` : "#161b18",
            border: `1px solid ${isActive ? `${accent}33` : "#22282350"}`,
          }}
        >
          {topAttribute.label} · {topAttribute.value}
        </span>
        <span className="text-[12.5px]" style={{ color: "#7a857d" }}>
          {subtype.references[0]}
        </span>
      </div>
    </button>
  );
}
