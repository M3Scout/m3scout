import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { formatFixed } from "@/lib/formatters";
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

const getPositionColorHex = (position: string | null): string => {
  if (!position) return "#71717a";
  const posColor = getPositionColor(position);
  const category = posColor.category;
  return POSITION_COLORS[category] || "#71717a";
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

ComparePdfTemplate.displayName = "ComparePdfTemplate";
