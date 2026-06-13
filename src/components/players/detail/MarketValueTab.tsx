import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Loader2, Save, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/authContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Design tokens ────────────────────────────────────────────────────────────
const A           = "#ec4525";
const GREEN       = "#22c55e";
const AMBER       = "#f59e0b";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const INPUT_BG    = "#0c0b0d";
const INPUT_BORDER = "rgba(255,255,255,0.12)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatShort(value: number | null | undefined, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? "";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${sym}${(n / 1_000).toFixed(0)}K`;
  return `${sym}${n.toLocaleString("pt-BR")}`;
}

function formatFull(value: number, currency: string): string {
  const sym = CURRENCIES.find((c) => c.value === currency)?.symbol ?? "";
  return `${sym}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function trendInfo(trend: string | null) {
  if (trend === "up")   return { Icon: TrendingUp,   color: GREEN, label: "EM ALTA"  };
  if (trend === "down") return { Icon: TrendingDown, color: A,     label: "EM BAIXA" };
  return { Icon: Minus, color: MUTED, label: "ESTÁVEL" };
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-editorial-mono text-[9.5px] tracking-[0.22em] uppercase mb-1.5" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

function SectionHead({ n, children, action }: { n?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: CARD_BORDER }}>
      <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: MUTED }}>
        {n && <><span style={{ color: A }} className="font-semibold">{n}</span><span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" /></>}
        {children}
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

const inputCls =
  "w-full font-editorial-mono text-[13px] px-3 py-2.5 rounded-lg outline-none transition-colors placeholder:opacity-40";

const inputStyle = {
  background: INPUT_BG,
  border: `1px solid ${INPUT_BORDER}`,
  color: TEXT,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ValueHistoryEntry {
  id: string;
  value: number;
  currency: string;
  note: string | null;
  source: string | null;
  recorded_at: string;
}

export interface MarketValueTabProps {
  playerId: string;
  marketValue: number | null;
  marketValueCurrency: string | null;
  marketValueTrend: string | null;
  onValueChange?: () => void;
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { rawValue: number; currency: string; fullDate: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="font-editorial-mono text-[11px] px-3 py-2 rounded-lg" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}>
      <p style={{ color: MUTED }} className="text-[10px] mb-0.5">{d.fullDate}</p>
      <p style={{ color: A }} className="font-bold">{formatShort(d.rawValue, d.currency)}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MarketValueTab({
  playerId,
  marketValue,
  marketValueCurrency,
  marketValueTrend,
  onValueChange,
}: MarketValueTabProps) {
  const { isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [history, setHistory] = useState<ValueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fValue, setFValue] = useState("");
  const [fCurrency, setFCurrency] = useState("EUR");
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fSource, setFSource] = useState("");
  const [fNote, setFNote] = useState("");

  const [editEntry, setEditEntry] = useState<ValueHistoryEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [eValue, setEValue] = useState("");
  const [eCurrency, setECurrency] = useState("EUR");
  const [eDate, setEDate] = useState("");
  const [eSource, setESource] = useState("");
  const [eNote, setENote] = useState("");

  const [deleteEntry, setDeleteEntry] = useState<ValueHistoryEntry | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const highestEntry = history.length
    ? history.reduce((m, e) => (e.value > m.value ? e : m), history[0])
    : null;
  const latestEntry = history.length ? history[history.length - 1] : null;

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("player_market_value_history")
      .select("*")
      .eq("player_id", playerId)
      .is("deleted_at", null)
      .order("recorded_at", { ascending: true });
    setHistory(Array.isArray(data) ? (data as ValueHistoryEntry[]) : []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [playerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(fValue);
    if (!Number.isFinite(val) || val < 0) { toast.error("Valor inválido"); return; }
    setSaving(true);
    const { error } = await supabase.rpc("update_player_market_value", {
      p_player_id: playerId,
      p_value: val,
      p_currency: fCurrency,
      p_note: fNote || null,
      p_source: fSource || null,
      p_recorded_at: new Date(fDate).toISOString(),
    });
    if (error) { toast.error("Erro ao salvar", { description: error.message }); setSaving(false); return; }
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });
    toast.success("Valor de mercado atualizado!");
    setFValue(""); setFNote(""); setFSource(""); setFDate(new Date().toISOString().split("T")[0]);
    setSaving(false);
    fetchHistory();
    onValueChange?.();
  };

  const openEdit = (entry: ValueHistoryEntry) => {
    setEditEntry(entry);
    setEValue(entry.value.toString());
    setECurrency(entry.currency);
    setEDate(new Date(entry.recorded_at).toISOString().split("T")[0]);
    setESource(entry.source ?? "");
    setENote(entry.note ?? "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editEntry) return;
    const val = parseFloat(eValue);
    if (!Number.isFinite(val) || val < 0) { toast.error("Valor inválido"); return; }
    setEditSaving(true);
    const { error } = await supabase
      .from("player_market_value_history")
      .update({ value: val, currency: eCurrency, recorded_at: new Date(eDate).toISOString(), note: eNote || null, source: eSource || null })
      .eq("id", editEntry.id);
    if (error) { toast.error("Erro ao editar", { description: error.message }); setEditSaving(false); return; }
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });
    toast.success("Entrada atualizada!");
    setEditOpen(false); setEditEntry(null); setEditSaving(false);
    fetchHistory(); onValueChange?.();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEntry) return;
    setDeleteSaving(true);
    const { error } = await supabase
      .from("player_market_value_history")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteEntry.id);
    if (error) { toast.error("Erro ao excluir", { description: error.message }); setDeleteSaving(false); return; }
    await supabase.rpc("recalculate_player_market_value_summary", { p_player_id: playerId });
    toast.success("Entrada excluída!");
    setDeleteOpen(false); setDeleteEntry(null); setDeleteSaving(false);
    fetchHistory(); onValueChange?.();
  };

  const trend = trendInfo(marketValueTrend);

  const chartData = history.map((e) => ({
    date: format(new Date(e.recorded_at), "MMM yy", { locale: ptBR }),
    fullDate: format(new Date(e.recorded_at), "dd/MM/yyyy"),
    value: e.value / 1_000_000,
    rawValue: e.value,
    currency: e.currency,
  }));

  const historyDesc = [...history].reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── 3 Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Valor Atual */}
        <div className="rounded-xl border p-5 transition-colors duration-[250ms] hover:bg-zinc-800/50" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <FieldLabel>VALOR ATUAL</FieldLabel>
          <div className="flex items-end gap-3 flex-wrap mt-1">
            <span className="font-display font-bold leading-none" style={{ fontSize: "clamp(24px,3vw,36px)", color: TEXT }}>
              {marketValue !== null ? formatShort(marketValue, marketValueCurrency ?? "EUR") : "—"}
            </span>
            {marketValue !== null && (
              <span
                className="inline-flex items-center gap-1 font-editorial-mono text-[10px] tracking-[0.15em] uppercase px-2 py-1 mb-0.5 rounded-md"
                style={{ border: `1px solid ${trend.color}`, color: trend.color }}
              >
                <trend.Icon className="w-3 h-3" />
                {trend.label}
              </span>
            )}
          </div>
        </div>

        {/* Valor Máximo */}
        <div className="rounded-xl border p-5 transition-colors duration-[250ms] hover:bg-zinc-800/50" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <FieldLabel>VALOR MÁXIMO</FieldLabel>
          <span className="font-display font-bold leading-none" style={{ fontSize: "clamp(24px,3vw,36px)", color: AMBER }}>
            {highestEntry ? formatShort(highestEntry.value, highestEntry.currency) : "—"}
          </span>
          {highestEntry && (
            <p className="font-editorial-mono text-[10px] mt-2" style={{ color: MUTED }}>
              {format(new Date(highestEntry.recorded_at), "dd MMM yyyy", { locale: ptBR })}
            </p>
          )}
        </div>

        {/* Última Atualização */}
        <div className="rounded-xl border p-5 transition-colors duration-[250ms] hover:bg-zinc-800/50" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <FieldLabel>ÚLTIMA ATUALIZAÇÃO</FieldLabel>
          <span className="font-display font-bold leading-tight uppercase" style={{ fontSize: "clamp(18px,2.5vw,26px)", color: TEXT }}>
            {latestEntry
              ? format(new Date(latestEntry.recorded_at), "dd MMM yyyy", { locale: ptBR }).toUpperCase()
              : "—"}
          </span>
          {latestEntry && (
            <p className="font-editorial-mono text-[10px] mt-2" style={{ color: MUTED }}>
              {formatShort(latestEntry.value, latestEntry.currency)}
            </p>
          )}
        </div>
      </div>

      {/* ── 2-col grid: Form + Chart ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">

        {/* Left: Form */}
        <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <SectionHead n="01">ATUALIZAR VALOR</SectionHead>
          <div className="p-5">
            {canEdit ? (
              <form onSubmit={handleAdd} className="space-y-4">
                <Field label="Valor">
                  <input
                    type="number" min={0} step="0.01" placeholder="1000000"
                    value={fValue} onChange={(e) => setFValue(e.target.value)} required
                    className={inputCls} style={inputStyle}
                  />
                </Field>
                <Field label="Moeda">
                  <select value={fCurrency} onChange={(e) => setFCurrency(e.target.value)}
                    className={inputCls} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value} style={{ background: "#111" }}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Data">
                  <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required
                    className={`${inputCls} max-w-full min-w-0 box-border`}
                    style={{ ...inputStyle, colorScheme: "dark" }} />
                </Field>
                <Field label={<>Fonte <span style={{ color: "rgba(255,255,255,0.2)" }}>(opcional)</span></>}>
                  <input type="text" placeholder="Ex: Transfermarkt, Scout"
                    value={fSource} onChange={(e) => setFSource(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </Field>
                <Field label={<>Nota <span style={{ color: "rgba(255,255,255,0.2)" }}>(opcional)</span></>}>
                  <textarea placeholder="Observações sobre a atualização..."
                    value={fNote} onChange={(e) => setFNote(e.target.value)}
                    rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
                </Field>
                <button
                  type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 font-editorial-mono text-[11px] tracking-[0.2em] uppercase text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: A }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  SALVAR
                </button>
              </form>
            ) : (
              <p className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>
                Apenas administradores e scouts podem atualizar o valor.
              </p>
            )}
          </div>
        </div>

        {/* Right: Chart */}
        <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <SectionHead n="02">EVOLUÇÃO DO VALOR DE MERCADO</SectionHead>
          <div className="p-5">
            {chartData.length < 2 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2">
                <span className="font-editorial-mono text-[11px] tracking-wider uppercase" style={{ color: MUTED }}>
                  {chartData.length === 1
                    ? "Adicione mais registros para visualizar a evolução"
                    : "Sem histórico de valores"}
                </span>
                {chartData.length === 1 && (
                  <span className="font-display font-bold text-[28px]" style={{ color: A }}>
                    {formatShort(chartData[0].rawValue, chartData[0].currency)}
                  </span>
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mvTabGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={A} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={A} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                    axisLine={{ stroke: CARD_BORDER }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: MUTED }}
                    axisLine={{ stroke: CARD_BORDER }}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}M`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {chartData.length > 0 && (
                    <ReferenceLine
                      y={chartData[chartData.length - 1].value}
                      stroke={MUTED}
                      strokeDasharray="4 3"
                      strokeWidth={1}
                      label={{
                        value: formatShort(chartData[chartData.length - 1].rawValue, chartData[chartData.length - 1].currency),
                        position: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 9,
                        fill: MUTED,
                      }}
                    />
                  )}
                  <Area
                    type="monotone" dataKey="value"
                    stroke={A} strokeWidth={1.5} fill="url(#mvTabGrad)"
                    dot={(props: { cx: number; cy: number; index: number }) => {
                      const isLast = props.index === chartData.length - 1;
                      return (
                        <circle key={props.index} cx={props.cx} cy={props.cy}
                          r={isLast ? 4 : 2.5}
                          fill={isLast ? A : CARD_BG}
                          stroke={A} strokeWidth={1.5}
                        />
                      );
                    }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Histórico de Valores ──────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
        <SectionHead n="03" action={
          <span className="font-editorial-mono text-[10px] tracking-wider" style={{ color: MUTED }}>
            {history.length} registro{history.length !== 1 ? "s" : ""}
          </span>
        }>
          HISTÓRICO DE VALORES
        </SectionHead>

        {historyDesc.length === 0 ? (
          <div className="py-10 flex items-center justify-center">
            <span className="font-editorial-mono text-[11px] tracking-wider uppercase" style={{ color: MUTED }}>
              Nenhum registro encontrado
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[640px] font-editorial-mono text-[11px]" style={{ color: TEXT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {["DATA", "VALOR", "MOEDA", "FONTE", "NOTA", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left font-editorial-mono text-[9px] tracking-[0.18em] uppercase whitespace-nowrap"
                      style={{ color: MUTED, borderRight: i < 5 ? `1px solid ${CARD_BORDER}` : undefined }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyDesc.map((entry, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-4 py-3 whitespace-nowrap" style={{ borderRight: `1px solid ${CARD_BORDER}` }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{format(new Date(entry.recorded_at), "dd/MM/yyyy")}</span>
                          {isLatest && (
                            <span className="font-editorial-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap"
                              style={{ color: A, border: `1px solid ${A}` }}>
                              ATUAL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-bold whitespace-nowrap"
                        style={{ borderRight: `1px solid ${CARD_BORDER}`, color: isLatest ? A : TEXT, fontSize: isLatest ? 14 : 11 }}>
                        {formatFull(entry.value, entry.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>
                        <span className="font-editorial-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-md"
                          style={{ border: `1px solid ${CARD_BORDER}`, color: MUTED }}>
                          {entry.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}>
                        {entry.source || "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate"
                        style={{ borderRight: `1px solid ${CARD_BORDER}`, color: MUTED }}
                        title={entry.note ?? undefined}>
                        {entry.note || "—"}
                      </td>
                      <td className="px-4 py-3 w-10">
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-6 h-6 flex items-center justify-center transition-colors hover:opacity-70"
                                style={{ color: MUTED }}>
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl min-w-[120px]"
                              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
                              <DropdownMenuItem onClick={() => openEdit(entry)}
                                className="font-editorial-mono text-[11px] gap-2 cursor-pointer rounded-lg"
                                style={{ color: TEXT }}>
                                <Pencil className="w-3 h-3" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setDeleteEntry(entry); setDeleteOpen(true); }}
                                className="font-editorial-mono text-[11px] gap-2 cursor-pointer rounded-lg"
                                style={{ color: A }}>
                                <Trash2 className="w-3 h-3" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-[18px] uppercase tracking-widest" style={{ color: TEXT }}>
              Editar Entrada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Valor">
              <input type="number" min={0} step="0.01" value={eValue} onChange={(e) => setEValue(e.target.value)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Moeda">
              <select value={eCurrency} onChange={(e) => setECurrency(e.target.value)} className={inputCls} style={{ ...inputStyle, appearance: "none" }}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value} style={{ background: "#111" }}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }} />
            </Field>
            <Field label="Fonte (opcional)">
              <input type="text" value={eSource} onChange={(e) => setESource(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ex: Transfermarkt" />
            </Field>
            <Field label="Nota (opcional)">
              <textarea value={eNote} onChange={(e) => setENote(e.target.value)} rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setEditOpen(false)}
              className="px-4 py-2 font-editorial-mono text-[11px] tracking-wider uppercase rounded-lg border transition-colors hover:border-white/30"
              style={{ borderColor: CARD_BORDER, color: MUTED }}>
              Cancelar
            </button>
            <button onClick={handleEditSave} disabled={editSaving}
              className="px-4 py-2 font-editorial-mono text-[11px] tracking-wider uppercase text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              style={{ background: A }}>
              {editSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-[18px] uppercase tracking-widest" style={{ color: TEXT }}>
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="font-editorial-mono text-[11px]" style={{ color: MUTED }}>
              Excluir o registro de{" "}
              <span style={{ color: TEXT }}>{deleteEntry && formatFull(deleteEntry.value, deleteEntry.currency)}</span>{" "}
              de{" "}
              <span style={{ color: TEXT }}>{deleteEntry && format(new Date(deleteEntry.recorded_at), "dd/MM/yyyy")}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-editorial-mono text-[11px] tracking-wider uppercase rounded-lg bg-transparent"
              style={{ borderColor: CARD_BORDER, color: MUTED }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteSaving}
              className="font-editorial-mono text-[11px] tracking-wider uppercase text-white rounded-lg flex items-center gap-2"
              style={{ background: A }}>
              {deleteSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
