import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseDateSafe, formatDateMediumBR, daysBetween, formatDateForDB } from "@/lib/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Design tokens ───────────────────────────────────────────────────────────

const ACCENT = "#E5173F";
const GREEN  = "#22C55E";
const AMBER  = "#F59E0B";
const BLUE   = "#3B82F6";
const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";
const TEXT   = "#F2EDE4";
const BG     = "#0A0A0A";
const NOTE_BORDER = "#282828";

// ─── Status config ────────────────────────────────────────────────────────────

type StatusKey = "apto" | "fit" | "recovering" | "em_recuperacao" | "injured" | "lesionado" | "transition" | "transicao" | "retorno_progressivo";

const STATUS_CONFIG: Record<StatusKey, { label: string; description: string; color: string; icon: string }> = {
  fit:                  { label: "APTO PARA ATIVIDADE",   description: "Atleta liberado para treinos e competições",       color: GREEN,  icon: "check" },
  apto:                 { label: "APTO PARA ATIVIDADE",   description: "Atleta liberado para treinos e competições",       color: GREEN,  icon: "check" },
  recovering:           { label: "EM RECUPERAÇÃO",        description: "Atleta em tratamento médico supervisionado",       color: AMBER,  icon: "pulse" },
  em_recuperacao:       { label: "EM RECUPERAÇÃO",        description: "Atleta em tratamento médico supervisionado",       color: AMBER,  icon: "pulse" },
  injured:              { label: "AFASTADO POR LESÃO",    description: "Atleta em período de recuperação completa",        color: ACCENT, icon: "x"     },
  lesionado:            { label: "AFASTADO POR LESÃO",    description: "Atleta em período de recuperação completa",        color: ACCENT, icon: "x"     },
  transition:           { label: "RETORNO PROGRESSIVO",   description: "Atleta em transição para atividades normais",      color: BLUE,   icon: "arrow" },
  transicao:            { label: "RETORNO PROGRESSIVO",   description: "Atleta em transição para atividades normais",      color: BLUE,   icon: "arrow" },
  retorno_progressivo:  { label: "RETORNO PROGRESSIVO",   description: "Atleta em transição para atividades normais",      color: BLUE,   icon: "arrow" },
};

const DEFAULT_STATUS = STATUS_CONFIG.apto;

const getStatus = (s: string | null | undefined) =>
  STATUS_CONFIG[(s?.toLowerCase() as StatusKey) ?? "apto"] ?? DEFAULT_STATUS;

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  leve:  { label: "LEVE",     color: GREEN  },
  mild:  { label: "LEVE",     color: GREEN  },
  media: { label: "MODERADA", color: AMBER  },
  média: { label: "MODERADA", color: AMBER  },
  medium:{ label: "MODERADA", color: AMBER  },
  grave: { label: "GRAVE",    color: ACCENT },
  severe:{ label: "GRAVE",    color: ACCENT },
};

const getSeverity = (s: string) =>
  SEVERITY_CONFIG[s.toLowerCase()] ?? { label: s.toUpperCase(), color: MUTED };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDays = (start: string, end: string | null): string => {
  const d = daysBetween(start, end);
  if (d < 7) return `${d} dias`;
  if (d < 30) return `${Math.floor(d / 7)} sem.`;
  return `${Math.floor(d / 30)} meses`;
};

const inputCls =
  "w-full bg-[#0A0A0A] border border-[#1C1C1C] font-jetbrains text-[13px] text-[#F2EDE4] px-3 py-2.5 outline-none focus:border-[#E5173F] placeholder:text-[#6B6560] transition-colors";

const labelCls = "block font-barlow text-[10px] uppercase tracking-widest mb-1.5";

// ─── Injury type ──────────────────────────────────────────────────────────────

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

const COMMON_INJURIES = [
  "Distensão muscular", "Entorse de tornozelo", "Lesão no joelho", "Contusão",
  "Fratura", "Tendinite", "Pubalgia", "Lesão no ombro", "Lombalgia", "Fadiga muscular",
];

// ─── Status icons (inline SVG paths) ─────────────────────────────────────────

