/**
 * Match Summary PDF using @react-pdf/renderer
 * Vector-based PDF for crisp text rendering
 * 
 * Supports:
 * - Complete statistics by half (using matchStatsDefinitions)
 * - Player activity heatmap
 * - Event distribution summary
 * - Filter by specific players
 */
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Line as SvgLine,
  Rect,
  Circle,
  G,
  Path,
  Polyline,
  Defs,
  LinearGradient,
  Stop,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDF_COLORS } from "@/lib/pdfStyles";
import { Match, MatchPlayer, MatchEvent, MatchEventType, MatchPlayerStats } from "@/hooks/useLiveMatch";
import { calculateMinutesPlayed } from "@/lib/minutesPlayed";
import { calculatePlayerMatchRating, getRatingBgColor, matchPlayerStatsToInput } from "@/lib/matchRatingEngine";
import { classifyMatchProfile, type MatchProfileKey } from "@/lib/matchProfileEngine";
import { calculateMatchEfficiency, getEfficiencyColorHex, getEfficiencyBgColorHex, type EfficiencyLevel } from "@/lib/matchEfficiencyEngine";
import { generateScoutingText } from "@/lib/scoutingTextEngine";
import { generatePostGameAnalysis, type MatchStatsInput } from "@/lib/postGameAnalysis";
import { calculateBallActionsFromMatchStats } from "@/lib/derivedBallActions";
import { MiniFieldHeatmapPdf } from "./MiniFieldHeatmapPdf";
import {
  EVENT_TYPE_CONFIG,
  COMPUTED_STATS,
  SUMMARY_EVENT_TYPES,
  EventCountsMap,
} from "@/lib/matchStatsDefinitions";

// Efficiency colors for PDF
const EFFICIENCY_COLORS: Record<EfficiencyLevel | "none", { bg: string; text: string; label: string }> = {
  high: { bg: "#D1FAE5", text: "#065F46", label: "Alta" },
  medium: { bg: "#FEF3C7", text: "#92400E", label: "Média" },
  low: { bg: "#FEE2E2", text: "#991B1B", label: "Baixa" },
  none: { bg: "#E5E7EB", text: "#6B7280", label: "—" },
};

// Profile colors for PDF
const PROFILE_COLORS: Record<MatchProfileKey, { bg: string; text: string }> = {
  decisive_efficient: { bg: "#DCFCE7", text: "#166534" },
  participative_impact: { bg: "#D1FAE5", text: "#065F46" },
  participative_no_impact: { bg: "#FFEDD5", text: "#C2410C" },
  efficient_low_volume: { bg: "#FEF3C7", text: "#92400E" },
  unproductive_volume: { bg: "#FEE2E2", text: "#991B1B" },
  defensive_dominant: { bg: "#DBEAFE", text: "#1E40AF" },
  defensive_consistent: { bg: "#CFFAFE", text: "#0E7490" },
  high_defensive_risk: { bg: "#FECACA", text: "#B91C1C" },
  low_general_impact: { bg: "#E5E7EB", text: "#374151" },
};

// Event type labels (backup)
const EVENT_LABELS: Record<MatchEventType, string> = {
  // Attack
  goal: "Gol",
  shot_on_target: "Finalização Gol",
  shot: "Finalização Fora",
  shot_blocked: "Final. Bloqueada",
  offside: "Impedimento",
  // Passing
  assist: "Assistência",
  key_pass: "Passe Decisivo",
  chance_created: "Chance Criada",
  pass_success: "Passe Certo",
  pass_total: "Passe Errado",
  cross_success: "Cruz. Certo",
  cross_failed: "Cruz. Errado",
  // Dribbles/Possession
  ball_action: "Ação c/ Bola",
  dribble_success: "Drible Certo",
  dribble_attempt: "Drible Errado",
  foul_suffered: "Falta Sofrida",
  possession_lost: "Bola Perdida",
  // Defense
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  blocked_shot: "Chute Bloqueado",
  was_dribbled: "Driblado",
  ground_duel_won: "Duelo no Chão",
  ground_duel_total: "Duelo no Chão (Perdido)",
  duel_won: "Duelo Ganho",
  duel_total: "Duelo Total",
  aerial_duel_won: "Duelo Aéreo",
  aerial_duel_total: "Duelo Aéreo (Perdido)",
  foul_committed: "Falta Cometida",
  yellow: "Amarelo",
  red: "Vermelho",
  // Goalkeeper
  save: "Defesa",
  goal_conceded: "Gol Sofrido",
  clean_sheet: "Clean Sheet",
  penalty_saved: "Pênalti Def.",
  error_led_to_goal: "Erro→Gol",
  box_save: "Def. Área",
  punch: "Soco",
  high_claim: "Bola Alta",
  sweeper_action: "Saída Gol",
  // Meta
  substitution: "Substituição",
  player_on: "Entrou",
  player_off: "Saiu",
};

