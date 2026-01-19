/**
 * Match Summary PDF using @react-pdf/renderer
 * Vector-based PDF for crisp text rendering
 */
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDF_COLORS } from "@/lib/pdfStyles";
import { Match, MatchPlayer, MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";

// Event type labels
const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  assist: "Assistência",
  shot: "Finalização Fora",
  shot_on_target: "Finalização Gol",
  key_pass: "Passe Decisivo",
  chance_created: "Chance Criada",
  dribble_success: "Drible Certo",
  dribble_attempt: "Drible Tentativa",
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  duel_won: "Duelo Ganho",
  duel_total: "Duelo Total",
  ground_duel_won: "Duelo no Chão",
  ground_duel_total: "Duelo no Chão (Perdido)",
  aerial_duel_won: "Duelo Aéreo",
  aerial_duel_total: "Duelo Aéreo (Perdido)",
  yellow: "Amarelo",
  red: "Vermelho",
  foul_committed: "Falta Cometida",
  foul_suffered: "Falta Sofrida",
  pass_success: "Passe Certo",
  pass_total: "Passe Total",
  possession_lost: "Bola Perdida",
  save: "Defesa",
  goal_conceded: "Gol Sofrido",
  clean_sheet: "Clean Sheet",
  penalty_saved: "Pênalti Def.",
  error_led_to_goal: "Erro→Gol",
  box_save: "Def. Área",
  punch: "Soco",
  high_claim: "Bola Alta",
  sweeper_action: "Saída Gol",
  substitution: "Substituição",
  player_on: "Entrou",
  player_off: "Saiu",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: PDF_COLORS.gray900,
    backgroundColor: PDF_COLORS.white,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `2px solid ${PDF_COLORS.brandRed}`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
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
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  statCardGreen: {
    flex: 1,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  statCardBlue: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    textAlign: "center",
  },
  statValueGreen: {
    fontSize: 28,
    fontWeight: 700,
    color: PDF_COLORS.green,
    textAlign: "center",
  },
  statValueBlue: {
    fontSize: 28,
    fontWeight: 700,
    color: PDF_COLORS.blue,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    marginTop: 6,
    textAlign: "center",
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 12,
  },
  // Table
  table: {
    marginBottom: 20,
    borderRadius: 8,
    border: `1px solid ${PDF_COLORS.gray200}`,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.gray100,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
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
    padding: 8,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  tableCellLabel: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: PDF_COLORS.gray600,
    textAlign: "center",
    borderRight: `1px solid ${PDF_COLORS.gray200}`,
  },
  // Events Grid
  eventsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  eventsColumn: {
    flex: 1,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 8,
    padding: 14,
    backgroundColor: PDF_COLORS.white,
  },
  eventsColumnTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: PDF_COLORS.gray700,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: `1px solid ${PDF_COLORS.gray200}`,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    minHeight: 16,
  },
  eventMinute: {
    backgroundColor: PDF_COLORS.gray200,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 600,
    marginRight: 8,
    minWidth: 28,
    textAlign: "center",
  },
  eventType: {
    fontSize: 9,
    fontWeight: 600,
    color: PDF_COLORS.gray800,
    marginRight: 4,
  },
  eventPlayer: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    flex: 1,
  },
  eventMore: {
    fontSize: 8,
    color: PDF_COLORS.gray300,
    marginTop: 6,
  },
  // Players Grid
  playersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  playerCard: {
    width: "48%",
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 8,
    padding: 12,
    backgroundColor: PDF_COLORS.white,
  },
  playerName: {
    fontSize: 10,
    fontWeight: 600,
    color: PDF_COLORS.gray900,
  },
  playerPosition: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginTop: 3,
  },
  playerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
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
  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: PDF_COLORS.gray400,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    paddingTop: 12,
  },
});

interface MatchSummaryVectorPdfProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
  teamName: string;
  logoUrl?: string;
}

