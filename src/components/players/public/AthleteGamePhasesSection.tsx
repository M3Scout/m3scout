import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isGoalkeeper } from "@/lib/positionUtils";

interface SeasonStats {
  goals: number; assists: number; shots: number; shots_on_target: number;
  key_passes: number; chances_created: number; accurate_passes: number;
  successful_dribbles: number; steals: number; tackles: number; interceptions: number;
  recoveries: number; saves: number; clean_sheets: number; penalties_saved: number;
  aerial_duels_won: number; aerial_duels_total: number; fouls_committed: number;
  yellow_cards: number; red_cards: number; total_passes: number;
  long_passes_accurate: number; long_passes_total: number;
  penalties_won?: number;
}
interface AthleteGamePhasesSectionProps {
  currentSeasonStats: SeasonStats | null;
  latestAvailableSeasonYear: number | null;
  playerPosition?: string;
}

// ── .fase card — title + bar rows, all bars use the accent gradient ──
function PhasePanel({
  title,
  index,
  stats,
}: {
  title: string;
  index: number;
  stats: { label: string; value: number; max: number }[];
}) {
  return (
    <div
      className="fase group border border-white/[0.075] rounded-[8px] bg-[#141318] p-[26px] transition-colors duration-[250ms] cursor-default"
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
      onMouseLeave={(e)  => { (e.currentTarget as HTMLDivElement).style.borderColor = ""; }}
    >
      {/* .fase-head */}
      <div className="fase-head flex items-center justify-between mb-[24px]">
        <h3 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-[#ededee]">
          {title}
        </h3>
        <span className="fi font-editorial-mono text-[11px] text-[#62616a] tracking-[0.1em] uppercase">
          FASE {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* .bar-row list */}
      {stats.map((stat, si) => {
        const pct = Math.max(2, Math.min(100, Math.round((stat.value / stat.max) * 100)));
        return (
          <div key={stat.label} className={cn("bar-row", si < stats.length - 1 && "mb-[18px]")}>
            {/* .bar-top */}
            <div className="bar-top flex justify-between items-baseline mb-[8px]">
              <span className="bar-lab font-editorial-mono text-[12px] text-[#9c9ba3] tracking-[0.02em] truncate pr-[12px]">
                {stat.label}
              </span>
              <span className="bar-val font-editorial-mono text-[13px] font-semibold text-[#ededee] whitespace-nowrap flex-none">
                {stat.value}
                <span className="max font-normal text-[#62616a]"> / {stat.max}</span>
              </span>
            </div>
            {/* .bar-track → .bar-fill */}
            <div
              className="bar-track h-[7px] rounded-full overflow-hidden relative"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <motion.div
                className="bar-fill h-full rounded-full group-hover:[filter:brightness(1.12)]"
                style={{
                  background: "linear-gradient(90deg, #ec4525, #ff5a39)",
                  boxShadow: "0 0 12px rgba(236,69,37,0.30)",
                }}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: si * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
export function AthleteGamePhasesSection({
  currentSeasonStats,
  latestAvailableSeasonYear,
  playerPosition,
}: AthleteGamePhasesSectionProps) {
  const isGK = isGoalkeeper(playerPosition);
  const yearLabel = latestAvailableSeasonYear ? `· Temporada ${latestAvailableSeasonYear}` : "";

  return (
    <section className="py-12 md:py-20 relative border-b border-zinc-800/50" id="fases">
      {/* .sec-head */}
      <div className="flex items-end justify-between gap-6 mb-8 md:mb-11 flex-wrap">
        <div>
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">05</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Fases do Jogo {yearLabel}
          </div>
          <h2
            className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
            style={{ fontSize: "clamp(24px,3.4vw,44px)" }}
          >
            Desempenho por fase
          </h2>
        </div>
        <p className="hidden md:block font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          Volume registrado em cada fase, normalizado por referência.
        </p>
      </div>

      {/* .fases-grid — 2 columns (matching Vanilla grid-template-columns:1fr 1fr) */}
      {currentSeasonStats ? (
        <div className="fases-grid grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
          {isGK ? (
            <>
              <PhasePanel title="Defesas" index={0} stats={[
                { label: "Defesas",              value: currentSeasonStats.saves,           max: 50 },
                { label: "Clean Sheets",         value: currentSeasonStats.clean_sheets,    max: 15 },
                { label: "Pênaltis Defendidos",  value: currentSeasonStats.penalties_saved, max: 5  },
              ]} />
              <PhasePanel title="Jogo Aéreo" index={1} stats={[
                { label: "Duelos Aéreos Ganhos", value: currentSeasonStats.aerial_duels_won,   max: 20 },
                { label: "Duelos Aéreos Total",  value: currentSeasonStats.aerial_duels_total, max: 30 },
              ]} />
              <PhasePanel title="Reposição" index={2} stats={[
                { label: "Passes Certos", value: currentSeasonStats.accurate_passes, max: 300 },
                { label: "Passes Totais", value: currentSeasonStats.total_passes,    max: 400 },
              ]} />
              <PhasePanel title="Disciplina" index={3} stats={[
                { label: "Amarelos",         value: currentSeasonStats.yellow_cards,    max: 10 },
                { label: "Vermelhos",        value: currentSeasonStats.red_cards,       max: 3  },
                { label: "Faltas Cometidas", value: currentSeasonStats.fouls_committed, max: 20 },
              ]} />
            </>
          ) : (
            <>
              <PhasePanel title="Ataque" index={0} stats={[
                { label: "Gols",                value: currentSeasonStats.goals,            max: 20 },
                { label: "Chutes",              value: currentSeasonStats.shots,            max: 50 },
                { label: "Chutes no Gol",       value: currentSeasonStats.shots_on_target,  max: 30 },
                { label: "Pênaltis Sofridos",   value: currentSeasonStats.penalties_won ?? 0, max: 5 },
              ]} />
              <PhasePanel title="Criatividade" index={1} stats={[
                { label: "Assistências",    value: currentSeasonStats.assists,           max: 15 },
                { label: "Passes Decisivos",value: currentSeasonStats.key_passes,        max: 40 },
                { label: "Chances Criadas", value: currentSeasonStats.chances_created,   max: 30 },
              ]} />
              <PhasePanel title="Passe" index={2} stats={[
                { label: "Passes Certos",    value: currentSeasonStats.accurate_passes,      max: 500 },
                { label: "P. Longo Certo",   value: currentSeasonStats.long_passes_accurate, max: 150 },
                { label: "P. Longo Tot.",    value: currentSeasonStats.long_passes_total,    max: 200 },
                { label: "Dribles Certos",   value: currentSeasonStats.successful_dribbles,  max: 30  },
              ]} />
              <PhasePanel title="Defesa" index={3} stats={[
                { label: "Roubada de Bola", value: currentSeasonStats.steals,            max: 30 },
                { label: "Desarmes",        value: currentSeasonStats.tackles,           max: 40 },
                { label: "Interceptações",  value: currentSeasonStats.interceptions,     max: 30 },
                { label: "Recuperações",    value: currentSeasonStats.recoveries,        max: 50 },
              ]} />
            </>
          )}
        </div>
      ) : (
        <p className="py-12 font-editorial-mono text-[12px] text-[#62616a] text-center border border-white/[0.075] rounded-[8px]">
          Sem estatísticas disponíveis para esta temporada.
        </p>
      )}
    </section>
  );
}
