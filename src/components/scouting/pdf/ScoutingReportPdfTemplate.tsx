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
import logoM3 from "@/assets/logo-m3.png";

interface ScoutingReportPdfTemplateProps {
  report: ScoutingReportData;
}

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
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={18}
          fill={star <= rating ? "#f59e0b" : "transparent"}
          color={star <= rating ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </div>
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
          backgroundColor: "#FFFFFF",
          color: "#111827",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "11pt",
          lineHeight: 1.5,
          padding: "12mm 16mm",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: "16px",
            borderBottom: "2px solid #E6E8EC",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={logoM3} alt="M3 Scouting" style={{ height: "40px", width: "auto" }} />
            <div>
              <h1 style={{ fontSize: "18pt", fontWeight: 700, margin: 0, color: "#111827" }}>
                Relatório de Scouting
              </h1>
              <p style={{ fontSize: "9pt", color: "#6b7280", margin: 0 }}>
                Análise de Desempenho Profissional
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9pt", color: "#6b7280" }}>
            <p style={{ margin: "2px 0" }}>
              <strong>Data:</strong>{" "}
              {format(new Date(report.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p style={{ margin: "2px 0" }}>
              <strong>Competição:</strong> {competitionLabel}
            </p>
            <p style={{ margin: "2px 0" }}>
              <strong>Scout:</strong> {report.profiles?.full_name || "Scout"}
            </p>
          </div>
        </div>

        {/* Player Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            padding: "20px",
            backgroundColor: "#F7F8FA",
            borderRadius: "12px",
            border: "1px solid #E6E8EC",
            marginBottom: "24px",
            pageBreakInside: "avoid",
          }}
        >
          {report.players?.photo_url && (
            <img
              src={report.players.photo_url}
              alt={report.players.full_name}
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "2px solid #E6E8EC",
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "16pt", fontWeight: 700, margin: "0 0 6px 0", color: "#111827" }}>
              {report.players?.full_name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  borderRadius: "16px",
                  fontSize: "9pt",
                  fontWeight: 600,
                }}
              >
                {report.players?.position}
              </span>
              <span style={{ fontSize: "10pt", color: "#6b7280" }}>
                {report.players?.current_club} • {report.players?.nationality}
              </span>
            </div>
            {report.opponent && (
              <p style={{ fontSize: "9pt", color: "#6b7280", marginTop: "6px" }}>
                Partida contra: <strong>{report.opponent}</strong>
              </p>
            )}
          </div>
          <div style={{ textAlign: "center", minWidth: "120px" }}>
            <div
              style={{
                fontSize: "32pt",
                fontWeight: 800,
                color: getScoreColorPdf(breakdown.finalScore),
                lineHeight: 1,
              }}
            >
              {breakdown.finalScore.toFixed(1)}
            </div>
            <div style={{ fontSize: "10pt", color: "#9ca3af" }}>/100</div>
            <div style={{ marginTop: "6px" }}>
              <RatingStarsPdf rating={breakdown.rating} />
            </div>
            <div
              style={{
                fontSize: "10pt",
                fontWeight: 600,
                color: "#f59e0b",
                marginTop: "4px",
              }}
            >
              {getRatingLabel(breakdown.rating)}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          {/* Radar Chart */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6E8EC",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              pageBreakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "12pt",
                fontWeight: 700,
                margin: "0 0 12px 0",
                color: "#111827",
              }}
            >
              Perfil de Desempenho
            </h3>
            <div style={{ width: "100%", height: "220px" }}>
              <RadarChart
                width={280}
                height={220}
                data={radarData}
                style={{ margin: "0 auto" }}
              >
                <PolarGrid stroke="#E6E8EC" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#9ca3af", fontSize: 8 }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </div>
          </div>

          {/* Score Breakdown */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6E8EC",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              pageBreakInside: "avoid",
            }}
          >
            <h3
              style={{
                fontSize: "12pt",
                fontWeight: 700,
                margin: "0 0 12px 0",
                color: "#111827",
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
                  padding: "10px 12px",
                  backgroundColor: "#F7F8FA",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Scale size={16} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: "#111827" }}>
                      Score Base
                    </div>
                    <div style={{ fontSize: "8pt", color: "#9ca3af" }}>
                      Média ponderada
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 700, color: "#111827" }}>
                  {breakdown.baseScore.toFixed(1)}
                </span>
              </div>

              {/* Competition Coefficient */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  backgroundColor: "#F7F8FA",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Trophy size={16} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: "#111827" }}>
                      Coeficiente
                    </div>
                    <div style={{ fontSize: "8pt", color: "#9ca3af" }}>
                      Nível da competição
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 700, color: "#f59e0b" }}>
                  ×{breakdown.competitionCoefficient.toFixed(2)}
                </span>
              </div>

              {/* Adjusted Score */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  backgroundColor: "#EFF6FF",
                  borderRadius: "8px",
                  borderLeft: "3px solid #3b82f6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={16} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: "10pt", fontWeight: 600, color: "#111827" }}>
                      Score Ajustado
                    </div>
                    <div style={{ fontSize: "8pt", color: "#9ca3af" }}>
                      Base × Coef.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "14pt", fontWeight: 700, color: "#3b82f6" }}>
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
                    padding: "10px 12px",
                    backgroundColor: "#FFFBEB",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: "10pt", fontWeight: 600, color: "#111827" }}>
                        Modificadores
                      </div>
                      <div style={{ fontSize: "8pt", color: "#9ca3af" }}>
                        Pot. +{breakdown.potentialBonus} | Cons.{" "}
                        {breakdown.consistencyModifier >= 0 ? "+" : ""}
                        {breakdown.consistencyModifier}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "14pt", fontWeight: 700, color: "#f59e0b" }}>
                    {breakdown.potentialBonus + breakdown.consistencyModifier >= 0 ? "+" : ""}
                    {breakdown.potentialBonus + breakdown.consistencyModifier}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart Section */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E6E8EC",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "24px",
            pageBreakInside: "avoid",
          }}
        >
          <h3
            style={{
              fontSize: "12pt",
              fontWeight: 700,
              margin: "0 0 12px 0",
              color: "#111827",
            }}
          >
            Scores por Categoria
          </h3>
          <div style={{ width: "100%", height: "160px" }}>
            <BarChart
              width={500}
              height={160}
              data={barData}
              layout="vertical"
              style={{ margin: "0 auto" }}
            >
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 9 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fill: "#374151", fontSize: 10, fontWeight: 500 }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>

        {/* Category Details */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E6E8EC",
            borderRadius: "12px",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "24px",
            pageBreakInside: "avoid",
          }}
        >
          <h3
            style={{
              fontSize: "12pt",
              fontWeight: 700,
              margin: "0 0 16px 0",
              color: "#111827",
            }}
          >
            Detalhamento por Categoria
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {SCOUTING_CATEGORY_CONFIG.map((cat) => {
              const score = report[`${cat.key}_score` as keyof ScoutingReportData] as number;
              const notes = report[`${cat.key}_notes` as keyof ScoutingReportData] as string | null;
              const Icon = categoryIcons[cat.key as keyof typeof categoryIcons];
              const weight = CATEGORY_WEIGHTS[cat.key as keyof typeof CATEGORY_WEIGHTS] * 100;

              return (
                <div
                  key={cat.key}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#F7F8FA",
                    borderRadius: "8px",
                    pageBreakInside: "avoid",
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
                          backgroundColor: `${cat.color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={14} color={cat.color} />
                      </div>
                      <span style={{ fontSize: "11pt", fontWeight: 600, color: "#111827" }}>
                        {cat.label}
                      </span>
                      <span style={{ fontSize: "9pt", color: "#9ca3af" }}>
                        (Peso: {weight}%)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "16pt",
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
                        color: "#6b7280",
                        margin: 0,
                        paddingLeft: "38px",
                        lineHeight: 1.4,
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

        {/* Summary & Recommendation */}
        {(report.summary || report.recommendation) && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6E8EC",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: "24px",
              pageBreakInside: "avoid",
            }}
          >
            {report.summary && (
              <div style={{ marginBottom: report.recommendation ? "16px" : 0 }}>
                <h4
                  style={{
                    fontSize: "11pt",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 8px 0",
                  }}
                >
                  Resumo
                </h4>
                <p style={{ fontSize: "10pt", color: "#374151", margin: 0, lineHeight: 1.5 }}>
                  {report.summary}
                </p>
              </div>
            )}
            {report.recommendation && (
              <div>
                <h4
                  style={{
                    fontSize: "11pt",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 8px 0",
                  }}
                >
                  Recomendação
                </h4>
                <p style={{ fontSize: "10pt", color: "#374151", margin: 0, lineHeight: 1.5 }}>
                  {report.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Match Notes */}
        {report.match_notes && (
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E6E8EC",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              pageBreakInside: "avoid",
            }}
          >
            <h4
              style={{
                fontSize: "11pt",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 8px 0",
              }}
            >
              Observações da Partida
            </h4>
            <p style={{ fontSize: "10pt", color: "#374151", margin: 0, lineHeight: 1.5 }}>
              {report.match_notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "12px",
            borderTop: "1px solid #E6E8EC",
            textAlign: "center",
            fontSize: "8pt",
            color: "#9ca3af",
          }}
        >
          <p style={{ margin: 0 }}>
            Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} •
            M3 Scouting © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    );
  }
);

ScoutingReportPdfTemplate.displayName = "ScoutingReportPdfTemplate";
