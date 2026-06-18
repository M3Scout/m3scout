import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { MatchDerivedStats } from "@/hooks/usePlayerMatchStats";

// ── Design tokens ──────────────────────────────────────────────────────────────
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED       = "#62616a";
const TEXT        = "#ededee";
const GREEN       = "#22c55e";
const RED         = "#ec4525";
const BLUE        = "#3b82f6";

// ── Stat field mapped from MatchDerivedStats ───────────────────────────────────
type StatField = keyof MatchDerivedStats;

// ── Metric definition ─────────────────────────────────────────────────────────
interface Metric {
  label:    string;
  low:      number;
  high:     number;
  extra?:   string;
  statKey?: StatField;
}

type PositionKey =
  | "Zagueiro"
  | "Lateral"
  | "Volante / Meia Central"
  | "Meia Ofensivo"
  | "Ponta / Extremo"
  | "Centroavante";

const POSITION_KEYS: PositionKey[] = [
  "Zagueiro",
  "Lateral",
  "Volante / Meia Central",
  "Meia Ofensivo",
  "Ponta / Extremo",
  "Centroavante",
];

// ── Benchmark data (Premier League 2023/24) ────────────────────────────────────
const BENCHMARKS: Record<PositionKey, Metric[]> = {
  "Zagueiro": [
    { label: "Passes Certos",          low: 65,  high: 85,  extra: ">90% acerto",  statKey: "passes_completed"    },
    { label: "Passes Longos Certos",   low: 4.0, high: 6.0,                        statKey: "long_passes_accurate" },
    { label: "Passes Progressivos",    low: 3.5, high: 5.0,                        statKey: "progressive_passes"  },
    { label: "Cortes",                 low: 4.0, high: 6.0,                        statKey: "clearances"          },
    { label: "Interceptações",         low: 1.5, high: 2.0,                        statKey: "interceptions"       },
    { label: "Recuperações de Bola",   low: 5.0, high: 7.0,                        statKey: "recoveries"          },
    { label: "Duelos Aéreos Ganhos",   low: 3.0, high: 5.0,                        statKey: "aerial_duels_won"    },
    { label: "Duelos no Chão Ganhos",  low: 3.0, high: 4.0,                        statKey: "ground_duels_won"    },
    { label: "Chutes Bloqueados",      low: 1.0, high: 1.5,                        statKey: "blocked_shots"       },
    { label: "Desarmes",               low: 1.0, high: 1.5,                        statKey: "tackles"             },
  ],
  "Lateral": [
    { label: "Passes Certos",          low: 45,  high: 65,                         statKey: "passes_completed"    },
    { label: "Passes Progressivos",    low: 5.0, high: 7.0,                        statKey: "progressive_passes"  },
    { label: "Passes Decisivos",       low: 1.0, high: 1.5,                        statKey: "key_passes"          },
    { label: "Cruzamentos Certos",     low: 1.0, high: 2.0,                        statKey: "crosses_success"     },
    { label: "Dribles Certos",         low: 1.0, high: 1.5,                        statKey: "dribbles_success"    },
    { label: "Desarmes",               low: 2.0, high: 3.0,                        statKey: "tackles"             },
    { label: "Interceptações",         low: 1.0, high: 1.5,                        statKey: "interceptions"       },
    { label: "Recuperações de Bola",   low: 5.0, high: 6.0,                        statKey: "recoveries"          },
    { label: "Duelos no Chão Ganhos",  low: 4.0, high: 6.0,                        statKey: "ground_duels_won"    },
    { label: "Duelos Aéreos Ganhos",   low: 1.0, high: 2.0,                        statKey: "aerial_duels_won"    },
  ],
  "Volante / Meia Central": [
    { label: "Passes Certos",          low: 60,  high: 90,                         statKey: "passes_completed"    },
    { label: "Passes Longos Certos",   low: 4.0, high: 7.0,                        statKey: "long_passes_accurate" },
    { label: "Passes Progressivos",    low: 6.0, high: 9.0,                        statKey: "progressive_passes"  },
    { label: "Passes Decisivos",       low: 1.0, high: 2.0,                        statKey: "key_passes"          },
    { label: "Chances Criadas",        low: 0.3, high: 0.5,                        statKey: "chances_created"     },
    { label: "Desarmes",               low: 2.5, high: 3.5,                        statKey: "tackles"             },
    { label: "Interceptações",         low: 1.5, high: 2.0,                        statKey: "interceptions"       },
    { label: "Recuperações de Bola",   low: 6.0, high: 8.5,                        statKey: "recoveries"          },
    { label: "Duelos no Chão Ganhos",  low: 5.0, high: 7.0,                        statKey: "ground_duels_won"    },
    { label: "Dribles Certos",         low: 1.0, high: 1.5,                        statKey: "dribbles_success"    },
  ],
  "Meia Ofensivo": [
    { label: "Passes Decisivos",       low: 2.5, high: 3.5,                        statKey: "key_passes"          },
    { label: "Chances Criadas",        low: 0.8, high: 1.2,                        statKey: "chances_created"     },
    { label: "Passes Progressivos",    low: 5.0, high: 7.0,                        statKey: "progressive_passes"  },
    { label: "Passes Certos",          low: 35,  high: 50,                         statKey: "passes_completed"    },
    { label: "Finalizações no Gol",    low: 0.8, high: 1.2,                        statKey: "shots_on_target"     },
    { label: "Dribles Certos",         low: 1.5, high: 2.5,                        statKey: "dribbles_success"    },
    { label: "Duelos no Chão Ganhos",  low: 4.0, high: 5.0,                        statKey: "ground_duels_won"    },
    { label: "Recuperações de Bola",   low: 3.0, high: 4.0,                        statKey: "recoveries"          },
  ],
  "Ponta / Extremo": [
    { label: "Dribles Certos",         low: 2.5, high: 4.0,                        statKey: "dribbles_success"    },
    { label: "Finalizações no Gol",    low: 1.2, high: 1.8,                        statKey: "shots_on_target"     },
    { label: "Passes Decisivos",       low: 1.5, high: 2.5,                        statKey: "key_passes"          },
    { label: "Chances Criadas",        low: 0.6, high: 1.0,                        statKey: "chances_created"     },
    { label: "Cruzamentos Certos",     low: 1.5, high: 2.5,                        statKey: "crosses_success"     },
    { label: "Passes Certos",          low: 25,  high: 35,                         statKey: "passes_completed"    },
    { label: "Duelos no Chão Ganhos",  low: 4.0, high: 6.0,                        statKey: "ground_duels_won"    },
    { label: "Desarmes / Recuperações",low: 3.0, high: 4.0,                        statKey: "tackles"             },
  ],
  "Centroavante": [
    { label: "Finalizações no Gol",    low: 1.5, high: 2.5,                        statKey: "shots_on_target"     },
    { label: "Chances Criadas",        low: 0.2, high: 0.5,                        statKey: "chances_created"     },
    { label: "Passes Decisivos",       low: 0.8, high: 1.2,                        statKey: "key_passes"          },
    { label: "Passes Certos",          low: 15,  high: 25,                         statKey: "passes_completed"    },
    { label: "Duelos Aéreos Ganhos",   low: 2.5, high: 4.5,                        statKey: "aerial_duels_won"    },
    { label: "Duelos no Chão Ganhos",  low: 3.0, high: 4.0,                        statKey: "ground_duels_won"    },
    { label: "Cortes",                 low: 0.5, high: 1.0,                        statKey: "clearances"          },
  ],
};

