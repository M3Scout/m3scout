import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";
const GREEN       = "#22c55e";
const RED         = "#ec4525";

// ── Ranges (same as PhysicalTab) ──────────────────────────────────────────────
const RANGES: Record<string, {
  min: number; idealLow: number; idealHigh: number; max: number; inverse?: boolean;
  refLabel: string;
}> = {
  height:              { min: 160, idealLow: 170, idealHigh: 190, max: 200, refLabel: "170-190 cm" },
  weight:              { min: 55,  idealLow: 65,  idealHigh: 85,  max: 100, refLabel: "65-85 kg"   },
  wingspan:            { min: 160, idealLow: 175, idealHigh: 200, max: 215, refLabel: "175-200 cm" },
  body_fat_percentage: { min: 5,   idealLow: 8,   idealHigh: 15,  max: 25,  inverse: true, refLabel: "8-15 %"  },
  muscle_mass:         { min: 40,  idealLow: 44,  idealHigh: 55,  max: 60,  refLabel: "44-55 %"   },
  max_speed:           { min: 25,  idealLow: 30,  idealHigh: 35,  max: 40,  refLabel: "30+ km/h"   },
  sprint_30m:          { min: 3.5, idealLow: 3.8, idealHigh: 4.3, max: 5.0, inverse: true, refLabel: "< 4.3 s"  },
  vo2_max:             { min: 40,  idealLow: 50,  idealHigh: 65,  max: 75,  refLabel: "55+ ml/kg"  },
};

type Status = "ideal" | "low" | "high" | "none";

function getStatus(value: number | null, key: string): { pct: number; status: Status } {
  if (value == null || !Number.isFinite(value)) return { pct: 0, status: "none" };
  const r = RANGES[key];
  if (!r) return { pct: 50, status: "ideal" };
  const clamped = Math.max(r.min, Math.min(r.max, value));
  const pct = ((clamped - r.min) / (r.max - r.min)) * 100;
  let status: Status;
  if (value < r.idealLow)      status = "low";
  else if (value <= r.idealHigh) status = "ideal";
  else                           status = "high";
  return { pct, status };
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  if (status === "none") return null;
  const cfg = {
    ideal: { label: "IDEAL",  color: GREEN },
    low:   { label: "ABAIXO", color: RED   },
    high:  { label: "ACIMA",  color: RED   },
  }[status];
  return (
    <span
      className="font-editorial-mono text-[9px] tracking-wider border px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ color: cfg.color, borderColor: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  rangeKey,
  decimals = 1,
}: {
  label: string;
  value: number | null;
  unit: string;
  rangeKey: string;
  decimals?: number;
}) {
  const hasValue   = value != null && Number.isFinite(value);
  const { pct, status } = getStatus(value, rangeKey);
  const refLabel   = RANGES[rangeKey]?.refLabel ?? "";

  return (
    <div
      className="rounded-xl border p-4 transition-colors duration-[250ms] hover:bg-zinc-800/30"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* Label + badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] leading-tight"
          style={{ color: MUTED }}
        >
          {label}
        </span>
        {hasValue && <StatusBadge status={status} />}
      </div>

      {hasValue ? (
        <>
          {/* Value */}
          <div
            className="font-display font-bold leading-none tabular-nums"
            style={{ fontSize: 26, color: TEXT }}
          >
            {value!.toFixed(decimals)}
            <span
              className="font-editorial-mono ml-1"
              style={{ fontSize: 12, color: MUTED }}
            >
              {unit}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="mt-3 h-[2px] rounded-full"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: GREEN }}
            />
          </div>

          {/* Ref label */}
          {refLabel && (
            <p
              className="font-editorial-mono text-[9.5px] mt-1.5"
              style={{ color: MUTED }}
            >
              Ref. {refLabel}
            </p>
          )}
        </>
      ) : (
        <div
          className="font-editorial-mono text-[10px] uppercase tracking-wider mt-2"
          style={{ color: MUTED }}
        >
          —
        </div>
      )}
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
interface Metrics {
  height: number | null;
  wingspan: number | null;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  max_speed: number | null;
  sprint_30m: number | null;
  vo2_max: number | null;
}

interface AthleteBodyMetricsCardProps {
  athleteId: string;
}

export function AthleteBodyMetricsCard({ athleteId }: AthleteBodyMetricsCardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        // 1. Base data from players
        const { data: player } = await supabase
          .from("players")
          .select("height, wingspan, weight, body_fat_percentage, muscle_mass, max_speed, sprint_30m, vo2_max")
          .eq("id", athleteId)
          .limit(1);

        // 2. Latest physical history record (overrides player data)
        const { data: hist } = await supabase
          .from("player_physical_history")
          .select("weight, body_fat_percentage, muscle_mass, max_speed, sprint_30m, vo2_max")
          .eq("player_id", athleteId)
          .order("recorded_at", { ascending: false })
          .limit(1);

        const p = player?.[0] ?? null;
        const h = hist?.[0] ?? null;

        setMetrics({
          height:              p?.height              ?? null,
          wingspan:            p?.wingspan            ?? null,
          weight:              h?.weight              ?? p?.weight              ?? null,
          body_fat_percentage: h?.body_fat_percentage ?? p?.body_fat_percentage ?? null,
          muscle_mass:         h?.muscle_mass         ?? p?.muscle_mass         ?? null,
          max_speed:           h?.max_speed           ?? p?.max_speed           ?? null,
          sprint_30m:          h?.sprint_30m          ?? p?.sprint_30m          ?? null,
          vo2_max:             h?.vo2_max             ?? p?.vo2_max             ?? null,
        });
      } catch (e) {
        console.error("[AthleteBodyMetricsCard]", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [athleteId]);

  // Muscle mass % — same formula as PhysicalTab: (1 - bf/100) * 50
  const muscleMassPct =
    metrics?.weight != null && metrics?.body_fat_percentage != null
      ? (1 - metrics.body_fat_percentage / 100) * 50
      : null;

  if (loading) {
    return (
      <div
        className="rounded-xl border flex items-center justify-center min-h-[200px]"
        style={{ background: CARD_BG, borderColor: CARD_BORDER }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: CARD_BORDER }}
      >
        <span
          className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
          style={{ color: MUTED }}
        >
          // Medidas Corporais
        </span>
        <span className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
          Valor atual frente à faixa ideal
        </span>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Row 1 */}
        <MetricCard label="Altura"     value={metrics?.height              ?? null} unit="cm"       rangeKey="height"              decimals={0} />
        <MetricCard label="Peso"       value={metrics?.weight              ?? null} unit="kg"       rangeKey="weight"                           />
        <MetricCard label="Envergadura" value={metrics?.wingspan           ?? null} unit="cm"       rangeKey="wingspan"             decimals={0} />
        <MetricCard label="% Gordura"  value={metrics?.body_fat_percentage ?? null} unit="%"        rangeKey="body_fat_percentage"              />

        {/* Row 2 */}
        <MetricCard label="% Massa Musc." value={muscleMassPct}                unit="%"        rangeKey="muscle_mass"                      />
        <MetricCard label="Vel. Máxima" value={metrics?.max_speed          ?? null} unit="km/h"     rangeKey="max_speed"                        />
        <MetricCard label="Sprint 30m"  value={metrics?.sprint_30m         ?? null} unit="s"        rangeKey="sprint_30m"          decimals={2}  />
        <MetricCard label="VO₂ Máximo"  value={metrics?.vo2_max            ?? null} unit="ml/kg"    rangeKey="vo2_max"                          />
      </div>
    </div>
  );
}
