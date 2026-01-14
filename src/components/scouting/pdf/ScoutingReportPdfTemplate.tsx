import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Target, Brain, Zap, Heart, TrendingUp, Trophy, Scale, Sparkles, Star } from "lucide-react";
import { CATEGORY_WEIGHTS, getRatingLabel, ScoreBreakdown } from "@/lib/scoring";
import { ScoutingReportData, SCOUTING_CATEGORY_CONFIG } from "@/types/scouting";

interface ScoutingReportPdfTemplateProps {
  report: ScoutingReportData;
}

// Design tokens for PDF consistency
const PDF_TOKENS = {
  // Page
  pagePadding: "18mm",
  pageBackground: "#FFFFFF",
  
  // Cards
  cardRadius: "14px",
  cardBorder: "1px solid #E6E8EC",
  cardShadow: "0 2px 6px rgba(0,0,0,0.06)",
  cardBackground: "#FFFFFF",
  cardBackgroundAlt: "#F8F9FB",
  
  // Spacing
  sectionGap: "20px",
  cardPadding: "20px",
  itemGap: "12px",
  
  // Typography
  colorPrimary: "#111827",
  colorSecondary: "#6B7280",
  colorMuted: "#9CA3AF",
  
  // Brand
  brandRed: "#E30613",
  accentBlue: "#3b82f6",
  accentAmber: "#f59e0b",
};

const categoryIcons = {
  technical: Target,
  tactical: Brain,
  physical: Zap,
  mental: Heart,
  impact: TrendingUp,
};