// ── Position auto-detection ───────────────────────────────────────────────────
function detectPosition(pos: string): PositionKey {
  const p = pos.toLowerCase();
  if (p.includes("zagueiro") || p === "cb") return "Zagueiro";
  if (p.includes("lateral") || p === "lb" || p === "rb") return "Lateral";
  if (p.includes("volante") || (p.includes("meia") && (p.includes("defensivo") || p.includes("central")))) return "Volante / Meia Central";
  if (p.includes("meia") || p.includes("trequart") || p === "cam") return "Meia Ofensivo";
  if (p.includes("ponta") || p.includes("extremo") || p.includes("ala") || p === "lw" || p === "rw") return "Ponta / Extremo";
  if (p.includes("avante") || p.includes("atacante") || p === "cf" || p === "st") return "Centroavante";
  return "Zagueiro";
}

// ── Per-90 helper ─────────────────────────────────────────────────────────────
function per90(value: number, minutes: number): number | null {
  if (minutes <= 0 || value <= 0) return null;
  return (value / minutes) * 90;
}

// ── Status ────────────────────────────────────────────────────────────────────
type Status = "ideal" | "low" | "elite" | "none";

function getStatus(p90: number | null, low: number, high: number): Status {
  if (p90 === null) return "none";
  if (p90 < low)   return "low";
  if (p90 > high)  return "elite";
  return "ideal";
}

const STATUS_CFG: Record<Status, { label: string; color: string }> = {
  ideal: { label: "IDEAL",     color: GREEN },
  low:   { label: "ABAIXO",    color: RED   },
  elite: { label: "ELITE",     color: BLUE  },
  none:  { label: "SEM DADOS", color: MUTED },
};

