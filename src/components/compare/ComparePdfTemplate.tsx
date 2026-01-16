import { forwardRef, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { formatFixed } from "@/lib/formatters";
import { computeRadarAttributes, type PlayerStatRow } from "@/lib/attributeRadar";
import logoM3 from "@/assets/logo-m3.png";

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  age: number | null;
  nationality: string;
  current_club: string | null;
  photo_url: string | null;
  auto_rating: number | null;
  height?: number | null;
}

interface AggregatedStats {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  shots?: number;
  shots_on_target?: number;
  key_passes?: number;
  chances_created?: number;
  duels_won?: number;
  total_duels?: number;
  accurate_passes?: number;
  total_passes?: number;
  successful_dribbles?: number;
  total_dribbles?: number;
}

interface PlayerWithStats extends PlayerData {
  aggregatedStats: AggregatedStats | null;
  statsRows?: PlayerStatRow[];
}

interface ComparePdfTemplateProps {
  players: PlayerWithStats[];
  generatedAt?: Date;
}

// Position color mapping for PDF (solid colors)
const POSITION_COLORS: Record<string, string> = {
  goalkeeper: "#8b5cf6",     // violet
  defender: "#3b82f6",       // blue
  fullback: "#06b6d4",       // cyan
  midfielder_defensive: "#10b981", // emerald
  midfielder: "#f59e0b",     // amber
  winger: "#f97316",         // orange
  forward: "#ef4444",        // red
};

// Player colors for radar (up to 4)
const PLAYER_RADAR_COLORS = [
  "#f97316", // Orange
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#a855f7", // Purple
];

// Radar chart attributes
const RADAR_ATTRIBUTES = [
  { key: "ata", label: "ATA", fullLabel: "Ataque" },
  { key: "tec", label: "TÉC", fullLabel: "Técnica" },
  { key: "tat", label: "TÁT", fullLabel: "Tática" },
  { key: "def", label: "DEF", fullLabel: "Defesa" },
  { key: "cri", label: "CRI", fullLabel: "Criatividade" },
];

const getPositionColorHex = (position: string | null): string => {
  if (!position) return "#71717a";
  const posColor = getPositionColor(position);
  const category = posColor.category;
  return POSITION_COLORS[category] || "#71717a";
};

// Helper to calculate radar polygon points
const calculateRadarPoints = (
  values: (number | null)[],
  centerX: number,
  centerY: number,
  radius: number
): string => {
  const angleStep = (2 * Math.PI) / values.length;
  const startAngle = -Math.PI / 2; // Start from top
  
  const points = values.map((value, index) => {
    const angle = startAngle + index * angleStep;
    const normalizedValue = (value ?? 0) / 100;
    const x = centerX + radius * normalizedValue * Math.cos(angle);
    const y = centerY + radius * normalizedValue * Math.sin(angle);
    return `${x},${y}`;
  });
  
  return points.join(" ");
};

// Generate grid lines for radar
const generateGridLines = (
  centerX: number,
  centerY: number,
  radius: number,
  numSides: number,
  levels: number[]
): string[] => {
  const angleStep = (2 * Math.PI) / numSides;
  const startAngle = -Math.PI / 2;
  
  return levels.map((level) => {
    const r = radius * level;
    const points = Array.from({ length: numSides }, (_, i) => {
      const angle = startAngle + i * angleStep;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(" ");
  });
};

// Generate axis lines
const generateAxisLines = (
  centerX: number,
  centerY: number,
  radius: number,
  numSides: number
): { x1: number; y1: number; x2: number; y2: number }[] => {
  const angleStep = (2 * Math.PI) / numSides;
  const startAngle = -Math.PI / 2;
  
  return Array.from({ length: numSides }, (_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x1: centerX,
      y1: centerY,
      x2: centerX + radius * Math.cos(angle),
      y2: centerY + radius * Math.sin(angle),
    };
  });
};

// Calculate label positions
const calculateLabelPositions = (
  centerX: number,
  centerY: number,
  radius: number,
  numSides: number
): { x: number; y: number }[] => {
  const angleStep = (2 * Math.PI) / numSides;
  const startAngle = -Math.PI / 2;
  const labelRadius = radius + 20;
  
  return Array.from({ length: numSides }, (_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x: centerX + labelRadius * Math.cos(angle),
      y: centerY + labelRadius * Math.sin(angle),
    };
  });
};