function getScoreColorPdf(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function RatingStarsPdf({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "3px", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? "#f59e0b" : "transparent"}
          color={star <= rating ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// M3 Logo SVG inline (red version)
function M3LogoRed() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="16" fill={PDF_TOKENS.brandRed} />
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, sans-serif"
        fontSize="48"
        fontWeight="800"
      >
        M3
      </text>
    </svg>
  );
}

export const ScoutingReportPdfTemplate = forwardRef<HTMLDivElement, ScoutingReportPdfTemplateProps>(
  ({ report }, ref) => {
    const radarData = SCOUTING_CATEGORY_CONFIG.map((cat) => ({
      category: cat.label,
      score: report[`${cat.key}_score` as keyof ScoutingReportData] as number,
      fullMark: 100,
    }));

    const barData = SCOUTING_CATEGORY_CONFIG.map((cat) => ({
      name: cat.label,
      score: report[`${cat.key}_score` as keyof ScoutingReportData] as number,
      weight: CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100,
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
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "297mm",
          backgroundColor: PDF_TOKENS.pageBackground,
          color: PDF_TOKENS.colorPrimary,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: "11pt",
          lineHeight: 1.5,
          padding: PDF_TOKENS.pagePadding,
          boxSizing: "border-box",
          overflow: "visible",
        }}
      >
        {/* ============ HEADER ============ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "16px",
            borderBottom: `2px solid ${PDF_TOKENS.brandRed}`,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Left: Logo + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <M3LogoRed />
            <div>
              <h1 
                style={{ 
                  fontSize: "20pt", 
                  fontWeight: 800, 
                  margin: 0, 
                  color: PDF_TOKENS.colorPrimary,
                  letterSpacing: "-0.5px",
                }}
              >
                Relatório de Scouting
              </h1>
              <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, margin: "2px 0 0 0" }}>
                Análise de Desempenho Profissional
              </p>
            </div>
          </div>
          
          {/* Right: Meta info */}
          <div style={{ textAlign: "right", fontSize: "9pt", color: PDF_TOKENS.colorSecondary }}>
            <p style={{ margin: "3px 0" }}>
              <strong style={{ color: PDF_TOKENS.colorPrimary }}>Data:</strong>{" "}
              {format(new Date(report.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong style={{ color: PDF_TOKENS.colorPrimary }}>Competição:</strong> {competitionLabel}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong style={{ color: PDF_TOKENS.colorPrimary }}>Scout:</strong> {report.profiles?.full_name || "Scout"}
            </p>
          </div>
        </div>

        {/* ============ PLAYER CARD ============ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            padding: PDF_TOKENS.cardPadding,
            backgroundColor: PDF_TOKENS.cardBackgroundAlt,
            borderRadius: PDF_TOKENS.cardRadius,
            border: PDF_TOKENS.cardBorder,
            boxShadow: PDF_TOKENS.cardShadow,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Photo */}
          {report.players?.photo_url && (
            <img
              src={report.players.photo_url}
              alt={report.players.full_name}
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "3px solid #E6E8EC",
                flexShrink: 0,
              }}
            />
          )}
          
          {/* Player Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: "18pt", fontWeight: 700, margin: "0 0 8px 0", color: PDF_TOKENS.colorPrimary }}>
              {report.players?.full_name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "5px 14px",
                  backgroundColor: PDF_TOKENS.accentBlue,
                  color: "#fff",
                  borderRadius: "20px",
                  fontSize: "9pt",
                  fontWeight: 600,
                }}
              >
                {report.players?.position}
              </span>
              <span style={{ fontSize: "10pt", color: PDF_TOKENS.colorSecondary }}>
                {report.players?.current_club} • {report.players?.nationality}
              </span>
            </div>
            {report.opponent && (
              <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, marginTop: "8px", marginBottom: 0 }}>
                Partida contra: <strong style={{ color: PDF_TOKENS.colorPrimary }}>{report.opponent}</strong>
              </p>
            )}
          </div>
          
          {/* Score Block - Fixed alignment */}
          <div 
            style={{ 
              textAlign: "center", 
              minWidth: "130px",
              padding: "12px 16px",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: PDF_TOKENS.cardBorder,
              flexShrink: 0,
            }}
          >
            {/* Score with /100 aligned */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "2px" }}>
              <span
                style={{
                  fontSize: "36pt",
                  fontWeight: 800,
                  color: getScoreColorPdf(breakdown.finalScore),
                  lineHeight: 1,
                }}
              >
                {breakdown.finalScore.toFixed(1)}
              </span>
              <span style={{ fontSize: "12pt", color: PDF_TOKENS.colorMuted, fontWeight: 500 }}>/100</span>
            </div>
            
            {/* Stars centered */}
            <div style={{ marginTop: "8px" }}>
              <RatingStarsPdf rating={breakdown.rating} />
            </div>
            
            {/* Rating label */}
            <div
              style={{
                fontSize: "11pt",
                fontWeight: 700,
                color: PDF_TOKENS.accentAmber,
                marginTop: "6px",
              }}
            >
              {getRatingLabel(breakdown.rating)}
            </div>
          </div>
        </div>

        {/* ============ MAIN CONTENT GRID ============ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: PDF_TOKENS.sectionGap,
            marginBottom: PDF_TOKENS.sectionGap,
          }}
        >
          {/* Radar Chart Card */}
          <div
            style={{
              backgroundColor: PDF_TOKENS.cardBackground,
              border: PDF_TOKENS.cardBorder,
              borderRadius: PDF_TOKENS.cardRadius,
              padding: PDF_TOKENS.cardPadding,
              boxShadow: PDF_TOKENS.cardShadow,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "13pt",
                fontWeight: 700,
                margin: "0 0 16px 0",
                color: PDF_TOKENS.colorPrimary,
              }}
            >
              Perfil de Desempenho
            </h3>
            <div style={{ width: "100%", height: "240px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <RadarChart
                width={300}
                height={240}
                data={radarData}
              >
                <PolarGrid stroke="#E6E8EC" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: PDF_TOKENS.colorPrimary, fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: PDF_TOKENS.colorMuted, fontSize: 8 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={PDF_TOKENS.accentBlue}
                  fill={PDF_TOKENS.accentBlue}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </div>
          </div>

          {/* Score Breakdown Card */}
          <div
            style={{
              backgroundColor: PDF_TOKENS.cardBackground,
              border: PDF_TOKENS.cardBorder,
              borderRadius: PDF_TOKENS.cardRadius,
              padding: PDF_TOKENS.cardPadding,
              boxShadow: PDF_TOKENS.cardShadow,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "13pt",
                fontWeight: 700,
                margin: "0 0 16px 0",
                color: PDF_TOKENS.colorPrimary,
              }}
            >
              Breakdown da Pontuação
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Base Score */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Scale size={18} color={PDF_TOKENS.colorSecondary} />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: PDF_TOKENS.colorPrimary }}>
                      Score Base
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted }}>
                      Média ponderada
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "16pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary }}>
                  {breakdown.baseScore.toFixed(1)}
                </span>
              </div>

              {/* Competition Coefficient */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Trophy size={18} color={PDF_TOKENS.accentAmber} />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: PDF_TOKENS.colorPrimary }}>
                      Coeficiente
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted }}>
                      Nível da competição
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "16pt", fontWeight: 700, color: PDF_TOKENS.accentAmber }}>
                  ×{breakdown.competitionCoefficient.toFixed(2)}
                </span>
              </div>

              {/* Adjusted Score */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "10px",
                  borderLeft: `4px solid ${PDF_TOKENS.accentBlue}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <TrendingUp size={18} color={PDF_TOKENS.accentBlue} />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: PDF_TOKENS.colorPrimary }}>
                      Score Ajustado
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted }}>
                      Base × Coef.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "16pt", fontWeight: 700, color: PDF_TOKENS.accentBlue }}>
                  {breakdown.adjustedScore.toFixed(1)}
                </span>
              </div>

              {/* Modifiers */}
              {(breakdown.potentialBonus > 0 || breakdown.consistencyModifier !== 0) && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Sparkles size={18} color={PDF_TOKENS.accentAmber} />
                    <div>
                      <div style={{ fontSize: "10pt", fontWeight: 600, color: PDF_TOKENS.colorPrimary }}>
                        Modificadores
                      </div>
                      <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted }}>
                        Pot. +{breakdown.potentialBonus} | Cons.{" "}
                        {breakdown.consistencyModifier >= 0 ? "+" : ""}
                        {breakdown.consistencyModifier}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "16pt", fontWeight: 700, color: PDF_TOKENS.accentAmber }}>
                    {breakdown.potentialBonus + breakdown.consistencyModifier >= 0 ? "+" : ""}
                    {breakdown.potentialBonus + breakdown.consistencyModifier}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============ BAR CHART SECTION ============ */}
        <div
          style={{
            backgroundColor: PDF_TOKENS.cardBackground,
            border: PDF_TOKENS.cardBorder,
            borderRadius: PDF_TOKENS.cardRadius,
            padding: PDF_TOKENS.cardPadding,
            boxShadow: PDF_TOKENS.cardShadow,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <h3
            style={{
              fontSize: "13pt",
              fontWeight: 700,
              margin: "0 0 16px 0",
              color: PDF_TOKENS.colorPrimary,
            }}
          >
            Scores por Categoria
          </h3>
          <div style={{ width: "100%", height: "180px", display: "flex", justifyContent: "center" }}>
            <BarChart
              width={520}
              height={180}
              data={barData}
              layout="vertical"
            >
              <XAxis type="number" domain={[0, 100]} tick={{ fill: PDF_TOKENS.colorSecondary, fontSize: 9 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={75}
                tick={{ fill: PDF_TOKENS.colorPrimary, fontSize: 10, fontWeight: 600 }}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* ============ CATEGORY DETAILS ============ */}
        {/* This section allows page breaks BETWEEN items, but not WITHIN an item */}
        <div
          style={{
            backgroundColor: PDF_TOKENS.cardBackground,
            border: PDF_TOKENS.cardBorder,
            borderRadius: PDF_TOKENS.cardRadius,
            padding: PDF_TOKENS.cardPadding,
            boxShadow: PDF_TOKENS.cardShadow,
            marginBottom: PDF_TOKENS.sectionGap,
            // Don't use pageBreakInside: avoid here - allow the section to break
          }}
        >
          <h3
            style={{
              fontSize: "13pt",
              fontWeight: 700,
              margin: "0 0 16px 0",
              color: PDF_TOKENS.colorPrimary,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            Detalhamento por Categoria
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: PDF_TOKENS.itemGap }}>
            {SCOUTING_CATEGORY_CONFIG.map((cat) => {
              const score = report[`${cat.key}_score` as keyof ScoutingReportData] as number;
              const notes = report[`${cat.key}_notes` as keyof ScoutingReportData] as string | null;
              const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
              const weight = CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100;

              return (
                <div
                  key={cat.key}
                  style={{
                    padding: "14px 18px",
                    backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                    borderRadius: "10px",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: notes ? "10px" : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          backgroundColor: `${cat.color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={16} color={cat.color} />
                      </div>
                      <span style={{ fontSize: "12pt", fontWeight: 600, color: PDF_TOKENS.colorPrimary }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: "9pt", color: PDF_TOKENS.colorMuted }}>
                        (Peso: {weight}%)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "18pt",
                        fontWeight: 700,
                        color: getScoreColorPdf(score),
                      }}
                    >
                      {score}
                    </span>
                  </div>
                  {notes && (
                    <p
                      style={{
                        fontSize: "9pt",
                        color: PDF_TOKENS.colorSecondary,
                        margin: 0,
                        paddingLeft: "44px",
                        lineHeight: 1.5,
                      }}
                    >
                      {notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ SUMMARY & RECOMMENDATION ============ */}
        {(report.summary || report.recommendation) && (
          <div
            style={{
              backgroundColor: PDF_TOKENS.cardBackground,
              border: PDF_TOKENS.cardBorder,
              borderRadius: PDF_TOKENS.cardRadius,
              padding: PDF_TOKENS.cardPadding,
              boxShadow: PDF_TOKENS.cardShadow,
              marginBottom: PDF_TOKENS.sectionGap,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {report.summary && (
              <div style={{ marginBottom: report.recommendation ? "18px" : 0 }}>
                <h4
                  style={{
                    fontSize: "12pt",
                    fontWeight: 700,
                    color: PDF_TOKENS.colorPrimary,
                    margin: "0 0 10px 0",
                  }}
                >
                  Resumo
                </h4>
                <p style={{ fontSize: "10pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
                  {report.summary}
                </p>
              </div>
            )}
            {report.recommendation && (
              <div>
                <h4
                  style={{
                    fontSize: "12pt",
                    fontWeight: 700,
                    color: PDF_TOKENS.colorPrimary,
                    margin: "0 0 10px 0",
                  }}
                >
                  Recomendação
                </h4>
                <p style={{ fontSize: "10pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
                  {report.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ MATCH NOTES ============ */}
        {report.match_notes && (
          <div
            style={{
              backgroundColor: PDF_TOKENS.cardBackground,
              border: PDF_TOKENS.cardBorder,
              borderRadius: PDF_TOKENS.cardRadius,
              padding: PDF_TOKENS.cardPadding,
              boxShadow: PDF_TOKENS.cardShadow,
              marginBottom: PDF_TOKENS.sectionGap,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12pt",
                fontWeight: 700,
                color: PDF_TOKENS.colorPrimary,
                margin: "0 0 10px 0",
              }}
            >
              Observações da Partida
            </h4>
            <p style={{ fontSize: "10pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
              {report.match_notes}
            </p>
          </div>
        )}

        {/* ============ FOOTER ============ */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "16px",
            borderTop: `1px solid #E6E8EC`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "8pt",
            color: PDF_TOKENS.colorMuted,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: PDF_TOKENS.brandRed,
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "7pt",
                fontWeight: 800,
              }}
            >
              M3
            </div>
            <span>M3 Scouting © {new Date().getFullYear()}</span>
          </div>
          <span>
            Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    );
  }
);

ScoutingReportPdfTemplate.displayName = "ScoutingReportPdfTemplate";
