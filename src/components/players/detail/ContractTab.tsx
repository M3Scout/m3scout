import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseDateSafe, formatDateMediumBR } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { ChevronUp, ChevronDown } from "lucide-react";

// ─── Design tokens ───────────────────────────────────────────────────────────

const ACCENT = "#E5173F";
const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";
const TEXT   = "#F2EDE4";
const BG     = "#0A0A0A";
const AMBER  = "#F59E0B";
const GREEN  = "#22C55E";
const BLUE   = "#3B82F6";

// ─── Status config ────────────────────────────────────────────────────────────

const getStatusCfg = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case "contracted":
    case "contratado":
      return { label: "CONTRATADO", color: GREEN };
    case "loan":
    case "emprestado":
      return { label: "EMPRESTADO", color: BLUE };
    case "free":
    case "livre":
      return { label: "LIVRE", color: AMBER };
    default:
      return { label: status?.toUpperCase() ?? "—", color: MUTED };
  }
};

// ─── Contract type badge ──────────────────────────────────────────────────────

const getTypeCfg = (type: string) => {
  switch (type?.toLowerCase()) {
    case "permanent":  return { label: "DEFINITIVO", color: GREEN };
    case "loan":       return { label: "EMPRÉSTIMO", color: BLUE };
    case "youth":      return { label: "FORMAÇÃO",   color: "#8B5CF6" };
    default:           return { label: type?.toUpperCase() ?? "DEFINITIVO", color: MUTED };
  }
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const fmtPeriod = (date: string) =>
  format(parseDateSafe(date), "MMM yyyy", { locale: ptBR }).toUpperCase();

const daysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  const diff = parseDateSafe(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-[14px]" style={{ background: ACCENT }} />
      <h3 className="font-barlow text-[13px] uppercase tracking-widest" style={{ color: TEXT }}>
        {title}
      </h3>
    </div>
  );
}

// ─── Info cell (label + value) ────────────────────────────────────────────────

function InfoCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <p className="font-barlow text-[10px] uppercase tracking-widest mb-1.5" style={{ color: MUTED }}>
        {label}
      </p>
      <div className="font-jetbrains text-[13px] leading-snug" style={{ color: TEXT }}>
        {value ?? <span style={{ color: MUTED }}>—</span>}
      </div>
      {sub && (
        <p className="font-jetbrains text-[10px] mt-0.5" style={{ color: MUTED }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Contract history record ──────────────────────────────────────────────────

interface ContractRecord {
  id: string;
  club_name: string;
  club_country: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary_info: string | null;
  transfer_fee: string | null;
  notes: string | null;
  is_current: boolean | null;
  is_archived: boolean | null;
  sort_order: number | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractTabProps {
  playerId: string;
  currentClub: string | null;
  country: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  contractStatus: string | null;
  salaryInfo: string | null;
  releaseClause: string | null;
  agentName: string | null;
  agentContact: string | null;
  contractNotes: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractTab({
  playerId,
  currentClub,
  country,
  contractStart,
  contractEnd,
  contractStatus,
  salaryInfo,
  releaseClause,
  agentName,
  agentContact,
  contractNotes,
}: ContractTabProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;
  const [reordering, setReordering] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["player-contract-history", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_contract_history")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as ContractRecord[];
      // Sort by sort_order when present; fall back to most-recent start_date
      return rows.sort((a, b) => {
        if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
        if (a.sort_order !== null) return -1;
        if (b.sort_order !== null) return 1;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
    },
  });

  // Entry with the most recent start_date always gets the ATUAL badge
  const currentEntryId = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((prev, curr) =>
      new Date(curr.start_date) > new Date(prev.start_date) ? curr : prev
    ).id;
  }, [history]);

  const handleReorder = async (index: number, dir: "up" | "down") => {
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= history.length || reordering) return;
    setReordering(true);
    try {
      const a = history[index];
      const b = history[swapIdx];
      // Use positional fallback so we always have a concrete integer to swap
      const aOrder = a.sort_order ?? index * 10;
      const bOrder = b.sort_order ?? swapIdx * 10;
      await Promise.all([
        supabase.from("player_contract_history").update({ sort_order: bOrder }).eq("id", a.id),
        supabase.from("player_contract_history").update({ sort_order: aOrder }).eq("id", b.id),
      ]);
      queryClient.invalidateQueries({ queryKey: ["player-contract-history", playerId] });
    } finally {
      setReordering(false);
    }
  };

  const statusCfg = getStatusCfg(contractStatus);
  const days = daysUntil(contractEnd);
  const isExpiring = days !== null && days > 0 && days <= 180;
  const isFree = ["free", "livre"].includes(contractStatus?.toLowerCase() ?? "");
  const isExpired = days !== null && days < 0;
  const showAlert = isFree || isExpiring || isExpired;

  // Details grid items
  const detailItems = [
    { label: "Clube Atual",           value: currentClub },
    { label: "País",                  value: country },
    { label: "Vínculo",               value: contractStatus ? statusCfg.label : null },
    { label: "Salário",               value: salaryInfo },
    { label: "Cláusula de Rescisão",  value: releaseClause },
    {
      label: "Agente",
      value: agentName,
      sub: agentContact ?? undefined,
    },
  ];

  return (
    <div className="space-y-8 py-6">

      {/* ── Alert banner ───────────────────────────────────────────────────── */}
      {showAlert && (
        <div
          className="px-4 py-3"
          style={{
            borderLeft: `2px solid ${AMBER}`,
            background: `${AMBER}0A`,
            border: `1px solid ${AMBER}22`,
            borderLeftWidth: "2px",
            borderLeftColor: AMBER,
          }}
        >
          <p className="font-barlow text-[12px] uppercase tracking-widest" style={{ color: AMBER }}>
            {isFree
              ? "ATLETA DISPONÍVEL — Sem clube / Livre no mercado"
              : isExpired
              ? `CONTRATO VENCIDO — Expirou em ${formatDateMediumBR(contractEnd!)}`
              : `CONTRATO PRÓXIMO DO VENCIMENTO — ${days} dias restantes (${formatDateMediumBR(contractEnd!)})`}
          </p>
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ border: `1px solid ${BORDER}` }}>
        {/* Status */}
        <div
          className="px-4 py-4 flex flex-col gap-2"
          style={{ borderRight: `1px solid ${BORDER}` }}
        >
          <span className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
            STATUS
          </span>
          <span
            className="font-jetbrains text-[11px] uppercase tracking-wider border px-2 py-1 self-start"
            style={{ color: statusCfg.color, borderColor: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Clube atual */}
        <div
          className="px-4 py-4 flex flex-col gap-1"
          style={{ borderRight: `1px solid ${BORDER}` }}
        >
          <span className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
            CLUBE ATUAL
          </span>
          <span className="font-jetbrains text-[13px] leading-tight" style={{ color: TEXT }}>
            {currentClub ?? <span style={{ color: MUTED }}>—</span>}
          </span>
        </div>

        {/* Início */}
        <div
          className="px-4 py-4 flex flex-col gap-1"
          style={{ borderRight: `1px solid ${BORDER}` }}
        >
          <span className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
            INÍCIO DO CONTRATO
          </span>
          <span className="font-jetbrains text-[13px]" style={{ color: TEXT }}>
            {contractStart ? fmtPeriod(contractStart) : <span style={{ color: MUTED }}>—</span>}
          </span>
        </div>

        {/* Término */}
        <div className="px-4 py-4 flex flex-col gap-1">
          <span className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
            TÉRMINO DO CONTRATO
          </span>
          <span
            className="font-jetbrains text-[13px]"
            style={{ color: isExpiring || isExpired ? AMBER : TEXT }}
          >
            {contractEnd ? fmtPeriod(contractEnd) : <span style={{ color: MUTED }}>—</span>}
          </span>
          {isExpiring && (
            <span className="font-jetbrains text-[9px] uppercase tracking-wider" style={{ color: AMBER }}>
              {days}d restantes
            </span>
          )}
        </div>
      </div>

      {/* ── Detalhes do Contrato ───────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Detalhes do Contrato" />
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-px"
          style={{ background: BORDER, border: `1px solid ${BORDER}` }}
        >
          {detailItems.map(item => (
            <div key={item.label} style={{ background: BG }}>
              <InfoCell label={item.label} value={item.value} sub={item.sub} />
            </div>
          ))}
          {/* Contract notes if present — full width */}
          {contractNotes && (
            <div className="sm:col-span-2" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
              <div className="p-4">
                <p className="font-barlow text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                  OBSERVAÇÕES DO CONTRATO
                </p>
                <p
                  className="font-jetbrains text-[12px] leading-relaxed pl-3"
                  style={{ color: TEXT, borderLeft: `2px solid ${BORDER}` }}
                >
                  {contractNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Histórico de Clubes ────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Histórico de Clubes" />

        {isLoading ? (
          <div className="py-8 flex items-center justify-center" style={{ border: `1px solid ${BORDER}` }}>
            <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              CARREGANDO...
            </span>
          </div>
        ) : history.length === 0 ? (
          <div
            className="py-10 flex flex-col items-center gap-2 text-center"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <span className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: MUTED }}>
              SEM HISTÓRICO
            </span>
            <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              Nenhum clube registrado no histórico
            </span>
          </div>
        ) : (
          <div className="relative" style={{ border: `1px solid ${BORDER}` }}>
            {/* Vertical connector line */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: "28px",
                width: "1px",
                background: BORDER,
              }}
            />

            {history.map((c, i) => {
              const typeCfg = getTypeCfg(c.contract_type);
              const isCurrent = c.id === currentEntryId;
              const dotColor = isCurrent ? ACCENT : MUTED;

              return (
                <div
                  key={c.id}
                  className="relative flex items-start gap-4 px-4 py-4"
                  style={{
                    borderBottom: i < history.length - 1 ? `1px solid ${BORDER}` : undefined,
                  }}
                >
                  {/* Dot */}
                  <div
                    className="relative z-10 flex-shrink-0"
                    style={{ marginTop: "3px", marginLeft: "4px" }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: dotColor,
                        border: `2px solid ${isCurrent ? ACCENT : BORDER}`,
                        boxShadow: isCurrent ? `0 0 6px ${ACCENT}66` : undefined,
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-barlow text-[14px] uppercase tracking-wider"
                            style={{ color: TEXT }}
                          >
                            {c.club_name}
                          </span>
                          {isCurrent && (
                            <span
                              className="font-jetbrains text-[9px] uppercase tracking-wider border px-1.5 py-0.5"
                              style={{ color: ACCENT, borderColor: ACCENT }}
                            >
                              ATUAL
                            </span>
                          )}
                        </div>

                        {/* Period + country */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="font-jetbrains text-[10px]" style={{ color: MUTED }}>
                            {fmtPeriod(c.start_date)}
                            {" → "}
                            {c.end_date ? fmtPeriod(c.end_date) : "ATUAL"}
                          </span>
                          {c.club_country && (
                            <>
                              <span style={{ color: BORDER }}>·</span>
                              <span className="font-jetbrains text-[10px]" style={{ color: MUTED }}>
                                {c.club_country}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Transfer fee / salary */}
                        {(c.transfer_fee || c.salary_info) && (
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {c.transfer_fee && (
                              <span className="font-jetbrains text-[10px]" style={{ color: AMBER }}>
                                {c.transfer_fee}
                              </span>
                            )}
                            {c.salary_info && (
                              <span className="font-jetbrains text-[10px]" style={{ color: MUTED }}>
                                {c.salary_info}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {c.notes && (
                          <p
                            className="font-jetbrains text-[10px] leading-relaxed mt-2 pl-2"
                            style={{
                              color: MUTED,
                              borderLeft: `2px solid ${BORDER}`,
                            }}
                          >
                            {c.notes}
                          </p>
                        )}
                      </div>

                      {/* Right side: type badge + reorder buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="font-jetbrains text-[9px] uppercase tracking-wider border px-2 py-0.5"
                          style={{ color: typeCfg.color, borderColor: typeCfg.color }}
                        >
                          {typeCfg.label}
                        </span>
                        {canEdit && history.length > 1 && (
                          <div className="flex flex-col" style={{ gap: "1px" }}>
                            <button
                              onClick={() => handleReorder(i, "up")}
                              disabled={i === 0 || reordering}
                              className="flex items-center justify-center w-5 h-5 transition-colors"
                              style={{
                                color: i === 0 ? BORDER : MUTED,
                                cursor: i === 0 ? "default" : "pointer",
                              }}
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleReorder(i, "down")}
                              disabled={i === history.length - 1 || reordering}
                              className="flex items-center justify-center w-5 h-5 transition-colors"
                              style={{
                                color: i === history.length - 1 ? BORDER : MUTED,
                                cursor: i === history.length - 1 ? "default" : "pointer",
                              }}
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
