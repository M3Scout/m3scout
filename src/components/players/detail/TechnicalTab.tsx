import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useComparePlayerStats } from "@/hooks/useComparePlayerStats";
import { AthleteHighlightsSection } from "@/components/players/public/AthleteHighlightsSection";
import { AthleteGamePhasesSection } from "@/components/players/public/AthleteGamePhasesSection";
import { formatDateMediumBR } from "@/lib/dateUtils";

const ACCENT = "#ec4525";
const BORDER = "#1C1C1C";
const MUTED  = "#6B6560";
const TEXT   = "#F2EDE4";
const BG     = "#0A0A0A";

interface ReportRow {
  id: string;
  match_date: string;
  rating: number;
  technical_score: number;
  technical_notes: string | null;
  scout_id: string;
}

interface TechnicalTabProps {
  playerId: string;
  playerPosition?: string;
  strengths?: string[] | null;
}

export function TechnicalTab({ playerId, playerPosition, strengths }: TechnicalTabProps) {
  // Season stats for the phases section
  const { rows: mergedRows } = useComparePlayerStats({
    playerId,
    seasonFilter: "all",
    competitionFilter: "all",
  });

  const careerStats = useMemo(() => {
    const acc: Record<number, {
      season_year: number; matches: number; minutes: number; goals: number; assists: number;
      yellow_cards: number; red_cards: number; steals: number; tackles: number;
      interceptions: number; recoveries: number; shots: number; shots_on_target: number;
      key_passes: number; chances_created: number; successful_dribbles: number;
      total_dribbles: number; accurate_passes: number; total_passes: number;
      long_passes_accurate: number; long_passes_total: number; clearances: number;
      aerial_duels_won: number; aerial_duels_total: number; fouls_committed: number;
      saves: number; goals_conceded: number; clean_sheets: number;
      penalties_saved: number; penalties_won: number;
    }> = {};

    for (const s of mergedRows) {
      const year = s.season_year;
      if (!acc[year]) {
        acc[year] = {
          season_year: year,
          matches: 0, minutes: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
          steals: 0, tackles: 0, interceptions: 0, recoveries: 0, shots: 0,
          shots_on_target: 0, key_passes: 0, chances_created: 0,
          successful_dribbles: 0, total_dribbles: 0, accurate_passes: 0, total_passes: 0,
          long_passes_accurate: 0, long_passes_total: 0, clearances: 0,
          aerial_duels_won: 0, aerial_duels_total: 0, fouls_committed: 0,
          saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0, penalties_won: 0,
        };
      }
      const c = acc[year];
      c.matches += s.matches;           c.minutes += s.minutes;
      c.goals += s.goals;               c.assists += s.assists;
      c.yellow_cards += s.yellow_cards; c.red_cards += s.red_cards;
      c.steals += s.steals;             c.tackles += s.tackles;
      c.interceptions += s.interceptions; c.recoveries += s.recoveries;
      c.shots += s.shots;               c.shots_on_target += s.shots_on_target;
      c.key_passes += s.key_passes;     c.chances_created += s.chances_created;
      c.successful_dribbles += s.successful_dribbles;
      c.total_dribbles += s.total_dribbles;
      c.accurate_passes += s.accurate_passes;
      c.total_passes += s.total_passes;
      c.long_passes_accurate += s.long_passes_accurate;
      c.long_passes_total += s.long_passes_total;
      c.clearances += s.clearances;
      c.aerial_duels_won += s.aerial_duels_won;
      c.aerial_duels_total += s.aerial_duels_total;
      c.fouls_committed += s.fouls_committed;
      c.saves += s.saves;               c.goals_conceded += s.goals_conceded;
      c.clean_sheets += s.clean_sheets; c.penalties_saved += s.penalties_saved;
      c.penalties_won += s.penalties_won;
    }
    return Object.values(acc).sort((a, b) => b.season_year - a.season_year);
  }, [mergedRows]);

  const latestAvailableSeasonYear = careerStats.length > 0 ? careerStats[0].season_year : null;

  const [phasesYear, setPhasesYear] = useState<number | null>(null);
  const currentSeasonStats = useMemo(() => {
    if (!careerStats.length) return null;
    if (phasesYear) return careerStats.find(s => s.season_year === phasesYear) ?? careerStats[0];
    return careerStats[0];
  }, [careerStats, phasesYear]);

  // Scouting reports for the history table
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["scouting-reports-tech", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scouting_reports")
        .select("id, match_date, rating, technical_score, technical_notes, scout_id")
        .eq("player_id", playerId)
        .order("match_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const scoutIds = [...new Set(reports.map(r => r.scout_id).filter(Boolean))];
  const { data: scouts = [] } = useQuery({
    queryKey: ["scout-profiles-tech", scoutIds.join(",")],
    queryFn: async () => {
      if (!scoutIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", scoutIds);
      return (data ?? []) as { user_id: string; full_name: string | null }[];
    },
    enabled: scoutIds.length > 0,
  });

  const scoutMap = Object.fromEntries(scouts.map(s => [s.user_id, s.full_name ?? "Scout"]));

  return (
    <div>
      {/* ── Mapa de Atributos ─────────────────────────────────────────────── */}
      <AthleteHighlightsSection
        playerId={playerId}
        strengths={strengths ?? null}
        compact
        onYearChange={setPhasesYear}
      />

      {/* ── Desempenho por Fase ───────────────────────────────────────────── */}
      <AthleteGamePhasesSection
        currentSeasonStats={currentSeasonStats}
        latestAvailableSeasonYear={phasesYear ?? latestAvailableSeasonYear}
        playerPosition={playerPosition}
        compact
      />

      {/* ── Histórico de Avaliações Técnicas ──────────────────────────────── */}
      <section className="py-12 md:py-16 border-b border-zinc-800/50">
        <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase mb-[14px]" style={{ color: MUTED }}>
          <span style={{ color: ACCENT }} className="font-semibold">03</span>
          <span className="inline-block mx-[10px] w-[34px] h-px bg-white/15 align-middle" />
          Histórico Técnico
        </div>
        <h2
          className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mb-8 text-[#ededee]"
          style={{ fontSize: "clamp(24px,3.4vw,44px)" }}
        >
          Avaliações de Scout
        </h2>

        <div style={{ border: `1px solid ${BORDER}` }}>
          <div
            className="grid grid-cols-[120px_140px_80px_1fr] px-4 py-2"
            style={{ borderBottom: `1px solid ${BORDER}`, background: "#0D0D0D" }}
          >
            {["DATA", "SCOUT", "NOTA", "OBSERVAÇÃO TÉCNICA"].map(col => (
              <span key={col} className="font-jetbrains text-[9px] uppercase tracking-widest" style={{ color: MUTED }}>
                {col}
              </span>
            ))}
          </div>

          {reportsLoading ? (
            <div className="px-4 py-8 text-center">
              <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                CARREGANDO...
              </span>
            </div>
          ) : reports.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
              <span className="font-jetbrains text-[14px] uppercase tracking-widest" style={{ color: MUTED }}>
                SEM AVALIAÇÕES
              </span>
              <span className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
                Nenhum relatório de observação registrado
              </span>
            </div>
          ) : (
            reports.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[120px_140px_80px_1fr] px-4 py-3 items-start"
                style={{
                  borderBottom: i < reports.length - 1 ? `1px solid ${BORDER}` : undefined,
                  background: i % 2 === 1 ? "#080808" : BG,
                }}
              >
                <span className="font-jetbrains text-[11px]" style={{ color: MUTED }}>
                  {formatDateMediumBR(r.match_date)}
                </span>
                <span className="font-jetbrains text-[11px] truncate pr-2" style={{ color: TEXT }}>
                  {scoutMap[r.scout_id] ?? "—"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-jetbrains text-[13px] tabular-nums font-bold"
                    style={{ color: r.rating >= 4 ? "#22C55E" : r.rating >= 3 ? TEXT : MUTED }}
                  >
                    {r.rating}
                  </span>
                  <span className="font-jetbrains text-[9px]" style={{ color: MUTED }}>/5</span>
                </div>
                <span
                  className="font-jetbrains text-[11px] leading-relaxed"
                  style={{ color: r.technical_notes ? TEXT : MUTED }}
                >
                  {r.technical_notes
                    ? r.technical_notes.length > 120
                      ? r.technical_notes.slice(0, 120) + "…"
                      : r.technical_notes
                    : "—"}
                </span>
              </div>
            ))
          )}
        </div>

        {reports.length > 0 && (
          <p className="font-jetbrains text-[10px] uppercase tracking-wider mt-2 text-right" style={{ color: MUTED }}>
            {reports.length} {reports.length === 1 ? "avaliação" : "avaliações"}
          </p>
        )}
      </section>
    </div>
  );
}