export const ComparePdfTemplate = forwardRef<HTMLDivElement, ComparePdfTemplateProps>(
  ({ players, generatedAt = new Date() }, ref) => {
    const colCount = players.length;

    // Find best value for highlighting
    const getBestIdx = (
      getValue: (p: PlayerWithStats) => number | null,
      higherIsBetter = true
    ): number | null => {
      const values = players.map((p, i) => ({ idx: i, val: getValue(p) }));
      const valid = values.filter((v) => v.val !== null);
      if (valid.length === 0) return null;
      
      const best = valid.reduce((a, b) => {
        if (a.val === null) return b;
        if (b.val === null) return a;
        return higherIsBetter ? (a.val > b.val ? a : b) : (a.val < b.val ? a : b);
      });
      return best.idx;
    };

    const StatRow = ({
      label,
      getValue,
      higherIsBetter = true,
      format: formatType = "number",
    }: {
      label: string;
      getValue: (p: PlayerWithStats) => number | null;
      higherIsBetter?: boolean;
      format?: "number" | "decimal" | "percent";
    }) => {
      const bestIdx = getBestIdx(getValue, higherIsBetter);
      const allEqual = players.every((p, i, arr) => getValue(p) === getValue(arr[0]));

      return (
        <tr>
          <td style={{ 
            padding: "8px 12px", 
            fontSize: "11px", 
            color: "#71717a",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            borderBottom: "1px solid #e4e4e7",
            background: "#fafafa",
          }}>
            {label}
          </td>
          {players.map((player, idx) => {
            const val = getValue(player);
            const isBest = !allEqual && bestIdx === idx;
            const color = getPositionColorHex(player.position);

            let displayVal = "—";
            if (val !== null) {
              switch (formatType) {
                case "decimal":
                  displayVal = val.toFixed(1);
                  break;
                case "percent":
                  displayVal = `${Math.round(val)}%`;
                  break;
                default:
                  displayVal = Math.round(val).toString();
              }
            }

            return (
              <td 
                key={player.id} 
                style={{ 
                  padding: "8px 12px", 
                  textAlign: "center",
                  fontSize: "13px",
                  fontWeight: isBest ? 700 : 500,
                  color: isBest ? color : "#3f3f46",
                  background: isBest ? `${color}10` : "white",
                  borderBottom: "1px solid #e4e4e7",
                }}
              >
                {displayVal}
                {isBest && <span style={{ marginLeft: "4px", fontSize: "10px" }}>↑</span>}
              </td>
            );
          })}
        </tr>
      );
    };

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          background: "white",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: "32px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "2px solid #18181b",
        }}>
          <div>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: 800, 
              color: "#18181b",
              margin: 0,
              letterSpacing: "-0.5px",
            }}>
              Comparação de Atletas
            </h1>
            <p style={{ 
              fontSize: "12px", 
              color: "#71717a", 
              margin: "4px 0 0 0" 
            }}>
              Relatório gerado em {format(generatedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <img 
            src={logoM3} 
            alt="M3 Scouting" 
            style={{ height: "40px", objectFit: "contain" }} 
          />
        </div>

        {/* Player Cards */}
        <div style={{ 
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: "16px",
          marginBottom: "24px",
        }}>
          {players.map((player) => {
            const color = getPositionColorHex(player.position);
            
            return (
              <div 
                key={player.id}
                style={{
                  background: "white",
                  borderRadius: "12px",
                  border: `2px solid ${color}`,
                  padding: "16px",
                  position: "relative",
                }}
              >
                {/* Position accent */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "4px",
                  background: color,
                  borderRadius: "12px 0 0 12px",
                }} />

                {/* Avatar + Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: `2px solid ${color}`,
                    flexShrink: 0,
                  }}>
                    {player.photo_url ? (
                      <img 
                        src={player.photo_url} 
                        alt={player.full_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ 
                        width: "100%", 
                        height: "100%", 
                        background: "#f4f4f5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        color: "#a1a1aa",
                      }}>
                        {player.full_name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      fontSize: "14px", 
                      fontWeight: 700, 
                      color: "#18181b",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {player.full_name}
                    </h3>
                    <div style={{ 
                      display: "inline-flex",
                      marginTop: "4px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                    }}>
                      <span style={{ 
                        fontSize: "10px", 
                        fontWeight: 700, 
                        color: color,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>
                        {getShortPosition(player.position)}
                      </span>
                    </div>
                    {player.current_club && (
                      <p style={{ 
                        fontSize: "11px", 
                        color: "#71717a", 
                        margin: "4px 0 0 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {player.current_club}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ 
                  display: "flex", 
                  gap: "12px", 
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #e4e4e7",
                }}>
                  {player.age && (
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#3f3f46", margin: 0 }}>
                        {player.age}
                      </p>
                      <p style={{ fontSize: "9px", color: "#a1a1aa", margin: 0, textTransform: "uppercase" }}>
                        Anos
                      </p>
                    </div>
                  )}
                  {player.auto_rating !== null && (
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p style={{ 
                        fontSize: "18px", 
                        fontWeight: 800, 
                        color: player.auto_rating >= 70 ? "#10b981" : player.auto_rating >= 50 ? "#f59e0b" : "#ef4444",
                        margin: 0,
                      }}>
                        {formatFixed(player.auto_rating, 1)}
                      </p>
                      <p style={{ fontSize: "9px", color: "#a1a1aa", margin: 0, textTransform: "uppercase" }}>
                        Global
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Table - Visão Geral */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ 
            fontSize: "14px", 
            fontWeight: 700, 
            color: "#18181b",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ 
              width: "4px", 
              height: "16px", 
              background: "#f97316", 
              borderRadius: "2px",
              display: "inline-block",
            }} />
            Visão Geral
          </h2>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <tbody>
              <StatRow label="Nota Global" getValue={(p) => p.auto_rating} format="decimal" />
              <StatRow label="Idade" getValue={(p) => p.age} higherIsBetter={false} />
              <StatRow label="Altura (cm)" getValue={(p) => p.height ?? null} />
              <StatRow label="Jogos" getValue={(p) => p.aggregatedStats?.matches ?? null} />
              <StatRow label="Minutos" getValue={(p) => p.aggregatedStats?.minutes ?? null} />
            </tbody>
          </table>
        </div>

        {/* Stats Table - Produção Ofensiva */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ 
            fontSize: "14px", 
            fontWeight: 700, 
            color: "#18181b",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ 
              width: "4px", 
              height: "16px", 
              background: "#ef4444", 
              borderRadius: "2px",
              display: "inline-block",
            }} />
            Produção Ofensiva
          </h2>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <tbody>
              <StatRow label="Gols" getValue={(p) => p.aggregatedStats?.goals ?? null} />
              <StatRow label="Assistências" getValue={(p) => p.aggregatedStats?.assists ?? null} />
              <StatRow 
                label="G+A" 
                getValue={(p) => {
                  const g = p.aggregatedStats?.goals ?? 0;
                  const a = p.aggregatedStats?.assists ?? 0;
                  return g + a;
                }} 
              />
              <StatRow label="Finalizações" getValue={(p) => p.aggregatedStats?.shots ?? null} />
              <StatRow 
                label="% Conversão" 
                getValue={(p) => {
                  const shots = p.aggregatedStats?.shots;
                  const goals = p.aggregatedStats?.goals;
                  if (!shots || shots === 0) return null;
                  return ((goals ?? 0) / shots) * 100;
                }}
                format="percent"
              />
            </tbody>
          </table>
        </div>

        {/* Stats Table - Construção */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ 
            fontSize: "14px", 
            fontWeight: 700, 
            color: "#18181b",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ 
              width: "4px", 
              height: "16px", 
              background: "#f59e0b", 
              borderRadius: "2px",
              display: "inline-block",
            }} />
            Construção & Jogo
          </h2>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <tbody>
              <StatRow 
                label="% Passes" 
                getValue={(p) => {
                  const acc = p.aggregatedStats?.accurate_passes;
                  const total = p.aggregatedStats?.total_passes;
                  if (!total || total === 0) return null;
                  return ((acc ?? 0) / total) * 100;
                }}
                format="percent"
              />
              <StatRow label="Passes Decisivos" getValue={(p) => p.aggregatedStats?.key_passes ?? null} />
              <StatRow label="Chances Criadas" getValue={(p) => p.aggregatedStats?.chances_created ?? null} />
              <StatRow label="Dribles" getValue={(p) => p.aggregatedStats?.successful_dribbles ?? null} />
              <StatRow 
                label="% Dribles" 
                getValue={(p) => {
                  const succ = p.aggregatedStats?.successful_dribbles;
                  const total = p.aggregatedStats?.total_dribbles;
                  if (!total || total === 0) return null;
                  return ((succ ?? 0) / total) * 100;
                }}
                format="percent"
              />
            </tbody>
          </table>
        </div>

        {/* Stats Table - Defesa */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ 
            fontSize: "14px", 
            fontWeight: 700, 
            color: "#18181b",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ 
              width: "4px", 
              height: "16px", 
              background: "#3b82f6", 
              borderRadius: "2px",
              display: "inline-block",
            }} />
            Defesa
          </h2>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <tbody>
              <StatRow label="Desarmes" getValue={(p) => p.aggregatedStats?.tackles ?? null} />
              <StatRow label="Interceptações" getValue={(p) => p.aggregatedStats?.interceptions ?? null} />
              <StatRow label="Recuperações" getValue={(p) => p.aggregatedStats?.recoveries ?? null} />
              <StatRow label="Duelos Ganhos" getValue={(p) => p.aggregatedStats?.duels_won ?? null} />
              <StatRow 
                label="% Duelos" 
                getValue={(p) => {
                  const won = p.aggregatedStats?.duels_won;
                  const total = p.aggregatedStats?.total_duels;
                  if (!total || total === 0) return null;
                  return ((won ?? 0) / total) * 100;
                }}
                format="percent"
              />
            </tbody>
          </table>
        </div>

        {/* Stats Table - Disciplina */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ 
            fontSize: "14px", 
            fontWeight: 700, 
            color: "#18181b",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ 
              width: "4px", 
              height: "16px", 
              background: "#71717a", 
              borderRadius: "2px",
              display: "inline-block",
            }} />
            Disciplina
          </h2>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            overflow: "hidden",
          }}>
            <tbody>
              <StatRow label="Amarelos" getValue={(p) => p.aggregatedStats?.yellow_cards ?? null} higherIsBetter={false} />
              <StatRow label="Vermelhos" getValue={(p) => p.aggregatedStats?.red_cards ?? null} higherIsBetter={false} />
            </tbody>
          </table>
        </div>

        {/* Radar Chart Comparison */}
        <RadarChartSection players={players} />

        {/* Footer */}
        <div style={{ 
          marginTop: "auto",
          paddingTop: "16px",
          borderTop: "1px solid #e4e4e7",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <p style={{ 
            fontSize: "10px", 
            color: "#a1a1aa", 
            margin: 0 
          }}>
            © {new Date().getFullYear()} M3 Scouting • Documento confidencial
          </p>
          <p style={{ 
            fontSize: "10px", 
            color: "#a1a1aa", 
            margin: 0 
          }}>
            Página 1 de 1
          </p>
        </div>
      </div>
    );
  }
);

