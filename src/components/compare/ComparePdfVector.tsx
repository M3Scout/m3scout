/**
 * Compare Players PDF using @react-pdf/renderer
 * Vector-based PDF for crisp text rendering
 */
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Polygon,
  Line,
  Circle,
  G,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDF_COLORS, POSITION_COLORS_PDF } from "@/lib/pdfStyles";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import { computeRadarAttributes, type PlayerStatRow } from "@/lib/attributeRadar";

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

interface ComparePdfVectorProps {
  players: PlayerWithStats[];
  generatedAt?: Date;
  logoUrl?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: PDF_COLORS.gray900,
    backgroundColor: PDF_COLORS.white,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: `2px solid ${PDF_COLORS.gray900}`,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 10,
    color: PDF_COLORS.gray500,
    marginTop: 4,
  },
  logo: {
    height: 36,
    objectFit: "contain",
  },
  // Player cards grid
  playersGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  playerCard: {
    flex: 1,
    borderRadius: 8,
    border: `2px solid ${PDF_COLORS.gray300}`,
    padding: 12,
    position: "relative",
  },
  playerAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  playerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover",
  },
  playerPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: PDF_COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPhotoInitial: {
    fontSize: 16,
    fontWeight: 600,
    color: PDF_COLORS.gray400,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 12,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  positionBadge: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    alignSelf: "flex-start",
  },
  positionText: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  playerClub: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    marginTop: 4,
  },
  playerQuickStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    marginLeft: 8,
  },
  quickStatItem: {
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: 700,
    color: PDF_COLORS.gray700,
  },
  quickStatLabel: {
    fontSize: 7,
    color: PDF_COLORS.gray400,
    textTransform: "uppercase",
    marginTop: 2,
  },
  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  // Table
  table: {
    marginBottom: 16,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
    backgroundColor: PDF_COLORS.gray50,
  },
  tableLabelCell: {
    padding: 6,
    fontSize: 9,
    color: PDF_COLORS.gray500,
    fontWeight: 500,
    textTransform: "uppercase",
    backgroundColor: PDF_COLORS.gray50,
    width: 80,
  },
  tableValueCell: {
    flex: 1,
    padding: 6,
    fontSize: 11,
    fontWeight: 500,
    textAlign: "center",
    color: PDF_COLORS.gray700,
  },
  tableValueCellBest: {
    flex: 1,
    padding: 6,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: PDF_COLORS.gray400,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    paddingTop: 10,
  },
  // Radar Section
  radarSection: {
    marginBottom: 20,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 8,
    padding: 16,
  },
  radarGrid: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 20,
  },
  radarLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${PDF_COLORS.gray100}`,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 8,
    color: PDF_COLORS.gray600,
    fontWeight: 600,
  },
});

// Radar attribute labels
const RADAR_LABELS = ["ATA", "TÉC", "TÁT", "DEF", "CRI"];
const RADAR_COLORS = [
  { stroke: "#3b82f6", fill: "#3b82f6" }, // Blue
  { stroke: "#10b981", fill: "#10b981" }, // Green
  { stroke: "#f59e0b", fill: "#f59e0b" }, // Amber
  { stroke: "#ec4899", fill: "#ec4899" }, // Pink
];

// Comparison Radar Chart SVG
function CompareRadarSvg({ 
  playersData, 
  size = 180 
}: { 
  playersData: { name: string; values: number[]; color: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 5;
  const numSides = 5;
  const angleSlice = (Math.PI * 2) / numSides;

  // Generate grid polygons
  const gridPolygons = [];
  for (let level = 1; level <= levels; level++) {
    const r = (maxRadius / levels) * level;
    const points = Array.from({ length: numSides }, (_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    gridPolygons.push(
      <Polygon
        key={`grid-${level}`}
        points={points}
        fill="none"
        stroke={PDF_COLORS.gray200}
        strokeWidth={0.5}
      />
    );
  }

  // Generate axis lines
  const axisLines = Array.from({ length: numSides }, (_, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    return (
      <Line
        key={`axis-${i}`}
        x1={cx}
        y1={cy}
        x2={cx + maxRadius * Math.cos(angle)}
        y2={cy + maxRadius * Math.sin(angle)}
        stroke={PDF_COLORS.gray200}
        strokeWidth={0.5}
      />
    );
  });

  // Generate data polygons for each player
  const dataPolygons = playersData.map((player, pIdx) => {
    const points = player.values.map((val, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = (val / 100) * maxRadius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    
    return (
      <Polygon
        key={`data-${pIdx}`}
        points={points}
        fill={player.color}
        fillOpacity={0.15}
        stroke={player.color}
        strokeWidth={2}
      />
    );
  });

  // Data points for each player
  const dataPoints = playersData.flatMap((player, pIdx) => 
    player.values.map((val, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = (val / 100) * maxRadius;
      return (
        <Circle
          key={`point-${pIdx}-${i}`}
          cx={cx + r * Math.cos(angle)}
          cy={cy + r * Math.sin(angle)}
          r={3}
          fill={player.color}
          stroke={PDF_COLORS.white}
          strokeWidth={1}
        />
      );
    })
  );

  // Labels with values
  const labelPositions = RADAR_LABELS.map((label, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const labelRadius = maxRadius + 28;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);
    // Get values for each player at this attribute
    const playerValues = playersData.map(p => ({
      value: Math.round(p.values[i]),
      color: p.color,
    }));
    return { x, y, label, playerValues };
  });

  return (
    <View style={{ position: "relative", width: size, height: size + 20 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {gridPolygons}
          {axisLines}
          {dataPolygons}
          {dataPoints}
        </G>
      </Svg>
      {/* Labels with player values positioned around the chart */}
      {labelPositions.map((pos, i) => {
        const isLeft = pos.x < cx - 10;
        const isRight = pos.x > cx + 10;
        const isTop = pos.y < cy;
        
        return (
          <View
            key={`label-${i}`}
            style={{
              position: "absolute",
              left: isLeft ? pos.x - 55 : isRight ? pos.x - 5 : pos.x - 30,
              top: isTop ? pos.y - 18 : pos.y - 2,
              width: 60,
              alignItems: isLeft ? "flex-end" : isRight ? "flex-start" : "center",
            }}
          >
            {/* Attribute label */}
            <Text style={{ fontSize: 7, fontWeight: 700, color: PDF_COLORS.gray600, marginBottom: 2 }}>
              {pos.label}
            </Text>
            {/* Player values row */}
            <View style={{ flexDirection: "row", gap: 4, justifyContent: isLeft ? "flex-end" : isRight ? "flex-start" : "center" }}>
              {pos.playerValues.map((pv, pIdx) => (
                <View
                  key={pIdx}
                  style={{
                    backgroundColor: `${pv.color}20`,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 3,
                  }}
                >
                  <Text style={{ fontSize: 7, fontWeight: 700, color: pv.color }}>
                    {pv.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const getPositionColorHex = (position: string | null): string => {
  if (!position) return PDF_COLORS.gray500;
  const posColor = getPositionColor(position);
  const category = posColor.category;
  return POSITION_COLORS_PDF[category] || PDF_COLORS.gray500;
};

export function ComparePdfVector({
  players,
  generatedAt = new Date(),
  logoUrl,
}: ComparePdfVectorProps) {
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

  // Check if all values are equal
  const allEqual = (getValue: (p: PlayerWithStats) => number | null): boolean => {
    const values = players.map(getValue);
    const validValues = values.filter(v => v !== null);
    if (validValues.length <= 1) return true;
    return validValues.every(v => v === validValues[0]);
  };

  // Calculate radar data for each player
  const playersRadarData = players.map((player, idx) => {
    let values = [50, 50, 50, 50, 50]; // Default values
    
    if (player.statsRows && player.statsRows.length > 0) {
      const result = computeRadarAttributes(player.statsRows, player.position, {
        logOnce: false,
      });
      if (result.confidence !== "none") {
        values = [
          result.ata ?? 50,
          result.tec ?? 50,
          result.tat ?? 50,
          result.def ?? 50,
          result.cri ?? 50,
        ];
      }
    }
    
    return {
      name: player.full_name,
      values,
      color: RADAR_COLORS[idx % RADAR_COLORS.length].stroke,
    };
  });

  // Check if we have valid radar data (at least one player with non-default values)
  const hasRadarData = playersRadarData.some(p => 
    p.values.some((v, i) => v !== 50 || i === 0)
  );

  // Stat row component
  const StatRow = ({
    label,
    getValue,
    higherIsBetter = true,
    formatType = "number",
  }: {
    label: string;
    getValue: (p: PlayerWithStats) => number | null;
    higherIsBetter?: boolean;
    formatType?: "number" | "decimal" | "percent";
  }) => {
    const bestIdx = allEqual(getValue) ? null : getBestIdx(getValue, higherIsBetter);

    return (
      <View style={styles.tableRow}>
        <Text style={styles.tableLabelCell}>{label}</Text>
        {players.map((player, idx) => {
          const val = getValue(player);
          const isBest = bestIdx === idx;
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
            <Text 
              key={player.id} 
              style={isBest 
                ? [styles.tableValueCellBest, { color, backgroundColor: `${color}10` }]
                : styles.tableValueCell
              }
            >
              {displayVal}{isBest ? " ↑" : ""}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Comparação de Atletas</Text>
            <Text style={styles.headerSubtitle}>
              Relatório gerado em {format(generatedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        {/* Player Cards */}
        <View style={styles.playersGrid}>
          {players.map((player) => {
            const color = getPositionColorHex(player.position);
            return (
              <View key={player.id} style={[styles.playerCard, { borderColor: color }]}>
                <View style={[styles.playerAccent, { backgroundColor: color }]} />
                <View style={styles.playerContent}>
                  {player.photo_url ? (
                    <Image src={player.photo_url} style={[styles.playerPhoto, { borderColor: color, borderWidth: 2 }]} />
                  ) : (
                    <View style={styles.playerPhotoPlaceholder}>
                      <Text style={styles.playerPhotoInitial}>{player.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.full_name}</Text>
                    <View style={[styles.positionBadge, { backgroundColor: `${color}15`, borderColor: `${color}30`, borderWidth: 1 }]}>
                      <Text style={[styles.positionText, { color }]}>
                        {getShortPosition(player.position)}
                      </Text>
                    </View>
                    {player.current_club && (
                      <Text style={styles.playerClub}>{player.current_club}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.playerQuickStats}>
                  {player.age && (
                    <View style={styles.quickStatItem}>
                      <Text style={styles.quickStatValue}>{player.age}</Text>
                      <Text style={styles.quickStatLabel}>Anos</Text>
                    </View>
                  )}
                  {player.auto_rating !== null && (
                    <View style={[styles.quickStatItem, { flex: 1 }]}>
                      <Text style={[styles.quickStatValue, { 
                        fontSize: 16, 
                        color: player.auto_rating >= 70 ? PDF_COLORS.green : player.auto_rating >= 50 ? PDF_COLORS.amber : PDF_COLORS.red 
                      }]}>
                        {player.auto_rating.toFixed(1)}
                      </Text>
                      <Text style={styles.quickStatLabel}>Global</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Radar Chart Comparison */}
        {hasRadarData && (
          <View style={styles.radarSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: "#8b5cf6" }]} />
              <Text style={styles.sectionTitle}>Comparação de Atributos</Text>
            </View>
            <View style={styles.radarGrid}>
              <CompareRadarSvg playersData={playersRadarData} size={200} />
            </View>
            <View style={styles.radarLegend}>
              {playersRadarData.map((player, idx) => (
                <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: player.color }]} />
                  <Text style={styles.legendText}>{player.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Attributes Table */}
        {hasRadarData && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: "#8b5cf6" }]} />
              <Text style={styles.sectionTitle}>Atributos Calculados</Text>
            </View>
            <View style={styles.table}>
              {RADAR_LABELS.map((label, attrIdx) => {
                const fullLabels = ["Ataque", "Técnica", "Tático", "Defesa", "Criatividade"];
                const values = players.map((_, pIdx) => playersRadarData[pIdx]?.values[attrIdx] ?? null);
                const validValues = values.filter(v => v !== null) as number[];
                const allSame = validValues.length <= 1 || validValues.every(v => v === validValues[0]);
                const bestValue = allSame ? null : Math.max(...validValues);
                
                return (
                  <View key={label} style={styles.tableRow}>
                    <Text style={styles.tableLabelCell}>{fullLabels[attrIdx]}</Text>
                    {players.map((player, pIdx) => {
                      const val = playersRadarData[pIdx]?.values[attrIdx] ?? null;
                      const isBest = !allSame && val === bestValue;
                      const playerColor = playersRadarData[pIdx]?.color || PDF_COLORS.gray500;
                      
                      return (
                        <Text
                          key={player.id}
                          style={isBest
                            ? [styles.tableValueCellBest, { color: playerColor, backgroundColor: `${playerColor}10` }]
                            : styles.tableValueCell
                          }
                        >
                          {val !== null ? Math.round(val) : "—"}{isBest ? " ↑" : ""}
                        </Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Footer Page 1 */}
        <Text style={styles.footer}>
          {players.length} atletas • Relatório M3 Scouting • Página 1
        </Text>
      </Page>

      {/* Page 2 - Statistics Tables */}
      <Page size="A4" style={styles.page}>
        {/* Header Page 2 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Comparação de Atletas</Text>
            <Text style={styles.headerSubtitle}>
              Relatório gerado em {format(generatedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        </View>

        {/* Stats Table - Visão Geral */}
        <View style={styles.sectionHeader} wrap={false}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.orange }]} />
          <Text style={styles.sectionTitle}>Visão Geral</Text>
        </View>
        <View style={styles.table} wrap={false}>
          <StatRow label="Nota Global" getValue={(p) => p.auto_rating} formatType="decimal" />
          <StatRow label="Idade" getValue={(p) => p.age} higherIsBetter={false} />
          <StatRow label="Altura (cm)" getValue={(p) => p.height ?? null} />
          <StatRow label="Jogos" getValue={(p) => p.aggregatedStats?.matches ?? null} />
          <StatRow label="Minutos" getValue={(p) => p.aggregatedStats?.minutes ?? null} />
        </View>

        {/* Stats Table - Produção Ofensiva */}
        <View style={styles.sectionHeader} wrap={false}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.green }]} />
          <Text style={styles.sectionTitle}>Produção Ofensiva</Text>
        </View>
        <View style={styles.table} wrap={false}>
          <StatRow label="Gols" getValue={(p) => p.aggregatedStats?.goals ?? null} />
          <StatRow label="Assistências" getValue={(p) => p.aggregatedStats?.assists ?? null} />
          <StatRow label="Finalizações" getValue={(p) => p.aggregatedStats?.shots ?? null} />
          <StatRow label="Passes Decisivos" getValue={(p) => p.aggregatedStats?.key_passes ?? null} />
          <StatRow label="Chances Criadas" getValue={(p) => p.aggregatedStats?.chances_created ?? null} />
        </View>

        {/* Stats Table - Defesa */}
        <View style={styles.sectionHeader} wrap={false}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.blue }]} />
          <Text style={styles.sectionTitle}>Defesa e Recuperação</Text>
        </View>
        <View style={styles.table} wrap={false}>
          <StatRow label="Desarmes" getValue={(p) => p.aggregatedStats?.tackles ?? null} />
          <StatRow label="Interceptações" getValue={(p) => p.aggregatedStats?.interceptions ?? null} />
          <StatRow label="Recuperações" getValue={(p) => p.aggregatedStats?.recoveries ?? null} />
        </View>

        {/* Stats Table - Disciplina */}
        <View style={styles.sectionHeader} wrap={false}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.amber }]} />
          <Text style={styles.sectionTitle}>Disciplina</Text>
        </View>
        <View style={styles.table} wrap={false}>
          <StatRow label="Amarelos" getValue={(p) => p.aggregatedStats?.yellow_cards ?? null} higherIsBetter={false} />
          <StatRow label="Vermelhos" getValue={(p) => p.aggregatedStats?.red_cards ?? null} higherIsBetter={false} />
        </View>

        {/* Footer Page 2 */}
        <Text style={styles.footer}>
          {players.length} atletas • Relatório M3 Scouting • Página 2
        </Text>
      </Page>
    </Document>
  );
}
