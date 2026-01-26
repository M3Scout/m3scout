/**
 * Post-Game Insights PDF Section
 * 
 * PDF-compatible version of post-game analysis for @react-pdf/renderer:
 * - SECTION 1: "Mapas de Calor da Partida" - Exclusive heatmaps grid
 * - SECTION 2: "Resumo por Jogador" - Micro-insights and Strengths/Improvements (NO heatmaps)
 */

import React from "react";
import { View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { PDF_COLORS } from "@/lib/pdfStyles";
import {
  generatePostGameAnalysis,
  type PostGameAnalysis,
  type MatchStatsInput,
} from "@/lib/postGameAnalysis";
import { MiniFieldHeatmapPdf } from "./MiniFieldHeatmapPdf";
import {
  calculateZoneDeviation,
  calculateSeasonAverage,
  type ZoneDeviationResult,
  type PreviousGameZone,
} from "@/lib/zoneDeviationEngine";
import { generateCombinedInsight, type ZoneDeviationInsight } from "@/lib/zoneDeviationInsight";
import { calculateHalfComparison, splitStatsByHalf, type MatchEvent, type HalfComparisonResult } from "@/lib/halfComparisonEngine";
import { classifyGameProfile, type GameProfileResult, GAME_PROFILES } from "@/lib/playerGameProfileEngine";

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.gray200,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginBottom: 8,
  },
  // Heatmaps Grid
  heatmapsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  heatmapCard: {
    width: "31%",
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PDF_COLORS.gray200,
    alignItems: "center",
  },
  heatmapPlayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    width: "100%",
  },
  heatmapAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PDF_COLORS.gray300,
  },
  heatmapPlayerName: {
    fontSize: 8,
    fontWeight: 600,
    color: PDF_COLORS.gray900,
  },
  heatmapPlayerPosition: {
    fontSize: 6,
    color: PDF_COLORS.gray500,
  },
  // Summary section
  summaryRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 4,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: PDF_COLORS.gray200,
  },
  summaryPlayerInfo: {
    marginBottom: 4,
  },
  playerName: {
    fontSize: 9,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  playerPosition: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
  },
  indicatorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
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
    marginTop: 3,
  },
  strengthsTitle: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 2,
  },
  strengthItem: {
    fontSize: 6,
    color: PDF_COLORS.gray600,
    marginBottom: 1,
    paddingLeft: 6,
  },
  // Performance Profile Insight
  insightContainer: {
    marginTop: 3,
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: PDF_COLORS.gray200,
  },
  insightTitle: {
    fontSize: 6,
    fontWeight: 600,
    color: PDF_COLORS.gray500,
    marginBottom: 2,
  },
  insightTextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
  },
  insightArrow: {
    fontSize: 8,
    fontWeight: 700,
  },
  insightText: {
    fontSize: 7,
    color: PDF_COLORS.gray700,
    flex: 1,
  },
  // Half Comparison Insight
  halfInsightContainer: {
    marginTop: 3,
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: "#fef3c7", // amber-100
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#fcd34d", // amber-300
  },
  halfInsightTitle: {
    fontSize: 6,
    fontWeight: 600,
    color: "#92400E", // amber-800
    marginBottom: 2,
  },
  halfInsightText: {
    fontSize: 7,
    color: "#78350f", // amber-900
  },
  noData: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  // Game Profile Badge
  gameProfileContainer: {
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gameProfileIcon: {
    fontSize: 8,
  },
  gameProfileText: {
    fontSize: 7,
    fontWeight: 600,
  },
});

// ============================================
// HEATMAP CARD (for exclusive heatmaps section)
// ============================================

interface HeatmapCardPdfProps {
  playerName: string;
  position: string;
  photoUrl?: string | null;
  analysis: PostGameAnalysis;
  matchId: string;
  playerId: string;
}

function HeatmapCardPdf({ playerName, position, photoUrl, analysis, matchId, playerId }: HeatmapCardPdfProps) {
  return (
    <View style={styles.heatmapCard} wrap={false}>
      {/* Player Header */}
      <View style={styles.heatmapPlayerHeader}>
        {photoUrl ? (
          <Image src={photoUrl} style={styles.heatmapAvatar} />
        ) : (
          <View style={styles.heatmapAvatar} />
        )}
        <View>
          <Text style={styles.heatmapPlayerName}>{playerName}</Text>
          <Text style={styles.heatmapPlayerPosition}>{position}</Text>
        </View>
      </View>

      {/* Mini Field Heatmap - Main Visual */}
      <MiniFieldHeatmapPdf
        percentages={analysis.zoneHeatmap.percentages}
        matchId={matchId}
        playerId={playerId}
        width={100}
        height={130}
        showLegend={true}
      />
    </View>
  );
}

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
// PERFORMANCE PROFILE INSIGHT PDF COMPONENT
// ============================================

