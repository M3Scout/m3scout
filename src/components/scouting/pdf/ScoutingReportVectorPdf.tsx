/**
 * Scouting Report PDF using @react-pdf/renderer
 * Vector-based PDF with native SVG charts for crisp rendering
 */
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Circle,
  Line,
  Polygon,
  Rect,
  G,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDF_COLORS } from "@/lib/pdfStyles";
import { CATEGORY_WEIGHTS, getRatingLabel, ScoreBreakdown } from "@/lib/scoring";
import { ScoutingReportData, SCOUTING_CATEGORY_CONFIG } from "@/types/scouting";

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 80) return PDF_COLORS.green;
  if (score >= 60) return PDF_COLORS.blue;
  if (score >= 40) return PDF_COLORS.amber;
  return PDF_COLORS.red;
}

// Styles
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
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 20,
    borderBottom: `3px solid ${PDF_COLORS.brandRed}`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 60,
    height: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  headerRight: {
    backgroundColor: PDF_COLORS.gray100,
    padding: 12,
    borderRadius: 8,
  },
  headerMeta: {
    fontSize: 9,
    color: PDF_COLORS.gray600,
    marginBottom: 2,
  },
  headerMetaValue: {
    fontWeight: 600,
    color: PDF_COLORS.gray900,
  },
  // Player Card
  playerCard: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 10,
    border: `1px solid ${PDF_COLORS.gray200}`,
    overflow: "hidden",
  },
  playerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: PDF_COLORS.gray100,
    gap: 14,
  },
  playerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: PDF_COLORS.gray200,
  },
  playerPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: PDF_COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPhotoInitial: {
    fontSize: 28,
    fontWeight: 700,
    color: PDF_COLORS.gray500,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    marginBottom: 6,
  },
  playerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  positionBadge: {
    backgroundColor: PDF_COLORS.blue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positionText: {
    fontSize: 8,
    fontWeight: 700,
    color: PDF_COLORS.white,
  },
  playerClub: {
    fontSize: 9,
    color: PDF_COLORS.gray600,
    fontWeight: 600,
  },
  playerOpponent: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginTop: 6,
  },
  // Score Block
  scoreBlock: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderLeft: `1px solid ${PDF_COLORS.gray200}`,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1,
  },
  scoreMax: {
    fontSize: 12,
    color: PDF_COLORS.gray400,
    fontWeight: 600,
    marginLeft: 2,
  },
  scoreStars: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 6,
    gap: 2,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  // Grid
  grid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  gridHalf: {
    flex: 1,
  },
  // Card
  card: {
    backgroundColor: PDF_COLORS.white,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    marginBottom: 12,
  },
  // Breakdown Items
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PDF_COLORS.gray100,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: PDF_COLORS.gray800,
  },
  breakdownSub: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: 800,
  },
  // Category Details
  categoryItem: {
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  categoryWeight: {
    fontSize: 7,
    color: PDF_COLORS.gray500,
    marginLeft: 6,
  },
  categoryScore: {
    fontSize: 14,
    fontWeight: 800,
  },
  categoryNotes: {
    fontSize: 8,
    color: PDF_COLORS.gray600,
    lineHeight: 1.4,
    marginTop: 4,
  },
  // Summary
  summaryTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 9,
    color: PDF_COLORS.gray600,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTop: `1px solid ${PDF_COLORS.gray200}`,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLogo: {
    width: 32,
    height: 20,
  },
  footerText: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
  },
});

