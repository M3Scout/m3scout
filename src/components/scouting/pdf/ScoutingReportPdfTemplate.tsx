import { forwardRef, useEffect, useState } from "react";
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
import logoRelatorio from "@/assets/logo-relatorio.png";

interface ScoutingReportPdfTemplateProps {
  report: ScoutingReportData;
}

// Design tokens for PDF consistency - OPTIMIZED FOR EXPORT
const PDF_TOKENS = {
  // Page
  pagePadding: "16mm",
  pageBackground: "#FFFFFF",
  
  // Cards
  cardRadius: "12px",
  cardBorder: "1.5px solid #D1D5DB",
  cardShadow: "none",
  cardBackground: "#FFFFFF",
  cardBackgroundAlt: "#F3F4F6",
  
  // Spacing
  sectionGap: "20px",
  cardPadding: "20px",
  itemGap: "12px",
  
  // Typography - HIGH CONTRAST FOR PDF
  colorPrimary: "#111827",
  colorSecondary: "#374151",
  colorMuted: "#4B5563",
  
  // Brand
  brandRed: "#E30613",
  accentBlue: "#2563EB",
  accentAmber: "#D97706",
  accentGreen: "#059669",
};

const categoryIcons = {
  technical: Target,
  tactical: Brain,
  physical: Zap,
  mental: Heart,
  impact: TrendingUp,
};

function getScoreColorPdf(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#2563EB";
  if (score >= 40) return "#D97706";
  return "#DC2626";
}

