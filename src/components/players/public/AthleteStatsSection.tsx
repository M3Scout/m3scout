import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatFixed } from "@/lib/formatters";

interface SeasonStats {
  season_year: number;
  matches: number; minutes: number; goals: number; assists: number;
  yellow_cards: number; red_cards: number; tackles: number; interceptions: number;
  recoveries: number; shots: number; shots_on_target: number; key_passes: number;
  chances_created: number; successful_dribbles: number; total_dribbles: number;
  accurate_passes: number; total_passes: number; clearances: number;
  saves: number; goals_conceded: number; clean_sheets: number; penalties_saved: number;
}
interface CompetitionStats {
  competition_id: string; competition_name: string; competition_type: string;
  season_year: number; matches: number; minutes: number; goals: number; assists: number;
}
interface CareerTotals { matches: number; minutes: number; goals: number; assists: number; }
type TabValue = "current" | "per90" | "competition" | "career";
interface AthleteStatsSectionProps {
  careerTotals: CareerTotals;
  careerStats: SeasonStats[];
  competitionStats: CompetitionStats[];
  currentSeasonStats: SeasonStats | null;
  latestAvailableSeasonYear: number | null;
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
}

// ── .sec-head pattern: kick label + display title + mono note ──
function SectionHead({ idx, kick, title, note }: {
  idx: string; kick: string; title: string; note?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 md:mb-11 flex-wrap">
      <div>
        <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
          <span className="text-[#ec4525] font-semibold">{idx}</span>
          <span className="w-[34px] h-px bg-white/15 flex-none" />
          {kick}
        </div>
        <h2
          className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
          style={{ fontSize: "clamp(24px,3.4vw,44px)" }}
        >
          {title}
        </h2>
      </div>
      {note && (
        <p className="hidden md:block font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          {note}
        </p>
      )}
    </div>
  );
}

// ── Single item inside .counters ──
function Counter({ label, value, highlight = false, index, wide = false }: {
  label: string; value: number | string; highlight?: boolean; index: number; wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "counter relative rounded-xl border border-zinc-800 transition-colors duration-[250ms] hover:bg-zinc-800/50",
        "py-[22px] px-[20px] md:py-[30px] md:px-[26px]",
        wide && "col-span-2 lg:col-span-1",
      )}
      style={highlight
        ? { background: "linear-gradient(165deg, rgba(236,69,37,0.14), rgba(20,19,24,1) 70%)", borderColor: "rgba(236,69,37,0.25)" }
        : { background: "#141318" }
      }
    >
      {/* index — top-right */}
      <span className="absolute top-[14px] right-[16px] font-mono text-[11px] text-zinc-500">
        {String(index + 1).padStart(2, "0")}
      </span>
      {/* main number */}
      <div
        className={cn(
          "font-display font-semibold leading-[0.9] tracking-[-0.03em] tabular-nums",
          highlight ? "text-[#ec4525]" : "text-[#ededee]"
        )}
        style={{ fontSize: "clamp(36px,4.5vw,58px)" }}
      >
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {/* label */}
      <div className="font-editorial-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mt-[14px]">
        {label}
      </div>
    </div>
  );
}

// ── .tab button — single container, border-right dividers, ::after accent ──
function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tab relative flex-none whitespace-nowrap font-editorial-mono text-[12px] tracking-[0.08em] uppercase font-semibold",
        "px-[16px] md:px-[22px] py-[10px] md:py-[13px]",
        // Mobile: pill with own border
        "border border-white/[0.075] rounded-full md:rounded-none md:border-0",
        // Desktop: right border divider
        "md:border-r md:border-white/[0.075] md:last:border-r-0",
        "transition-all duration-200",
        active
          ? "on text-[#ededee] bg-[#ec4525] border-[#ec4525] md:bg-[#191822] md:border-white/[0.075]"
          : "text-[#62616a] hover:text-[#9c9ba3] hover:bg-[#141318]"
      )}
    >
      {children}
      {/* Active bottom accent line — desktop only */}
      {active && (
        <span className="hidden md:block absolute left-0 right-0 bottom-0 h-[2px] bg-[#ec4525]" />
      )}
    </button>
  );
}