interface PerformanceProfileInsightPdfProps {
  insight: ZoneDeviationInsight | null;
}

function PerformanceProfileInsightPdf({ insight }: PerformanceProfileInsightPdfProps) {
  // Don't render if no insight
  if (!insight) {
    return null;
  }

  const arrowColor = insight.direction === "up" ? "#065F46" : "#92400E";

  return (
    <View style={styles.insightContainer}>
      <Text style={styles.insightTitle}>Perfil de Atuação</Text>
      <View style={styles.insightTextRow}>
        <Text style={[styles.insightArrow, { color: arrowColor }]}>
          {insight.icon}
        </Text>
        <Text style={styles.insightText}>{insight.text}</Text>
      </View>
    </View>
  );
}

// ============================================
// HALF COMPARISON INSIGHT PDF COMPONENT
// ============================================

interface HalfComparisonInsightPdfProps {
  halfResult: HalfComparisonResult | null;
}

function HalfComparisonInsightPdf({ halfResult }: HalfComparisonInsightPdfProps) {
  // Don't render if no change or no insight
  if (!halfResult || !halfResult.hasChange || !halfResult.insightText) {
    return null;
  }

  const icon = halfResult.primaryTrend === "more_offensive" 
    ? "⚡" 
    : halfResult.primaryTrend === "more_defensive" 
      ? "🛡️" 
      : "⚖️";

  return (
    <View style={styles.halfInsightContainer}>
      <Text style={styles.halfInsightTitle}>Evolução por Tempo</Text>
      <Text style={styles.halfInsightText}>
        {icon} {halfResult.insightText}
      </Text>
    </View>
  );
}

// ============================================
// PLAYER SUMMARY ROW (NO heatmap)
// ============================================

// ============================================
// GAME PROFILE BADGE PDF COMPONENT
// ============================================

interface GameProfileBadgePdfProps {
  profileResult: GameProfileResult | null;
}

function GameProfileBadgePdf({ profileResult }: GameProfileBadgePdfProps) {
  if (!profileResult || !profileResult.hasData) {
    return null;
  }

  const { profile } = profileResult;
  
  // Map profile to PDF colors
  const profileColors: Record<string, { bg: string; border: string; text: string }> = {
    low_participation: { bg: "#71717a20", border: "#71717a50", text: "#71717a" },
    defensive_active: { bg: "#0ea5e920", border: "#0ea5e950", text: "#0284c7" },
    offensive_direct: { bg: "#10b98120", border: "#10b98150", text: "#059669" },
    builder: { bg: "#f59e0b20", border: "#f59e0b50", text: "#d97706" },
    balanced: { bg: "#8b5cf620", border: "#8b5cf650", text: "#7c3aed" },
  };

  const colors = profileColors[profile.key] || profileColors.balanced;

  return (
    <View style={[styles.gameProfileContainer, { 
      backgroundColor: colors.bg, 
      borderColor: colors.border 
    }]}>
      <Text style={styles.gameProfileIcon}>{profile.icon}</Text>
      <Text style={[styles.gameProfileText, { color: colors.text }]}>
        Perfil: {profile.label}
      </Text>
    </View>
  );
}

// ============================================
// PLAYER SUMMARY ROW (NO heatmap)
// ============================================

interface PlayerSummaryRowPdfProps {
  playerName: string;
  position: string;
  analysis: PostGameAnalysis;
  insight: ZoneDeviationInsight | null;
  halfResult: HalfComparisonResult | null;
  profileResult: GameProfileResult | null;
}

