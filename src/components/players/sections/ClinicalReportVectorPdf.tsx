/**
 * Clinical Report PDF using @react-pdf/renderer
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
import { PDF_COLORS, getSeverityColor } from "@/lib/pdfStyles";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface Player {
  full_name: string;
  position: string;
  age?: number | null;
  birth_date?: string | null;
  nationality?: string;
  current_club?: string | null;
  photo_url?: string | null;
}

interface ClinicalReportVectorPdfProps {
  player: Player;
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `3px solid ${PDF_COLORS.blue}`,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1E3A8A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: PDF_COLORS.gray500,
    marginTop: 4,
  },
  // Player info
  playerSection: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 8,
  },
  playerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    objectFit: "cover",
    border: `3px solid ${PDF_COLORS.gray200}`,
  },
  playerPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PDF_COLORS.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPhotoInitial: {
    fontSize: 28,
    fontWeight: 700,
    color: PDF_COLORS.gray500,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
    marginBottom: 4,
  },
  playerMeta: {
    fontSize: 11,
    color: PDF_COLORS.gray500,
  },
  statusBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 100,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 4,
  },
  statusDesc: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    textAlign: "center",
  },
  // Alert
  alertBox: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#FEF2F2",
    border: `2px solid #FECACA`,
    borderRadius: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#DC2626",
    marginBottom: 8,
  },
  alertBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  alertBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
  },
  alertNote: {
    fontSize: 10,
    color: "#7F1D1D",
    marginTop: 8,
  },
  // Stats grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1E3A8A",
  },
  statLabel: {
    fontSize: 10,
    color: PDF_COLORS.gray500,
    marginTop: 4,
    textAlign: "center",
  },
  // Table
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1E3A8A",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  table: {
    marginBottom: 20,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.gray200,
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 10,
    fontWeight: 600,
    textAlign: "center",
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
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  tableCellCenter: {
    padding: 8,
    fontSize: 10,
    textAlign: "center",
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 500,
    alignSelf: "center",
  },
  noData: {
    padding: 16,
    textAlign: "center",
    color: PDF_COLORS.gray500,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 8,
  },
  // Notes
  notesBox: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: PDF_COLORS.gray50,
    borderRadius: 8,
    border: `1px solid ${PDF_COLORS.gray200}`,
  },
  notesText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: PDF_COLORS.gray700,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: PDF_COLORS.gray400,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
    paddingTop: 12,
  },
});

// Helper functions
const calculateRecoveryDays = (startDate: string, returnDate: string | null): number => {
  const start = new Date(startDate);
  const end = returnDate ? new Date(returnDate) : new Date();
  return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDaysAway = (days: number): string => {
  if (days === 1) return "1 dia";
  if (days < 7) return `${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 semana" : `${weeks} semanas`;
  }
  const months = Math.floor(days / 30);
  return months === 1 ? "1 mês" : `${months} meses`;
};

const normalizeSeverity = (severity: string): { label: string; color: string } => {
  const s = severity.toLowerCase();
  if (s === "mild" || s === "leve") return { label: "Leve", color: PDF_COLORS.green };
  if (s === "medium" || s === "media" || s === "média") return { label: "Média", color: PDF_COLORS.amber };
  if (s === "severe" || s === "grave") return { label: "Grave", color: PDF_COLORS.red };
  return { label: severity, color: PDF_COLORS.gray500 };
};

const getStatusConfig = (status: string | null | undefined) => {
  const s = status?.toLowerCase() || "apto";
  if (s === "fit" || s === "apto") {
    return { label: "Apto", description: "Liberado para treinos e jogos", color: PDF_COLORS.green };
  }
  if (s === "recovering" || s === "em_recuperacao") {
    return { label: "Em Recuperação", description: "Em tratamento médico", color: PDF_COLORS.amber };
  }
  if (s === "injured" || s === "lesionado") {
    return { label: "Lesionado", description: "Afastado por lesão", color: PDF_COLORS.red };
  }
  if (s === "transition" || s === "transicao" || s === "retorno_progressivo") {
    return { label: "Retorno Progressivo", description: "Em transição", color: PDF_COLORS.blue };
  }
  return { label: "Apto", description: "Liberado para treinos e jogos", color: PDF_COLORS.green };
};

const normalizeInjuryType = (type: string): string => {
  const lower = type.toLowerCase().trim();
  if (lower.includes("joelho") || lower.includes("ligamento") || lower.includes("menisco")) return "Joelho";
  if (lower.includes("tornozelo") || lower.includes("entorse")) return "Tornozelo";
  if (lower.includes("muscular") || lower.includes("distensão") || lower.includes("estiramento")) return "Muscular";
  if (lower.includes("ombro")) return "Ombro";
  if (lower.includes("lombar") || lower.includes("costas") || lower.includes("coluna")) return "Coluna/Lombar";
  if (lower.includes("pubalgia") || lower.includes("virilha") || lower.includes("adutor")) return "Virilha/Pubis";
  if (lower.includes("coxa") || lower.includes("quadríceps") || lower.includes("posterior")) return "Coxa";
  return type;
};

export function ClinicalReportVectorPdf({
  player,
  injuries,
  physicalStatus,
  medicalNotes,
}: ClinicalReportVectorPdfProps) {
  const safeInjuries = injuries || [];
  const sortedInjuries = [...safeInjuries].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  const statusConfig = getStatusConfig(physicalStatus);

  // Calculate stats
  const totalInjuries = safeInjuries.length;
  const totalDaysAway = safeInjuries.reduce(
    (acc, inj) => acc + calculateRecoveryDays(inj.start_date, inj.return_date),
    0
  );
  const avgRecovery = totalInjuries > 0 ? Math.round(totalDaysAway / totalInjuries) : 0;

  // Find recurrent injuries (3+)
  const grouped: Record<string, Injury[]> = {};
  safeInjuries.forEach((injury) => {
    const normalizedType = normalizeInjuryType(injury.injury_type);
    if (!grouped[normalizedType]) grouped[normalizedType] = [];
    grouped[normalizedType].push(injury);
  });
  const recurrentTypes = Object.entries(grouped)
    .filter(([, arr]) => arr.length >= 3)
    .map(([type, arr]) => ({ type, count: arr.length }));

  // Injury counts by severity
  const severityCounts = { leve: 0, media: 0, grave: 0 };
  safeInjuries.forEach((inj) => {
    const s = inj.severity.toLowerCase();
    if (s === "mild" || s === "leve") severityCounts.leve++;
    else if (s === "medium" || s === "media" || s === "média") severityCounts.media++;
    else if (s === "severe" || s === "grave") severityCounts.grave++;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Relatório Clínico</Text>
            <Text style={styles.headerSubtitle}>
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
            </Text>
          </View>
        </View>

        {/* Player Info */}
        <View style={styles.playerSection}>
          {player.photo_url ? (
            <Image src={player.photo_url} style={styles.playerPhoto} />
          ) : (
            <View style={styles.playerPhotoPlaceholder}>
              <Text style={styles.playerPhotoInitial}>{player.full_name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.full_name}</Text>
            <Text style={styles.playerMeta}>
              {player.position} {player.age ? `• ${player.age} anos` : ""} {player.nationality ? `• ${player.nationality}` : ""}
            </Text>
            {player.current_club && (
              <Text style={styles.playerMeta}>Clube: {player.current_club}</Text>
            )}
          </View>
          <View style={[styles.statusBox, { backgroundColor: `${statusConfig.color}20`, border: `2px solid ${statusConfig.color}` }]}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            <Text style={styles.statusDesc}>{statusConfig.description}</Text>
          </View>
        </View>

        {/* Recurrent Injury Alert */}
        {recurrentTypes.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>⚠️ Alerta de Lesão Recorrente</Text>
            <View style={styles.alertBadges}>
              {recurrentTypes.map((r) => (
                <Text key={r.type} style={styles.alertBadge}>
                  {r.type}: {r.count}x ocorrências
                </Text>
              ))}
            </View>
            <Text style={styles.alertNote}>
              Recomenda-se avaliação preventiva e fortalecimento específico para as áreas afetadas.
            </Text>
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalInjuries}</Text>
            <Text style={styles.statLabel}>Total de Lesões</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgRecovery}</Text>
            <Text style={styles.statLabel}>Média Dias Afastado</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalDaysAway}</Text>
            <Text style={styles.statLabel}>Total Dias Afastado</Text>
          </View>
          <View style={styles.statCard}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Text style={{ color: PDF_COLORS.green, fontWeight: 700, fontSize: 16 }}>{severityCounts.leve}</Text>
              <Text style={{ color: PDF_COLORS.amber, fontWeight: 700, fontSize: 16 }}>{severityCounts.media}</Text>
              <Text style={{ color: PDF_COLORS.red, fontWeight: 700, fontSize: 16 }}>{severityCounts.grave}</Text>
            </View>
            <Text style={styles.statLabel}>Leve / Média / Grave</Text>
          </View>
        </View>

        {/* Injury History Table */}
        <Text style={styles.sectionTitle}>📋 Histórico de Lesões</Text>
        {sortedInjuries.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Tipo de Lesão</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Gravidade</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Início</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Retorno</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Afastamento</Text>
            </View>
            {sortedInjuries.map((injury, index) => {
              const sev = normalizeSeverity(injury.severity);
              const days = calculateRecoveryDays(injury.start_date, injury.return_date);
              return (
                <View key={injury.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text>{injury.injury_type}</Text>
                    {injury.notes && (
                      <Text style={{ fontSize: 9, color: PDF_COLORS.gray500, marginTop: 2 }}>
                        {injury.notes.length > 40 ? injury.notes.substring(0, 40) + "..." : injury.notes}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.tableCellCenter, { flex: 1 }]}>
                    <Text style={[styles.severityBadge, { backgroundColor: `${sev.color}20`, color: sev.color }]}>
                      {sev.label}
                    </Text>
                  </View>
                  <Text style={[styles.tableCellCenter, { flex: 1 }]}>
                    {format(new Date(injury.start_date), "dd/MM/yyyy")}
                  </Text>
                  <Text style={[styles.tableCellCenter, { flex: 1 }]}>
                    {injury.return_date 
                      ? format(new Date(injury.return_date), "dd/MM/yyyy")
                      : "Em tratamento"
                    }
                  </Text>
                  <Text style={[styles.tableCellCenter, { flex: 1, fontWeight: 500 }]}>
                    {formatDaysAway(days)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noData}>Nenhuma lesão registrada</Text>
        )}

        {/* Medical Notes */}
        {medicalNotes && (
          <View>
            <Text style={styles.sectionTitle}>📝 Observações Médicas</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{medicalNotes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Relatório gerado automaticamente pelo sistema M3 Scouting{"\n"}
          Este documento é confidencial e de uso exclusivo da equipe médica e diretoria técnica.
        </Text>
      </Page>
    </Document>
  );
}