export function MatchSummaryVectorPdf({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
  teamName,
  logoUrl,
}: MatchSummaryVectorPdfProps) {
  // Calculate stats by half
  const getHalfStats = () => {
    const first = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, shots: 0, saves: 0 };
    const second = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, shots: 0, saves: 0 };

    matchEvents.forEach((event) => {
      const stats = event.half === 2 ? second : first;
      switch (event.event_type) {
        case "goal": stats.goals += event.value; break;
        case "assist": stats.assists += event.value; break;
        case "yellow": stats.yellowCards += event.value; break;
        case "red": stats.redCards += event.value; break;
        case "shot":
        case "shot_on_target": stats.shots += event.value; break;
        case "save": stats.saves += event.value; break;
      }
    });

    return { first, second };
  };

  // Group events by half
  const getEventsByHalf = () => {
    const first: MatchEvent[] = [];
    const second: MatchEvent[] = [];

    matchEvents.forEach((event) => {
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

  const halfStats = getHalfStats();
  const eventsByHalf = getEventsByHalf();
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const displayTeamName = match.team_name_display || teamName || "Time";

  // Stats row component
  const StatsRow = ({ label, first, second }: { label: string; first: number; second: number }) => {
    if (first === 0 && second === 0) return null;
    return (
      <View style={styles.tableRow}>
        <Text style={styles.tableCell}>{first}</Text>
        <Text style={styles.tableCellLabel}>{label}</Text>
        <Text style={styles.tableCell}>{second}</Text>
      </View>
    );
  };

  return (
    <Document>
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
          </View>
        </View>

        {/* Global Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{matchPlayers.length}</Text>
            <Text style={styles.statLabel}>Jogadores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{matchEvents.length}</Text>
            <Text style={styles.statLabel}>Eventos</Text>
          </View>
          <View style={styles.statCardGreen}>
            <Text style={styles.statValueGreen}>
              {halfStats.first.goals + halfStats.second.goals}
            </Text>
            <Text style={styles.statLabel}>Gols</Text>
          </View>
          <View style={styles.statCardBlue}>
            <Text style={styles.statValueBlue}>
              {halfStats.first.assists + halfStats.second.assists}
            </Text>
            <Text style={styles.statLabel}>Assistências</Text>
          </View>
        </View>

        {/* Stats by Half */}
        <Text style={styles.sectionTitle}>Estatísticas por Tempo</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>1º TEMPO</Text>
            <Text style={styles.tableHeaderCell}>Estatística</Text>
            <Text style={styles.tableHeaderCell}>2º TEMPO</Text>
          </View>
          <StatsRow label="⚽ Gols" first={halfStats.first.goals} second={halfStats.second.goals} />
          <StatsRow label="👟 Assistências" first={halfStats.first.assists} second={halfStats.second.assists} />
          <StatsRow label="🟨 Amarelos" first={halfStats.first.yellowCards} second={halfStats.second.yellowCards} />
          <StatsRow label="🟥 Vermelhos" first={halfStats.first.redCards} second={halfStats.second.redCards} />
          <StatsRow label="🎯 Chutes" first={halfStats.first.shots} second={halfStats.second.shots} />
          <StatsRow label="🧤 Defesas" first={halfStats.first.saves} second={halfStats.second.saves} />
        </View>

        {/* Events by Half */}
        <Text style={styles.sectionTitle}>Eventos por Tempo</Text>
        <View style={styles.eventsGrid}>
          {/* First Half */}
          <View style={styles.eventsColumn}>
            <Text style={styles.eventsColumnTitle}>
              1º TEMPO ({eventsByHalf.firstHalf.length})
            </Text>
            {eventsByHalf.firstHalf.slice(0, 12).map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <Text style={styles.eventMinute}>
                  {event.display_minute || `${event.minute}'`}
                </Text>
                <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                <Text style={styles.eventPlayer}>- {getPlayerName(event.player_id)}</Text>
              </View>
            ))}
            {eventsByHalf.firstHalf.length > 12 && (
              <Text style={styles.eventMore}>+{eventsByHalf.firstHalf.length - 12} eventos...</Text>
            )}
          </View>

          {/* Second Half */}
          <View style={styles.eventsColumn}>
            <Text style={styles.eventsColumnTitle}>
              2º TEMPO ({eventsByHalf.secondHalf.length})
            </Text>
            {eventsByHalf.secondHalf.slice(0, 12).map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <Text style={styles.eventMinute}>
                  {event.display_minute || `${event.minute}'`}
                </Text>
                <Text style={styles.eventType}>{EVENT_LABELS[event.event_type]}</Text>
                <Text style={styles.eventPlayer}>- {getPlayerName(event.player_id)}</Text>
              </View>
            ))}
            {eventsByHalf.secondHalf.length > 12 && (
              <Text style={styles.eventMore}>+{eventsByHalf.secondHalf.length - 12} eventos...</Text>
            )}
          </View>
        </View>

        {/* Player Stats */}
        <Text style={styles.sectionTitle}>Estatísticas por Jogador</Text>
        <View style={styles.playersGrid}>
          {matchPlayers.slice(0, 16).map((mp) => {
            if (!mp.player) return null;
            const counts = playerEventCounts[mp.player_id] || {};
            const statEntries = Object.entries(counts)
              .filter(([_, v]) => (v ?? 0) > 0)
              .slice(0, 5);

            return (
              <View key={mp.id} style={styles.playerCard}>
                <Text style={styles.playerName}>{mp.player.full_name}</Text>
                <Text style={styles.playerPosition}>{mp.player.position}</Text>
                <View style={styles.playerStats}>
                  {statEntries.length > 0 ? (
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
          })}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Gerado por M3 Scouting • {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </Text>
      </Page>
    </Document>
  );
}
