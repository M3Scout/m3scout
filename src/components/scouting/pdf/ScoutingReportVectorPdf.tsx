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
  Defs,
  LinearGradient,
  Stop,
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

// Truncate text helper
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + "…";
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
    alignItems: "flex-start",
    paddingBottom: 16,
    marginBottom: 20,
    borderBottom: `3px solid ${PDF_COLORS.brandRed}`,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    maxWidth: "60%",
  },
  logo: {
    width: 50,
    height: "auto",
    objectFit: "contain",
  },
  headerTitleBlock: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    flexWrap: "wrap",
  },
  headerSubtitle: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
  headerRight: {
    backgroundColor: PDF_COLORS.gray900,
    padding: 10,
    borderRadius: 6,
    width: 160,
    flexShrink: 0,
  },
  headerMeta: {
    fontSize: 8,
    color: PDF_COLORS.gray400,
    marginBottom: 4,
    lineHeight: 1.3,
  },
  headerMetaValue: {
    fontWeight: 700,
    color: PDF_COLORS.white,
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
  // Category Details with Icons
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PDF_COLORS.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryNameBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 11,
    fontWeight: 700,
    color: PDF_COLORS.gray900,
  },
  categoryWeight: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
    marginLeft: 6,
  },
  categoryScore: {
    fontSize: 16,
    fontWeight: 800,
  },
  categoryNotes: {
    fontSize: 8,
    color: PDF_COLORS.gray600,
    lineHeight: 1.4,
    marginTop: 4,
    marginLeft: 38,
  },
  // Bar Chart Section
  barChartCard: {
    backgroundColor: PDF_COLORS.white,
    border: `1px solid ${PDF_COLORS.gray200}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  barChartTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
    marginBottom: 14,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  barLabel: {
    width: 60,
    fontSize: 9,
    fontWeight: 600,
    color: PDF_COLORS.gray700,
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: PDF_COLORS.gray200,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  barFill: {
    height: 16,
    borderRadius: 4,
  },
  barValue: {
    width: 30,
    fontSize: 11,
    fontWeight: 800,
    textAlign: "right",
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
    width: 28,
    height: "auto",
  },
  footerText: {
    fontSize: 8,
    color: PDF_COLORS.gray500,
  },
  // Page header for continuation pages
  pageHeader: {
    marginBottom: 16,
  },
  pageHeaderTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: PDF_COLORS.gray900,
  },
  pageHeaderSubtitle: {
    fontSize: 9,
    color: PDF_COLORS.gray500,
    marginTop: 2,
  },
});

// Category Icon SVG Component
function CategoryIcon({ color, iconType }: { color: string; iconType: string }) {
  const iconSize = 14;
  
  // Simple icon paths for each category
  const icons: Record<string, React.ReactNode> = {
    technical: (
      // Football/soccer ball icon
      <Circle cx={7} cy={7} r={6} fill="none" stroke={color} strokeWidth={1.5} />
    ),
    tactical: (
      // Crosshair/target icon
      <G>
        <Circle cx={7} cy={7} r={5} fill="none" stroke={color} strokeWidth={1.5} />
        <Line x1={7} y1={2} x2={7} y2={5} stroke={color} strokeWidth={1.5} />
        <Line x1={7} y1={9} x2={7} y2={12} stroke={color} strokeWidth={1.5} />
        <Line x1={2} y1={7} x2={5} y2={7} stroke={color} strokeWidth={1.5} />
        <Line x1={9} y1={7} x2={12} y2={7} stroke={color} strokeWidth={1.5} />
      </G>
    ),
    physical: (
      // Lightning bolt icon
      <Path d="M8 2 L4 8 L7 8 L6 12 L10 6 L7 6 L8 2 Z" fill={color} />
    ),
    mental: (
      // Brain/head icon - simplified
      <G>
        <Circle cx={7} cy={7} r={5} fill="none" stroke={color} strokeWidth={1.5} />
        <Path d="M5 7 Q7 4 9 7 Q7 10 5 7" fill="none" stroke={color} strokeWidth={1} />
      </G>
    ),
    impact: (
      // Star icon
      <Path d="M7 2 L8.5 5.5 L12 6 L9.5 8.5 L10 12 L7 10.5 L4 12 L4.5 8.5 L2 6 L5.5 5.5 Z" fill={color} />
    ),
  };

  return (
    <Svg width={iconSize} height={iconSize} viewBox="0 0 14 14">
      {icons[iconType] || icons.technical}
    </Svg>
  );
}

// Native SVG Radar Chart for react-pdf with labels
function RadarChartSvg({ data, size = 180 }: { data: { label: string; score: number; color: string }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 40;
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
    const labelRadius = maxRadius + 22;
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
        const isLeft = pos.x < cx - 10;
        const isRight = pos.x > cx + 10;
        const isTop = pos.y < cy - 10;
        
        return (
          <View
            key={`label-${i}`}
            style={{
              position: "absolute",
              left: isLeft ? pos.x - 35 : isRight ? pos.x - 10 : pos.x - 22,
              top: isTop ? pos.y - 6 : pos.y - 4,
              width: 45,
              alignItems: isLeft ? "flex-end" : isRight ? "flex-start" : "center",
            }}
          >
            <Text style={{ fontSize: 6, fontWeight: 700, color: pos.color }}>
              {pos.label}
            </Text>
            <Text style={{ fontSize: 8, fontWeight: 800, color: PDF_COLORS.gray900 }}>
              {pos.score}
            </Text>
          </View>
        );
      })}
    </View>
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
    key: cat.key,
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
      {/* ========== PAGE 1: Header + Player + Charts ========== */}
      <Page size="A4" style={styles.page}>
        {/* Header - Fixed layout */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Relatório de Scouting</Text>
              <Text style={styles.headerSubtitle}>Análise de Desempenho Profissional</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>
              Data:{" "}
              <Text style={styles.headerMetaValue}>
                {format(new Date(report.match_date), "dd/MM/yyyy", { locale: ptBR })}
              </Text>
            </Text>
            <Text style={styles.headerMeta}>
              Competição:{" "}
              <Text style={styles.headerMetaValue}>
                {truncateText(competitionLabel, 28)}
              </Text>
            </Text>
            <Text style={[styles.headerMeta, { marginBottom: 0 }]}>
              Scout:{" "}
              <Text style={styles.headerMetaValue}>
                {truncateText(report.profiles?.full_name || "Scout", 24)}
              </Text>
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

        {/* Charts Grid: Radar + Breakdown */}
        <View style={styles.grid}>
          {/* Radar Chart */}
          <View style={[styles.card, styles.gridHalf]}>
            <Text style={styles.cardTitle}>Perfil de Desempenho</Text>
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              <RadarChartSvg data={radarData} size={180} />
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

        {/* Bar Chart - Dark theme (Premium look) */}
        <View style={styles.barChartCard}>
          <Text style={styles.barChartTitle}>Scores por Categoria</Text>
          {barData.map((item) => (
            <View key={item.key} style={styles.barRow}>
              <Text style={styles.barLabel}>{item.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${item.score}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: item.color }]}>{item.score}</Text>
            </View>
          ))}
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

      {/* ========== PAGE 2: Category Details with Icons ========== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Detalhamento por Categoria</Text>
          <Text style={styles.pageHeaderSubtitle}>
            {report.players?.full_name} • {format(new Date(report.match_date), "dd/MM/yyyy", { locale: ptBR })}
          </Text>
        </View>

        {/* Category Details - Full block, won't break */}
        <View style={styles.card} wrap={false}>
          <Text style={styles.cardTitle}>Scores por Categoria</Text>
          {SCOUTING_CATEGORY_CONFIG.map((cat) => {
            const score = report[`${cat.key}_score` as keyof ScoutingReportData] as number;
            const notes = report[`${cat.key}_notes` as keyof ScoutingReportData] as string | null;
            const weight = CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100;

            return (
              <View key={cat.key} wrap={false}>
                <View style={styles.categoryItem}>
                  <View style={[styles.categoryIconContainer, { backgroundColor: cat.color + "20" }]}>
                    <CategoryIcon color={cat.color} iconType={cat.key} />
                  </View>
                  <View style={styles.categoryContent}>
                    <View style={styles.categoryNameBlock}>
                      <Text style={styles.categoryName}>{cat.label}</Text>
                      <Text style={styles.categoryWeight}>(Peso: {weight}%)</Text>
                    </View>
                    <Text style={[styles.categoryScore, { color: getScoreColor(score) }]}>
                      {score}
                    </Text>
                  </View>
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

      {/* ========== PAGE 3: Summary & Recommendation ========== */}
      {(report.summary || report.recommendation || report.match_notes) && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>Resumo e Recomendações</Text>
            <Text style={styles.pageHeaderSubtitle}>
              {report.players?.full_name} • {format(new Date(report.match_date), "dd/MM/yyyy", { locale: ptBR })}
            </Text>
          </View>

          {report.summary && (
            <View style={styles.card} wrap={false}>
              <Text style={styles.summaryTitle}>Resumo</Text>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>
          )}
          {report.recommendation && (
            <View style={styles.card} wrap={false}>
              <Text style={styles.summaryTitle}>Recomendação</Text>
              <Text style={styles.summaryText}>{report.recommendation}</Text>
            </View>
          )}
          {report.match_notes && (
            <View style={styles.card} wrap={false}>
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
