import { AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── SVG geometry (idêntica ao AtributoRadar) ──────────────────────────────────
const CX = 140;
const CY = 155;
const R  = 86;
const LABEL_R = 112;
const VIEW_W  = 280;
const VIEW_H  = 300;

const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";

const AXES = [
  { key: "ata", label: "ATA", fullLabel: "Ataque",       angleDeg: -90  },
  { key: "tec", label: "TEC", fullLabel: "Técnica",      angleDeg: -18  },
  { key: "tat", label: "TAT", fullLabel: "Tática",       angleDeg:  54  },
  { key: "def", label: "DEF", fullLabel: "Defesa",       angleDeg: 126  },
  { key: "cri", label: "CRI", fullLabel: "Criatividade", angleDeg: 198  },
] as const;

// Cores por jogador — mesmo verde/azul do AtributoRadar para p1/p2
export const PLAYER_COLORS = [
  { stroke: "#16a34a", fill: "rgba(34,197,94,0.20)"   },
  { stroke: "#2563eb", fill: "rgba(59,130,246,0.18)"  },
  { stroke: "#f97316", fill: "rgba(249,115,22,0.15)"  },
  { stroke: "#a855f7", fill: "rgba(168,85,247,0.15)"  },
];

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

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RadarPlayerData {
  id: string;
  name: string;
  // [ata, tec, tat, def, cri] — mesma ordem dos AXES, escala 0-100
  scores: number[];
}

interface ComparisonRadarOverlayProps {
  players: RadarPlayerData[];
  loading?: boolean;
  className?: string;
  availableYears?: number[];
  selectedYear?: number | null;
  onYearChange?: (year: number) => void;
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded transition-colors"
      style={
        active
          ? { color: "#F2EDE4", background: "#2A2A2A", border: "1px solid #3A3A3A" }
          : { color: MUTED, background: "transparent", border: "1px solid transparent" }
      }
    >
      {label}
    </button>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ComparisonRadarOverlay({
  players,
  loading = false,
  className,
  availableYears = [],
  selectedYear = null,
  onYearChange,
}: ComparisonRadarOverlayProps) {
  const labelPositions = AXES.map(a => {
    const { x, y } = pt(LABEL_R, a.angleDeg);
    return { left: (x / VIEW_W) * 100, top: (y / VIEW_H) * 100 };
  });

  const hasData = players.some(p => p.scores.some(s => s > 0));

  return (
    <Card className={cn("bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: MUTED }}>
            Atributos
          </span>
          {availableYears.length > 1 && onYearChange && (
            <div className="flex gap-1">
              {availableYears.map(year => (
                <Pill
                  key={year}
                  label={String(year)}
                  active={year === selectedYear}
                  onClick={() => onYearChange(year)}
                />
              ))}
            </div>
          )}
        </div>
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

      <CardContent className="p-0">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-zinc-500 text-sm">Carregando...</div>
          </div>
        ) : players.length < 2 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-6 h-6 text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-xs">Selecione pelo menos 2 jogadores</p>
          </div>
        ) : !hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-6 h-6 text-zinc-600 mb-2" />
            <p className="text-zinc-500 text-xs">Sem dados suficientes para comparação</p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center py-2 px-2 bg-zinc-800/40">
              {players.map((player, i) => (
                <div key={player.id} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0.5 inline-block rounded"
                    style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length].stroke }}
                  />
                  <span className="text-[10px] font-medium text-zinc-300 truncate max-w-[100px]">
                    {player.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>

            {/* SVG Radar */}
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

                {/* Polígonos — renderiza do último para o primeiro (p1 fica na frente) */}
                {[...players].reverse().map((player, ri) => {
                  const i = players.length - 1 - ri;
                  const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                  return (
                    <path
                      key={player.id}
                      d={polygonPath(player.scores)}
                      fill={color.fill}
                      stroke={color.stroke}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeDasharray={i > 0 ? "4 2" : undefined}
                    />
                  );
                })}
              </svg>

              {/* Badges HTML sobrepostos */}
              {AXES.map((a, axisIdx) => {
                const { left, top } = labelPositions[axisIdx];
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
                      className="text-[10px] font-bold tracking-wider uppercase leading-none"
                      style={{ color: MUTED }}
                    >
                      {a.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {players.map((player, pi) => {
                        const score = Math.round(player.scores[axisIdx] ?? 0);
                        const color = PLAYER_COLORS[pi % PLAYER_COLORS.length];
                        return (
                          <span
                            key={player.id}
                            className="rounded px-1 py-0.5 text-[9px] font-bold text-white leading-none"
                            style={{
                              background: color.stroke,
                              minWidth: 20,
                              textAlign: "center",
                            }}
                          >
                            {score}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
