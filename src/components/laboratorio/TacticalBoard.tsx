import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { FormationPlayerNode, MovementPath, RoleFamilyId, TacticalPosition } from "./types";
import { arrowHeadPoints } from "./arrow";

const GK_COLOR = "#8a948d";

interface TacticalBoardProps {
  positions: TacticalPosition[];
  nodes: FormationPlayerNode[];
  formationKey: string;
  selectedPositionId: string;
  activeMovement: MovementPath;
  activeMovementKey: string;
  accent: string;
  onSelect: (id: RoleFamilyId) => void;
}

/**
 * Movement paths are authored once per subtype with fixed coordinates, but a role's
 * on-pitch circle moves depending on the selected formation/variation. Re-anchor the
 * whole path (translate, keep shape) so it always starts exactly at the live circle
 * for the currently selected family, picking the closest node when a family has more
 * than one on-pitch instance (e.g. two zagueiros).
 */
function anchorMovementToNode(
  movement: MovementPath,
  nodes: FormationPlayerNode[],
  familyId: string
): MovementPath {
  const candidates = nodes.filter((n) => n.family === familyId);
  if (candidates.length === 0) return movement;

  const [ax, ay] = movement.points[0];
  let nearest = candidates[0];
  let nearestDist = Infinity;
  for (const c of candidates) {
    const dist = (c.x - ax) ** 2 + (c.y - ay) ** 2;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = c;
    }
  }

  const dx = nearest.x - ax;
  const dy = nearest.y - ay;
  const clampX = (v: number) => Math.min(970, Math.max(30, v));
  const clampY = (v: number) => Math.min(635, Math.max(25, v));
  const points = movement.points.map(([x, y]) => [clampX(x + dx), clampY(y + dy)] as [number, number]);

  return { ...movement, points };
}

function buildMovementPath(movement: MovementPath, color: string, gradientId: string) {
  const pts = movement.points;
  const n = pts.length;
  const d =
    n === 2
      ? `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`
      : `M ${pts[0][0]} ${pts[0][1]} Q ${pts[1][0]} ${pts[1][1]} ${pts[2][0]} ${pts[2][1]}`;

  const tip = pts[n - 1];
  const from = pts[n - 2];
  const arrowHead = arrowHeadPoints(tip, from, 16, 7);

  const zx = pts.reduce((sum, p) => sum + p[0], 0) / n;
  const zy = pts.reduce((sum, p) => sum + p[1], 0) / n;

  return (
    <g>
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="55%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={zx} cy={zy} rx={280} ry={200} fill={`url(#${gradientId})`} />
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="butt"
        strokeDasharray={1}
        style={{ animation: "tacticalDrawLine .9s cubic-bezier(.4,0,.2,1) forwards" }}
      />
      <circle cx={pts[0][0]} cy={pts[0][1]} r={8} fill={color} stroke="#0f1a14" strokeWidth={2} />
      <polygon
        points={arrowHead}
        fill={color}
        style={{ opacity: 0, animation: "tacticalFadeArrow .18s ease .88s forwards" }}
      />
    </g>
  );
}