// Native SVG Radar Chart for react-pdf with labels
function RadarChartSvg({ data, size = 200 }: { data: { label: string; score: number; color: string }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 45; // More space for labels
  const levels = 5;
  const angleSlice = (Math.PI * 2) / data.length;

  // Generate grid lines
  const gridLines = [];
  for (let level = 1; level <= levels; level++) {
    const r = (maxRadius / levels) * level;
    const points = data.map((_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    gridLines.push(
      <Polygon
        key={`grid-${level}`}
        points={points}
        fill="none"
        stroke={PDF_COLORS.gray300}
        strokeWidth={0.5}
      />
    );
  }

  // Generate axis lines
  const axisLines = data.map((_, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    return (
      <Line
        key={`axis-${i}`}
        x1={cx}
        y1={cy}
        x2={cx + maxRadius * Math.cos(angle)}
        y2={cy + maxRadius * Math.sin(angle)}
        stroke={PDF_COLORS.gray300}
        strokeWidth={0.5}
      />
    );
  });

  // Generate data polygon
  const dataPoints = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = (d.score / 100) * maxRadius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  // Calculate label positions
  const labelPositions = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const labelRadius = maxRadius + 25;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);
    return { x, y, label: d.label, score: d.score, color: d.color, angle };
  });

  return (
    <View style={{ position: "relative", width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {gridLines}
          {axisLines}
          <Polygon
            points={dataPoints}
            fill={PDF_COLORS.blue}
            fillOpacity={0.3}
            stroke={PDF_COLORS.blue}
            strokeWidth={2}
          />
          {/* Data points */}
          {data.map((d, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const r = (d.score / 100) * maxRadius;
            return (
              <Circle
                key={`point-${i}`}
                cx={cx + r * Math.cos(angle)}
                cy={cy + r * Math.sin(angle)}
                r={4}
                fill={d.color}
                stroke={PDF_COLORS.white}
                strokeWidth={1}
              />
            );
          })}
        </G>
      </Svg>
      {/* Labels positioned around the chart */}
      {labelPositions.map((pos, i) => {
        // Calculate text alignment based on position
        const isLeft = pos.x < cx - 10;
        const isRight = pos.x > cx + 10;
        const isTop = pos.y < cy - 10;
        
        return (
          <View
            key={`label-${i}`}
            style={{
              position: "absolute",
              left: isLeft ? pos.x - 40 : isRight ? pos.x - 10 : pos.x - 25,
              top: isTop ? pos.y - 8 : pos.y - 4,
              width: 50,
              alignItems: isLeft ? "flex-end" : isRight ? "flex-start" : "center",
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: 700, color: pos.color }}>
              {pos.label}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: 800, color: PDF_COLORS.gray900 }}>
              {pos.score}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Native SVG Bar Chart for react-pdf
function BarChartSvg({ data, width = 200, height = 120 }: { 
  data: { name: string; score: number; color: string }[]; 
  width?: number; 
  height?: number;
}) {
  const barHeight = 18;
  const gap = 6;
  const labelWidth = 55;
  const maxBarWidth = width - labelWidth - 30;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = i * (barHeight + gap) + 5;
        const barWidth = (d.score / 100) * maxBarWidth;
        return (
          <G key={i}>
            <Rect
              x={labelWidth}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={d.color}
              rx={3}
            />
            <Rect
              x={labelWidth + barWidth + 4}
              y={y + 2}
              width={20}
              height={barHeight - 4}
              fill="none"
            />
          </G>
        );
      })}
    </Svg>
  );
}

// Star Rating Component
function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.scoreStars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Svg key={star} width={12} height={12} viewBox="0 0 24 24">
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={star <= rating ? PDF_COLORS.amber : "none"}
            stroke={star <= rating ? PDF_COLORS.amber : PDF_COLORS.gray300}
            strokeWidth={1.5}
          />
        </Svg>
      ))}
    </View>
  );
}

interface ScoutingReportVectorPdfProps {
  report: ScoutingReportData;
  logoUrl?: string;
}