// ── .stat-cell ──
function StatCell({ label, value, sub }: {
  label: string; value: number | string; sub?: string;
}) {
  return (
    <div
      className="stat-cell border border-white/[0.075] rounded-[6px] bg-[#141318] px-[20px] py-[22px] cursor-default transition-all duration-[250ms] hover:bg-[#191822] hover:-translate-y-[3px]"
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(236,69,37,0.42)"; }}
      onMouseLeave={(e)  => { (e.currentTarget as HTMLDivElement).style.borderColor = ""; }}
    >
      <div
        className="sv font-display font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#ededee]"
        style={{ fontSize: "36px" }}
      >
        {value}
      </div>
      <div className="sl font-editorial-mono text-[10.5px] tracking-[0.14em] uppercase text-[#62616a] mt-[13px]">
        {label}
        {sub && <span className="ss ml-1 text-[10px] opacity-70">{sub}</span>}
      </div>
    </div>
  );
}

// ── Competition / career list row ──
function ListRow({ left, sub, cols }: {
  left: React.ReactNode; sub?: string;
  cols: { value: string | number; accent?: boolean }[];
}) {
  return (
    <div className="flex items-center justify-between px-[20px] py-[16px] border border-white/[0.075] rounded-[6px] bg-[#141318] hover:bg-[#191822] transition-colors duration-[250ms] cursor-default">
      <div>
        <div className="font-display text-[15px] font-semibold text-[#ededee]">{left}</div>
        {sub && <div className="font-editorial-mono text-[11px] text-[#62616a] mt-0.5">{sub}</div>}
      </div>
      <div className="font-editorial-mono text-[13px] font-semibold tabular-nums flex gap-5">
        {cols.map((c, i) => (
          <span key={i} className={c.accent ? "text-[#ec4525]" : "text-[#9c9ba3]"}>
            {c.value}
          </span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
export function AthleteStatsSection({
  careerTotals, careerStats, competitionStats, currentSeasonStats,
  latestAvailableSeasonYear, activeTab, setActiveTab,
}: AthleteStatsSectionProps) {
  if (careerStats.length === 0) return null;

  const currentYear = new Date().getFullYear();

  // All data logic intact — no changes
  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  return (
    <>
      {/* ══ 03 · Consolidado de Carreira ══ */}
      <section className="py-12 md:py-20 relative border-b border-zinc-800/50" id="carreira">
        <SectionHead
          idx="03"
          kick="Consolidado de Carreira"
          title="Números acumulados"
          note="Números registrados ao longo da carreira do atleta."
        />

        {/* .counters — 2 cols mobile, 5 cols desktop; G+A spans full width on mobile */}
        <div className="counters grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <Counter label="G+A"     value={careerTotals.goals + careerTotals.assists} highlight wide index={0} />
          <Counter label="Gols"    value={careerTotals.goals}    highlight                          index={1} />
          <Counter label="Assist." value={careerTotals.assists}                                     index={2} />
          <Counter label="Jogos"   value={careerTotals.matches}                                     index={3} />
          <Counter label="Minutos" value={careerTotals.minutes.toLocaleString("pt-BR")}             index={4} />
        </div>
      </section>

      {/* ══ 04 · Recortes ══ */}
      <section className="py-12 md:py-20 relative border-b border-zinc-800/50" id="recortes">
        <SectionHead
          idx="04"
          kick="Recortes"
          title="Estatísticas por filtro"
          note="Alterne entre temporada, médias por 90′, competição e carreira."
        />

        {/* Mobile: scrollable pills. Desktop: bordered container */}
        <div className="tabs flex gap-2 md:gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 md:pb-0 md:border md:border-white/[0.075] md:rounded-[6px] md:overflow-hidden md:w-fit mb-[24px] md:mb-[30px]">
          <TabBtn active={activeTab === "current"}     onClick={() => setActiveTab("current")}>
            Temporada {latestAvailableSeasonYear ?? currentYear}
          </TabBtn>
          <TabBtn active={activeTab === "per90"}       onClick={() => setActiveTab("per90")}>
            Por 90 min
          </TabBtn>
          <TabBtn active={activeTab === "competition"} onClick={() => setActiveTab("competition")}>
            Por Competição
          </TabBtn>
          <TabBtn active={activeTab === "career"}      onClick={() => setActiveTab("career")}>
            Carreira
          </TabBtn>
        </div>

        {/* .tabpanel — animated on tab change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Temporada */}
            {activeTab === "current" && currentSeasonStats && (
              <div className="stat-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-[14px]">
                <StatCell label="Jogos"     value={currentSeasonStats.matches} />
                <StatCell label="Minutos"   value={currentSeasonStats.minutes} />
                <StatCell label="Gols"      value={currentSeasonStats.goals} />
                <StatCell label="Assist."   value={currentSeasonStats.assists} />
                <StatCell label="Desarmes"  value={currentSeasonStats.tackles} />
                <StatCell label="Intercep." value={currentSeasonStats.interceptions} />
              </div>
            )}
            {activeTab === "current" && !currentSeasonStats && (
              <p className="py-8 font-editorial-mono text-[12px] text-[#62616a] text-center">
                Sem estatísticas disponíveis ainda.
              </p>
            )}

            {/* Por 90 min */}
            {activeTab === "per90" && currentSeasonStats && currentSeasonStats.minutes >= 90 && (
              <div className="stat-grid grid grid-cols-2 sm:grid-cols-4 gap-[14px]">
                <StatCell label="Gols/90"     value={calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes)} />
                <StatCell label="Assist./90"  value={calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes)} />
                <StatCell label="G+A/90"      value={calculatePer90(currentSeasonStats.goals + currentSeasonStats.assists, currentSeasonStats.minutes)} />
                <StatCell label="Desarmes/90" value={calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes)} />
              </div>
            )}
            {activeTab === "per90" && (!currentSeasonStats || currentSeasonStats.minutes < 90) && (
              <p className="py-8 font-editorial-mono text-[12px] text-[#62616a] text-center">
                Mínimo de 90 minutos necessários.
              </p>
            )}

            {/* Por Competição */}
            {activeTab === "competition" && competitionStats.length > 0 && (
              <div className="space-y-[10px]">
                {competitionStats.slice(0, 5).map((comp) => (
                  <ListRow
                    key={`${comp.competition_id}-${comp.season_year}`}
                    left={comp.competition_name}
                    sub={String(comp.season_year)}
                    cols={[
                      { value: `${comp.matches}J` },
                      { value: `${comp.goals}G`, accent: true },
                      { value: `${comp.assists}A` },
                    ]}
                  />
                ))}
              </div>
            )}
            {activeTab === "competition" && competitionStats.length === 0 && (
              <p className="py-8 font-editorial-mono text-[12px] text-[#62616a] text-center">
                Sem competições registradas.
              </p>
            )}

            {/* Carreira */}
            {activeTab === "career" && (
              <div className="space-y-[10px]">
                {careerStats.map((season) => (
                  <div
                    key={season.season_year}
                    className="flex items-center justify-between px-[20px] py-[16px] border border-white/[0.075] rounded-[6px] bg-[#141318] hover:bg-[#191822] transition-colors duration-[250ms] cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-editorial-mono text-[13px] font-semibold text-[#ededee] tabular-nums">
                        {season.season_year}
                      </span>
                      {season.season_year === currentYear && (
                        <span className="font-editorial-mono text-[9px] tracking-[0.1em] uppercase text-[#ec4525] border border-[#ec4525]/40 rounded-full px-[8px] py-[3px]">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="font-editorial-mono text-[13px] font-semibold tabular-nums flex gap-5">
                      <span className="text-[#9c9ba3]">{season.matches}J</span>
                      <span className="text-[#ec4525]">{season.goals}G</span>
                      <span className="text-[#9c9ba3]">{season.assists}A</span>
                      <span className="text-[#62616a] hidden sm:inline">{season.minutes}'</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  );
}