function StatusIcon({ type, color, size = 52 }: { type: string; color: string; size?: number }) {
  const s = size;
  const sw = size * 0.09;
  if (type === "check") return (
    <svg width={s} height={s} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke={color} strokeWidth={sw} />
      <polyline points="14,27 22,35 38,18" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
  if (type === "x") return (
    <svg width={s} height={s} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke={color} strokeWidth={sw} />
      <line x1="16" y1="16" x2="36" y2="36" stroke={color} strokeWidth={sw} strokeLinecap="square" />
      <line x1="36" y1="16" x2="16" y2="36" stroke={color} strokeWidth={sw} strokeLinecap="square" />
    </svg>
  );
  if (type === "pulse") return (
    <svg width={s} height={s} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke={color} strokeWidth={sw} />
      <polyline points="10,26 18,26 22,16 26,36 30,20 34,26 42,26" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
  // arrow / retorno progressivo
  return (
    <svg width={s} height={s} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" stroke={color} strokeWidth={sw} />
      <path d="M18 26 L34 26 M26 18 L34 26 L26 34" stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-[14px]" style={{ background: ACCENT }} />
        <h3 className="font-barlow text-[13px] uppercase tracking-widest" style={{ color: TEXT }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

// ─── Injury form state ────────────────────────────────────────────────────────

const emptyInjuryForm = () => ({
  injury_type: "",
  custom_type: false,
  severity: "leve",
  start_date: format(new Date(), "yyyy-MM-dd"),
  return_date: "",
  notes: "",
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  playerId: string;
  playerPhysicalStatus?: string | null;
  playerMedicalNotes?: string | null;
  onDataChange: () => void;
  canEdit?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicalTab({
  playerId,
  playerPhysicalStatus,
  playerMedicalNotes,
  onDataChange,
  canEdit = false,
}: MedicalTabProps) {
  const qc = useQueryClient();

  // ── Injury dialogs ──
  const [addOpen, setAddOpen] = useState(false);
  const [editInjury, setEditInjury] = useState<Injury | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Injury | null>(null);
  const [injuryForm, setInjuryForm] = useState(emptyInjuryForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Medical note dialog ──
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(playerMedicalNotes ?? "");
  const [savingNote, setSavingNote] = useState(false);

  // ── Data ──
  const { data: injuries, isLoading } = useQuery({
    queryKey: ["player-injuries", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_injuries")
        .select("*")
        .eq("player_id", playerId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Injury[];
    },
  });

  const invalidateInjuries = () => qc.invalidateQueries({ queryKey: ["player-injuries", playerId] });

  // ── Status ──
  const status = getStatus(playerPhysicalStatus);

  // ── Add injury ──
  const openAdd = () => {
    setInjuryForm(emptyInjuryForm());
    setAddOpen(true);
  };

  const openEdit = (inj: Injury) => {
    setInjuryForm({
      injury_type: inj.injury_type,
      custom_type: !COMMON_INJURIES.includes(inj.injury_type),
      severity: inj.severity,
      start_date: inj.start_date,
      return_date: inj.return_date ?? "",
      notes: inj.notes ?? "",
    });
    setEditInjury(inj);
  };

  const handleSaveInjury = async () => {
    if (!injuryForm.injury_type) return toast.error("Informe o tipo de lesão");
    if (!injuryForm.start_date) return toast.error("Informe a data de início");
    setSaving(true);
    try {
      const payload = {
        player_id: playerId,
        injury_type: injuryForm.injury_type,
        severity: injuryForm.severity,
        start_date: injuryForm.start_date,
        return_date: injuryForm.return_date || null,
        notes: injuryForm.notes || null,
      };
      if (editInjury) {
        const { error } = await supabase.from("player_injuries").update(payload).eq("id", editInjury.id);
        if (error) throw error;
        toast.success("Lesão atualizada");
        setEditInjury(null);
      } else {
        const { error } = await supabase.from("player_injuries").insert(payload);
        if (error) throw error;
        toast.success("Lesão registrada");
        setAddOpen(false);
      }
      await invalidateInjuries();
    } catch {
      toast.error("Erro ao salvar lesão");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInjury = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("player_injuries").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Lesão removida");
      setDeleteTarget(null);
      await invalidateInjuries();
    } catch {
      toast.error("Erro ao remover lesão");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ medical_notes: noteText || null })
        .eq("id", playerId);
      if (error) throw error;
      toast.success("Observação salva");
      setNoteOpen(false);
      onDataChange();
    } catch {
      toast.error("Erro ao salvar observação");
    } finally {
      setSavingNote(false);
    }
  };

  const openNote = () => {
    setNoteText(playerMedicalNotes ?? "");
    setNoteOpen(true);
  };

  // ── Injury form (shared by add + edit) ──
  const InjuryForm = (
    <div className="space-y-4 pt-2">
      {/* Tipo */}
      <div>
        <label className={labelCls} style={{ color: MUTED }}>Tipo de Lesão</label>
        {injuryForm.custom_type ? (
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Descreva a lesão..."
              value={injuryForm.injury_type}
              onChange={e => setInjuryForm(f => ({ ...f, injury_type: e.target.value }))}
            />
            <button
              type="button"
              className="font-jetbrains text-[10px] uppercase tracking-wider px-3 border border-[#1C1C1C] text-[#6B6560] hover:border-[#6B6560] transition-colors whitespace-nowrap"
              onClick={() => setInjuryForm(f => ({ ...f, custom_type: false, injury_type: "" }))}
            >
              ← Lista
            </button>
          </div>
        ) : (
          <select
            className={inputCls}
            value={injuryForm.injury_type}
            onChange={e => {
              if (e.target.value === "__custom__") {
                setInjuryForm(f => ({ ...f, custom_type: true, injury_type: "" }));
              } else {
                setInjuryForm(f => ({ ...f, injury_type: e.target.value }));
              }
            }}
          >
            <option value="">Selecione...</option>
            {COMMON_INJURIES.map(i => <option key={i} value={i}>{i}</option>)}
            <option value="__custom__">+ Outro tipo</option>
          </select>
        )}
      </div>

      {/* Severidade */}
      <div>
        <label className={labelCls} style={{ color: MUTED }}>Gravidade</label>
        <select
          className={inputCls}
          value={injuryForm.severity}
          onChange={e => setInjuryForm(f => ({ ...f, severity: e.target.value }))}
        >
          <option value="leve">Leve</option>
          <option value="media">Moderada</option>
          <option value="grave">Grave</option>
        </select>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} style={{ color: MUTED }}>Data de Início</label>
          <input
            type="date"
            className={inputCls}
            value={injuryForm.start_date}
            onChange={e => setInjuryForm(f => ({ ...f, start_date: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls} style={{ color: MUTED }}>Retorno <span style={{ color: MUTED }}>(opcional)</span></label>
          <input
            type="date"
            className={inputCls}
            value={injuryForm.return_date}
            min={injuryForm.start_date}
            onChange={e => setInjuryForm(f => ({ ...f, return_date: e.target.value }))}
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className={labelCls} style={{ color: MUTED }}>Observações <span style={{ color: MUTED }}>(opcional)</span></label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Detalhes sobre a lesão..."
          value={injuryForm.notes}
          onChange={e => setInjuryForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => { setAddOpen(false); setEditInjury(null); }}
          disabled={saving}
          className="flex-1 font-jetbrains text-[11px] uppercase tracking-wider py-2.5 border border-[#1C1C1C] text-[#6B6560] hover:border-[#6B6560] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSaveInjury}
          disabled={saving}
          className="flex-1 font-jetbrains text-[11px] uppercase tracking-wider py-2.5 text-[#F2EDE4] transition-colors"
          style={{ background: ACCENT }}
        >
          {saving ? "SALVANDO..." : "SALVAR"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 py-6">

      {/* ── 1. Status Físico Atual ──────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Status Físico Atual" />
        <div
          className="border p-8 flex flex-col items-center gap-4 text-center"
          style={{ borderColor: BORDER }}
        >
          <StatusIcon type={status.icon} color={status.color} size={56} />
          <div>
            <p
              className="font-barlow text-[22px] uppercase tracking-[0.18em] leading-none"
              style={{ color: status.color }}
            >
              {status.label}
            </p>
            <p className="font-jetbrains text-[11px] mt-2 uppercase tracking-wider" style={{ color: MUTED }}>
              {status.description}
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. Histórico de Lesões ──────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title={`Histórico de Lesões${injuries && injuries.length > 0 ? ` (${injuries.length})` : ""}`}
          action={
            canEdit ? (
              <button
                onClick={openAdd}
                className="font-jetbrains text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                + Registrar Lesão
              </button>
            ) : null
          }
        />

        {isLoading ? (
          <div className="border p-8 flex items-center justify-center" style={{ borderColor: BORDER }}>
            <span className="font-jetbrains text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
              CARREGANDO...
            </span>
          </div>
        ) : !injuries || injuries.length === 0 ? (
          /* Empty state */
          <div className="border p-10 flex flex-col items-center gap-3 text-center" style={{ borderColor: BORDER }}>
            <div className="border p-4" style={{ borderColor: BORDER }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke={GREEN} strokeWidth="1.5" />
                <polyline points="8,17 13,22 24,11" stroke={GREEN} strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </div>
            <p className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: TEXT }}>
              Histórico Clínico Limpo
            </p>
            <p className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              Nenhuma lesão registrada no prontuário
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {injuries.map(inj => {
              const sev = getSeverity(inj.severity);
              const isOngoing = !inj.return_date;
              return (
                <div key={inj.id} className="border" style={{ borderColor: BORDER }}>
                  {/* Card header */}
                  <div
                    className="flex items-start justify-between px-4 pt-4 pb-3"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-barlow text-[15px] uppercase tracking-wider" style={{ color: TEXT }}>
                          {inj.injury_type}
                        </span>
                        {isOngoing && (
                          <span
                            className="font-jetbrains text-[9px] uppercase tracking-wider border px-1.5 py-0.5"
                            style={{ color: ACCENT, borderColor: ACCENT }}
                          >
                            EM TRATAMENTO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {/* Severity badge */}
                      <span
                        className="font-jetbrains text-[9px] uppercase tracking-wider border px-2 py-0.5"
                        style={{ color: sev.color, borderColor: sev.color }}
                      >
                        {sev.label}
                      </span>
                      {/* Edit / Delete */}
                      {canEdit && (
                        <>
                          <button
                            onClick={() => openEdit(inj)}
                            className="font-jetbrains text-[10px] uppercase tracking-wider border px-2 py-0.5 transition-colors"
                            style={{ color: MUTED, borderColor: BORDER }}
                          >
                            EDITAR
                          </button>
                          <button
                            onClick={() => setDeleteTarget(inj)}
                            className="font-jetbrains text-[10px] uppercase tracking-wider border px-2 py-0.5 transition-colors"
                            style={{ color: ACCENT, borderColor: ACCENT }}
                          >
                            EXCLUIR
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 divide-x px-0" style={{ borderBottom: `1px solid ${BORDER}`, divideColor: BORDER }}>
                    {[
                      { label: "INÍCIO",       value: formatDateMediumBR(inj.start_date) },
                      { label: "RETORNO",      value: inj.return_date ? formatDateMediumBR(inj.return_date) : "—" },
                      { label: "AFASTAMENTO",  value: fmtDays(inj.start_date, inj.return_date) },
                    ].map((col, i) => (
                      <div
                        key={i}
                        className="px-4 py-3"
                        style={{ borderRight: i < 2 ? `1px solid ${BORDER}` : undefined }}
                      >
                        <p className="font-jetbrains text-[9px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>
                          {col.label}
                        </p>
                        <p className="font-jetbrains text-[13px]" style={{ color: TEXT }}>
                          {col.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {inj.notes && (
                    <div
                      className="mx-4 my-3 pl-3 py-1"
                      style={{ borderLeft: `2px solid ${NOTE_BORDER}` }}
                    >
                      <p className="font-jetbrains text-[11px] leading-relaxed" style={{ color: MUTED }}>
                        {inj.notes}
                      </p>
                    </div>
                  )}

                  {/* No notes padding */}
                  {!inj.notes && <div className="pb-1" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3. Observações Médicas ──────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Observações Médicas"
          action={
            canEdit ? (
              <button
                onClick={openNote}
                className="font-jetbrains text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors"
                style={{ borderColor: BORDER, color: MUTED }}
              >
                {playerMedicalNotes ? "EDITAR" : "+ NOVA OBSERVAÇÃO"}
              </button>
            ) : null
          }
        />

        {playerMedicalNotes ? (
          <div className="border" style={{ borderColor: BORDER }}>
            <div className="mx-4 my-4 pl-3" style={{ borderLeft: `2px solid ${NOTE_BORDER}` }}>
              <p className="font-jetbrains text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: TEXT }}>
                {playerMedicalNotes}
              </p>
            </div>
          </div>
        ) : (
          <div className="border p-10 flex flex-col items-center gap-3 text-center" style={{ borderColor: BORDER }}>
            <div className="border p-4" style={{ borderColor: BORDER }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="5" y="4" width="18" height="20" stroke={MUTED} strokeWidth="1.2" />
                <line x1="9" y1="10" x2="19" y2="10" stroke={MUTED} strokeWidth="1.2" />
                <line x1="9" y1="14" x2="19" y2="14" stroke={MUTED} strokeWidth="1.2" />
                <line x1="9" y1="18" x2="15" y2="18" stroke={MUTED} strokeWidth="1.2" />
              </svg>
            </div>
            <p className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: MUTED }}>
              Sem Observações
            </p>
            <p className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              Nenhuma observação médica registrada
            </p>
            {canEdit && (
              <button
                onClick={openNote}
                className="mt-2 font-jetbrains text-[10px] uppercase tracking-wider px-4 py-2 border transition-colors"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                + Nova Observação
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Add Injury Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={o => !o && setAddOpen(false)}>
        <DialogContent className="max-w-md" style={{ background: BG, borderColor: BORDER }}>
          <DialogHeader>
            <DialogTitle className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: TEXT }}>
              Registrar Nova Lesão
            </DialogTitle>
          </DialogHeader>
          {InjuryForm}
        </DialogContent>
      </Dialog>

      {/* ── Edit Injury Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editInjury} onOpenChange={o => !o && setEditInjury(null)}>
        <DialogContent className="max-w-md" style={{ background: BG, borderColor: BORDER }}>
          <DialogHeader>
            <DialogTitle className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: TEXT }}>
              Editar Lesão
            </DialogTitle>
          </DialogHeader>
          {InjuryForm}
        </DialogContent>
      </Dialog>

      {/* ── Delete Injury Alert ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: BG, borderColor: BORDER }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: TEXT }}>
              Excluir Lesão
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jetbrains text-[11px]" style={{ color: MUTED }}>
              Tem certeza que deseja excluir o registro de{" "}
              <span style={{ color: TEXT }}>"{deleteTarget?.injury_type}"</span>?{" "}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="font-jetbrains text-[10px] uppercase tracking-wider"
              style={{ background: "transparent", borderColor: BORDER, color: MUTED }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInjury}
              disabled={deleting}
              className="font-jetbrains text-[10px] uppercase tracking-wider"
              style={{ background: ACCENT, color: TEXT, border: "none" }}
            >
              {deleting ? "EXCLUINDO..." : "EXCLUIR"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Medical Note Dialog ────────────────────────────────────────────── */}
      <Dialog open={noteOpen} onOpenChange={o => !o && setNoteOpen(false)}>
        <DialogContent className="max-w-md" style={{ background: BG, borderColor: BORDER }}>
          <DialogHeader>
            <DialogTitle className="font-barlow text-[14px] uppercase tracking-widest" style={{ color: TEXT }}>
              Observação Médica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className={labelCls} style={{ color: MUTED }}>Observação</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={6}
                placeholder="Registre observações médicas relevantes sobre o atleta..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                disabled={savingNote}
                className="flex-1 font-jetbrains text-[11px] uppercase tracking-wider py-2.5 border transition-colors"
                style={{ borderColor: BORDER, color: MUTED }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="flex-1 font-jetbrains text-[11px] uppercase tracking-wider py-2.5"
                style={{ background: ACCENT, color: TEXT }}
              >
                {savingNote ? "SALVANDO..." : "SALVAR"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