// Radar Chart Section Component
function RadarChartSection({ players }: { players: PlayerWithStats[] }) {
  const radarSize = 200;
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;
  const radius = 70;
  const gridLevels = [0.25, 0.5, 0.75, 1];
  
  // Calculate radar attributes for each player
  const playerRadarData = useMemo(() => {
    return players.map((player, index) => {
      // Try to compute from statsRows if available
      if (player.statsRows && player.statsRows.length > 0) {
        const result = computeRadarAttributes(player.statsRows, player.position, {
          logOnce: false,
        });
        if (result.confidence !== "none") {
          return {
            player,
            color: PLAYER_RADAR_COLORS[index % PLAYER_RADAR_COLORS.length],
            values: [
              result.ata ?? 0,
              result.tec ?? 0,
              result.tat ?? 0,
              result.def ?? 0,
              result.cri ?? 0,
            ],
          };
        }
      }
      
      // Fallback: derive from aggregated stats
      const stats = player.aggregatedStats;
      if (!stats) {
        return {
          player,
          color: PLAYER_RADAR_COLORS[index % PLAYER_RADAR_COLORS.length],
          values: [0, 0, 0, 0, 0],
        };
      }
      
      // Simple derived values (normalized 0-100)
      const minutesPlayed = stats.minutes || 1;
      const per90 = 90 / minutesPlayed;
      
      // Attack score (goals + assists weighted)
      const ataRaw = ((stats.goals || 0) * 1.5 + (stats.assists || 0)) * per90;
      const ata = Math.min(100, ataRaw * 15);
      
      // Technical score (pass accuracy, dribbles)
      const passAcc = stats.total_passes ? ((stats.accurate_passes || 0) / stats.total_passes) * 100 : 50;
      const dribbleAcc = stats.total_dribbles ? ((stats.successful_dribbles || 0) / stats.total_dribbles) * 100 : 50;
      const tec = (passAcc + dribbleAcc) / 2;
      
      // Tactical score (based on cards - fewer is better)
      const cardPenalty = ((stats.yellow_cards || 0) * 5 + (stats.red_cards || 0) * 20) * per90;
      const tat = Math.max(0, 80 - cardPenalty);
      
      // Defensive score
      const defActions = ((stats.tackles || 0) + (stats.interceptions || 0) + (stats.recoveries || 0)) * per90;
      const def = Math.min(100, defActions * 8);
      
      // Creativity score
      const creativeActions = ((stats.key_passes || 0) + (stats.chances_created || 0) + (stats.assists || 0)) * per90;
      const cri = Math.min(100, creativeActions * 10);
      
      return {
        player,
        color: PLAYER_RADAR_COLORS[index % PLAYER_RADAR_COLORS.length],
        values: [ata, tec, tat, def, cri],
      };
    });
  }, [players]);
  
  const gridPolygons = generateGridLines(centerX, centerY, radius, 5, gridLevels);
  const axisLines = generateAxisLines(centerX, centerY, radius, 5);
  const labelPositions = calculateLabelPositions(centerX, centerY, radius, 5);
  
  // Check if we have any meaningful data
  const hasData = playerRadarData.some(p => p.values.some(v => v > 0));
  
  if (!hasData) {
    return null;
  }
  
  return (
    <div style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>
      <h2 style={{ 
        fontSize: "14px", 
        fontWeight: 700, 
        color: "#18181b",
        margin: "0 0 16px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ 
          width: "4px", 
          height: "16px", 
          background: "linear-gradient(180deg, #f97316, #3b82f6)", 
          borderRadius: "2px",
          display: "inline-block",
        }} />
        Comparação de Atributos
      </h2>
      
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "24px",
        background: "#fafafa",
        borderRadius: "12px",
        padding: "20px",
        border: "1px solid #e4e4e7",
      }}>
        {/* Radar Chart SVG */}
        <div style={{ flex: "0 0 auto" }}>
          <svg 
            width={radarSize} 
            height={radarSize} 
            viewBox={`0 0 ${radarSize} ${radarSize}`}
            style={{ overflow: "visible" }}
          >
            {/* Grid polygons */}
            {gridPolygons.map((points, i) => (
              <polygon
                key={`grid-${i}`}
                points={points}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="1"
              />
            ))}
            
            {/* Axis lines */}
            {axisLines.map((line, i) => (
              <line
                key={`axis-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#d4d4d8"
                strokeWidth="1"
              />
            ))}
            
            {/* Player polygons (overlaid) */}
            {playerRadarData.map((data, playerIndex) => (
              <polygon
                key={`player-${playerIndex}`}
                points={calculateRadarPoints(data.values, centerX, centerY, radius)}
                fill={data.color}
                fillOpacity={0.2 - playerIndex * 0.03}
                stroke={data.color}
                strokeWidth={2.5 - playerIndex * 0.3}
                strokeDasharray={playerIndex > 0 ? "4 2" : undefined}
              />
            ))}
            
            {/* Attribute labels */}
            {RADAR_ATTRIBUTES.map((attr, i) => (
              <text
                key={attr.key}
                x={labelPositions[i].x}
                y={labelPositions[i].y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  fill: "#52525b",
                }}
              >
                {attr.label}
              </text>
            ))}
          </svg>
        </div>
        
        {/* Legend and Values */}
        <div style={{ flex: 1 }}>
          {/* Player Legend */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ 
              fontSize: "10px", 
              fontWeight: 600, 
              color: "#71717a", 
              margin: "0 0 8px 0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Legenda
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {playerRadarData.map((data, i) => (
                <div key={data.player.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    background: data.color,
                  }} />
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "#3f3f46" }}>
                    {data.player.full_name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Attribute Values Table */}
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: "11px",
          }}>
            <thead>
              <tr>
                <th style={{ 
                  textAlign: "left", 
                  padding: "6px 8px", 
                  borderBottom: "2px solid #e4e4e7",
                  color: "#71717a",
                  fontWeight: 600,
                  fontSize: "10px",
                  textTransform: "uppercase",
                }}>
                  Atributo
                </th>
                {playerRadarData.map((data) => (
                  <th 
                    key={data.player.id}
                    style={{ 
                      textAlign: "center", 
                      padding: "6px 8px", 
                      borderBottom: "2px solid #e4e4e7",
                      color: data.color,
                      fontWeight: 600,
                      fontSize: "10px",
                    }}
                  >
                    {data.player.full_name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RADAR_ATTRIBUTES.map((attr, attrIndex) => {
                const values = playerRadarData.map(d => d.values[attrIndex]);
                const maxVal = Math.max(...values);
                
                return (
                  <tr key={attr.key}>
                    <td style={{ 
                      padding: "6px 8px", 
                      borderBottom: "1px solid #f4f4f5",
                      color: "#52525b",
                      fontWeight: 500,
                    }}>
                      {attr.fullLabel}
                    </td>
                    {playerRadarData.map((data, playerIndex) => {
                      const val = data.values[attrIndex];
                      const isBest = val === maxVal && values.filter(v => v === maxVal).length === 1;
                      
                      return (
                        <td 
                          key={data.player.id}
                          style={{ 
                            textAlign: "center", 
                            padding: "6px 8px", 
                            borderBottom: "1px solid #f4f4f5",
                            fontWeight: isBest ? 700 : 500,
                            color: isBest ? data.color : "#3f3f46",
                            background: isBest ? `${data.color}10` : "transparent",
                          }}
                        >
                          {Math.round(val)}
                          {isBest && <span style={{ marginLeft: "2px", fontSize: "9px" }}>↑</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Average row */}
              <tr>
                <td style={{ 
                  padding: "6px 8px", 
                  borderTop: "2px solid #e4e4e7",
                  color: "#18181b",
                  fontWeight: 700,
                }}>
                  Média
                </td>
                {playerRadarData.map((data) => {
                  const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
                  return (
                    <td 
                      key={data.player.id}
                      style={{ 
                        textAlign: "center", 
                        padding: "6px 8px", 
                        borderTop: "2px solid #e4e4e7",
                        fontWeight: 700,
                        color: data.color,
                      }}
                    >
                      {Math.round(avg)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

ComparePdfTemplate.displayName = "ComparePdfTemplate";
