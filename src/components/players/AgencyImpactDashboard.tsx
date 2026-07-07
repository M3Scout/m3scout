import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Goal, Footprints, Timer, Trophy, Target, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Design tokens (matches InsightsCard / dashboard premium look) ────────────
const BG      = "#0f0e13";
const BDR     = "rgba(255,255,255,0.07)";
const MUTED   = "#62616a";
const FG      = "#ededee";
const ACCENT  = "#ec4525";

const TIER_COLORS: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#a855f7",
};
const tierColor = (tier: string) => TIER_COLORS[tier] ?? "#62616a";

interface AgencyImpactStats {
  season_year: number | null;
  active_players: number;
  total_matches: number;
  total_minutes: number;
  total_goals: number;
  total_assists: number;
  total_goal_participations: number;
  total_penalties_won: number;
  pass_accuracy_pct: number | null;
  cross_accuracy_pct: number | null;
  aerial_duel_win_pct: number | null;
  ground_duel_win_pct: number | null;
  dribble_success_pct: number | null;
  shot_accuracy_pct: number | null;
  tier_breakdown: { tier: string; minutes: number }[];
  available_years: number[];
}

function BigNumberCard({
  icon: Icon, label, value, sub,
}: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BDR}` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,69,37,0.12)" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
      </div>
      <p className="text-3xl font-display font-bold tabular-nums" style={{ color: FG }}>{value}</p>
      {sub && <p className="text-[10px] font-mono mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

function EfficiencyBar({ label, pct }: { label: string; pct: number | null }) {
  const hasValue = pct != null;
  const color = !hasValue ? MUTED : pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : ACCENT;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        <span className="text-[13px] font-mono font-semibold" style={{ color: hasValue ? FG : MUTED }}>
          {hasValue ? `${pct.toFixed(1)}%` : "sem dado"}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${hasValue ? pct : 0}%`, background: color }} />
      </div>
    </div>
  );
}

const CURRENT_YEAR = new Date().getFullYear();

export function AgencyImpactDashboard() {
  // Defaults to the current season, per spec — never starts on "all time".
  const [selectedYear, setSelectedYear] = useState<number | "all">(CURRENT_YEAR);

  const { data, isLoading } = useQuery({
    queryKey: ["agency-impact-stats", selectedYear],
    queryFn: async () => {
      const p_season_year = selectedYear === "all" ? null : selectedYear;
      const { data, error } = await supabase.rpc("get_agency_impact_stats", { p_season_year });
      if (error) throw error;
      return data as unknown as AgencyImpactStats;
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentYear = CURRENT_YEAR;
  const availableYears = useMemo(() => data?.available_years ?? [], [data]);
  const activeYear = selectedYear;

  const totalMinutes = data?.total_minutes ?? 0;
  const tierBreakdown = data?.tier_breakdown ?? [];
  const tierTotal = tierBreakdown.reduce((sum, t) => sum + t.minutes, 0);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ background: BG, border: `1px solid ${BDR}` }}>
      {/* Header + period selector */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b" style={{ borderColor: BDR }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,69,37,0.12)" }}>
            <Trophy className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          </div>
          <p className="text-[12px] font-display font-semibold uppercase tracking-wide" style={{ color: FG }}>
            // Métricas Institucionais — Impacto da Agência
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {availableYears.map(year => {
            const isActive = activeYear === year && selectedYear !== "all";
            return (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider shrink-0 transition-colors"
                style={{
                  background: isActive ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? ACCENT : BDR}`,
                  color: isActive ? ACCENT : MUTED,
                }}
              >
                {year === currentYear ? `${year} (Atual)` : year}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedYear("all")}
            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider shrink-0 transition-colors"
            style={{
              background: selectedYear === "all" ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${selectedYear === "all" ? ACCENT : BDR}`,
              color: selectedYear === "all" ? ACCENT : MUTED,
            }}
          >
            Todo o Período
          </button>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[92px] rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        ) : !data || data.active_players === 0 ? (
          <div className="text-center py-8">
            <p className="font-mono text-[12px]" style={{ color: MUTED }}>
              Nenhuma estatística registrada para este período.
            </p>
          </div>
        ) : (
          <>
            {/* Volume KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <BigNumberCard icon={Footprints} label="Jogos" value={data.total_matches.toLocaleString("pt-BR")} sub={`${data.active_players} atletas`} />
              <BigNumberCard icon={Timer} label="Minutagem" value={`${totalMinutes.toLocaleString("pt-BR")} min`} />
              <BigNumberCard icon={Goal} label="Gols" value={data.total_goals.toLocaleString("pt-BR")} />
              <BigNumberCard icon={Target} label="Assistências" value={data.total_assists.toLocaleString("pt-BR")} />
              <BigNumberCard icon={ShieldCheck} label="Participações (G+A)" value={data.total_goal_participations.toLocaleString("pt-BR")} />
              <BigNumberCard icon={Trophy} label="Pênaltis Sofridos" value={data.total_penalties_won.toLocaleString("pt-BR")} />
            </div>

            {/* Efficiency metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-5 border-t" style={{ borderColor: BDR }}>
              <EfficiencyBar label="% Passes Certos" pct={data.pass_accuracy_pct} />
              <EfficiencyBar label="% Cruzamentos Certos" pct={data.cross_accuracy_pct} />
              <EfficiencyBar label="% Dribles Certos" pct={data.dribble_success_pct} />
              <EfficiencyBar label="% Duelos Aéreos Ganhos" pct={data.aerial_duel_win_pct} />
              <EfficiencyBar label="% Duelos no Chão Ganhos" pct={data.ground_duel_win_pct} />
              <EfficiencyBar label="% Finalização no Gol" pct={data.shot_accuracy_pct} />
            </div>

            {/* Tier breakdown (bonus) */}
            {tierBreakdown.length > 0 && (
              <div className="pt-5 mt-5 border-t" style={{ borderColor: BDR }}>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: MUTED }}>
                  Impacto por Tier de Competição
                </p>
                <div className="flex h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {tierBreakdown.map(t => (
                    <div key={t.tier} style={{ width: `${(t.minutes / tierTotal) * 100}%`, background: tierColor(t.tier) }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {tierBreakdown.map(t => (
                    <div key={t.tier} className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="w-2 h-2 rounded-full" style={{ background: tierColor(t.tier) }} />
                      <span style={{ color: FG }}>Tier {t.tier}</span>
                      <span style={{ color: MUTED }}>{((t.minutes / tierTotal) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
