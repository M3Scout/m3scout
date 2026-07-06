import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import { parseDateSafe } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Design tokens ───────────────────────────────────────────────────────────
const ACCENT      = "#ec4525";
const GREEN       = "#22c55e";
const AMBER       = "#f59e0b";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const INPUT_BG    = "#0c0b0d";
const INPUT_BORDER = "rgba(255,255,255,0.12)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";

// ─── Metric config ────────────────────────────────────────────────────────────
const METRIC_CONFIG = {
  weight:              { label: "Peso",          unit: "kg",        color: "hsl(217,91%,60%)" },
  body_fat_percentage: { label: "% Gordura",     unit: "%",         color: "hsl(0,84%,60%)"   },
  muscle_mass:         { label: "Massa Muscular", unit: "kg",       color: "hsl(142,76%,36%)" },
  max_speed:           { label: "Vel. Máx",      unit: "km/h",      color: "hsl(45,93%,47%)"  },
  sprint_30m:          { label: "Sprint 30m",    unit: "s",         color: "hsl(280,65%,60%)" },
  vo2_max:             { label: "VO2 Máx",       unit: "ml/kg/min", color: "hsl(180,70%,45%)" },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

// ─── Ranges ───────────────────────────────────────────────────────────────────
const METRIC_RANGES: Record<string, { min: number; idealLow: number; idealHigh: number; max: number; inverse?: boolean }> = {
  height:              { min: 160, idealLow: 170, idealHigh: 190, max: 200 },
  weight:              { min: 55,  idealLow: 65,  idealHigh: 85,  max: 100 },
  wingspan:            { min: 160, idealLow: 175, idealHigh: 200, max: 215 },
  body_fat_percentage: { min: 5,   idealLow: 8,   idealHigh: 15,  max: 25,  inverse: true },
  muscle_mass:         { min: 25,  idealLow: 35,  idealHigh: 55,  max: 70 },
  bmi:                 { min: 18,  idealLow: 20,  idealHigh: 24,  max: 28 },
  max_speed:           { min: 25,  idealLow: 30,  idealHigh: 35,  max: 40 },
  sprint_30m:          { min: 3.5, idealLow: 3.8, idealHigh: 4.3, max: 5.0, inverse: true },
  vo2_max:             { min: 40,  idealLow: 50,  idealHigh: 65,  max: 75 },
};

// ─── Radar axes ───────────────────────────────────────────────────────────────
const RADAR_AXES = [
  { key: "max_speed",           label: "Velocidade",    elite: 36,  inverse: false, rangeMax: 40  },
  { key: "sprint_30m",          label: "Sprint",        elite: 3.9, inverse: true,  rangeMax: 5.0 },
  { key: "vo2_max",             label: "VO2 Máx",       elite: 65,  inverse: false, rangeMax: 75  },
  { key: "body_fat_percentage", label: "% Gordura",     elite: 10,  inverse: true,  rangeMax: 25  },
  { key: "muscle_mass",         label: "Massa Musc.",   elite: 45,  inverse: false, rangeMax: 70  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeForRadar = (value: number | null, axisKey: string): number => {
  if (value == null || !Number.isFinite(value)) return 0;
  const axis = RADAR_AXES.find(a => a.key === axisKey);
  if (!axis) return 0;
  if (axis.inverse) {
    const norm = ((axis.rangeMax - value) / (axis.rangeMax - axis.elite)) * 100;
    return Math.max(0, Math.min(100, norm));
  }
  return Math.max(0, Math.min(100, (value / axis.elite) * 100));
};

const calcBMI = (weight?: number | null, height?: number | null): number | null => {
  if (!weight || !height) return null;
  return weight / ((height / 100) ** 2);
};


const getMetricStatus = (value: number | null, key: string): { pct: number; status: "low" | "ideal" | "high" | "none" } => {
  if (value == null || !Number.isFinite(value)) return { pct: 0, status: "none" };
  const r = METRIC_RANGES[key];
  if (!r) return { pct: 50, status: "ideal" };
  const clamped = Math.max(r.min, Math.min(r.max, value));
  const pct = ((clamped - r.min) / (r.max - r.min)) * 100;
  let status: "low" | "ideal" | "high";
  if (value < r.idealLow) status = "low";
  else if (value <= r.idealHigh) status = "ideal";
  else status = "high";
  return { pct, status };
};

// ─── SVG Pentagon Radar ───────────────────────────────────────────────────────
const CX = 120, CY = 115, R = 82;
const axisPoint = (idx: number, factor: number) => {
  const angle = (idx * 72 - 90) * (Math.PI / 180);
  return { x: CX + R * factor * Math.cos(angle), y: CY + R * factor * Math.sin(angle) };
};
const pointsStr = (pts: { x: number; y: number }[]) =>
  pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

function PhysicalRadar({ athleteValues }: { athleteValues: number[] }) {
  const rings = [0.25, 0.5, 0.75, 1.0];
  const elitePts   = RADAR_AXES.map((_, i) => axisPoint(i, 1.0));
  const athletePts = athleteValues.map((v, i) => axisPoint(i, v / 100));
  return (
    <svg viewBox="0 0 240 230" className="w-full max-w-[260px] mx-auto">
      {rings.map(r => (
        <polygon key={r} points={pointsStr(RADAR_AXES.map((_, i) => axisPoint(i, r)))}
          fill="none" stroke={CARD_BORDER} strokeWidth="1" />
      ))}
      {RADAR_AXES.map((_, i) => {
        const outer = axisPoint(i, 1.0);
        return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke={CARD_BORDER} strokeWidth="1" />;
      })}
      <polygon points={pointsStr(elitePts)} fill={`${ACCENT}14`} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points={pointsStr(athletePts)} fill={`${GREEN}28`} stroke={GREEN} strokeWidth="2" />
      {RADAR_AXES.map((axis, i) => {
        const pt = axisPoint(i, 1.22);
        return (
          <text key={i} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fill={MUTED} fontFamily="JetBrains Mono, monospace">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, rangeKey, unit }: { status: "low" | "ideal" | "high"; rangeKey: string; unit: string }) {
  const cfg = {
    low:   { label: "BAIXO", color: AMBER  },
    ideal: { label: "IDEAL", color: GREEN  },
    high:  { label: "ALTO",  color: ACCENT },
  }[status];

  const range = METRIC_RANGES[rangeKey];
  const tooltipText = range ? `Faixa ideal: ${range.idealLow}–${range.idealHigh} ${unit}`.trim() : null;

  return (
    <div className="relative group/badge flex-shrink-0">
      <span
        className="font-editorial-mono text-[9px] tracking-wider border px-1.5 py-0.5 rounded-md cursor-default select-none"
        style={{ color: cfg.color, borderColor: cfg.color }}
      >
        {cfg.label}
      </span>
      {tooltipText && (
        <div className="absolute bottom-full right-0 mb-2 z-20 pointer-events-none opacity-0 group-hover/badge:opacity-100 transition-opacity duration-150">
          <div
            className="font-editorial-mono text-[10px] tracking-wide whitespace-nowrap px-2.5 py-1.5 rounded-lg shadow-xl"
            style={{ background: "#1c1b20", border: `1px solid ${cfg.color}40`, color: cfg.color }}
          >
            {tooltipText}
          </div>
          <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
            style={{ borderTopColor: `${cfg.color}40` }} />
        </div>
      )}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
interface MetricCardProps { label: string; value: number | null; unit: string; rangeKey: string; decimals?: number }

function MetricCard({ label, value, unit, rangeKey, decimals = 1 }: MetricCardProps) {
  const hasValue = value != null && Number.isFinite(value);
  const { pct, status } = getMetricStatus(value, rangeKey);
  const barColor = status === "ideal" ? GREEN : status === "low" ? AMBER : ACCENT;

  return (
    <div className="rounded-xl border p-4 transition-colors duration-[250ms] hover:bg-zinc-800/50"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] leading-tight" style={{ color: MUTED }}>
          {label}
        </span>
        {hasValue && status !== "none" && <StatusBadge status={status} rangeKey={rangeKey} unit={unit} />}
      </div>
      {hasValue ? (
        <>
          <div className="font-display font-bold leading-none tabular-nums" style={{ fontSize: 26, color: TEXT }}>
            {value!.toFixed(decimals)}
            <span className="font-editorial-mono text-[12px] ml-1" style={{ color: MUTED }}>{unit}</span>
          </div>
          <div className="mt-3 h-[2px] rounded-full" style={{ background: CARD_BORDER }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
          </div>
        </>
      ) : (
        <div className="font-editorial-mono text-[10px] uppercase tracking-wider mt-2" style={{ color: MUTED }}>
          DADO NÃO COLETADO
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ n, children, action }: { n?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: MUTED }}>
        {n && <><span style={{ color: ACCENT }} className="font-semibold">{n}</span><span className="inline-block w-[34px] h-px bg-white/15 mx-[10px] align-middle" /></>}
        {children}
      </div>
      {action}
    </div>
  );
}

// ─── Form atoms ───────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-editorial-mono text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
      {children}
    </label>
  );
}

function FieldInput({ type = "number", value, onChange, placeholder, step }: {
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} step={step}
      className="w-full font-editorial-mono text-[12px] px-3 py-2.5 rounded-lg outline-none transition-colors"
      style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT, colorScheme: type === "date" ? "dark" : undefined }}
      onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
      onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)}
    />
  );
}

// ─── Physical history record ──────────────────────────────────────────────────
interface PhysicalHistoryRecord {
  id: string;
  recorded_at: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
  notes: string | null;
}

const EMPTY_FORM = { recorded_at: "", weight: "", body_fat_percentage: "", muscle_mass: "", max_speed: "", sprint_30m: "", vo2_max: "", notes: "" };

// ─── Props ────────────────────────────────────────────────────────────────────
interface PhysicalTabProps {
  playerId: string;
  playerPosition?: string | null;
  playerHeight?: number | null;
  playerWingspan?: number | null;
  playerWeight?: number | null;
  playerBodyFat?: number | null;
  playerMuscle?: number | null;
  playerMaxSpeed?: number | null;
  playerSprint30m?: number | null;
  playerVo2Max?: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PhysicalTab({
  playerId,
  playerHeight,
  playerWingspan,
  playerWeight,
  playerBodyFat,
  playerMuscle,
  playerMaxSpeed,
  playerSprint30m,
  playerVo2Max,
}: PhysicalTabProps) {
  const queryClient = useQueryClient();
  const { user, isAdmin, isScout } = useAuth();
  const canEdit = isAdmin || isScout;

  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["weight", "body_fat_percentage"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: history, isLoading } = useQuery({
    queryKey: ["player-physical-history", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_physical_history")
        .select("*")
        .eq("player_id", playerId)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data as PhysicalHistoryRecord[];
    },
  });

  const latest = history && history.length > 0 ? history[history.length - 1] : null;

  const resolvedWeight   = latest?.weight              ?? playerWeight    ?? null;
  const resolvedBodyFat  = latest?.body_fat_percentage ?? playerBodyFat   ?? null;
  const resolvedMuscle   = latest?.muscle_mass         ?? playerMuscle    ?? null;
  const resolvedMaxSpeed = latest?.max_speed           ?? playerMaxSpeed  ?? null;
  const resolvedSprint   = latest?.sprint_30m          ?? playerSprint30m ?? null;
  const resolvedVo2      = latest?.vo2_max             ?? playerVo2Max    ?? null;

  const bmi           = calcBMI(resolvedWeight, playerHeight);
  const muscleMassPct = calcMuscleMassPct(resolvedWeight, resolvedBodyFat);

  const radarValues = RADAR_AXES.map(axis => {
    let value: number | null = null;
    if      (axis.key === "max_speed")           value = resolvedMaxSpeed;
    else if (axis.key === "sprint_30m")          value = resolvedSprint;
    else if (axis.key === "vo2_max")             value = resolvedVo2;
    else if (axis.key === "body_fat_percentage") value = resolvedBodyFat;
    else if (axis.key === "muscle_mass_pct")     value = muscleMassPct;
    return normalizeForRadar(value, axis.key);
  });

  const chartData = (history ?? []).map(r => ({
    date: format(parseDateSafe(r.recorded_at), "dd/MM/yy"),
    weight: r.weight,
    body_fat_percentage: r.body_fat_percentage,
    muscle_mass: r.muscle_mass,
    max_speed: r.max_speed,
    sprint_30m: r.sprint_30m,
    vo2_max: r.vo2_max,
  }));

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics(prev => {
      if (prev.includes(key)) return prev.filter(m => m !== key);
      if (prev.length >= 3) return [...prev.slice(1), key];
      return [...prev, key];
    });
  };

  const openDialog = () => {
    setForm({ ...EMPTY_FORM, recorded_at: format(new Date(), "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) { toast.error("É necessário estar autenticado"); return; }
    const hasAtLeastOne = form.weight || form.body_fat_percentage || form.muscle_mass ||
      form.max_speed || form.sprint_30m || form.vo2_max;
    if (!hasAtLeastOne) { toast.error("Preencha ao menos um campo de medida"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("player_physical_history").insert({
        player_id: playerId,
        recorded_at: form.recorded_at,
        weight:              form.weight              ? parseFloat(form.weight)              : null,
        body_fat_percentage: form.body_fat_percentage ? parseFloat(form.body_fat_percentage) : null,
        muscle_mass:         form.muscle_mass         ? parseFloat(form.muscle_mass)         : null,
        max_speed:           form.max_speed           ? parseFloat(form.max_speed)           : null,
        sprint_30m:          form.sprint_30m          ? parseFloat(form.sprint_30m)          : null,
        vo2_max:             form.vo2_max             ? parseFloat(form.vo2_max)             : null,
        notes:               form.notes               || null,
        created_by:          user.id,
      });
      if (error) {
        if (error.code === "23505") toast.error("Já existe um registro para esta data");
        else throw error;
        return;
      }
      toast.success("Avaliação registrada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["player-physical-history", playerId] });
      queryClient.invalidateQueries({ queryKey: ["latest-physical-evaluation", playerId] });
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const addButton = canEdit ? (
    <button onClick={openDialog}
      className="font-editorial-mono text-[9px] uppercase tracking-[0.18em] px-3 py-1.5 border rounded-lg transition-colors"
      style={{ borderColor: ACCENT, color: ACCENT, background: `${ACCENT}0d` }}
      onMouseEnter={e => (e.currentTarget.style.background = `${ACCENT}20`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${ACCENT}0d`)}>
      ＋ ADICIONAR DADOS
    </button>
  ) : null;

  return (
    <>
      <div className="space-y-5 py-4">

        {/* ── 1. Evolução Física ──────────────────────────────────────── */}
        <div>
          <SectionHead n="01" action={addButton}>EVOLUÇÃO FÍSICA</SectionHead>
          <div className="rounded-xl border overflow-hidden p-4" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.entries(METRIC_CONFIG) as [MetricKey, typeof METRIC_CONFIG[MetricKey]][]).map(([key, cfg]) => {
                const isActive = activeMetrics.includes(key);
                return (
                  <button key={key} onClick={() => toggleMetric(key)}
                    className="font-editorial-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded-lg transition-colors"
                    style={{
                      borderColor: isActive ? ACCENT : CARD_BORDER,
                      color: isActive ? ACCENT : MUTED,
                      background: isActive ? `${ACCENT}12` : "transparent",
                    }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            {isLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <span className="font-editorial-mono text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>CARREGANDO...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center gap-3">
                <span className="font-editorial-mono text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
                  SEM AVALIAÇÕES REGISTRADAS
                </span>
                {canEdit && (
                  <button onClick={openDialog}
                    className="font-editorial-mono text-[9px] uppercase tracking-[0.18em] px-4 py-2 border rounded-lg transition-colors"
                    style={{ borderColor: ACCENT, color: ACCENT, background: `${ACCENT}0d` }}>
                    ＋ ADICIONAR PRIMEIRA AVALIAÇÃO
                  </button>
                )}
              </div>
            ) : (() => {
              const metricsWithData = activeMetrics.filter(key =>
                chartData.some(d => d[key] != null && Number.isFinite(d[key] as number))
              );
              const noDataMetrics = activeMetrics.filter(m => !metricsWithData.includes(m));
              if (metricsWithData.length === 0) {
                return (
                  <div className="h-[220px] flex items-center justify-center">
                    <span className="font-editorial-mono text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
                      SEM DADOS PARA AS MÉTRICAS SELECIONADAS
                    </span>
                  </div>
                );
              }
              return (
                <>
                  <div className="h-[220px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 40, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={CARD_BORDER} vertical={false} />
                        <XAxis dataKey="date"
                          tick={{ fill: MUTED, fontSize: 9, fontFamily: "JetBrains Mono" }}
                          tickLine={false} axisLine={{ stroke: CARD_BORDER }} padding={{ right: 16 }} />
                        {metricsWithData.map((key, idx) => (
                          <YAxis key={key} yAxisId={key}
                            orientation={idx === 0 ? "left" : "right"}
                            hide={idx > 0} domain={["auto", "auto"]}
                            tick={{ fill: MUTED, fontSize: 9, fontFamily: "JetBrains Mono" }}
                            tickLine={false} axisLine={false} width={32} />
                        ))}
                        <Tooltip
                          contentStyle={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, fontSize: 11, fontFamily: "JetBrains Mono" }}
                          labelStyle={{ color: MUTED }}
                          cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: "4 3" }}
                          formatter={(value: number, name: string) => {
                            const cfg = METRIC_CONFIG[name as MetricKey];
                            return [`${value?.toFixed(1)} ${cfg?.unit ?? ""}`, cfg?.label ?? name];
                          }}
                        />
                        {metricsWithData.map(key => (
                          <Line key={key} yAxisId={key} type="monotone" dataKey={key}
                            stroke={METRIC_CONFIG[key].color} strokeWidth={2}
                            dot={{ fill: METRIC_CONFIG[key].color, strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls isAnimationActive={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {noDataMetrics.length > 0 && (
                    <p className="font-editorial-mono text-[10px] uppercase tracking-wider text-center mt-3" style={{ color: MUTED }}>
                      Sem dados para: {noDataMetrics.map(m => METRIC_CONFIG[m].label).join(", ")}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* ── 2. Performance vs Elite ──────────────────────────────────── */}
        <div>
          <SectionHead n="02">PERFORMANCE VS ELITE</SectionHead>
          <div className="rounded-xl border p-6" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 flex justify-center">
                <PhysicalRadar athleteValues={radarValues} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 font-editorial-mono text-[10px] uppercase tracking-wider">
                  <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                  <span style={{ color: MUTED }}>Benchmark Elite</span>
                </div>
                <div className="flex items-center gap-2 font-editorial-mono text-[10px] uppercase tracking-wider">
                  <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke={GREEN} strokeWidth="2" /></svg>
                  <span style={{ color: MUTED }}>Atleta</span>
                </div>
                <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: CARD_BORDER }}>
                  {RADAR_AXES.map((axis, i) => (
                    <div key={axis.key} className="flex items-center gap-3 font-editorial-mono text-[11px]">
                      <span className="w-[108px]" style={{ color: MUTED }}>{axis.label}</span>
                      <div className="flex-1 h-[1px]" style={{ background: CARD_BORDER }} />
                      <span style={{ color: radarValues[i] >= 75 ? GREEN : radarValues[i] >= 40 ? TEXT : ACCENT }}>
                        {radarValues[i].toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Medidas Corporais ─────────────────────────────────────── */}
        <div>
          <SectionHead n="03" action={addButton}>MEDIDAS CORPORAIS</SectionHead>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MetricCard label="Altura"      value={playerHeight ?? null} unit="cm"  rangeKey="height"  decimals={0} />
            <MetricCard label="Peso"        value={resolvedWeight}       unit="kg"  rangeKey="weight"              />
            <MetricCard label="Envergadura" value={playerWingspan ?? null} unit="cm" rangeKey="wingspan" decimals={0} />
          </div>
        </div>

        {/* ── 4. Composição Corporal ───────────────────────────────────── */}
        <div>
          <SectionHead n="04">COMPOSIÇÃO CORPORAL</SectionHead>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MetricCard label="% Gordura"        value={resolvedBodyFat} unit="%"  rangeKey="body_fat_percentage" />
            <MetricCard label="% Massa Muscular"  value={muscleMassPct}  unit="%"  rangeKey="muscle_mass_pct"     />
            <MetricCard label="IMC"               value={bmi}            unit=""   rangeKey="bmi"                  />
          </div>
        </div>

        {/* ── 5. Performance ───────────────────────────────────────────── */}
        <div>
          <SectionHead n="05">PERFORMANCE</SectionHead>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MetricCard label="Vel. Máx"  value={resolvedMaxSpeed} unit="km/h"      rangeKey="max_speed"  />
            <MetricCard label="Sprint 30m" value={resolvedSprint}   unit="s"         rangeKey="sprint_30m" decimals={2} />
            <MetricCard label="VO2 Máx"   value={resolvedVo2}      unit="ml/kg/min" rangeKey="vo2_max"    />
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        {latest && (
          <div className="border-t pt-4" style={{ borderColor: CARD_BORDER }}>
            <span className="font-editorial-mono text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              ÚLTIMA AVALIAÇÃO: {format(parseDateSafe(latest.recorded_at), "dd/MM/yyyy")}
            </span>
          </div>
        )}
      </div>

      {/* ── Add Physical Data Dialog ─────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
          <DialogHeader className="px-5 py-4" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
            <DialogTitle className="font-display font-bold text-[13px] uppercase tracking-[0.2em]" style={{ color: TEXT }}>
              NOVA AVALIAÇÃO FÍSICA
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-5 space-y-4">
            <div>
              <FieldLabel>Data da Avaliação</FieldLabel>
              <FieldInput type="date" value={form.recorded_at} onChange={v => setForm(f => ({ ...f, recorded_at: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><FieldLabel>Peso (kg)</FieldLabel><FieldInput value={form.weight} onChange={v => setForm(f => ({ ...f, weight: v }))} placeholder="75.5" step="0.1" /></div>
              <div><FieldLabel>% Gordura</FieldLabel><FieldInput value={form.body_fat_percentage} onChange={v => setForm(f => ({ ...f, body_fat_percentage: v }))} placeholder="12.5" step="0.1" /></div>
              <div><FieldLabel>Massa Muscular (kg)</FieldLabel><FieldInput value={form.muscle_mass} onChange={v => setForm(f => ({ ...f, muscle_mass: v }))} placeholder="38.0" step="0.1" /></div>
              <div><FieldLabel>Vel. Máx (km/h)</FieldLabel><FieldInput value={form.max_speed} onChange={v => setForm(f => ({ ...f, max_speed: v }))} placeholder="32.5" step="0.1" /></div>
              <div><FieldLabel>Sprint 30m (s)</FieldLabel><FieldInput value={form.sprint_30m} onChange={v => setForm(f => ({ ...f, sprint_30m: v }))} placeholder="4.25" step="0.01" /></div>
              <div><FieldLabel>VO2 Máx (ml/kg/min)</FieldLabel><FieldInput value={form.vo2_max} onChange={v => setForm(f => ({ ...f, vo2_max: v }))} placeholder="55.0" step="0.1" /></div>
            </div>
            <div>
              <FieldLabel>Observações</FieldLabel>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas sobre a avaliação..." rows={2}
                className="w-full font-editorial-mono text-[12px] px-3 py-2.5 rounded-lg outline-none resize-none transition-colors"
                style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
                onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)} />
            </div>
          </div>

          <div className="px-5 py-4 flex gap-3" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
            <button onClick={() => setDialogOpen(false)} disabled={submitting}
              className="flex-1 font-editorial-mono text-[10px] uppercase tracking-[0.18em] py-2.5 border rounded-lg transition-colors"
              style={{ borderColor: CARD_BORDER, color: MUTED }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = CARD_BORDER)}>
              CANCELAR
            </button>
            <button onClick={handleSave} disabled={submitting}
              className="flex-[2] font-editorial-mono text-[10px] uppercase tracking-[0.18em] py-2.5 rounded-lg transition-opacity"
              style={{ background: ACCENT, color: "#fff", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "SALVANDO..." : "SALVAR AVALIAÇÃO"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