function RatingStarsPdf({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-start", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? "#D97706" : "transparent"}
          color={star <= rating ? "#D97706" : "#9CA3AF"}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}

// Player photo component with fallback and preloading
function PlayerPhoto({ 
  src, 
  alt, 
  onLoad 
}: { 
  src?: string | null; 
  alt: string; 
  onLoad?: () => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      onLoad?.();
      return;
    }

    // Preload and convert to base64 for reliable PDF rendering
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setImageSrc(canvas.toDataURL("image/png"));
        } else {
          setImageSrc(src);
        }
      } catch {
        setImageSrc(src);
      }
      onLoad?.();
    };
    img.onerror = () => {
      setHasError(true);
      onLoad?.();
    };
    img.src = src;
  }, [src, onLoad]);

  const containerStyle: React.CSSProperties = {
    width: "96px",
    height: "96px",
    borderRadius: "12px",
    border: "3px solid #E5E7EB",
    flexShrink: 0,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (hasError || !imageSrc) {
    return (
      <div style={containerStyle}>
        <div style={{ 
          width: "100%", 
          height: "100%", 
          backgroundColor: "#E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: "32px",
          fontWeight: 700,
        }}>
          {alt.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      style={{
        ...containerStyle,
        objectFit: "cover",
      }}
    />
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
        className="pdf-export"
        style={{
          width: "210mm",
          minHeight: "297mm",
          backgroundColor: PDF_TOKENS.pageBackground,
          color: PDF_TOKENS.colorPrimary,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: "10pt",
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
            borderBottom: `3px solid ${PDF_TOKENS.brandRed}`,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Left: Logo + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img 
              src={logoRelatorio} 
              alt="M3" 
              style={{ 
                width: "80px", 
                height: "48px", 
                objectFit: "contain",
                flexShrink: 0,
              }} 
            />
            <div>
              <h1 
                style={{ 
                  fontSize: "22pt", 
                  fontWeight: 800, 
                  margin: 0, 
                  color: PDF_TOKENS.colorPrimary,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}
              >
                Relatório de Scouting
              </h1>
              <p style={{ 
                fontSize: "9pt", 
                color: PDF_TOKENS.colorSecondary, 
                margin: "4px 0 0 0",
                fontWeight: 500,
              }}>
                Análise de Desempenho Profissional
              </p>
            </div>
          </div>
          
          {/* Right: Meta info - LEFT ALIGNED content, VERTICALLY CENTERED */}
          <div 
            style={{ 
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              fontSize: "9pt", 
              color: PDF_TOKENS.colorSecondary,
              backgroundColor: PDF_TOKENS.cardBackgroundAlt,
              padding: "12px 16px",
              borderRadius: "10px",
              border: PDF_TOKENS.cardBorder,
              minHeight: "70px",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: "2px 0", display: "flex", alignItems: "center", gap: "6px", lineHeight: 1.4 }}>
                <strong style={{ color: PDF_TOKENS.colorPrimary }}>Data:</strong>
                <span>{format(new Date(report.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </p>
              <p style={{ margin: "2px 0", display: "flex", alignItems: "center", gap: "6px", lineHeight: 1.4 }}>
                <strong style={{ color: PDF_TOKENS.colorPrimary }}>Competição:</strong>
                <span>{competitionLabel}</span>
              </p>
              <p style={{ margin: "2px 0", display: "flex", alignItems: "center", gap: "6px", lineHeight: 1.4 }}>
                <strong style={{ color: PDF_TOKENS.colorPrimary }}>Scout:</strong>
                <span>{report.profiles?.full_name || "Scout"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ============ PLAYER CARD ============ */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "0",
            backgroundColor: PDF_TOKENS.cardBackground,
            borderRadius: PDF_TOKENS.cardRadius,
            border: PDF_TOKENS.cardBorder,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
            overflow: "hidden",
          }}
        >
          {/* Left section: Photo + Info */}
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "16px", 
              flex: 1,
              padding: PDF_TOKENS.cardPadding,
              backgroundColor: PDF_TOKENS.cardBackgroundAlt,
            }}
          >
            {/* Photo with fallback */}
            <PlayerPhoto 
              src={report.players?.photo_url} 
              alt={report.players?.full_name || "Player"} 
            />
            
            {/* Player Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ 
                fontSize: "18pt", 
                fontWeight: 800, 
                margin: "0 0 10px 0", 
                color: PDF_TOKENS.colorPrimary,
                letterSpacing: "-0.3px",
              }}>
                {report.players?.full_name}
              </h2>
              {/* Position pill + Club - FIXED ALIGNMENT - wrapper centers all items */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "12px", 
                flexWrap: "wrap",
                marginTop: "2px",
              }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "28px",
                    padding: "0 14px",
                    backgroundColor: PDF_TOKENS.accentBlue,
                    color: "#FFFFFF",
                    borderRadius: "14px",
                    fontSize: "9pt",
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    lineHeight: "28px",
                    boxSizing: "border-box",
                    verticalAlign: "middle",
                  }}
                >
                  {report.players?.position}
                </span>
                <span style={{ 
                  fontSize: "10pt", 
                  color: PDF_TOKENS.colorSecondary, 
                  fontWeight: 600,
                  lineHeight: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  verticalAlign: "middle",
                }}>
                  {report.players?.current_club} • {report.players?.nationality}
                </span>
              </div>
              {report.opponent && (
                <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, marginTop: "8px", marginBottom: 0 }}>
                  Partida contra: <strong style={{ color: PDF_TOKENS.colorPrimary }}>{report.opponent}</strong>
                </p>
              )}
            </div>
          </div>
          
          {/* Right section: Score Block - FIXED LAYOUT */}
          <div 
            style={{ 
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              minWidth: "130px",
              padding: "16px 20px",
              backgroundColor: PDF_TOKENS.cardBackground,
              borderLeft: "1.5px solid #D1D5DB",
              flexShrink: 0,
            }}
          >
            {/* Score number + /100 on same line */}
            <div style={{ 
              display: "flex", 
              alignItems: "baseline", 
              justifyContent: "flex-start",
              gap: "4px",
              marginBottom: "4px",
            }}>
              <span
                style={{
                  fontSize: "32pt",
                  fontWeight: 900,
                  color: getScoreColorPdf(breakdown.finalScore),
                  lineHeight: 1,
                  letterSpacing: "-1.5px",
                }}
              >
                {breakdown.finalScore.toFixed(1)}
              </span>
              <span style={{ 
                fontSize: "14pt", 
                color: PDF_TOKENS.colorMuted, 
                fontWeight: 600,
              }}>/100</span>
            </div>
            
            {/* Stars - BELOW score with more spacing */}
            <div style={{ marginTop: "10px", marginBottom: "8px" }}>
              <RatingStarsPdf rating={breakdown.rating} />
            </div>
            
            {/* Rating label */}
            <div
              style={{
                fontSize: "10pt",
                fontWeight: 800,
                color: getScoreColorPdf(breakdown.finalScore),
                textTransform: "uppercase",
                letterSpacing: "0.5px",
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
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "13pt",
                fontWeight: 800,
                margin: "0 0 14px 0",
                color: PDF_TOKENS.colorPrimary,
                letterSpacing: "-0.3px",
              }}
            >
              Perfil de Desempenho
            </h3>
            {/* Radar with enhanced visibility */}
            <div style={{ width: "100%", height: "260px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <RadarChart
                width={320}
                height={260}
                data={radarData}
              >
                <PolarGrid 
                  stroke="#9CA3AF" 
                  strokeWidth={1.5} 
                  strokeOpacity={0.6}
                />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ 
                    fill: PDF_TOKENS.colorPrimary, 
                    fontSize: 10, 
                    fontWeight: 700,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ 
                    fill: PDF_TOKENS.colorMuted, 
                    fontSize: 8,
                    fontWeight: 600,
                  }}
                  stroke="#9CA3AF"
                  strokeWidth={1}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={PDF_TOKENS.accentBlue}
                  fill={PDF_TOKENS.accentBlue}
                  fillOpacity={0.35}
                  strokeWidth={2.5}
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
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "13pt",
                fontWeight: 800,
                margin: "0 0 14px 0",
                color: PDF_TOKENS.colorPrimary,
                letterSpacing: "-0.3px",
              }}
            >
              Breakdown da Pontuação
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Base Score */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 14px",
                  backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  height: "52px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
                  <Scale size={16} color={PDF_TOKENS.colorSecondary} style={{ flexShrink: 0, alignSelf: "center" }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary, lineHeight: 1.3, margin: 0 }}>
                      Score Base
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted, lineHeight: 1.3, margin: 0 }}>
                      Média ponderada
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 800, color: PDF_TOKENS.colorPrimary, display: "flex", alignItems: "center", height: "100%" }}>
                  {breakdown.baseScore.toFixed(1)}
                </span>
              </div>

              {/* Competition Coefficient */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 14px",
                  backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  height: "52px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
                  <Trophy size={16} color={PDF_TOKENS.accentAmber} style={{ flexShrink: 0, alignSelf: "center" }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary, lineHeight: 1.3, margin: 0 }}>
                      Coeficiente
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted, lineHeight: 1.3, margin: 0 }}>
                      Nível da competição
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 800, color: PDF_TOKENS.accentAmber, display: "flex", alignItems: "center", height: "100%" }}>
                  ×{breakdown.competitionCoefficient.toFixed(2)}
                </span>
              </div>

              {/* Adjusted Score */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 14px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${PDF_TOKENS.accentBlue}`,
                  height: "52px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
                  <TrendingUp size={16} color={PDF_TOKENS.accentBlue} style={{ flexShrink: 0, alignSelf: "center" }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary, lineHeight: 1.3, margin: 0 }}>
                      Score Ajustado
                    </div>
                    <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted, lineHeight: 1.3, margin: 0 }}>
                      Base × Coef.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 800, color: PDF_TOKENS.accentBlue, display: "flex", alignItems: "center", height: "100%" }}>
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
                    padding: "0 14px",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "8px",
                    border: "1px solid #FDE68A",
                    height: "52px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
                    <Sparkles size={16} color={PDF_TOKENS.accentAmber} style={{ flexShrink: 0, alignSelf: "center" }} />
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
                      <div style={{ fontSize: "9pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary, lineHeight: 1.3, margin: 0 }}>
                        Modificadores
                      </div>
                      <div style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted, lineHeight: 1.3, margin: 0 }}>
                        Pot. +{breakdown.potentialBonus} | Cons.{" "}
                        {breakdown.consistencyModifier >= 0 ? "+" : ""}
                        {breakdown.consistencyModifier}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "14pt", fontWeight: 800, color: PDF_TOKENS.accentAmber, display: "flex", alignItems: "center", height: "100%" }}>
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
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <h3
            style={{
              fontSize: "13pt",
              fontWeight: 800,
              margin: "0 0 14px 0",
              color: PDF_TOKENS.colorPrimary,
              letterSpacing: "-0.3px",
            }}
          >
            Scores por Categoria
          </h3>
          <div style={{ width: "100%", height: "170px", display: "flex", justifyContent: "center" }}>
            <BarChart
              width={500}
              height={170}
              data={barData}
              layout="vertical"
            >
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tick={{ fill: PDF_TOKENS.colorSecondary, fontSize: 9, fontWeight: 600 }} 
                stroke="#9CA3AF"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fill: PDF_TOKENS.colorPrimary, fontSize: 9, fontWeight: 700 }}
                stroke="#9CA3AF"
              />
              <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* ============ CATEGORY DETAILS - FORCE PAGE 2 ============ */}
        <div
          style={{
            backgroundColor: PDF_TOKENS.cardBackground,
            border: PDF_TOKENS.cardBorder,
            borderRadius: PDF_TOKENS.cardRadius,
            padding: PDF_TOKENS.cardPadding,
            marginBottom: PDF_TOKENS.sectionGap,
            pageBreakBefore: "always",
            breakBefore: "page",
          }}
        >
          <h3
            style={{
              fontSize: "13pt",
              fontWeight: 800,
              margin: "0 0 14px 0",
              color: PDF_TOKENS.colorPrimary,
              letterSpacing: "-0.3px",
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
                    padding: "14px 16px",
                    backgroundColor: PDF_TOKENS.cardBackgroundAlt,
                    borderRadius: "10px",
                    border: "1px solid #E5E7EB",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: notes ? "8px" : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          backgroundColor: `${cat.color}25`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={14} color={cat.color} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: "11pt", fontWeight: 700, color: PDF_TOKENS.colorPrimary }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: "8pt", color: PDF_TOKENS.colorMuted, fontWeight: 600 }}>
                        (Peso: {weight}%)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "16pt",
                        fontWeight: 800,
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
                        paddingLeft: "38px",
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
              marginBottom: PDF_TOKENS.sectionGap,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {report.summary && (
              <div style={{ marginBottom: report.recommendation ? "16px" : 0 }}>
                <h4
                  style={{
                    fontSize: "12pt",
                    fontWeight: 800,
                    color: PDF_TOKENS.colorPrimary,
                    margin: "0 0 10px 0",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Resumo
                </h4>
                <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
                  {report.summary}
                </p>
              </div>
            )}
            {report.recommendation && (
              <div>
                <h4
                  style={{
                    fontSize: "12pt",
                    fontWeight: 800,
                    color: PDF_TOKENS.colorPrimary,
                    margin: "0 0 10px 0",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Recomendação
                </h4>
                <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
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
              marginBottom: PDF_TOKENS.sectionGap,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "12pt",
                fontWeight: 800,
                color: PDF_TOKENS.colorPrimary,
                margin: "0 0 10px 0",
                letterSpacing: "-0.3px",
              }}
            >
              Observações da Partida
            </h4>
            <p style={{ fontSize: "9pt", color: PDF_TOKENS.colorSecondary, margin: 0, lineHeight: 1.6 }}>
              {report.match_notes}
            </p>
          </div>
        )}

        {/* ============ FOOTER ============ */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "14px",
            borderTop: `2px solid #D1D5DB`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "8pt",
            color: PDF_TOKENS.colorMuted,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img 
              src={logoRelatorio} 
              alt="M3" 
              style={{ 
                width: "40px", 
                height: "24px", 
                objectFit: "contain",
              }} 
            />
            <span style={{ fontWeight: 700, color: PDF_TOKENS.colorSecondary }}>
              M3 Scouting © {new Date().getFullYear()}
            </span>
          </div>
          <span style={{ color: PDF_TOKENS.colorSecondary }}>
            Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    );
  }
);

ScoutingReportPdfTemplate.displayName = "ScoutingReportPdfTemplate";