// ── MetricCard ─────────────────────────────────────────────────────────────────
function MetricCard({
  metric,
  totals,
}: {
  metric: Metric;
  totals: MatchDerivedStats;
}) {
  const rawVal  = metric.statKey != null ? (totals[metric.statKey] as number ?? 0) : null;
  const p90Val  = rawVal !== null ? per90(rawVal, totals.minutes) : null;
  const status  = getStatus(p90Val, metric.low, metric.high);
  const cfg     = STATUS_CFG[status];
  const valColor = status === "low" ? RED : status === "elite" ? BLUE : status === "ideal" ? GREEN : MUTED;

  const fmtRange = metric.low >= 10
    ? `${metric.low} – ${metric.high}`
    : `${metric.low.toFixed(1)} – ${metric.high.toFixed(1)}`;

  return (
    <div
      className="rounded-xl border p-4 transition-colors duration-[250ms] hover:bg-zinc-800/30 flex flex-col gap-2"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* Label + badge */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] leading-tight"
          style={{ color: MUTED }}
        >
          {metric.label}
        </span>
        <span
          className="font-editorial-mono text-[9px] tracking-wider border px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ color: cfg.color, borderColor: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Athlete per-90 value — large */}
      <div
        className="font-display font-bold tabular-nums leading-none"
        style={{ fontSize: 28, color: valColor }}
      >
        {p90Val !== null ? p90Val.toFixed(1) : "—"}
      </div>

      {/* Reference range below */}
      <div>
        <p className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
          Ref. {fmtRange} por 90 min
        </p>
        {metric.extra && (
          <p className="font-editorial-mono text-[9px] mt-0.5" style={{ color: MUTED }}>
            {metric.extra}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface EliteInsightsProps {
  athletePosition: string;
  totals:          MatchDerivedStats | undefined;
  isLoading:       boolean;
}

export function EliteInsights({ athletePosition, totals, isLoading }: EliteInsightsProps) {
  const [selected, setSelected] = useState<PositionKey>(() =>
    detectPosition(athletePosition)
  );

  const metrics = BENCHMARKS[selected];

  const counted = !totals ? [] : metrics.filter(m => {
    if (!m.statKey) return false;
    const p90 = per90(totals[m.statKey] as number ?? 0, totals.minutes);
    return p90 !== null;
  });
  const ideal = counted.filter(m => getStatus(per90((totals![m.statKey!] as number) ?? 0, totals!.minutes), m.low, m.high) === "ideal").length;
  const elite = counted.filter(m => getStatus(per90((totals![m.statKey!] as number) ?? 0, totals!.minutes), m.low, m.high) === "elite").length;
  const low   = counted.filter(m => getStatus(per90((totals![m.statKey!] as number) ?? 0, totals!.minutes), m.low, m.high) === "low").length;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: CARD_BG, borderColor: CARD_BORDER }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 border-b flex-wrap"
        style={{ borderColor: CARD_BORDER }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="font-editorial-mono text-[11px] tracking-[0.22em] uppercase"
            style={{ color: MUTED }}
          >
            // Insights de Elite (Padrão Premier League)
          </span>

          {!isLoading && totals && counted.length > 0 && (
            <div className="flex items-center gap-1.5">
              {elite > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border"
                  style={{ color: BLUE, borderColor: BLUE }}>{elite} ELITE</span>
              )}
              {ideal > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border"
                  style={{ color: GREEN, borderColor: GREEN }}>{ideal} IDEAL</span>
              )}
              {low > 0 && (
                <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md border"
                  style={{ color: RED, borderColor: RED }}>{low} ABAIXO</span>
              )}
            </div>
          )}
        </div>

        {/* Position selector */}
        <select
          value={selected}
          onChange={e => setSelected(e.target.value as PositionKey)}
          className="font-editorial-mono text-[10px] rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          style={{ background: "#111112", border: `1px solid ${CARD_BORDER}`, color: TEXT }}
        >
          {POSITION_KEYS.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading || !totals ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {metrics.map(m => (
            <MetricCard key={m.label} metric={m} totals={totals} />
          ))}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t" style={{ borderColor: CARD_BORDER }}>
        <p className="font-editorial-mono text-[9.5px]" style={{ color: MUTED }}>
          Benchmarks baseados em dados da Premier League 2023/24 · Valores calculados por 90 min · Métricas sem dados requerem estatísticas registradas por partida
        </p>
      </div>
    </div>
  );
}