function PlayerSummaryRowPdf({ playerName, position, analysis, insight, halfResult, profileResult }: PlayerSummaryRowPdfProps) {
  const { quickIndicators, strengthsImprovements } = analysis;

  return (
    <View style={styles.summaryRow} wrap={false}>
      <View style={{ flex: 1 }}>
        {/* Player info */}
        <View style={styles.summaryPlayerInfo}>
          <Text style={styles.playerName}>{playerName}</Text>
          <Text style={styles.playerPosition}>{position}</Text>
        </View>

        {/* Game Profile Badge */}
        <GameProfileBadgePdf profileResult={profileResult} />

        {/* Performance Profile Insight - Contextual text */}
        <PerformanceProfileInsightPdf insight={insight} />

        {/* Half Comparison Insight - 1st vs 2nd half */}
        <HalfComparisonInsightPdf halfResult={halfResult} />

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

        {/* Two-column layout for strengths/improvements */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Strengths */}
          {strengthsImprovements.strengths.length > 0 && (
            <View style={[styles.strengthsSection, { flex: 1 }]}>
              <Text style={[styles.strengthsTitle, { color: "#065F46" }]}>✓ Pontos Fortes</Text>
              {strengthsImprovements.strengths.slice(0, 2).map((s, i) => (
                <Text key={i} style={styles.strengthItem}>• {s}</Text>
              ))}
            </View>
          )}

          {/* Improvements */}
          {strengthsImprovements.improvements.length > 0 && (
            <View style={[styles.strengthsSection, { flex: 1 }]}>
              <Text style={[styles.strengthsTitle, { color: "#92400E" }]}>⚠ A Melhorar</Text>
              {strengthsImprovements.improvements.slice(0, 2).map((s, i) => (
                <Text key={i} style={styles.strengthItem}>• {s}</Text>
              ))}
            </View>
          )}
        </View>
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

interface PlayerZoneHistoryMap {
  [playerId: string]: PreviousGameZone[] | undefined;
}

interface PostGameInsightsPdfProps {
  matchPlayers: MatchPlayer[];
  playerStatsMap: PlayerStatsMap;
  matchDuration?: number;
  selectedPlayerIds?: string[];
  matchId: string;
  /** Optional: Pre-fetched zone history for each player */
  playerZoneHistoryMap?: PlayerZoneHistoryMap;
}

export function PostGameInsightsPdf({
  matchPlayers,
  playerStatsMap,
  matchDuration = 90,
  selectedPlayerIds,
  matchId,
  playerZoneHistoryMap = {},
}: PostGameInsightsPdfProps) {
  // Filter players - CRITICAL: Only include players who actually played
  const filteredPlayers = selectedPlayerIds && selectedPlayerIds.length > 0
    ? matchPlayers.filter((mp) => selectedPlayerIds.includes(mp.player_id))
    : matchPlayers;

  // Generate analyses with deviation insights
  // CRITICAL FIX: Filter out players with 0 minutes - they should NEVER have a heatmap
  const playerAnalyses = filteredPlayers
    .filter((mp) => {
      // Must have valid player data
      if (!mp.player) return false;
      
      // CRITICAL: Player must have actually played (> 0 minutes)
      // If minutes_played is null or 0, the player didn't enter the field
      const minutesPlayed = mp.minutes_played ?? 0;
      if (minutesPlayed <= 0) return false;
      
      return true;
    })
    .map((mp) => {
      const stats = playerStatsMap[mp.player_id] ?? {};
      // Use actual minutes played (already validated > 0 in filter)
      const minutesPlayed = mp.minutes_played ?? 0;
      const position = mp.player?.position ?? "Meio";

      const analysis = generatePostGameAnalysis(position, stats, minutesPlayed);

      // Calculate deviation if zone history is available
      const previousGames = playerZoneHistoryMap[mp.player_id] ?? [];
      let insight: ZoneDeviationInsight | null = null;
      
      if (previousGames.length >= 3) {
        const deviationResult = calculateZoneDeviation(
          analysis.zoneHeatmap.percentages,
          previousGames,
          matchId
        );
        insight = generateCombinedInsight(deviationResult);
      }

      // Calculate half comparison (no events in PDF, use 50/50 split)
      const { firstHalf, secondHalf } = splitStatsByHalf([], stats);
      const halfResult = calculateHalfComparison(position, firstHalf, secondHalf);

      // Calculate game profile
      const profileResult = classifyGameProfile({
        ...stats,
        zoneDistribution: analysis.zoneHeatmap.percentages,
      });

      return {
        player: mp,
        analysis,
        insight,
        halfResult,
        profileResult,
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
      {/* ============================================ */}
      {/* SECTION 1: Mapas de Calor da Partida */}
      {/* ============================================ */}
      <Text style={styles.sectionTitle}>📍 Mapas de Calor da Partida</Text>
      <Text style={styles.sectionSubtitle}>Distribuição de atuação por zonas do campo</Text>
      
      <View style={styles.heatmapsGrid}>
        {playerAnalyses.map(({ player, analysis }) => (
          <HeatmapCardPdf
            key={player.id}
            playerName={player.player?.full_name ?? "Jogador"}
            position={player.player?.position ?? "N/A"}
            photoUrl={player.player?.photo_url}
            analysis={analysis}
            matchId={matchId}
            playerId={player.player_id}
          />
        ))}
      </View>

      {/* ============================================ */}
      {/* SECTION 2: Resumo por Jogador */}
      {/* ============================================ */}
      <Text style={styles.sectionTitle}>📊 Resumo por Jogador</Text>
      <Text style={styles.sectionSubtitle}>Indicadores rápidos e pontos-chave</Text>

      {playerAnalyses.map(({ player, analysis, insight, halfResult, profileResult }) => (
        <PlayerSummaryRowPdf
          key={player.id}
          playerName={player.player?.full_name ?? "Jogador"}
          position={player.player?.position ?? "N/A"}
          analysis={analysis}
          insight={insight}
          halfResult={halfResult}
          profileResult={profileResult}
        />
      ))}
    </View>
  );
}
