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
  const arrowHead = arrowHeadPoints(tip, from, 11, 3.4);
  const zx = pts.reduce((sum, p) => sum + p[0], 0) / n;
  const zy = pts.reduce((sum, p) => sum + p[1], 0) / n;
  const gradientId = `vc-zone-${subtype.id}`;

  return (
    <svg viewBox="0 0 220 132" className="w-full block">
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={220} height={132} fill="#0c0b0d" />
      <g fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}>
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
      className="text-left flex flex-col rounded-[8px] p-4 md:px-[18px] md:py-4 font-archivo transition-colors duration-200"
      style={{
        background: isActive ? "rgba(255,255,255,0.045)" : "#141318",
        border: `1px solid ${isActive ? "rgba(255,255,255,0.18)" : isPreview ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.075)"}`,
        boxShadow: isActive ? `inset 2px 0 0 ${accent}` : "none",
      }}
    >
      <div className="flex items-center justify-between gap-2.5 mb-3.5">
        <span className="font-tactical-mono text-[11px] tracking-[0.12em]" style={{ color: "#62616a" }}>
          VAR {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: isActive ? accent : "transparent",
            border: `1.5px solid ${isActive ? accent : "#3a3942"}`,
          }}
        />
      </div>

      <div
        className="relative rounded-[6px] overflow-hidden mb-3.5"
        style={{ border: "1px solid rgba(255,255,255,0.075)" }}
      >
        <div
          className="absolute top-[14px] left-[18px] z-[2] font-tactical-mono text-[9px] tracking-[0.18em] uppercase"
          style={{ color: isActive ? accent : "rgba(255,255,255,0.35)" }}
        >
          Movimento
        </div>
        <MiniDiagram subtype={subtype} accent={accent} />
      </div>

      <div className="font-tactical-mono text-[11px] tracking-[0.1em]" style={{ color: isActive ? accent : "#62616a" }}>
        {subtype.tag}
      </div>
      <div className="font-archivo font-semibold text-[20px] my-[3px] mb-2" style={{ letterSpacing: "-0.01em", color: "#ededee" }}>
        {subtype.name}
      </div>
      <p className="text-[13.5px] leading-relaxed flex-1" style={{ color: "#9c9ba3" }}>
        {subtype.description}
      </p>

      <div
        className="flex items-center justify-between gap-2.5 mt-3.5 pt-[13px]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.075)" }}
      >
        <span
          className="inline-flex items-center px-[11px] py-[5px] rounded-[6px] text-xs font-medium"
          style={{ color: "#c8c7cc", background: "#0c0b0d", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {topAttribute.label} · {topAttribute.value}
        </span>
        <span className="text-[12.5px]" style={{ color: "#62616a" }}>
          {subtype.references[0]}
        </span>
      </div>
    </button>
  );
}