export function ScoutingReportVectorPdf({ report, logoUrl }: ScoutingReportVectorPdfProps) {
  const radarData = SCOUTING_CATEGORY_CONFIG.map((cat) => ({
    label: cat.label,
    score: report[`${cat.key}_score` as keyof ScoutingReportData] as number,
    color: cat.color,
  }));

  const barData = SCOUTING_CATEGORY_CONFIG.map((cat) => ({
    name: cat.label,
    score: report[`${cat.key}_score` as keyof ScoutingReportData] as number,
    color: cat.color,
  }));

  const breakdown: ScoreBreakdown = {
    baseScore: Number(report.base_score),
    competitionCoefficient: Number(report.competition_coefficient),
    adjustedScore: Number(report.adjusted_score),
    potentialBonus: report.potential_bonus || 0,
    consistencyModifier: report.consistency_modifier || 0,
    finalScore: Number(report.final_score),
    rating: report.rating,
  };

  const competitionLabel = [
    report.competitions?.name,
    report.competitions?.division,
    report.competitions?.phase,
  ].filter(Boolean).join(" - ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.headerTitle}>Relatório de Scouting</Text>
              <Text style={styles.headerSubtitle}>Análise de Desempenho Profissional</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>
              Data: <Text style={styles.headerMetaValue}>
                {format(new Date(report.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>
            </Text>
            <Text style={styles.headerMeta}>
              Competição: <Text style={styles.headerMetaValue}>{competitionLabel}</Text>
            </Text>
            <Text style={styles.headerMeta}>
              Scout: <Text style={styles.headerMetaValue}>{report.profiles?.full_name || "Scout"}</Text>
            </Text>
          </View>
        </View>

        {/* Player Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerInfo}>
            {report.players?.photo_url ? (
              <Image src={report.players.photo_url} style={styles.playerPhoto} />
            ) : (
              <View style={styles.playerPhotoPlaceholder}>
                <Text style={styles.playerPhotoInitial}>
                  {report.players?.full_name?.charAt(0) || "?"}
                </Text>
              </View>
            )}
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{report.players?.full_name}</Text>
              <View style={styles.playerMeta}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{report.players?.position}</Text>
                </View>
                <Text style={styles.playerClub}>
                  {report.players?.current_club} • {report.players?.nationality}
                </Text>
              </View>
              {report.opponent && (
                <Text style={styles.playerOpponent}>
                  Partida contra: {report.opponent}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.scoreBlock}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text style={[styles.scoreValue, { color: getScoreColor(breakdown.finalScore) }]}>
                {breakdown.finalScore.toFixed(1)}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <StarRating rating={breakdown.rating} />
            <Text style={[styles.scoreLabel, { color: getScoreColor(breakdown.finalScore) }]}>
              {getRatingLabel(breakdown.rating)}
            </Text>
          </View>
        </View>

        {/* Charts Grid */}
        <View style={styles.grid}>
          {/* Radar Chart */}
          <View style={[styles.card, styles.gridHalf]}>
            <Text style={styles.cardTitle}>Perfil de Desempenho</Text>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <RadarChartSvg data={radarData} size={200} />
            </View>
          </View>

          {/* Score Breakdown */}
          <View style={[styles.card, styles.gridHalf]}>
            <Text style={styles.cardTitle}>Breakdown da Pontuação</Text>
            <View style={styles.breakdownItem}>
              <View>
                <Text style={styles.breakdownLabel}>Score Base</Text>
                <Text style={styles.breakdownSub}>Média ponderada</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: PDF_COLORS.gray900 }]}>
                {breakdown.baseScore.toFixed(1)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <View>
                <Text style={styles.breakdownLabel}>Coeficiente</Text>
                <Text style={styles.breakdownSub}>Nível da competição</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: PDF_COLORS.amber }]}>
                ×{breakdown.competitionCoefficient.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.breakdownItem, { backgroundColor: "#EFF6FF", borderLeft: `3px solid ${PDF_COLORS.blue}` }]}>
              <View>
                <Text style={styles.breakdownLabel}>Score Ajustado</Text>
                <Text style={styles.breakdownSub}>Base × Coef.</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: PDF_COLORS.blue }]}>
                {breakdown.adjustedScore.toFixed(1)}
              </Text>
            </View>
            {(breakdown.potentialBonus > 0 || breakdown.consistencyModifier !== 0) && (
              <View style={[styles.breakdownItem, { backgroundColor: "#FFFBEB" }]}>
                <View>
                  <Text style={styles.breakdownLabel}>Modificadores</Text>
                  <Text style={styles.breakdownSub}>
                    Pot. +{breakdown.potentialBonus} | Cons. {breakdown.consistencyModifier >= 0 ? "+" : ""}{breakdown.consistencyModifier}
                  </Text>
                </View>
                <Text style={[styles.breakdownValue, { color: PDF_COLORS.amber }]}>
                  {breakdown.potentialBonus + breakdown.consistencyModifier >= 0 ? "+" : ""}
                  {breakdown.potentialBonus + breakdown.consistencyModifier}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scores por Categoria</Text>
          {SCOUTING_CATEGORY_CONFIG.map((cat) => {
            const score = report[`${cat.key}_score` as keyof ScoutingReportData] as number;
            const notes = report[`${cat.key}_notes` as keyof ScoutingReportData] as string | null;
            const weight = CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100;

            return (
              <View key={cat.key} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.categoryName}>{cat.label}</Text>
                    <Text style={styles.categoryWeight}>(Peso: {weight}%)</Text>
                  </View>
                  <Text style={[styles.categoryScore, { color: getScoreColor(score) }]}>
                    {score}
                  </Text>
                </View>
                {notes && (
                  <Text style={styles.categoryNotes}>{notes}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.footerLogo} />}
            <Text style={styles.footerText}>M3 Scouting © {new Date().getFullYear()}</Text>
          </View>
          <Text style={styles.footerText}>
            Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
      </Page>

      {/* Page 2: Summary & Recommendation */}
      {(report.summary || report.recommendation || report.match_notes) && (
        <Page size="A4" style={styles.page}>
          {report.summary && (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>
          )}
          {report.recommendation && (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Recomendação</Text>
              <Text style={styles.summaryText}>{report.recommendation}</Text>
            </View>
          )}
          {report.match_notes && (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Observações da Partida</Text>
              <Text style={styles.summaryText}>{report.match_notes}</Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <View style={styles.footerLeft}>
              {logoUrl && <Image src={logoUrl} style={styles.footerLogo} />}
              <Text style={styles.footerText}>M3 Scouting © {new Date().getFullYear()}</Text>
            </View>
            <Text style={styles.footerText}>
              Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