// Heatmap intensity colors
const HEATMAP_COLORS = {
  offField: "#E5E7EB", // gray-200
  noEvents: "#F3F4F6", // gray-100
  low: "#86EFAC", // green-300
  medium: "#FDE047", // yellow-300
  high: "#FB923C", // orange-400
  veryHigh: "#EF4444", // red-500
};

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
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `2px solid ${PDF_COLORS.brandRed}`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    height: 44,
    objectFit: "contain" as const,
  },
  logoSmall: {
    height: 28,
    objectFit: "contain" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 10,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  matchDate: {
    fontSize: 10,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  matchVenue: {
    fontSize: 9,
    color: PDF_COLORS.gray400,
    marginTop: 2,
  },
  playerFilter: {
    fontSize: 10,
    color: PDF_COLORS.brandRed,
    marginTop: 4,
    fontWeight: 700,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  statCardGreen: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  statCardBlue: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    textAlign: "center",
  },
  statValueGreen: {
    fontSize: 22,
    fontWeight: 700,
    color: PDF_COLORS.green,
    textAlign: "center",
  },
  statValueBlue: {
    fontSize: 22,
    fontWeight: 700,
    color: PDF_COLORS.blue,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginTop: 4,
    textAlign: "center",
  },
  // Section - Anti-orphan container
  sectionBlock: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginBottom: 8,
    marginTop: -6,
  },
  // Table
  table: {
    marginBottom: 14,
    borderRadius: 6,
    border: `1px solid ${PDF_COLORS.gray200}`,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.gray100,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    fontWeight: 600,
    textAlign: "center",
    color: PDF_COLORS.gray600,
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableHeaderCellWide: {
    flex: 2,
    padding: 5,
    fontSize: 9,
    fontWeight: 600,
    textAlign: "center",
    color: PDF_COLORS.gray600,
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableRow: {
    flexDirection: "row",
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableCellWide: {
    flex: 2,
    padding: 4,
    fontSize: 8,
    color: PDF_COLORS.gray600,
    textAlign: "center",
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableCellLabel: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    color: PDF_COLORS.gray600,
    textAlign: "center",
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  // Events Grid
  eventsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  eventsColumn: {
    flex: 1,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 6,
    padding: 10,
    backgroundColor: PDF_COLORS.white,
  },
  eventsColumnTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: PDF_COLORS.gray700,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    minHeight: 12,
  },
  eventItemCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    minHeight: 10,
  },
  eventMinute: {
    backgroundColor: PDF_COLORS.gray200,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 600,
    marginRight: 6,
    minWidth: 24,
    textAlign: "center",
  },
  eventType: {
    fontSize: 8,
    fontWeight: 600,
    color: PDF_COLORS.gray800,
    marginRight: 3,
  },
  eventPlayer: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    flex: 1,
  },
  // Event Summary Totals
  eventSummaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 10,
    padding: 8,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 4,
  },
  eventSummaryTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: PDF_COLORS.gray700,
    marginBottom: 4,
    width: "100%",
  },
  eventSummaryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PDF_COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    border: `1px solid ${PDF_COLORS.gray200}`,
  },
  eventSummaryChipLabel: {
    fontSize: 7,
    color: PDF_COLORS.gray600,
    marginRight: 4,
  },
  eventSummaryChipValue: {
    fontSize: 8,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  // Players Grid
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerCard: {
    width: "48%",
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 6,
    padding: 10,
    backgroundColor: PDF_COLORS.white,
  },
  playerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  playerPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PDF_COLORS.gray200,
  },
  playerPhotoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PDF_COLORS.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPhotoInitials: {
    fontSize: 12,
    fontWeight: 700,
    color: PDF_COLORS.gray500,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 10,
    fontWeight: 600,
    color: PDF_COLORS.gray900,
  },
  playerPosition: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  playerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  playerBadgeStarter: {
    backgroundColor: "#DCFCE7", // green-100
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 600,
    color: "#166534", // green-800
  },
  playerBadgeSub: {
    backgroundColor: "#DBEAFE", // blue-100
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 600,
    color: "#1E40AF", // blue-800
  },
  playerMinutes: {
    backgroundColor: PDF_COLORS.gray100,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    color: PDF_COLORS.gray600,
  },
  playerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  playerStatBadge: {
    backgroundColor: PDF_COLORS.gray100,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    color: PDF_COLORS.gray700,
  },
  noStats: {
    fontSize: 8,
    color: PDF_COLORS.gray300,
  },
  // Distribution summary
  distributionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  distributionCard: {
    flex: 1,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  distributionCardHighlight: {
    flex: 1,
    backgroundColor: "#FEF3C7", // amber-100
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  distributionLabel: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
    marginTop: 3,
  },
  // Heatmap
  heatmapContainer: {
    marginBottom: 14,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 6,
    padding: 10,
  },
  heatmapLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  heatmapLegendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heatmapLegendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  heatmapLegendText: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
  },
  heatmapHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  heatmapPlayerCol: {
    width: 100,
  },
  heatmapCellsHeader: {
    flex: 1,
    flexDirection: "row",
  },
  heatmapTimeLabel: {
    flex: 1,
    fontSize: 7,
    textAlign: "center",
    color: PDF_COLORS.gray400,
  },
  heatmapTotalCol: {
    width: 32,
    fontSize: 7,
    textAlign: "center",
    color: PDF_COLORS.gray500,
    fontWeight: 600,
  },
  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  heatmapPlayerInfo: {
    width: 100,
    paddingRight: 8,
  },
  heatmapPlayerName: {
    fontSize: 8,
    fontWeight: 600,
    color: PDF_COLORS.gray900,
  },
  heatmapPlayerPosition: {
    fontSize: 6,
    color: PDF_COLORS.gray400,
  },
  heatmapCells: {
    flex: 1,
    flexDirection: "row",
    gap: 2,
  },
  heatmapCell: {
    flex: 1,
    height: 14,
    borderRadius: 2,
  },
  heatmapTotal: {
    width: 32,
    fontSize: 9,
    fontWeight: 600,
    textAlign: "center",
    color: PDF_COLORS.gray700,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 7,
    color: PDF_COLORS.gray400,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    paddingTop: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 32,
    fontSize: 7,
    color: PDF_COLORS.gray400,
  },
});

interface MatchSummaryVectorPdfProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
  playerStatsMap?: Record<string, MatchPlayerStats>;
  teamName: string;
  logoUrl?: string;
  selectedPlayerIds?: string[]; // Filter for specific players
}

// Heatmap interval size in minutes
const HEATMAP_INTERVAL = 5;

