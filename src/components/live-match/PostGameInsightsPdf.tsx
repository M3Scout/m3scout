/**
 * Post-Game Insights PDF Section
 * 
 * PDF-compatible version of post-game analysis for @react-pdf/renderer:
 * - Mini-Field Heatmap (seeded points visualization)
 * - Quick Indicators (key metrics)
 * - Strengths / Areas to Improve
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PDF_COLORS } from "@/lib/pdfStyles";
import {
  generatePostGameAnalysis,
  type PostGameAnalysis,
  type MatchStatsInput,
} from "@/lib/postGameAnalysis";
import { MiniFieldHeatmapPdf } from "./MiniFieldHeatmapPdf";

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.gray200,
  },
  playerRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: PDF_COLORS.gray200,
  },
  zoneColumn: {
    width: 95,
    marginRight: 8,
  },
  contentColumn: {
    flex: 1,
  },
  playerName: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginBottom: 6,
  },
  indicatorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  indicatorBadge: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    borderWidth: 1,
  },
  indicatorText: {
    fontSize: 7,
    fontWeight: 600,
  },
  strengthsSection: {
    marginTop: 4,
  },
  strengthsTitle: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 2,
  },
  strengthItem: {
    fontSize: 7,
    color: PDF_COLORS.gray600,
    marginBottom: 1,
    paddingLeft: 6,
  },
  zoneLabel: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
    textAlign: "center",
    marginTop: 2,
  },
  noData: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
});

// ============================================
// INDICATOR BADGE
// ============================================

interface IndicatorBadgeProps {
  icon: string;
  value: string | number;
  type: "positive" | "neutral" | "negative";
}

function IndicatorBadge({ icon, value, type }: IndicatorBadgeProps) {
  const colors = {
    positive: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
    neutral: { bg: PDF_COLORS.gray100, text: PDF_COLORS.gray700, border: PDF_COLORS.gray300 },
    negative: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  };

  const { bg, text, border } = colors[type];

  return (
    <View style={[styles.indicatorBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.indicatorText, { color: text }]}>
        {icon} {value}
      </Text>
    </View>
  );
}

// ============================================
// PLAYER INSIGHT ROW
// ============================================

interface PlayerInsightRowPdfProps {
  playerName: string;
  position: string;
  analysis: PostGameAnalysis;
  matchId: string;
  playerId: string;
}

function PlayerInsightRowPdf({ playerName, position, analysis, matchId, playerId }: PlayerInsightRowPdfProps) {
  const { quickIndicators, strengthsImprovements } = analysis;

  return (
    <View style={styles.playerRow} wrap={false}>
      {/* Mini Field Heatmap */}
      <View style={styles.zoneColumn}>
        <MiniFieldHeatmapPdf
          percentages={analysis.zoneHeatmap.percentages}
          matchId={matchId}
          playerId={playerId}
          width={90}
          height={120}
          showLegend={true}
        />
      </View>

      {/* Content */}
      <View style={styles.contentColumn}>
        {/* Player info */}
        <Text style={styles.playerName}>{playerName}</Text>
        <Text style={styles.playerPosition}>{position}</Text>

        {/* Quick Indicators */}
        {quickIndicators.length > 0 && (
          <View style={styles.indicatorsRow}>
            {quickIndicators.slice(0, 4).map((indicator) => (
              <IndicatorBadge
                key={indicator.id}
                icon={indicator.icon}
                value={indicator.value}
                type={indicator.type}
              />
            ))}
          </View>
        )}

        {/* Strengths */}
        {strengthsImprovements.strengths.length > 0 && (
          <View style={styles.strengthsSection}>
            <Text style={[styles.strengthsTitle, { color: "#065F46" }]}>✓ Pontos Fortes</Text>
            {strengthsImprovements.strengths.slice(0, 2).map((s, i) => (
              <Text key={i} style={styles.strengthItem}>• {s}</Text>
            ))}
          </View>
        )}

        {/* Improvements */}
        {strengthsImprovements.improvements.length > 0 && (
          <View style={styles.strengthsSection}>
            <Text style={[styles.strengthsTitle, { color: "#92400E" }]}>⚠ A Melhorar</Text>
            {strengthsImprovements.improvements.slice(0, 2).map((s, i) => (
              <Text key={i} style={styles.strengthItem}>• {s}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface MatchPlayer {
  id: string;
  player_id: string;
  started: boolean;
  minutes_played: number | null;
  position_template: string;
  player?: {
    id: string;
    full_name: string;
    position: string;
    photo_url: string | null;
  } | null;
}

interface PlayerStatsMap {
  [playerId: string]: MatchStatsInput | undefined;
}

interface PostGameInsightsPdfProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: PlayerStatsMap;
  matchDuration?: number;
  selectedPlayerIds?: string[];
  matchId: string;
}

export function PostGameInsightsPdf({
  matchPlayers,
  playerStatsMap,
  matchDuration = 90,
  selectedPlayerIds,
  matchId,
}: PostGameInsightsPdfProps) {
  // Filter players
  const filteredPlayers = selectedPlayerIds && selectedPlayerIds.length > 0
    ? matchPlayers.filter((mp) => selectedPlayerIds.includes(mp.player_id))
    : matchPlayers;

  // Generate analyses
  const playerAnalyses = filteredPlayers
    .filter((mp) => mp.player)
    .map((mp) => {
      const stats = playerStatsMap[mp.player_id] ?? {};
      const minutesPlayed = mp.minutes_played ?? matchDuration;
      const position = mp.player?.position ?? "Meio";

      const analysis = generatePostGameAnalysis(position, stats, minutesPlayed);

      return {
        player: mp,
        analysis,
        // Sort score: positive indicators and strengths first
        sortScore:
          analysis.quickIndicators.filter((i) => i.type === "positive").length * 2 +
          analysis.strengthsImprovements.strengths.length -
          analysis.strengthsImprovements.improvements.length,
      };
    })
    .sort((a, b) => b.sortScore - a.sortScore);

  if (playerAnalyses.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Análise Pós-Jogo</Text>
        <Text style={styles.noData}>Nenhum jogador para análise</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Análise Pós-Jogo — Zonas, Indicadores e Pontos-Chave</Text>

      {playerAnalyses.map(({ player, analysis }) => (
        <PlayerInsightRowPdf
          key={player.id}
          playerName={player.player?.full_name ?? "Jogador"}
          position={player.player?.position ?? "N/A"}
          analysis={analysis}
          matchId={matchId}
          playerId={player.player_id}
        />
      ))}
    </View>
  );
}
