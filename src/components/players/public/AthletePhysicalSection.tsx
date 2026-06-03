import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AthletePhysicalSectionProps {
  height: number | null; weight: number | null; wingspan: number | null;
  body_fat_percentage: number | null; muscle_mass: number | null;
  max_speed: number | null; sprint_30m: number | null; vo2_max: number | null;
}

interface MetricDef {
  label: string;
  value: number | null;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  refText: string;
  invert?: boolean;
}

// ── .fcard — physical metric card ──
function PhysicalCard({
  label, value, unit, refMin, refMax, refText, invert = false, index,
}: MetricDef & { index: number }) {
  const hasValue = value !== null && value !== undefined;

  // Gauge percentage + "Na faixa" — mirrors Vanilla JS calculation exactly
  let pct = 50;
  let ok = false;
  if (hasValue && refMin !== null && refMax !== null) {
    const lo = refMin - (refMax - refMin) * 0.4;
    const hi = refMax + (refMax - refMin) * 0.4;
    pct = Math.max(4, Math.min(100, Math.round(((value as number) - lo) / (hi - lo) * 100)));
    ok = invert
      ? (value as number) <= refMax
      : (value as number) >= refMin && (value as number) <= refMax;
  }

  const hasGauge = hasValue && refMin !== null && refMax !== null;
  // Portuguese decimal format: 10.5 → "10,5"
  const valStr = hasValue ? String(value).replace(".", ",") : null;

  return (
    <div
      className={cn(
        "fcard border border-white/[0.075] rounded-[8px] bg-[#141318] p-[16px] md:p-[24px]",
        "transition-all duration-[250ms] cursor-default",
        !hasValue && "opacity-[0.55]"
      )}
      onMouseEnter={(e) => {
        if (!hasValue) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(255,255,255,0.15)";
        el.style.background = "#191822";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "";
        el.style.background = "";
      }}
    >
      {/* .ftop — label + "Na faixa" badge */}
      <div className="ftop flex justify-between items-start gap-[10px] mb-[14px] md:mb-[22px]">
        <span className="flab font-editorial-mono text-[11px] tracking-[0.14em] uppercase text-[#62616a] leading-[1.35]">
          {label}
        </span>
        {ok && (
          <span className="fok font-editorial-mono text-[10px] tracking-[0.1em] uppercase text-[#ec4525] border border-[#ec4525]/40 rounded-full px-[10px] py-[4px] whitespace-nowrap flex-none">
            Na faixa
          </span>
        )}
      </div>

      {/* .fval — value with unit, or "—" when empty */}
      {hasValue ? (
        <div className="fval font-display font-semibold text-[28px] md:text-[42px] tracking-[-0.025em] leading-none tabular-nums text-[#ededee]">
          {valStr}
          <span className="u font-editorial-mono text-[15px] text-[#9c9ba3] font-medium ml-[5px]">
            {unit}
          </span>
        </div>
      ) : (
        <div className="fval font-editorial-mono text-[22px] text-[#62616a]">—</div>
      )}

      {/* .fgauge — animated gauge + ref label */}
      {hasGauge && (
        <div className="fgauge mt-[18px]">
          <div
            className="fgauge-track h-[6px] rounded-full overflow-hidden relative"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <motion.div
              className="fgauge-fill absolute top-0 bottom-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #ec4525, #ff5a39)" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="fgauge-ref font-editorial-mono text-[11px] text-[#62616a] mt-[9px] tracking-[0.02em]">
            Ref. {refText}
          </div>
        </div>
      )}

      {/* No gauge but has ref text (e.g. wingspan with no range) */}
      {!hasGauge && refText && refText !== "—" && (
        <div className="fgauge-ref font-editorial-mono text-[11px] text-[#62616a] mt-[9px] tracking-[0.02em]">
          {refText}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
export function AthletePhysicalSection({
  height, weight, wingspan, body_fat_percentage, muscle_mass, max_speed, sprint_30m, vo2_max,
}: AthletePhysicalSectionProps) {
  if (!height && !weight && !wingspan && !body_fat_percentage && !muscle_mass && !max_speed && !sprint_30m && !vo2_max) return null;

  // Metric definitions — ref ranges mirror common elite reference bands
  const metrics: MetricDef[] = [
    { label: "Altura",      value: height,              unit: "cm",    refMin: 175, refMax: 185, refText: "175–185 cm"  },
    { label: "Peso",        value: weight,              unit: "kg",    refMin: 70,  refMax: 80,  refText: "70–80 kg"    },
    { label: "Envergadura", value: wingspan,            unit: "cm",    refMin: null,refMax: null, refText: "—"           },
    { label: "% Gordura",   value: body_fat_percentage, unit: "%",     refMin: 8,   refMax: 12,  refText: "8–12 %"      },
    { label: "Massa Musc.", value: muscle_mass,         unit: "kg",    refMin: 50,  refMax: 65,  refText: "50–65 kg"    },
    { label: "Vel. Máxima", value: max_speed,           unit: "km/h",  refMin: 30,  refMax: 35,  refText: "30+ km/h"    },
    { label: "Sprint 30m",  value: sprint_30m,          unit: "s",     refMin: 3.8, refMax: 4.2, refText: "< 4.2 s",  invert: true },
    { label: "VO₂ Máximo",  value: vo2_max,             unit: "ml/kg", refMin: 55,  refMax: 65,  refText: "55+ ml/kg"  },
  ];

  return (
    <section className="py-12 md:py-20 relative border-b border-zinc-800/50" id="fisico">
      {/* .sec-head */}
      <div className="flex items-end justify-between gap-6 mb-8 md:mb-11 flex-wrap">
        <div>
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">06</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Dados Físicos
          </div>
          <h2
            className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
            style={{ fontSize: "clamp(24px,3.4vw,44px)" }}
          >
            Avaliação corporal
          </h2>
        </div>
        <p className="hidden md:block font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          Valor atual frente à faixa ideal de referência para a posição.
        </p>
      </div>

      {/* .fisico-grid — 2 cols mobile, 4 cols desktop */}
      <div className="fisico-grid grid grid-cols-2 md:grid-cols-4 gap-[12px] md:gap-[16px]">
        {metrics.map((m, i) => (
          <PhysicalCard key={m.label} {...m} index={i} />
        ))}
      </div>
    </section>
  );
}