export function MatchSummaryVectorPdf({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
  playerStatsMap = {},
  teamName,
  logoUrl,
  selectedPlayerIds,
}: MatchSummaryVectorPdfProps) {
  // Determine match duration
  const matchDuration = match.duration_minutes || 90;
  
  // Filter players if selectedPlayerIds is provided
  const filteredPlayers = selectedPlayerIds && selectedPlayerIds.length > 0
    ? matchPlayers.filter((mp) => selectedPlayerIds.includes(mp.player_id))
    : matchPlayers;

  // Filter events for selected players
  const filteredEvents = selectedPlayerIds && selectedPlayerIds.length > 0
    ? matchEvents.filter((e) => selectedPlayerIds.includes(e.player_id))
    : matchEvents;

  // Calculate stats by half using the same logic as HalfStatsComparison
  const getHalfStats = () => {
    const eventCounts: EventCountsMap = {};
    
    filteredEvents.forEach((event) => {
      if (event.event_status === "voided" || !event.count_in_stats) return;
      
      const half = event.half === 2 ? "second" : "first";
      const eventType = event.event_type as MatchEventType;
      
      if (!eventCounts[eventType]) {
        eventCounts[eventType] = { first: 0, second: 0 };
      }
      eventCounts[eventType]![half] += event.value || 1;
    });

    // Count substitutions
    let subsFirstHalf = 0;
    let subsSecondHalf = 0;
    filteredEvents.forEach((event) => {
      if (event.event_type === "player_on" && event.event_status !== "voided") {
        if (event.half === 2 || event.period === 2) {
          subsSecondHalf++;
        } else {
          subsFirstHalf++;
        }
      }
    });

    // Build stats rows
    interface StatsRow {
      id: string;
      label: string;
      icon: string;
      first: number;
      second: number;
      total: number;
      order: number;
    }
    
    const rows: StatsRow[] = [];
    
    // Add direct event type rows
    SUMMARY_EVENT_TYPES.forEach((type) => {
      const counts = eventCounts[type];
      if (!counts) return;
      
      const total = counts.first + counts.second;
      if (total > 0) {
        const config = EVENT_TYPE_CONFIG[type];
        rows.push({
          id: type,
          label: config.label,
          icon: config.icon,
          first: counts.first,
          second: counts.second,
          total,
          order: config.order,
        });
      }
    });

    // Add computed stats
    COMPUTED_STATS.forEach((computedStat) => {
      const computed = computedStat.compute(eventCounts);
      const total = computed.first + computed.second;
      if (total > 0) {
        rows.push({
          id: computedStat.id,
          label: computedStat.label,
          icon: computedStat.icon,
          first: computed.first,
          second: computed.second,
          total,
          order: computedStat.order,
        });
      }
    });

    // Sort by order
    rows.sort((a, b) => a.order - b.order);

    return {
      rows,
      substitutions: { first: subsFirstHalf, second: subsSecondHalf },
      totals: {
        goals: (eventCounts.goal?.first || 0) + (eventCounts.goal?.second || 0),
        assists: (eventCounts.assist?.first || 0) + (eventCounts.assist?.second || 0),
      }
    };
  };

  // Calculate event distribution summary
  const getDistributionStats = () => {
    const validEvents = filteredEvents.filter(
      (e) => e.event_status !== "voided" && e.count_in_stats !== false
    );
    const firstHalfEvents = validEvents.filter((e) => e.half === 1).length;
    const secondHalfEvents = validEvents.filter((e) => e.half === 2).length;
    
    // Find peak minute
    const minuteCounts: Record<number, number> = {};
    validEvents.forEach((event) => {
      let eventMinute: number | null = event.minute;
      if (eventMinute === null && event.game_time_seconds !== null) {
        eventMinute = Math.floor(event.game_time_seconds / 60);
      }
      if (eventMinute !== null && eventMinute >= 0) {
        minuteCounts[eventMinute] = (minuteCounts[eventMinute] || 0) + 1;
      }
    });

    let peakMinute = 0;
    let peakCount = 0;
    Object.entries(minuteCounts).forEach(([min, count]) => {
      if (count > peakCount) {
        peakCount = count;
        peakMinute = parseInt(min);
      }
    });

    return {
      firstHalf: firstHalfEvents,
      secondHalf: secondHalfEvents,
      peakMinute,
      peakCount,
      total: validEvents.length,
    };
  };

  // Calculate chart data for distribution graph (events per minute + smoothed)
  const getChartData = () => {
    const validEvents = filteredEvents.filter(
      (e) => e.event_status !== "voided" && e.count_in_stats !== false
    );
    
    // Create array with all minutes (0 to matchDuration)
    const data: Array<{ minute: number; total: number; smoothed: number; goals: number }> = [];
    for (let i = 0; i <= matchDuration; i++) {
      data.push({ minute: i, total: 0, smoothed: 0, goals: 0 });
    }

    // Count events per minute
    validEvents.forEach((event) => {
      let eventMinute: number | null = event.minute;
      if (eventMinute === null && event.game_time_seconds !== null) {
        eventMinute = Math.floor(event.game_time_seconds / 60);
      }
      if (eventMinute === null || eventMinute < 0 || eventMinute > matchDuration + 15) return;
      
      const idx = Math.min(Math.floor(eventMinute), data.length - 1);
      if (idx >= 0 && idx < data.length) {
        data[idx].total++;
        if (event.event_type === "goal") data[idx].goals++;
      }
    });

    // Apply 5-minute moving average for smoothed line
    const smoothedData = data.map((point, idx) => {
      const windowSize = 5;
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(data.length - 1, idx + Math.floor(windowSize / 2));
      
      let sum = 0;
      let count = 0;
      for (let i = start; i <= end; i++) {
        sum += data[i].total;
        count++;
      }
      
      return {
        ...point,
        smoothed: count > 0 ? Number((sum / count).toFixed(2)) : 0,
      };
    });

    // Find max for Y scaling
    const maxEvents = Math.max(...smoothedData.map(d => Math.max(d.total, d.smoothed)), 1);
    
    // Get goal minutes for markers
    const goalMinutes = smoothedData.filter(d => d.goals > 0).map(d => d.minute);

    return { data: smoothedData, maxEvents, goalMinutes };
  };

  // Calculate heatmap data
  const getHeatmapData = () => {
    const intervals = Math.ceil(matchDuration / HEATMAP_INTERVAL);
    const EXCLUDED_EVENT_TYPES = ["player_on", "player_off", "substitution"];
    
    const activePlayers = filteredPlayers.filter(
      (mp) => mp.player && !mp.is_removed
    );

    const playerData = activePlayers.map((mp) => {
      const playerEvents = filteredEvents.filter((e) => {
        if (e.player_id !== mp.player_id) return false;
        if (e.event_status === "voided") return false;
        if (e.count_in_stats === false) return false;
        if (EXCLUDED_EVENT_TYPES.includes(e.event_type)) return false;
        return e.game_time_seconds !== null || e.minute !== null;
      });

      const intervalCounts: number[] = [];
      for (let i = 0; i < intervals; i++) {
        const start = i * HEATMAP_INTERVAL;
        const end = (i + 1) * HEATMAP_INTERVAL;
        
        const count = playerEvents.filter((e) => {
          const eventMinute = e.game_time_seconds !== null 
            ? Math.floor(e.game_time_seconds / 60) 
            : e.minute;
          if (eventMinute === null) return false;
          return eventMinute >= start && eventMinute < end;
        }).length;
        
        intervalCounts.push(count);
      }

      return {
        player: mp,
        intervalCounts,
        totalEvents: playerEvents.length,
      };
    });

    // Sort by total events
    playerData.sort((a, b) => b.totalEvents - a.totalEvents);

    // Find global max for color scaling
    const globalMax = Math.max(...playerData.flatMap((p) => p.intervalCounts), 1);

    return { playerData, intervals, globalMax };
  };

  // Group events by half - ONLY include active (non-voided) events
  const getEventsByHalf = () => {
    const first: MatchEvent[] = [];
    const second: MatchEvent[] = [];

    filteredEvents.forEach((event) => {
      // CRITICAL: Skip voided events - they should NOT appear in event lists
      if (event.event_status === "voided" || event.count_in_stats === false) return;
      
      if (event.half === 2) {
        second.push(event);
      } else {
        first.push(event);
      }
    });

    const sortByMinute = (a: MatchEvent, b: MatchEvent) => (a.minute ?? 0) - (b.minute ?? 0);
    
    return {
      firstHalf: first.sort(sortByMinute),
      secondHalf: second.sort(sortByMinute),
    };
  };

  const getPlayerName = (playerId: string) => {
    const mp = matchPlayers.find((p) => p.player_id === playerId);
    return mp?.player?.full_name || "Jogador";
  };

  const getHeatmapColor = (count: number, globalMax: number): string => {
    if (count === 0) return HEATMAP_COLORS.noEvents;
    const intensity = count / globalMax;
    if (intensity >= 0.8) return HEATMAP_COLORS.veryHigh;
    if (intensity >= 0.6) return HEATMAP_COLORS.high;
    if (intensity >= 0.4) return HEATMAP_COLORS.medium;
    return HEATMAP_COLORS.low;
  };

  const halfStats = getHalfStats();
  const distributionStats = getDistributionStats();
  const chartData = getChartData();
  const heatmapData = getHeatmapData();
  const eventsByHalf = getEventsByHalf();
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const displayTeamName = match.team_name_display || teamName || "Time";
  const halfTimeMinute = Math.floor(matchDuration / 2);

  // Chart dimensions for SVG
  const CHART_WIDTH = 500;
  const CHART_HEIGHT = 100;
  const CHART_PADDING = { top: 10, right: 10, bottom: 20, left: 25 };
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Generate SVG path for smoothed line
  const generateSmoothedPath = () => {
    if (chartData.data.length === 0) return "";
    const xScale = plotWidth / matchDuration;
    const yScale = plotHeight / chartData.maxEvents;
    
    const points = chartData.data.map((d, i) => {
      const x = CHART_PADDING.left + (d.minute * xScale);
      const y = CHART_PADDING.top + plotHeight - (d.smoothed * yScale);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    
    return points.join(' ');
  };

  // Generate closed area path for gradient fill (smoothed line + baseline)
  const generateAreaPath = () => {
    if (chartData.data.length === 0) return "";
    const xScale = plotWidth / matchDuration;
    const yScale = plotHeight / chartData.maxEvents;
    const baseline = CHART_PADDING.top + plotHeight;
    
    // Start at bottom-left
    let path = `M ${CHART_PADDING.left} ${baseline}`;
    
    // Line up to first point then follow the curve
    chartData.data.forEach((d) => {
      const x = CHART_PADDING.left + (d.minute * xScale);
      const y = CHART_PADDING.top + plotHeight - (d.smoothed * yScale);
      path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    
    // Close path back to baseline
    const lastX = CHART_PADDING.left + plotWidth;
    path += ` L ${lastX} ${baseline} Z`;
    
    return path;
  };

  // Generate dots for raw events
  const generateEventDots = () => {
    const xScale = plotWidth / matchDuration;
    const yScale = plotHeight / chartData.maxEvents;
    
    return chartData.data
      .filter(d => d.total > 0)
      .map(d => ({
        cx: CHART_PADDING.left + (d.minute * xScale),
        cy: CHART_PADDING.top + plotHeight - (d.total * yScale),
        minute: d.minute,
      }));
  };

  // Generate time labels for heatmap
  const timeLabels: string[] = [];
  for (let i = 0; i < heatmapData.intervals; i++) {
    if (i % 3 === 0) {
      timeLabels.push(`${i * HEATMAP_INTERVAL}'`);
    } else {
      timeLabels.push("");
    }
  }

  // Determine if filtered
  const isFiltered = selectedPlayerIds && selectedPlayerIds.length > 0;
  const filterPlayerNames = isFiltered 
    ? filteredPlayers.map(mp => mp.player?.full_name).filter(Boolean).join(", ")
    : null;

  return (
    <Document>
      {/* Page 1: Header, Stats, Distribution */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl && (
              <Image src={logoUrl} style={styles.logo} />
            )}
            <View>
              <Text style={styles.headerTitle}>Resumo do Jogo</Text>
              <Text style={styles.headerSubtitle}>{competitionName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.matchTitle}>{displayTeamName} vs {match.opponent_name}</Text>
            <Text style={styles.matchDate}>
              {format(new Date(match.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {match.match_start_time && ` • ${format(new Date(match.match_start_time), "HH:mm")}`}
            </Text>
            {match.venue && (
              <Text style={styles.matchVenue}>{match.venue}</Text>
            )}
            {filterPlayerNames && (
              <Text style={styles.playerFilter}>Jogador: {filterPlayerNames}</Text>
            )}
          </View>
        </View>

        {/* Global Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{filteredPlayers.length}</Text>
            <Text style={styles.statLabel}>Jogadores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{filteredEvents.length}</Text>
            <Text style={styles.statLabel}>Eventos</Text>
          </View>
          <View style={styles.statCardGreen}>
            <Text style={styles.statValueGreen}>{halfStats.totals.goals}</Text>
            <Text style={styles.statLabel}>Gols</Text>
          </View>
          <View style={styles.statCardBlue}>
            <Text style={styles.statValueBlue}>{halfStats.totals.assists}</Text>
            <Text style={styles.statLabel}>Assistências</Text>
          </View>
        </View>

        {/* Stats by Half - Complete Table (wrap allowed - can break across pages) */}
        <Text style={styles.sectionTitle}>Estatísticas por Tempo</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>1º TEMPO</Text>
            <Text style={styles.tableHeaderCellWide}>Estatística</Text>
            <Text style={styles.tableHeaderCell}>2º TEMPO</Text>
            <Text style={styles.tableHeaderCell}>TOTAL</Text>
          </View>
          {halfStats.rows.map((row) => (
            <View key={row.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.tableCell}>{row.first}</Text>
              <Text style={styles.tableCellWide}>{row.label}</Text>
              <Text style={styles.tableCell}>{row.second}</Text>
              <Text style={styles.tableCell}>{row.total}</Text>
            </View>
          ))}
          {(halfStats.substitutions.first > 0 || halfStats.substitutions.second > 0) && (
            <View style={styles.tableRow} wrap={false}>
              <Text style={styles.tableCell}>{halfStats.substitutions.first}</Text>
              <Text style={styles.tableCellWide}>Substituições</Text>
              <Text style={styles.tableCell}>{halfStats.substitutions.second}</Text>
              <Text style={styles.tableCell}>{halfStats.substitutions.first + halfStats.substitutions.second}</Text>
            </View>
          )}
        </View>

        {/* Distribution Chart Section - Single unified block with smart pagination */}
        {/* wrap={false} keeps title+badges+chart together; minPresenceAhead ensures space exists */}
        <View wrap={false} minPresenceAhead={120}>
          <Text style={styles.sectionTitle}>Distribuição de Eventos</Text>
          <Text style={styles.sectionSubtitle}>Intensidade do jogo ao longo do tempo</Text>
          
          {/* Distribution Summary Cards */}
          <View style={styles.distributionRow}>
            <View style={styles.distributionCard}>
              <Text style={styles.distributionValue}>{distributionStats.firstHalf}</Text>
              <Text style={styles.distributionLabel}>1º TEMPO</Text>
            </View>
            <View style={styles.distributionCard}>
              <Text style={styles.distributionValue}>{distributionStats.secondHalf}</Text>
              <Text style={styles.distributionLabel}>2º TEMPO</Text>
            </View>
            <View style={styles.distributionCardHighlight}>
              <Text style={styles.distributionValue}>{distributionStats.peakMinute}'</Text>
              <Text style={styles.distributionLabel}>PICO ({distributionStats.peakCount} eventos)</Text>
            </View>
            <View style={styles.distributionCard}>
              <Text style={styles.distributionValue}>{distributionStats.total}</Text>
              <Text style={styles.distributionLabel}>TOTAL</Text>
            </View>
          </View>

          {/* SVG Chart */}
          <View style={{ border: `1px solid ${PDF_COLORS.gray200}`, borderRadius: 6, padding: 8, backgroundColor: PDF_COLORS.white, marginTop: 8 }}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
              {/* Grid lines (horizontal) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                <SvgLine
                  key={`grid-h-${idx}`}
                  x1={CHART_PADDING.left}
                  y1={CHART_PADDING.top + plotHeight * (1 - ratio)}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y2={CHART_PADDING.top + plotHeight * (1 - ratio)}
                  stroke={PDF_COLORS.gray200}
                  strokeWidth={0.5}
                  strokeDasharray="2,2"
                />
              ))}

              {/* Gradient definition */}
              <Defs>
                <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={PDF_COLORS.brandRed} stopOpacity={0.3} />
                  <Stop offset="100%" stopColor={PDF_COLORS.brandRed} stopOpacity={0.02} />
                </LinearGradient>
              </Defs>

              {/* Area fill under smoothed line */}
              <Path
                d={generateAreaPath()}
                fill="url(#areaGradient)"
                stroke="none"
              />

              {/* Half-time vertical line */}
              <SvgLine
                x1={CHART_PADDING.left + (halfTimeMinute / matchDuration) * plotWidth}
                y1={CHART_PADDING.top}
                x2={CHART_PADDING.left + (halfTimeMinute / matchDuration) * plotWidth}
                y2={CHART_PADDING.top + plotHeight}
                stroke={PDF_COLORS.gray400}
                strokeWidth={1}
                strokeDasharray="4,3"
              />

              {/* Goal markers (green vertical lines) */}
              {chartData.goalMinutes.map((min, idx) => (
                <SvgLine
                  key={`goal-${idx}`}
                  x1={CHART_PADDING.left + (min / matchDuration) * plotWidth}
                  y1={CHART_PADDING.top}
                  x2={CHART_PADDING.left + (min / matchDuration) * plotWidth}
                  y2={CHART_PADDING.top + plotHeight}
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                />
              ))}

              {/* Smoothed line (main intensity curve) */}
              <Path
                d={generateSmoothedPath()}
                stroke={PDF_COLORS.brandRed}
                strokeWidth={2}
                fill="none"
              />

              {/* Event dots */}
              {generateEventDots().map((dot, idx) => (
                <Circle
                  key={`dot-${idx}`}
                  cx={dot.cx}
                  cy={dot.cy}
                  r={2.5}
                  fill={PDF_COLORS.gray400}
                  fillOpacity={0.6}
                />
              ))}

              {/* X-axis */}
              <SvgLine
                x1={CHART_PADDING.left}
                y1={CHART_PADDING.top + plotHeight}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={CHART_PADDING.top + plotHeight}
                stroke={PDF_COLORS.gray300}
                strokeWidth={1}
              />

              {/* X-axis labels */}
              {[0, 15, 30, 45, 60, 75, 90].filter(m => m <= matchDuration).map((minute) => (
                <G key={`xlabel-${minute}`}>
                  <SvgLine
                    x1={CHART_PADDING.left + (minute / matchDuration) * plotWidth}
                    y1={CHART_PADDING.top + plotHeight}
                    x2={CHART_PADDING.left + (minute / matchDuration) * plotWidth}
                    y2={CHART_PADDING.top + plotHeight + 3}
                    stroke={PDF_COLORS.gray400}
                    strokeWidth={0.5}
                  />
                </G>
              ))}
            </Svg>

            {/* X-axis text labels (outside SVG for better font rendering) */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: CHART_PADDING.left - 5, paddingRight: CHART_PADDING.right }}>
              {[0, 15, 30, 45, 60, 75, 90].filter(m => m <= matchDuration).map((minute) => (
                <Text key={`xlbl-${minute}`} style={{ fontSize: 7, color: PDF_COLORS.gray400 }}>{minute}'</Text>
              ))}
            </View>

            {/* Legend */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 12, height: 2, backgroundColor: PDF_COLORS.brandRed, borderRadius: 1 }} />
                <Text style={{ fontSize: 7, color: PDF_COLORS.gray500 }}>Intensidade (média móvel)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 5, height: 5, backgroundColor: PDF_COLORS.gray400, borderRadius: 2.5 }} />
                <Text style={{ fontSize: 7, color: PDF_COLORS.gray500 }}>Eventos por minuto</Text>
              </View>
              {chartData.goalMinutes.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 2, height: 10, backgroundColor: "#22c55e", borderRadius: 1 }} />
                  <Text style={{ fontSize: 7, color: PDF_COLORS.gray500 }}>Gols</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Gerado por M3 Scouting • {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
        <Text style={styles.pageNumber}>1</Text>
      </Page>

      {/* Page 2: Activity Heatmap + Events */}
      <Page size="A4" style={styles.page}>
        {/* Compact Header */}
        <View style={{ ...styles.header, marginBottom: 16, paddingBottom: 12 }}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.logoSmall} />}
            <View>
              <Text style={{ fontSize: 14, fontWeight: 700 }}>Resumo do Jogo</Text>
              <Text style={{ fontSize: 9, color: PDF_COLORS.gray500 }}>
                {displayTeamName} vs {match.opponent_name}
              </Text>
            </View>
          </View>
        </View>

        {/* Activity Heatmap */}
        <Text style={styles.sectionTitle}>Mapa de Atividade</Text>
        <Text style={styles.sectionSubtitle}>Intensidade de eventos por jogador a cada {HEATMAP_INTERVAL} minutos</Text>
        
        <View style={styles.heatmapContainer}>
          {/* Legend */}
          <View style={styles.heatmapLegend}>
            <View style={styles.heatmapLegendLeft}>
              <Text style={styles.heatmapLegendText}>Menos ativo</Text>
              <View style={{ ...styles.heatmapLegendBox, backgroundColor: HEATMAP_COLORS.low }} />
              <View style={{ ...styles.heatmapLegendBox, backgroundColor: HEATMAP_COLORS.medium }} />
              <View style={{ ...styles.heatmapLegendBox, backgroundColor: HEATMAP_COLORS.high }} />
              <View style={{ ...styles.heatmapLegendBox, backgroundColor: HEATMAP_COLORS.veryHigh }} />
              <Text style={styles.heatmapLegendText}>Mais ativo</Text>
            </View>
            <View style={styles.heatmapLegendLeft}>
              <View style={{ ...styles.heatmapLegendBox, backgroundColor: HEATMAP_COLORS.noEvents, borderWidth: 1, borderColor: PDF_COLORS.gray300, borderStyle: "dashed" }} />
              <Text style={styles.heatmapLegendText}>Sem eventos</Text>
            </View>
          </View>

          {/* Time axis */}
          <View style={styles.heatmapHeader}>
            <View style={styles.heatmapPlayerCol} />
            <View style={styles.heatmapCellsHeader}>
              {timeLabels.map((label, idx) => (
                <Text key={idx} style={styles.heatmapTimeLabel}>{label}</Text>
              ))}
            </View>
            <Text style={styles.heatmapTotalCol}>Total</Text>
          </View>

          {/* Player rows - limit to 18 for page fit */}
          {heatmapData.playerData.slice(0, 18).map(({ player, intervalCounts, totalEvents }) => {
            if (!player.player) return null;
            return (
              <View key={player.id} style={styles.heatmapRow}>
                <View style={styles.heatmapPlayerInfo}>
                  <Text style={styles.heatmapPlayerName}>
                    {player.player.full_name.split(" ").slice(-1)[0]}
                  </Text>
                  <Text style={styles.heatmapPlayerPosition}>{player.player.position}</Text>
                </View>
                <View style={styles.heatmapCells}>
                  {intervalCounts.map((count, idx) => (
                    <View
                      key={idx}
                      style={{
                        ...styles.heatmapCell,
                        backgroundColor: getHeatmapColor(count, heatmapData.globalMax),
                      }}
                    />
                  ))}
                </View>
                <Text style={styles.heatmapTotal}>{totalEvents}</Text>
              </View>
            );
          })}
        </View>

        {/* Events by Half - Section with anti-orphan header */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Eventos por Tempo</Text>
          
          {/* Event Summary Totals - Kept with title */}
          {(() => {
            // Calculate totals by event type
            const allEvents = [...eventsByHalf.firstHalf, ...eventsByHalf.secondHalf];
            const totals: Record<string, number> = {};
            allEvents.forEach(event => {
              const label = EVENT_LABELS[event.event_type] || event.event_type;
              totals[label] = (totals[label] || 0) + 1;
            });
            
            // Sort by count descending
            const sortedTotals = Object.entries(totals)
              .sort((a, b) => b[1] - a[1]);
            
            if (sortedTotals.length === 0) return null;
            
            return (
              <View style={styles.eventSummaryContainer} wrap={false}>
                <Text style={styles.eventSummaryTitle}>
                  Resumo de Totais ({allEvents.length} eventos)
                </Text>
                {sortedTotals.map(([label, count]) => (
                  <View key={label} style={styles.eventSummaryChip}>
                    <Text style={styles.eventSummaryChipLabel}>{label}:</Text>
                    <Text style={styles.eventSummaryChipValue}>{count}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>
        
        <View style={styles.eventsGrid}>
          {/* First Half - ALL EVENTS */}
          <View style={styles.eventsColumn}>
            <Text style={styles.eventsColumnTitle}>
              1º TEMPO ({eventsByHalf.firstHalf.length})
            </Text>
            {eventsByHalf.firstHalf
              .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
              .map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <Text style={styles.eventMinute}>
                    {event.display_minute || `${event.minute}'`}
                  </Text>
                  <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                  <Text style={styles.eventPlayer}>- {getPlayerName(event.player_id)}</Text>
                </View>
              ))}
          </View>

          {/* Second Half - ALL EVENTS */}
          <View style={styles.eventsColumn}>
            <Text style={styles.eventsColumnTitle}>
              2º TEMPO ({eventsByHalf.secondHalf.length})
            </Text>
            {eventsByHalf.secondHalf
              .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
              .map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <Text style={styles.eventMinute}>
                    {event.display_minute || `${event.minute}'`}
                  </Text>
                  <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                  <Text style={styles.eventPlayer}>- {getPlayerName(event.player_id)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Gerado por M3 Scouting • {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
        {/* Player Stats Section - Title + first cards grouped to prevent orphan title */}
        {(() => {
          // Split players into first row (2 cards) and rest to prevent orphan title
          const firstRowPlayers = filteredPlayers.slice(0, 2);
          const remainingPlayers = filteredPlayers.slice(2, 16);
          
          const renderPlayerCard = (mp: MatchPlayer) => {
            if (!mp.player) return null;
            const counts = playerEventCounts[mp.player_id] || {};
            const stats = playerStatsMap[mp.player_id];
            
            // Calculate derived ball_actions
            const ballActions = stats ? calculateBallActionsFromMatchStats(stats) : 0;
            
            const statEntries = Object.entries(counts)
              .filter(([_, v]) => (v ?? 0) > 0)
              .slice(0, 4); // Reduced to 4 to make room for ball_actions
            
            const initials = mp.player.full_name
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            
            // Calculate minutes played using standardized logic
            const minutesInfo = calculateMinutesPlayed({
              started: mp.started,
              entered_minute: mp.entered_minute,
              exited_minute: mp.exited_minute,
              minutes_played: mp.minutes_played,
            });
            const minutesPlayed = minutesInfo.minutesPlayed;

            return (
              <View key={mp.id} style={styles.playerCard} wrap={false}>
                <View style={styles.playerCardHeader}>
                  {mp.player.photo_url ? (
                    <Image src={mp.player.photo_url} style={styles.playerPhoto} />
                  ) : (
                    <View style={styles.playerPhotoPlaceholder}>
                      <Text style={styles.playerPhotoInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{mp.player.full_name}</Text>
                    <Text style={styles.playerPosition}>{mp.player.position}</Text>
                  </View>
                </View>
                <View style={styles.playerMeta}>
                  <Text style={mp.started ? styles.playerBadgeStarter : styles.playerBadgeSub}>
                    {mp.started ? "TITULAR" : "RESERVA"}
                  </Text>
                  {minutesPlayed > 0 && (
                    <Text style={styles.playerMinutes}>{minutesPlayed} min</Text>
                  )}
                  {/* Match Rating Badge */}
                  {(match.status === "finished" || match.status === "applied") && (() => {
                    const stats = playerStatsMap[mp.player_id];
                    const rating = calculatePlayerMatchRating(stats, {
                      started: mp.started,
                      entered_minute: mp.entered_minute,
                      exited_minute: mp.exited_minute,
                      minutes_played: mp.minutes_played,
                    });
                    
                    // Players with no rating (0 minutes) show "—"
                    if (!rating.hasRating) {
                      return (
                        <View style={{ backgroundColor: "#6b7280", paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 3 }}>
                          <Text style={{ fontSize: 8, fontWeight: 700, color: "#ffffff" }}>—</Text>
                        </View>
                      );
                    }
                    
                    // SofaScore color bands: <6=red, 6-6.4=orange, 6.5-6.9=amber, 7-7.9=green, 8-8.9=cyan, 9+=blue
                    const r = rating.rating!;
                    const bgColor = r < 6.0 ? "#ef4444" : r < 6.5 ? "#f97316" : r < 7.0 ? "#f59e0b" : r < 8.0 ? "#22c55e" : r < 9.0 ? "#06b6d4" : "#3b82f6";
                    return (
                      <View style={{ backgroundColor: bgColor, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 3 }}>
                        <Text style={{ fontSize: 8, fontWeight: 700, color: "#ffffff" }}>{rating.rating!.toFixed(1)}</Text>
                      </View>
                    );
                  })()}
                </View>
                {/* Match Profile + Efficiency + Professional Scouting Text */}
                {minutesPlayed >= 10 && (() => {
                  const stats = playerStatsMap[mp.player_id];
                  const statsInput = matchPlayerStatsToInput(stats);
                  const profile = classifyMatchProfile(statsInput, minutesPlayed);
                  const efficiency = calculateMatchEfficiency(statsInput, minutesPlayed);
                  const profileColors = PROFILE_COLORS[profile.primary.key];
                  const efficiencyColors = EFFICIENCY_COLORS[efficiency.level];
                  // Generate professional position-adapted scouting text
                  const scoutingText = generateScoutingText(
                    mp.player.position,
                    profile.primary.key,
                    efficiency.level,
                    minutesPlayed < 10
                  );
                  return (
                    <View style={{ marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", gap: 4, marginBottom: 3, flexWrap: "wrap" }}>
                        {/* Profile Badge */}
                        <View style={{ 
                          backgroundColor: profileColors.bg, 
                          paddingHorizontal: 5, 
                          paddingVertical: 2, 
                          borderRadius: 3,
                        }}>
                          <Text style={{ fontSize: 6, fontWeight: 600, color: profileColors.text }}>
                            {profile.primary.label}
                          </Text>
                        </View>
                        {/* Efficiency Badge */}
                        <View style={{ 
                          backgroundColor: efficiencyColors.bg, 
                          paddingHorizontal: 5, 
                          paddingVertical: 2, 
                          borderRadius: 3,
                        }}>
                          <Text style={{ fontSize: 6, fontWeight: 600, color: efficiencyColors.text }}>
                            Efic: {efficiencyColors.label}
                          </Text>
                        </View>
                      </View>
                      {/* Professional Scouting Text - Position-adapted */}
                      <Text style={{ fontSize: 5.5, color: PDF_COLORS.gray600, lineHeight: 1.35 }}>
                        {scoutingText.combinedText.slice(0, 120)}{scoutingText.combinedText.length > 120 ? '...' : ''}
                      </Text>
                    </View>
                  );
                })()}
                <View style={styles.playerStats}>
                  {/* Derived stat: Ações com a Bola - always first if > 0 */}
                  {ballActions > 0 && (
                    <Text key="ball_actions" style={{
                      ...styles.playerStatBadge,
                      backgroundColor: '#164E63', // cyan-900
                      color: '#22D3EE', // cyan-400
                    }}>
                      Ações: {ballActions}
                    </Text>
                  )}
                  {statEntries.length > 0 || ballActions > 0 ? (
                    statEntries.map(([type, value]) => (
                      <Text key={type} style={styles.playerStatBadge}>
                        {EVENT_LABELS[type as MatchEventType]}: {value}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.noStats}>Sem estatísticas</Text>
                  )}
                </View>
              </View>
            );
          };

          return (
            <>
              {/* ATOMIC BLOCK: Title + First Row of Cards - NEVER SPLIT */}
              <View wrap={false} style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Estatísticas por Jogador</Text>
                <View style={styles.playersGrid}>
                  {firstRowPlayers.map(renderPlayerCard)}
                </View>
              </View>
              
              {/* Remaining cards - can break between pages but not within cards */}
              {remainingPlayers.length > 0 && (
                <View style={styles.playersGrid}>
                  {remainingPlayers.map(renderPlayerCard)}
                </View>
              )}
            </>
          );
        })()}

        {/* Post-Game Analysis Section - Only for finished matches */}
        {(match.status === "finished" || match.status === "applied") && (
          <View style={{ marginTop: 16 }} wrap={false}>
          {/* Section Header - kept with first card */}
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Análise Pós-Jogo</Text>
            <Text style={styles.sectionSubtitle}>Zonas de atuação, indicadores rápidos e pontos-chave</Text>
          </View>
          
          {filteredPlayers.slice(0, 12).map((mp) => {
              if (!mp.player) return null;
              
              const stats = playerStatsMap[mp.player_id];
              const statsInput: MatchStatsInput = {
                goals: stats?.goals ?? 0,
                assists: stats?.assists ?? 0,
                shots: stats?.shots ?? 0,
                shots_on_target: stats?.shots_on_target ?? 0,
                key_passes: stats?.key_passes ?? 0,
                chances_created: stats?.chances_created ?? 0,
                passes_completed: stats?.passes_completed ?? 0,
                passes_total: stats?.passes_total ?? 0,
                dribbles_success: stats?.dribbles_success ?? 0,
                dribbles_total: stats?.dribbles_total ?? 0,
                tackles: stats?.tackles ?? 0,
                interceptions: stats?.interceptions ?? 0,
                clearances: stats?.clearances ?? 0,
                recoveries: stats?.recoveries ?? 0,
                duels_won: stats?.duels_won ?? 0,
                duels_total: stats?.duels_total ?? 0,
                aerial_duels_won: stats?.aerial_duels_won ?? 0,
                aerial_duels_total: stats?.aerial_duels_total ?? 0,
                fouls_committed: stats?.fouls_committed ?? 0,
                fouls_suffered: stats?.fouls_suffered ?? 0,
                yellow_cards: stats?.yellow_cards ?? 0,
                red_cards: stats?.red_cards ?? 0,
                possession_lost: stats?.possession_lost ?? 0,
                saves: stats?.saves ?? 0,
                goals_conceded: stats?.goals_conceded ?? 0,
                blocked_shots: stats?.blocked_shots ?? 0,
                was_dribbled: stats?.was_dribbled ?? 0,
                ball_actions: stats?.ball_actions ?? 0,
                crosses_success: stats?.crosses_success ?? 0,
                crosses_failed: stats?.crosses_failed ?? 0,
                offsides: stats?.offsides ?? 0,
                shots_blocked: stats?.shots_blocked ?? 0,
              };
              
              const minutesInfo = calculateMinutesPlayed({
                started: mp.started,
                entered_minute: mp.entered_minute,
                exited_minute: mp.exited_minute,
                minutes_played: mp.minutes_played,
              });
              const minutesPlayed = minutesInfo.minutesPlayed;
              
              // CRITICAL FIX: Skip players who didn't play (0 minutes)
              // This prevents false heatmaps for players who never entered the field
              // Also skip if less than 10 minutes for meaningful analysis
              if (minutesPlayed <= 0) return null;
              
              const analysis = generatePostGameAnalysis(mp.player.position, statsInput, minutesPlayed);
              const { quickIndicators, strengthsImprovements, zoneHeatmap } = analysis;
              
              // Skip if no meaningful data
              if (quickIndicators.length === 0 && strengthsImprovements.strengths.length === 0 && strengthsImprovements.improvements.length === 0) {
                return null;
              }
              
              const getZoneColor = (intensity: "low" | "medium" | "high"): string => {
                switch (intensity) {
                  case "high": return "#10B981"; // emerald-500
                  case "medium": return "#34D399"; // emerald-400
                  case "low": return PDF_COLORS.gray300;
                  default: return PDF_COLORS.gray200;
                }
              };
              
              const getIndicatorColors = (type: "positive" | "neutral" | "negative") => {
                switch (type) {
                  case "positive": return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
                  case "negative": return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
                  default: return { bg: PDF_COLORS.gray100, text: PDF_COLORS.gray700, border: PDF_COLORS.gray300 };
                }
              };
              
              return (
                <View key={mp.id} style={{
                  flexDirection: "row",
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  backgroundColor: PDF_COLORS.gray50,
                  borderRadius: 4,
                  marginBottom: 6,
                  borderWidth: 1,
                  borderColor: PDF_COLORS.gray200,
                }} wrap={false}>
                  {/* Mini Field Heatmap */}
                  <View style={{ width: 95, marginRight: 8, alignItems: "center" }}>
                    <MiniFieldHeatmapPdf
                      percentages={zoneHeatmap.percentages}
                      matchId={match.id}
                      playerId={mp.player_id}
                      width={90}
                      height={110}
                      showLegend={true}
                    />
                  </View>
                  
                  {/* Content Column */}
                  <View style={{ flex: 1 }}>
                    {/* Player Info */}
                    <Text style={{ fontSize: 10, fontWeight: 700, color: PDF_COLORS.gray900, marginBottom: 2 }}>
                      {mp.player.full_name}
                    </Text>
                    <Text style={{ fontSize: 8, color: PDF_COLORS.gray500, marginBottom: 6 }}>
                      {mp.player.position} • {minutesPlayed} min
                    </Text>
                    
                    {/* Quick Indicators - 4 in a row */}
                    {quickIndicators.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                        {quickIndicators.slice(0, 4).map((indicator) => {
                          const colors = getIndicatorColors(indicator.type);
                          return (
                            <View key={indicator.id} style={{
                              paddingVertical: 2,
                              paddingHorizontal: 4,
                              borderRadius: 3,
                              backgroundColor: colors.bg,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}>
                              <Text style={{ fontSize: 5, color: colors.text, marginBottom: 1 }}>
                                {indicator.label}
                              </Text>
                              <Text style={{ fontSize: 7, fontWeight: 600, color: colors.text }}>
                                {indicator.value}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    
                    {/* Strengths & Improvements in columns */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {strengthsImprovements.strengths.length > 0 && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 7, fontWeight: 700, color: "#065F46", marginBottom: 2 }}>✓ Pontos Fortes</Text>
                          {strengthsImprovements.strengths.slice(0, 2).map((s, i) => (
                            <Text key={i} style={{ fontSize: 6, color: PDF_COLORS.gray600, marginBottom: 1, paddingLeft: 4 }}>
                              • {s.slice(0, 50)}{s.length > 50 ? '...' : ''}
                            </Text>
                          ))}
                        </View>
                      )}
                      {strengthsImprovements.improvements.length > 0 && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 7, fontWeight: 700, color: "#92400E", marginBottom: 2 }}>⚠ A Melhorar</Text>
                          {strengthsImprovements.improvements.slice(0, 2).map((s, i) => (
                            <Text key={i} style={{ fontSize: 6, color: PDF_COLORS.gray600, marginBottom: 1, paddingLeft: 4 }}>
                              • {s.slice(0, 50)}{s.length > 50 ? '...' : ''}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Gerado por M3 Scouting • {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </Page>
    </Document>
  );
}