export function TacticalBoard({
  positions,
  nodes,
  formationKey,
  selectedPositionId,
  activeMovement,
  activeMovementKey,
  accent,
  onSelect,
}: TacticalBoardProps) {
  const colorByFamily = useMemo(() => Object.fromEntries(positions.map((p) => [p.id, p.color])), [positions]);
  const anchoredMovement = useMemo(
    () => anchorMovementToNode(activeMovement, nodes, selectedPositionId),
    [activeMovement, nodes, selectedPositionId]
  );

  return (
    <div
      className="rounded-[20px] p-3.5"
      style={{ background: "#0f1311", border: "1px solid #1c2120" }}
    >
      <div className="relative w-full rounded-[13px] overflow-hidden">
        <svg viewBox="0 0 1000 660" className="w-full block" style={{ display: "block" }}>
          <defs>
            <linearGradient id="tactical-board-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16241c" />
              <stop offset="1" stopColor="#0f1a14" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1000" height="660" fill="url(#tactical-board-bg)" />

          <g fill="none" stroke="rgba(222,236,228,0.17)" strokeWidth={2}>
            <rect x={22} y={18} width={956} height={624} rx={3} />
            <line x1={500} y1={18} x2={500} y2={642} />
            <circle cx={500} cy={330} r={88} />
            <rect x={22} y={155} width={158} height={350} />
            <rect x={22} y={248} width={56} height={164} />
            <rect x={820} y={155} width={158} height={350} />
            <rect x={922} y={248} width={56} height={164} />
            <path d="M180 270 A88 88 0 0 1 180 390" />
            <path d="M820 270 A88 88 0 0 0 820 390" />
          </g>
          <circle cx={500} cy={330} r={3.5} fill="rgba(222,236,228,0.32)" />
          <circle cx={128} cy={330} r={3} fill="rgba(222,236,228,0.32)" />
          <circle cx={872} cy={330} r={3} fill="rgba(222,236,228,0.32)" />

          <g key={activeMovementKey}>{buildMovementPath(anchoredMovement, accent, `tb-zone-${activeMovementKey}`)}</g>
        </svg>

        {/* Formation nodes overlay — animates between variations, resets on formation change */}
        <div key={formationKey} className="absolute inset-0">
          {nodes.map((node) => {
            const isGoalkeeper = node.family === null;
            const isSelected = !isGoalkeeper && selectedPositionId === node.family;
            const color = isGoalkeeper ? GK_COLOR : colorByFamily[node.family] ?? GK_COLOR;
            return (
              <button
                key={node.sigla}
                type="button"
                title={node.label}
                disabled={isGoalkeeper}
                onClick={() => !isGoalkeeper && onSelect(node.family as RoleFamilyId)}
                className="absolute flex items-center justify-center rounded-full font-tactical-mono"
                style={{
                  left: `${(node.x / 1000) * 100}%`,
                  top: `${(node.y / 660) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  transition: "left .6s cubic-bezier(.4,0,.2,1), top .6s cubic-bezier(.4,0,.2,1), background .2s, box-shadow .2s",
                  width: 36,
                  height: 36,
                  fontSize: isSelected ? 10 : 9,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  cursor: isGoalkeeper ? "default" : "pointer",
                  color: isSelected ? "#fff" : "rgba(233,236,233,0.65)",
                  background: isSelected ? color : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${isSelected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)"}`,
                  opacity: isSelected ? 1 : 0.85,
                  zIndex: isSelected ? 5 : 3,
                  boxShadow: isSelected ? `0 0 0 4px ${color}2e, 0 5px 14px -3px ${color}` : "none",
                }}
              >
                {!isSelected && !isGoalkeeper && (
                  <span
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: -5,
                      border: `2px solid ${color}`,
                      animation: "tacticalPulseRing 2.2s ease-out infinite",
                    }}
                  />
                )}
                <span className="relative z-[2]">{node.sigla}</span>
              </button>
            );
          })}
        </div>

        {/* Move label chip */}
        <div
          key={`chip-${activeMovementKey}`}
          className="absolute top-3.5 left-3.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-[11px] z-[8] backdrop-blur-md"
          style={{
            background: "rgba(9,13,11,0.84)",
            border: `1px solid ${accent}45`,
            boxShadow: "0 8px 22px -12px rgba(0,0,0,0.8)",
          }}
        >
          <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} strokeWidth={2.6} />
          <span className="font-archivo font-semibold text-[13.5px] whitespace-nowrap" style={{ color: "#f1f4f0" }}>
            {activeMovement.label}
          </span>
        </div>

        <div
          className="absolute left-3.5 bottom-2.5 font-tactical-mono text-[10px] tracking-[0.16em]"
          style={{ color: "rgba(222,236,228,0.5)" }}
        >
          ← DEFESA &nbsp;·&nbsp; ATAQUE →
        </div>
      </div>
    </div>
  );
}
