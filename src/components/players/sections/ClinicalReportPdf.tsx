import * as React from "react";
import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity,
  Stethoscope,
  TrendingUp
} from "lucide-react";
import { safeArray } from "@/lib/utils";

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

interface ClinicalReportPdfProps {
  player: Player;
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
}

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
  if (s === "mild" || s === "leve") return { label: "Leve", color: "#22c55e" };
  if (s === "medium" || s === "media" || s === "média") return { label: "Média", color: "#f59e0b" };
  if (s === "severe" || s === "grave") return { label: "Grave", color: "#ef4444" };
  return { label: severity, color: "#6b7280" };
};

const getStatusConfig = (status: string | null | undefined) => {
  const s = status?.toLowerCase() || "apto";
  if (s === "fit" || s === "apto") {
    return { label: "Apto", description: "Liberado para treinos e jogos", color: "#22c55e", Icon: CheckCircle2 };
  }
  if (s === "recovering" || s === "em_recuperacao") {
    return { label: "Em Recuperação", description: "Em tratamento médico", color: "#f59e0b", Icon: Activity };
  }
  if (s === "injured" || s === "lesionado") {
    return { label: "Lesionado", description: "Afastado por lesão", color: "#ef4444", Icon: XCircle };
  }
  if (s === "transition" || s === "transicao" || s === "retorno_progressivo") {
    return { label: "Retorno Progressivo", description: "Em transição para atividades normais", color: "#3b82f6", Icon: AlertTriangle };
  }
  return { label: "Apto", description: "Liberado para treinos e jogos", color: "#22c55e", Icon: CheckCircle2 };
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

export const ClinicalReportPdf = forwardRef<HTMLDivElement, ClinicalReportPdfProps>(
  ({ player, injuries, physicalStatus, medicalNotes }, ref) => {
    const safeInjuries = safeArray(injuries);
    const sortedInjuries = [...safeInjuries].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    const statusConfig = getStatusConfig(physicalStatus);
    const StatusIcon = statusConfig.Icon;

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
      <div
        ref={ref}
        style={{
          width: "794px", // A4 width at 96 DPI
          minHeight: "1123px", // A4 height
          backgroundColor: "#ffffff",
          color: "#1a1a1a",
          fontFamily: "Arial, sans-serif",
          padding: "40px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "3px solid #2563eb", paddingBottom: "20px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>
              Relatório Clínico
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: "14px", color: "#6b7280" }}>
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <Stethoscope style={{ width: "40px", height: "40px", color: "#2563eb" }} />
          </div>
        </div>

        {/* Player Info */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
          {player.photo_url && (
            <img
              src={player.photo_url}
              alt={player.full_name}
              style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }}
            />
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>{player.full_name}</h2>
            <p style={{ margin: "5px 0", fontSize: "14px", color: "#6b7280" }}>
              {player.position} {player.age ? `• ${player.age} anos` : ""} {player.nationality ? `• ${player.nationality}` : ""}
            </p>
            {player.current_club && (
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Clube: {player.current_club}</p>
            )}
          </div>
          <div style={{ textAlign: "center", padding: "15px 25px", borderRadius: "8px", backgroundColor: statusConfig.color + "20", border: `2px solid ${statusConfig.color}` }}>
            <StatusIcon style={{ width: "32px", height: "32px", color: statusConfig.color, margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: statusConfig.color }}>{statusConfig.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6b7280" }}>{statusConfig.description}</p>
          </div>
        </div>

        {/* Recurrent Injury Alert */}
        {recurrentTypes.length > 0 && (
          <div style={{ marginBottom: "25px", padding: "15px 20px", backgroundColor: "#fef2f2", border: "2px solid #fecaca", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <AlertTriangle style={{ width: "20px", height: "20px", color: "#dc2626" }} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#dc2626" }}>
                Alerta de Lesão Recorrente
              </h3>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {recurrentTypes.map((r) => (
                <span
                  key={r.type}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {r.type}: {r.count}x ocorrências
                </span>
              ))}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#7f1d1d" }}>
              ⚠️ Recomenda-se avaliação preventiva e fortalecimento específico para as áreas afetadas.
            </p>
          </div>
        )}

        {/* Stats Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "25px" }}>
          <div style={{ padding: "15px", backgroundColor: "#f1f5f9", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{totalInjuries}</p>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#6b7280" }}>Total de Lesões</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#f1f5f9", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{avgRecovery}</p>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#6b7280" }}>Média Dias Afastado</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#f1f5f9", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{totalDaysAway}</p>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#6b7280" }}>Total Dias Afastado</p>
          </div>
          <div style={{ padding: "15px", backgroundColor: "#f1f5f9", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>{severityCounts.leve}</span>
              <span style={{ color: "#f59e0b", fontWeight: "bold" }}>{severityCounts.media}</span>
              <span style={{ color: "#ef4444", fontWeight: "bold" }}>{severityCounts.grave}</span>
            </div>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#6b7280" }}>Leve / Média / Grave</p>
          </div>
        </div>

        {/* Injury History Table */}
        <div style={{ marginBottom: "25px" }}>
          <h3 style={{ margin: "0 0 15px", fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp style={{ width: "18px", height: "18px" }} />
            Histórico de Lesões
          </h3>
          {sortedInjuries.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#e5e7eb" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600" }}>Tipo de Lesão</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600" }}>Gravidade</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600" }}>Início</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600" }}>Retorno</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600" }}>Afastamento</th>
                </tr>
              </thead>
              <tbody>
                {sortedInjuries.map((injury, index) => {
                  const sev = normalizeSeverity(injury.severity);
                  const days = calculateRecoveryDays(injury.start_date, injury.return_date);
                  return (
                    <tr key={injury.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>
                        {injury.injury_type}
                        {injury.notes && (
                          <span style={{ display: "block", fontSize: "11px", color: "#6b7280", marginTop: "3px" }}>
                            {injury.notes.length > 50 ? injury.notes.substring(0, 50) + "..." : injury.notes}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                        <span style={{ padding: "3px 10px", backgroundColor: sev.color + "20", color: sev.color, borderRadius: "12px", fontSize: "12px", fontWeight: "500" }}>
                          {sev.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                        {format(new Date(injury.start_date), "dd/MM/yyyy")}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                        {injury.return_date ? format(new Date(injury.return_date), "dd/MM/yyyy") : (
                          <span style={{ color: "#f59e0b", fontWeight: "500" }}>Em tratamento</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e5e7eb", fontWeight: "500" }}>
                        {formatDaysAway(days)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: "20px", textAlign: "center", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
              Nenhuma lesão registrada
            </p>
          )}
        </div>

        {/* Medical Notes */}
        {medicalNotes && (
          <div style={{ marginBottom: "25px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "16px", fontWeight: "bold", color: "#1e3a8a" }}>
              Observações Médicas
            </h3>
            <div style={{ padding: "15px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {medicalNotes}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>
            Relatório gerado automaticamente pelo sistema M3 Scouting
          </p>
          <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#9ca3af" }}>
            Este documento é confidencial e de uso exclusivo da equipe médica e diretoria técnica.
          </p>
        </div>
      </div>
    );
  }
);

ClinicalReportPdf.displayName = "ClinicalReportPdf";
