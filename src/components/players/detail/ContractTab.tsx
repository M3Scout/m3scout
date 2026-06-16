import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseDateSafe, formatDateMediumBR } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/authContext";
import { ChevronUp, ChevronDown, Pencil, Plus, Loader2, Upload, ExternalLink, FileText } from "lucide-react";
import { EditContractModal } from "@/components/players/sections/EditContractModal";
import { AddContractModal } from "@/components/players/sections/AddContractModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Design tokens ───────────────────────────────────────────────────────────
const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";
const AMBER       = "#f59e0b";
const GREEN       = "#22c55e";
const BLUE        = "#3b82f6";

// ─── Status config ────────────────────────────────────────────────────────────
const getStatusCfg = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case "contracted":
    case "contratado":  return { label: "CONTRATADO", color: GREEN };
    case "loan":
    case "emprestado":  return { label: "EMPRESTADO", color: BLUE  };
    case "free":
    case "livre":       return { label: "LIVRE",      color: AMBER };
    default:            return { label: status?.toUpperCase() ?? "—", color: MUTED };
  }
};

const getTypeCfg = (type: string) => {
  switch (type?.toLowerCase()) {
    case "permanent":  return { label: "DEFINITIVO", color: GREEN       };
    case "loan":       return { label: "EMPRÉSTIMO", color: BLUE        };
    case "youth":      return { label: "FORMAÇÃO",   color: "#8b5cf6"   };
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
function SectionHead({ n, children }: { n?: string; children: React.ReactNode }) {
  return (
    <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase mb-3" style={{ color: MUTED }}>
      {n && <><span style={{ color: ACCENT }} className="font-semibold">{n}</span><span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" /></>}
      {children}
    </div>
  );
}

// ─── Info cell ────────────────────────────────────────────────────────────────
function InfoCell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="p-4" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
      <p className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
        {label}
      </p>
      <div className="font-editorial-mono text-[13px] leading-snug" style={{ color: TEXT }}>
        {value ?? <span style={{ color: MUTED }}>—</span>}
      </div>
      {sub && <p className="font-editorial-mono text-[10px] mt-0.5" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

// ─── Contract history record ──────────────────────────────────────────────────
interface ContractRecord {
  id: string;
  club_name: string;
  club_country: string | null;
  club_logo_url: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary_info: string | null;
  transfer_fee: string | null;
  notes: string | null;
  is_current: boolean | null;
  is_archived: boolean | null;
  sort_order: number | null;
  contract_file_url: string | null;
}

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
  m3ContractStart: string | null;
  m3ContractEnd: string | null;
  m3ContractFileUrl: string | null;
  onPlayerUpdate: () => void;
}

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
  m3ContractStart,
  m3ContractEnd,
  m3ContractFileUrl,
  onPlayerUpdate,
}: ContractTabProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;
  const [reordering, setReordering] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRecord | null>(null);
  const [addingContract, setAddingContract] = useState(false);
  const [editingM3, setEditingM3] = useState(false);
  const [m3StartDraft, setM3StartDraft] = useState("");
  const [m3EndDraft, setM3EndDraft] = useState("");
  const [m3Saving, setM3Saving] = useState(false);
  const [m3Uploading, setM3Uploading] = useState(false);
  const m3FileRef = useRef<HTMLInputElement>(null);

  const openM3Editor = () => {
    setM3StartDraft(m3ContractStart ?? "");
    setM3EndDraft(m3ContractEnd ?? "");
    setEditingM3(true);
  };

  const saveM3 = async () => {
    setM3Saving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({
          m3_contract_start: m3StartDraft || null,
          m3_contract_end: m3EndDraft || null,
        })
        .eq("id", playerId);
      if (error) throw error;
      toast.success("Contrato com M3 atualizado");
      setEditingM3(false);
      onPlayerUpdate();
    } catch {
      toast.error("Erro ao salvar contrato com M3");
    } finally {
      setM3Saving(false);
    }
  };

  const handleM3FileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "pdf";
    const storagePath = `m3/${playerId}.${ext}`;
    setM3Uploading(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("players")
        .update({ m3_contract_file_url: storagePath })
        .eq("id", playerId);
      if (dbErr) throw dbErr;
      toast.success("Arquivo enviado com sucesso");
      onPlayerUpdate();
    } catch {
      toast.error("Erro ao enviar o arquivo");
    } finally {
      setM3Uploading(false);
      if (m3FileRef.current) m3FileRef.current.value = "";
    }
  };

  const viewM3File = async () => {
    if (!m3ContractFileUrl) return;
    const { data, error } = await supabase.storage
      .from("contracts")
      .createSignedUrl(m3ContractFileUrl, 3600);
    if (error || !data?.signedUrl) { toast.error("Erro ao abrir o arquivo"); return; }
    window.open(data.signedUrl, "_blank");
  };

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
      return rows.sort((a, b) => {
        if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
        if (a.sort_order !== null) return -1;
        if (b.sort_order !== null) return 1;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
    },
  });

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

  // ── Derive all contract info from history (first = most current) ──────────
  const topContract = history.length > 0 ? history[0] : null;
  const derivedCurrentClub = topContract?.club_name ?? currentClub;
  const derivedStart        = topContract?.start_date ?? contractStart;
  const derivedEnd          = topContract?.end_date   ?? contractEnd;

  // Status: if top contract exists and end_date hasn't passed → contracted/loan, else free
  const derivedStatus = (() => {
    if (!topContract) return contractStatus;
    const daysLeft = daysUntil(topContract.end_date);
    if (topContract.end_date && daysLeft !== null && daysLeft < 0) return "free";
    return topContract.contract_type === "loan" ? "emprestado" : "contracted";
  })();

  const statusCfg = getStatusCfg(derivedStatus);
  const days = daysUntil(derivedEnd);
  const isExpiring = days !== null && days > 0 && days <= 180;
  const isFree = ["free", "livre"].includes(derivedStatus?.toLowerCase() ?? "");
  const isExpired = days !== null && days < 0;
  const showAlert = isFree || isExpiring || isExpired;

  const detailItems = [
    { label: "Clube Atual",          value: derivedCurrentClub },
    { label: "País",                 value: country       },
    { label: "Vínculo",              value: derivedStatus ? statusCfg.label : null },
    { label: "Salário",              value: salaryInfo    },
    { label: "Cláusula de Rescisão", value: releaseClause },
    { label: "Agente",               value: agentName, sub: agentContact ?? undefined },
  ];

  return (
    <div className="space-y-5 py-4">

      {/* ── Alert banner ────────────────────────────────────────────────── */}
      {showAlert && (
        <div className="rounded-xl px-5 py-3" style={{
          background: `${AMBER}0a`,
          border: `1px solid ${AMBER}33`,
          borderLeftWidth: "3px",
          borderLeftColor: AMBER,
        }}>
          <p className="font-editorial-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
            {isFree
              ? "ATLETA DISPONÍVEL — Sem clube / Livre no mercado"
              : isExpired
              ? `CONTRATO VENCIDO — Expirou em ${formatDateMediumBR(derivedEnd!)}`
              : `CONTRATO PRÓXIMO DO VENCIMENTO — ${days} dias restantes (${formatDateMediumBR(derivedEnd!)})`}
          </p>
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Status */}
        <div className="rounded-xl border p-4 flex flex-col gap-2 transition-colors duration-[250ms] hover:bg-zinc-800/50"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <span className="font-editorial-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>STATUS</span>
          <span className="font-editorial-mono text-[11px] uppercase tracking-wider border px-2 py-1 self-start rounded-md"
            style={{ color: statusCfg.color, borderColor: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>

        {/* Clube atual */}
        <div className="rounded-xl border p-4 flex flex-col gap-1 transition-colors duration-[250ms] hover:bg-zinc-800/50"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <span className="font-editorial-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>CLUBE ATUAL</span>
          <span className="font-editorial-mono text-[13px] leading-tight" style={{ color: TEXT }}>
            {derivedCurrentClub ?? <span style={{ color: MUTED }}>—</span>}
          </span>
        </div>

        {/* Início */}
        <div className="rounded-xl border p-4 flex flex-col gap-1 transition-colors duration-[250ms] hover:bg-zinc-800/50"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <span className="font-editorial-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>INÍCIO DO CONTRATO</span>
          <span className="font-editorial-mono text-[13px]" style={{ color: TEXT }}>
            {derivedStart ? fmtPeriod(derivedStart) : <span style={{ color: MUTED }}>—</span>}
          </span>
        </div>

        {/* Término */}
        <div className="rounded-xl border p-4 flex flex-col gap-1 transition-colors duration-[250ms] hover:bg-zinc-800/50"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <span className="font-editorial-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>TÉRMINO DO CONTRATO</span>
          <span className="font-editorial-mono text-[13px]" style={{ color: isExpiring || isExpired ? AMBER : TEXT }}>
            {derivedEnd ? fmtPeriod(derivedEnd) : <span style={{ color: MUTED }}>—</span>}
          </span>
          {isExpiring && (
            <span className="font-editorial-mono text-[9px] uppercase tracking-wider" style={{ color: AMBER }}>
              {days}d restantes
            </span>
          )}
        </div>
      </div>

      {/* ── Detalhes do Contrato ──────────────────────────────────────── */}
      <div>
        <SectionHead n="01">DETALHES DO CONTRATO</SectionHead>
        <div className="rounded-xl border overflow-hidden grid grid-cols-1 sm:grid-cols-2"
          style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          {detailItems.map((item, i) => (
            <div key={item.label} style={{ borderRight: i % 2 === 0 ? `1px solid ${CARD_BORDER}` : undefined }}>
              <InfoCell label={item.label} value={item.value} sub={item.sub} />
            </div>
          ))}
          {contractNotes && (
            <div className="sm:col-span-2" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
              <div className="p-4">
                <p className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
                  OBSERVAÇÕES DO CONTRATO
                </p>
                <p className="font-editorial-mono text-[12px] leading-relaxed pl-3"
                  style={{ color: TEXT, borderLeft: `2px solid ${CARD_BORDER}` }}>
                  {contractNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico de Clubes ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: MUTED }}>
            <span style={{ color: ACCENT }} className="font-semibold">02</span>
            <span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" />
            HISTÓRICO DE CLUBES
          </div>
          {canEdit && (
            <button
              onClick={() => setAddingContract(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: MUTED }}
              title="Adicionar contrato"
            >
              <Plus className="w-3 h-3" />
              <span className="font-editorial-mono text-[10px] uppercase tracking-wider">Adicionar</span>
            </button>
          )}
        </div>

        <AddContractModal
          open={addingContract}
          onOpenChange={setAddingContract}
          playerId={playerId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["player-contract-history", playerId] })}
        />

        {/* Edit modal — rendered outside the list to avoid z-index issues */}
        <EditContractModal
          open={!!editingContract}
          onOpenChange={(open) => !open && setEditingContract(null)}
          contract={editingContract ? {
            ...editingContract,
            is_current: editingContract.is_current ?? false,
            is_archived: editingContract.is_archived ?? false,
          } : null}
          playerId={playerId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["player-contract-history", playerId] })}
          canEdit={canEdit}
        />

        {isLoading ? (
          <div className="rounded-xl border py-8 flex items-center justify-center" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>CARREGANDO...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border py-10 flex flex-col items-center gap-2 text-center"
            style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <span className="font-editorial-mono text-[13px] uppercase tracking-widest" style={{ color: MUTED }}>SEM HISTÓRICO</span>
            <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              Nenhum clube registrado no histórico
            </span>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden relative" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            {/* Vertical connector line */}
            <div className="absolute top-0 bottom-0" style={{ left: "28px", width: "1px", background: CARD_BORDER }} />

            {history.map((c, i) => {
              const typeCfg = getTypeCfg(c.contract_type);
              const isCurrent = c.id === currentEntryId;
              const dotColor = isCurrent ? ACCENT : MUTED;

              return (
                <div key={c.id} className="relative flex items-start gap-4 px-4 py-4"
                  style={{ borderBottom: i < history.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                  {/* Dot */}
                  <div className="relative z-10 flex-shrink-0" style={{ marginTop: "3px", marginLeft: "4px" }}>
                    <div style={{
                      width: "12px", height: "12px", borderRadius: "50%",
                      background: dotColor,
                      border: `2px solid ${isCurrent ? ACCENT : CARD_BORDER}`,
                      boxShadow: isCurrent ? `0 0 6px ${ACCENT}66` : undefined,
                    }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-editorial-mono text-[14px] uppercase tracking-wider" style={{ color: TEXT }}>
                            {c.club_name}
                          </span>
                          {isCurrent && (
                            <span className="font-editorial-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-md"
                              style={{ color: ACCENT, borderColor: ACCENT }}>
                              ATUAL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>
                            {fmtPeriod(c.start_date)}{" → "}{c.end_date ? fmtPeriod(c.end_date) : "ATUAL"}
                          </span>
                          {c.club_country && (
                            <>
                              <span style={{ color: CARD_BORDER }}>·</span>
                              <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>{c.club_country}</span>
                            </>
                          )}
                        </div>
                        {(c.transfer_fee || c.salary_info) && (
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {c.transfer_fee && <span className="font-editorial-mono text-[10px]" style={{ color: AMBER }}>{c.transfer_fee}</span>}
                            {c.salary_info  && <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>{c.salary_info}</span>}
                          </div>
                        )}
                        {c.notes && (
                          <p className="font-editorial-mono text-[10px] leading-relaxed mt-2 pl-2"
                            style={{ color: MUTED, borderLeft: `2px solid ${CARD_BORDER}` }}>
                            {c.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-editorial-mono text-[9px] uppercase tracking-wider border px-2 py-0.5 rounded-md"
                          style={{ color: typeCfg.color, borderColor: typeCfg.color }}>
                          {typeCfg.label}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => setEditingContract(c)}
                            className="flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-white/5"
                            style={{ color: MUTED }}
                            title="Editar contrato"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {canEdit && history.length > 1 && (
                          <div className="flex flex-col" style={{ gap: "1px" }}>
                            <button onClick={() => handleReorder(i, "up")} disabled={i === 0 || reordering}
                              className="flex items-center justify-center w-5 h-5 transition-colors"
                              style={{ color: i === 0 ? CARD_BORDER : MUTED, cursor: i === 0 ? "default" : "pointer" }}>
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleReorder(i, "down")} disabled={i === history.length - 1 || reordering}
                              className="flex items-center justify-center w-5 h-5 transition-colors"
                              style={{ color: i === history.length - 1 ? CARD_BORDER : MUTED, cursor: i === history.length - 1 ? "default" : "pointer" }}>
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
      </div>

      {/* ── Contrato com M3 ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: MUTED }}>
            <span style={{ color: ACCENT }} className="font-semibold">03</span>
            <span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" />
            CONTRATO COM M3
          </div>
          {canEdit && (
            <button
              onClick={openM3Editor}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: MUTED }}
              title="Editar contrato com M3"
            >
              <Pencil className="w-3 h-3" />
              <span className="font-editorial-mono text-[10px] uppercase tracking-wider">Editar</span>
            </button>
          )}
        </div>

        {/* Edit dialog */}
        <Dialog open={editingM3} onOpenChange={setEditingM3}>
          <DialogContent className="max-w-sm bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="font-editorial-mono text-sm uppercase tracking-wider">
                Contrato com M3
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 font-editorial-mono uppercase tracking-wider">
                  Data de Assinatura
                </Label>
                <Input
                  type="date"
                  value={m3StartDraft}
                  onChange={e => setM3StartDraft(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 font-editorial-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 font-editorial-mono uppercase tracking-wider">
                  Data de Vencimento
                </Label>
                <Input
                  type="date"
                  value={m3EndDraft}
                  onChange={e => setM3EndDraft(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 font-editorial-mono"
                />
              </div>

              {/* Arquivo do contrato M3 */}
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400 font-editorial-mono uppercase tracking-wider">
                  Arquivo do Contrato
                </Label>
                <div className="flex gap-2">
                  <input
                    ref={m3FileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleM3FileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => m3FileRef.current?.click()}
                    disabled={m3Uploading}
                  >
                    {m3Uploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando...</>
                      : <><Upload className="w-3.5 h-3.5" />{m3ContractFileUrl ? "Substituir" : "Enviar contrato"}</>
                    }
                  </Button>
                  {m3ContractFileUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      onClick={viewM3File}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visualizar
                    </Button>
                  )}
                </div>
                {m3ContractFileUrl && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>Arquivo anexado</span>
                  </div>
                )}
              </div>

              <Button onClick={saveM3} disabled={m3Saving} className="w-full h-11">
                {m3Saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {(() => {
          const m3Days = daysUntil(m3ContractEnd);
          const m3Expired  = m3Days !== null && m3Days < 0;
          const m3Critical = m3Days !== null && m3Days >= 0 && m3Days <= 30;
          const m3Warning  = m3Days !== null && m3Days > 30 && m3Days <= 90;

          const alertColor = m3Expired || m3Critical ? ACCENT : m3Warning ? AMBER : GREEN;

          const fmtDate = (d: string | null) =>
            d ? format(parseDateSafe(d), "dd/MM/yyyy", { locale: ptBR }) : null;

          if (!m3ContractStart && !m3ContractEnd) {
            return (
              <div className="rounded-xl border py-8 flex items-center justify-center"
                style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
                <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                  CONTRATO COM M3 NÃO REGISTRADO
                </span>
              </div>
            );
          }

          return (
            <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              {(m3Expired || m3Critical || m3Warning) && (
                <div className="px-5 py-2.5" style={{
                  background: `${alertColor}0d`,
                  borderBottom: `1px solid ${alertColor}33`,
                  borderLeft: `3px solid ${alertColor}`,
                }}>
                  <p className="font-editorial-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: alertColor }}>
                    {m3Expired
                      ? `CONTRATO VENCIDO — Expirou em ${fmtDate(m3ContractEnd)}`
                      : m3Critical
                      ? `VENCIMENTO CRÍTICO — ${m3Days} dias restantes`
                      : `PRÓXIMO DO VENCIMENTO — ${m3Days} dias restantes`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="p-5" style={{ borderRight: `1px solid ${CARD_BORDER}` }}>
                  <p className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                    ASSINATURA
                  </p>
                  <p className="font-editorial-mono text-[14px]" style={{ color: TEXT }}>
                    {fmtDate(m3ContractStart) ?? <span style={{ color: MUTED }}>—</span>}
                  </p>
                </div>

                <div className="p-5" style={{ borderRight: `1px solid ${CARD_BORDER}` }}>
                  <p className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                    VENCIMENTO
                  </p>
                  <p className="font-editorial-mono text-[14px]"
                    style={{ color: m3Expired || m3Critical || m3Warning ? alertColor : TEXT }}>
                    {fmtDate(m3ContractEnd) ?? <span style={{ color: MUTED }}>—</span>}
                  </p>
                </div>

                <div className="p-5">
                  <p className="font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                    STATUS
                  </p>
                  {m3ContractEnd ? (
                    <span className="font-editorial-mono text-[10px] uppercase tracking-wider border px-2 py-1 rounded-md inline-block"
                      style={{ color: alertColor, borderColor: alertColor }}>
                      {m3Expired ? "VENCIDO" : m3Critical ? "CRÍTICO" : m3Warning ? "EXPIRANDO" : "ATIVO"}
                    </span>
                  ) : (
                    <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
