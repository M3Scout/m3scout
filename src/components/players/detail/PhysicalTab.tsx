import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

// ─── Design tokens ───────────────────────────────────────────────────────────

const ACCENT  = "#E5173F";
const GREEN   = "#22C55E";
const AMBER   = "#F59E0B";
const BORDER  = "#1C1C1C";
const MUTED   = "#6B6560";
const TEXT    = "#F2EDE4";
const BG      = "#0A0A0A";

// ─── Metric config for evolution chart ───────────────────────────────────────

const METRIC_CONFIG = {
  weight:              { label: "Peso",          unit: "kg",        color: "hsl(217,91%,60%)" },
  body_fat_percentage: { label: "% Gordura",     unit: "%",         color: "hsl(0,84%,60%)"   },
  muscle_mass:         { label: "Massa Muscular", unit: "kg",       color: "hsl(142,76%,36%)" },
  max_speed:           { label: "Vel. Máx",      unit: "km/h",      color: "hsl(45,93%,47%)"  },
  sprint_30m:          { label: "Sprint 30m",    unit: "s",         color: "hsl(280,65%,60%)" },
  vo2_max:             { label: "VO2 Máx",       unit: "ml/kg/min", color: "hsl(180,70%,45%)" },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

// ─── Ranges for progress bars and status badges ───────────────────────────────

const METRIC_RANGES: Record<string, {
  min: number; idealLow: number; idealHigh: number; max: number; inverse?: boolean;
}> = {
  height:              { min: 160, idealLow: 170, idealHigh: 190, max: 200 },
  weight:              { min: 55,  idealLow: 65,  idealHigh: 85,  max: 100 },
  wingspan:            { min: 160, idealLow: 175, idealHigh: 200, max: 215 },
  body_fat_percentage: { min: 5,   idealLow: 8,   idealHigh: 15,  max: 25,  inverse: true },
  muscle_mass_pct:     { min: 40,  idealLow: 44,  idealHigh: 55,  max: 60 },
  bmi:                 { min: 18,  idealLow: 20,  idealHigh: 24,  max: 28 },
  max_speed:           { min: 25,  idealLow: 30,  idealHigh: 35,  max: 40 },
  sprint_30m:          { min: 3.5, idealLow: 3.8, idealHigh: 4.3, max: 5.0, inverse: true },
  vo2_max:             { min: 40,  idealLow: 50,  idealHigh: 65,  max: 75 },
};

// ─── Radar axes (5-point pentagon) ───────────────────────────────────────────

const RADAR_AXES = [
  { key: "max_speed",           label: "Velocidade",    elite: 36,  inverse: false, rangeMax: 40  },
  { key: "sprint_30m",          label: "Sprint",        elite: 3.9, inverse: true,  rangeMax: 5.0 },
  { key: "vo2_max",             label: "VO2 Máx",       elite: 65,  inverse: false, rangeMax: 75  },
  { key: "body_fat_percentage", label: "% Gordura",     elite: 10,  inverse: true,  rangeMax: 25  },
  { key: "muscle_mass_pct",     label: "% Massa Musc.", elite: 50,  inverse: false, rangeMax: 60  },
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
  const norm = (value / axis.elite) * 100;
  return Math.max(0, Math.min(100, norm));
};

const calcBMI = (weight?: number | null, height?: number | null): number | null => {
  if (!weight || !height) return null;
  return weight / ((height / 100) ** 2);
};

const calcMuscleMassPct = (weight?: number | null, bf?: number | null): number | null => {
  if (!weight || bf == null) return null;
  const leanMass = weight * (1 - bf / 100);
  return (leanMass * 0.5 / weight) * 100;
};

const getMetricStatus = (
  value: number | null,
  key: string,
): { pct: number; status: "low" | "ideal" | "high" | "none" } => {
  if (value == null || !Number.isFinite(value)) return { pct: 0, status: "none" };
  const r = METRIC_RANGES[key];
  if (!r) return { pct: 50, status: "ideal" };
  const clamped = Math.max(r.min, Math.min(r.max, value));
  const pct = ((clamped - r.min) / (r.max - r.min)) * 100;
  let status: "low" | "ideal" | "high";
  if (r.inverse) {
    if (value < r.idealLow) status = "low";
    else if (value <= r.idealHigh) status = "ideal";
    else status = "high";
  } else {
    if (value < r.idealLow) status = "low";
    else if (value <= r.idealHigh) status = "ideal";
    else status = "high";
  }
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
  const elitePts  = RADAR_AXES.map((_, i) => axisPoint(i, 1.0));
  const athletePts = athleteValues.map((v, i) => axisPoint(i, v / 100));
  const LABEL_FACTOR = 1.22;

  return (
    <svg viewBox="0 0 240 230" className="w-full max-w-[260px] mx-auto">
      {/* Grid rings */}
      {rings.map(r => (
        <polygon
          key={r}
          points={pointsStr(RADAR_AXES.map((_, i) => axisPoint(i, r)))}
          fill="none"
          stroke={BORDER}
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const outer = axisPoint(i, 1.0);
        return (
          <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke={BORDER} strokeWidth="1" />
        );
      })}
      {/* Elite polygon — red dashed */}
      <polygon
        points={pointsStr(elitePts)}
        fill={`${ACCENT}14`}
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Athlete polygon — green solid */}
      <polygon
        points={pointsStr(athletePts)}
        fill={`${GREEN}28`}
        stroke={GREEN}
        strokeWidth="2"
      />
      {/* Axis labels */}
      {RADAR_AXES.map((axis, i) => {
        const pt = axisPoint(i, LABEL_FACTOR);
        return (
          <text
            key={i}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8.5"
            fill={MUTED}
            fontFamily="JetBrains Mono, monospace"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Metric card (M3 style) ───────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string;
  rangeKey: string;
  decimals?: number;
}

function StatusBadge({ status }: { status: "low" | "ideal" | "high" }) {
  const cfg = {
    low:   { label: "BAIXO", color: AMBER },
    ideal: { label: "IDEAL", color: GREEN },
    high:  { label: "ALTO",  color: ACCENT },
  }[status];
  return (
    <span
      className="font-jetbrains text-[9px] tracking-wider border px-1.5 py-0.5"
      style={{ color: cfg.color, borderColor: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function MetricCard({ label, value, unit, rangeKey, decimals = 1 }: MetricCardProps) {
  const hasValue = value != null && Number.isFinite(value);
  const { pct, status } = getMetricStatus(value, rangeKey);
  const barColor = status === "ideal" ? GREEN : status === "low" ? AMBER : ACCENT;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="font-barlow text-[10px] uppercase tracking-widest leading-tight"
          style={{ color: MUTED }}
        >
          {label}
        </span>
        {hasValue && status !== "none" && <StatusBadge status={status} />}
      </div>

      {hasValue ? (
        <>
          <div
            className="font-jetbrains text-[26px] leading-none tabular-nums"
            style={{ color: TEXT }}
          >
            {value!.toFixed(decimals)}
            <span className="text-[12px] ml-1" style={{ color: MUTED }}>{unit}</span>
          </div>
          <div className="mt-3 h-[2px]" style={{ background: BORDER }}>
            <div
              className="h-full"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
            />
          </div>
        </>
      ) : (
        <div
          className="font-jetbrains text-[10px] uppercase tracking-wider mt-2"
          style={{ color: MUTED }}
        >
          DADO NÃO COLETADO
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-[14px]" style={{ background: ACCENT }} />
      <h3
        className="font-barlow text-[13px] uppercase tracking-widest"
        style={{ color: TEXT }}
      >
        {title}
      </h3>
    </div>
  );
}

// ─── Metric grid wrapper (1px separators via gap-px technique) ────────────────

function MetricGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  const colCls = cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div
      className={`grid ${colCls} gap-px border`}
      style={{ background: BORDER, borderColor: BORDER }}
    >
      {children}
    </div>
  );
}

function GridCell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: BG }}>{children}</div>;
}

// ─── Physical history record type ─────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhysicalTabProps {
  playerId: string;
  playerPosition?: string | null;
  playerHeight?: number | null;
  playerWingspan?: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhysicalTab({
  playerId,
  playerHeight,
  playerWingspan,
}: PhysicalTabProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "weight",
    "body_fat_percentage",
  ]);

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

  const bmi = calcBMI(latest?.weight, playerHeight);
  const muscleMassPct = calcMuscleMassPct(latest?.weight, latest?.body_fat_percentage);

  const radarValues = RADAR_AXES.map(axis => {
    let value: number | null = null;
    if (axis.key === "max_speed")           value = latest?.max_speed ?? null;
    else if (axis.key === "sprint_30m")     value = latest?.sprint_30m ?? null;
    else if (axis.key === "vo2_max")        value = latest?.vo2_max ?? null;
    else if (axis.key === "body_fat_percentage") value = latest?.body_fat_percentage ?? null;
    else if (axis.key === "muscle_mass_pct") value = muscleMassPct;
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

  return (
    <div className="space-y-8 py-6">

      {/* ── 1. Evolução Física ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Evolução Física" />
        <div className="border p-4" style={{ borderColor: BORDER }}>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(Object.entries(METRIC_CONFIG) as [MetricKey, typeof METRIC_CONFIG[MetricKey]][]).map(
              ([key, cfg]) => {
                const isActive = activeMetrics.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleMetric(key)}
                    className="font-jetbrains text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors"
                    style={{
                      borderColor: isActive ? ACCENT : BORDER,
                      color: isActive ? ACCENT : MUTED,
                      background: isActive ? `${ACCENT}12` : "transparent",
                    }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}
                  </button>
                );
              }
            )}
          </div>

          {/* Chart */}
          {isLoading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="font-jetbrains text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
                CARREGANDO...
              </span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="font-jetbrains text-[11px] uppercase tracking-wider" style={{ color: MUTED }}>
                SEM AVALIAÇÕES REGISTRADAS
              </span>
            </div>
          ) : (
            <div className="h-[220px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={BORDER} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: MUTED, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: BORDER }}
                  />
                  <YAxis
                    tick={{ fill: MUTED, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    labelStyle={{ color: MUTED }}
                    formatter={(value: number, name: string) => {
                      const cfg = METRIC_CONFIG[name as MetricKey];
                      return [`${value?.toFixed(1)} ${cfg?.unit ?? ""}`, cfg?.label ?? name];
                    }}
                  />
                  {activeMetrics.map(key => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={METRIC_CONFIG[key].color}
                      strokeWidth={2}
                      dot={{ fill: METRIC_CONFIG[key].color, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. Performance vs Elite ────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Performance vs Elite" />
        <div className="border p-6" style={{ borderColor: BORDER }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 flex justify-center">
              <PhysicalRadar athleteValues={radarValues} />
            </div>

            {/* Legend + values */}
            <div className="flex flex-col gap-3">
              {/* Legend */}
              <div className="flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-wider">
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
                <span style={{ color: MUTED }}>Benchmark Elite</span>
              </div>
              <div className="flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-wider">
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={GREEN} strokeWidth="2" />
                </svg>
                <span style={{ color: MUTED }}>Atleta</span>
              </div>

              {/* Per-axis values */}
              <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: BORDER }}>
                {RADAR_AXES.map((axis, i) => (
                  <div key={axis.key} className="flex items-center gap-3 font-jetbrains text-[11px]">
                    <span className="w-[108px]" style={{ color: MUTED }}>{axis.label}</span>
                    <div className="flex-1 h-[1px]" style={{ background: BORDER }} />
                    <span style={{ color: radarValues[i] >= 75 ? GREEN : radarValues[i] >= 40 ? TEXT : ACCENT }}>
                      {radarValues[i].toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Medidas Corporais ───────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Medidas Corporais" />
        <MetricGrid>
          <GridCell>
            <MetricCard label="Altura" value={playerHeight ?? null} unit="cm" rangeKey="height" decimals={0} />
          </GridCell>
          <GridCell>
            <MetricCard label="Peso" value={latest?.weight ?? null} unit="kg" rangeKey="weight" />
          </GridCell>
          <GridCell>
            <MetricCard label="Envergadura" value={playerWingspan ?? null} unit="cm" rangeKey="wingspan" decimals={0} />
          </GridCell>
        </MetricGrid>
      </section>

      {/* ── 4. Composição Corporal ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Composição Corporal" />
        <MetricGrid>
          <GridCell>
            <MetricCard
              label="% Gordura"
              value={latest?.body_fat_percentage ?? null}
              unit="%"
              rangeKey="body_fat_percentage"
            />
          </GridCell>
          <GridCell>
            <MetricCard
              label="% Massa Muscular"
              value={muscleMassPct}
              unit="%"
              rangeKey="muscle_mass_pct"
            />
          </GridCell>
          <GridCell>
            <MetricCard label="IMC" value={bmi} unit="" rangeKey="bmi" />
          </GridCell>
        </MetricGrid>
      </section>

      {/* ── 5. Performance ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Performance" />
        <MetricGrid>
          <GridCell>
            <MetricCard
              label="Vel. Máx"
              value={latest?.max_speed ?? null}
              unit="km/h"
              rangeKey="max_speed"
            />
          </GridCell>
          <GridCell>
            <MetricCard
              label="Sprint 30m"
              value={latest?.sprint_30m ?? null}
              unit="s"
              rangeKey="sprint_30m"
              decimals={2}
            />
          </GridCell>
          <GridCell>
            <MetricCard
              label="VO2 Máx"
              value={latest?.vo2_max ?? null}
              unit="ml/kg/min"
              rangeKey="vo2_max"
            />
          </GridCell>
        </MetricGrid>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {latest && (
        <div className="border-t pt-4" style={{ borderColor: BORDER }}>
          <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
            ÚLTIMA AVALIAÇÃO: {format(parseDateSafe(latest.recorded_at), "dd/MM/yyyy")}
          </span>
        </div>
      )}
    </div>
  );
}
