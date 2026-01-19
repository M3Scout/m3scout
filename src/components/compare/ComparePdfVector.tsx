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
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDF_COLORS, POSITION_COLORS_PDF, formatNumber, formatPercent } from "@/lib/pdfStyles";
import { getPositionColor, getShortPosition } from "@/lib/positionColors";
import type { PlayerStatRow } from "@/lib/attributeRadar";

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
    fontFamily: "Inter",
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
    borderRadius: "8px 0 0 8px",
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
});

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

        {/* Stats Table - Visão Geral */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.orange }]} />
          <Text style={styles.sectionTitle}>Visão Geral</Text>
        </View>
        <View style={styles.table}>
          <StatRow label="Nota Global" getValue={(p) => p.auto_rating} formatType="decimal" />
          <StatRow label="Idade" getValue={(p) => p.age} higherIsBetter={false} />
          <StatRow label="Altura (cm)" getValue={(p) => p.height ?? null} />
          <StatRow label="Jogos" getValue={(p) => p.aggregatedStats?.matches ?? null} />
          <StatRow label="Minutos" getValue={(p) => p.aggregatedStats?.minutes ?? null} />
        </View>

        {/* Stats Table - Produção Ofensiva */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.green }]} />
          <Text style={styles.sectionTitle}>Produção Ofensiva</Text>
        </View>
        <View style={styles.table}>
          <StatRow label="Gols" getValue={(p) => p.aggregatedStats?.goals ?? null} />
          <StatRow label="Assistências" getValue={(p) => p.aggregatedStats?.assists ?? null} />
          <StatRow label="Finalizações" getValue={(p) => p.aggregatedStats?.shots ?? null} />
          <StatRow label="Passes Decisivos" getValue={(p) => p.aggregatedStats?.key_passes ?? null} />
          <StatRow label="Chances Criadas" getValue={(p) => p.aggregatedStats?.chances_created ?? null} />
        </View>

        {/* Stats Table - Defesa */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.blue }]} />
          <Text style={styles.sectionTitle}>Defesa e Recuperação</Text>
        </View>
        <View style={styles.table}>
          <StatRow label="Desarmes" getValue={(p) => p.aggregatedStats?.tackles ?? null} />
          <StatRow label="Interceptações" getValue={(p) => p.aggregatedStats?.interceptions ?? null} />
          <StatRow label="Recuperações" getValue={(p) => p.aggregatedStats?.recoveries ?? null} />
        </View>

        {/* Stats Table - Disciplina */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: PDF_COLORS.amber }]} />
          <Text style={styles.sectionTitle}>Disciplina</Text>
        </View>
        <View style={styles.table}>
          <StatRow label="Amarelos" getValue={(p) => p.aggregatedStats?.yellow_cards ?? null} higherIsBetter={false} />
          <StatRow label="Vermelhos" getValue={(p) => p.aggregatedStats?.red_cards ?? null} higherIsBetter={false} />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {players.length} atletas • Relatório M3 Scouting
        </Text>
      </Page>
    </Document>
  );
}
