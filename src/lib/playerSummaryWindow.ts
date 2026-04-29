/**
 * playerSummaryWindow
 *
 * Janelas de tempo/jogos disponíveis no botão "Resumo WhatsApp" e helpers
 * para agregar `match_player_stats` no formato `AggregatedUnifiedStats`
 * (mesma forma esperada por `buildPlayerWhatsAppSummary`).
 *
 * Estratégia:
 *  - "career" / "season:YYYY": usa o agregado unificado existente
 *    (LIVE > MANUAL por contexto), via `fetchUnifiedPlayerStats` + `aggregateUnifiedStats`.
 *  - "last3m" / "lastN" / "lastMatch": usa SOMENTE LIVE (`match_player_stats`
 *    + `matches.match_date`), porque MANUAL não tem granularidade por jogo.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AggregatedUnifiedStats } from "@/hooks/useUnifiedPlayerStats";

export type SummaryWindowKind =
  | { kind: "career" }
  | { kind: "season"; year: number }
  | { kind: "last3m" }
  | { kind: "lastMatch" }
  | { kind: "lastN"; n: number };

export interface SummaryWindowOption {
  id: string;
  label: string;
  /** Texto curto que aparece no cabeçalho do resumo gerado. */
  shortLabel: string;
  value: SummaryWindowKind;
}

/** Janelas padrão oferecidas no seletor (acrescidas dinamicamente das temporadas disponíveis). */
export function buildDefaultWindowOptions(availableYears: number[]): SummaryWindowOption[] {
  const baseList: SummaryWindowOption[] = [
    { id: "career", label: "Carreira (todas as temporadas)", shortLabel: "Carreira", value: { kind: "career" } },
    { id: "last3m", label: "Últimos 3 meses", shortLabel: "Últimos 3 meses", value: { kind: "last3m" } },
    { id: "last5", label: "Últimos 5 jogos", shortLabel: "Últimos 5 jogos", value: { kind: "lastN", n: 5 } },
    { id: "lastMatch", label: "Última partida", shortLabel: "Última partida", value: { kind: "lastMatch" } },
  ];
  const seasons = availableYears
    .slice()
    .sort((a, b) => b - a)
    .map<SummaryWindowOption>((y) => ({
      id: `season:${y}`,
      label: `Temporada ${y}`,
      shortLabel: `Temporada ${y}`,
      value: { kind: "season", year: y },
    }));
  return [...baseList, ...seasons];
}

/* ============================================================
 * Agregação a partir de match_player_stats (LIVE)
 * ============================================================ */

interface RawMatchRow {
  match_id: string;
  match: { match_date: string } | null;
  // stats snake_case (ver schema match_player_stats)
  goals: number | null;
  assists: number | null;
  shots: number | null;
  shots_on_target: number | null;
  chances_created: number | null;
  key_passes: number | null;
  passes_completed: number | null;
  passes_total: number | null;
  dribbles_success: number | null;
  dribbles_total: number | null;
  tackles: number | null;
  interceptions: number | null;
  recoveries: number | null;
  clearances: number | null;
  duels_won: number | null;
  duels_total: number | null;
  aerial_duels_won: number | null;
  aerial_duels_total: number | null;
  saves: number | null;
  goals_conceded: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  fouls_committed: number | null;
  fouls_suffered: number | null;
}

interface RawMatchPlayerRow {
  minutes_played: number | null;
  match_id: string;
  match: { match_date: string } | null;
}

const n = (v: number | null | undefined): number => (typeof v === "number" && !isNaN(v) ? v : 0);

/**
 * Busca match_ids do jogador filtrados por data/limit, junto com minutos jogados,
 * e em seguida busca os match_player_stats correspondentes. Retorna o agregado
 * normalizado (mesmas chaves de `AggregatedUnifiedStats`).
 *
 * Observação sobre duels_total: no schema, `duels_total` armazena duelos PERDIDOS,
 * portanto o total real = duels_won + duels_total. Mesma lógica para aerial.
 * Ground = total - aerial.
 */
export async function fetchLiveAggregateForWindow(
  playerId: string,
  window: Extract<SummaryWindowKind, { kind: "last3m" } | { kind: "lastMatch" } | { kind: "lastN" }>,
): Promise<{ stats: AggregatedUnifiedStats | null; matchesCount: number }> {
  // 1) Buscar participações do jogador com data, ordenadas desc.
  let participantsQuery = supabase
    .from("match_players")
    .select("match_id, minutes_played, match:matches(match_date)")
    .eq("player_id", playerId)
    .eq("is_removed", false)
    .order("match_date", { foreignTable: "matches", ascending: false });

  if (window.kind === "last3m") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    participantsQuery = participantsQuery.gte("matches.match_date", cutoff.toISOString());
  }
  if (window.kind === "lastN") {
    participantsQuery = participantsQuery.limit(Math.max(1, window.n) * 2); // margem p/ filtrar nulls
  }
  if (window.kind === "lastMatch") {
    participantsQuery = participantsQuery.limit(2);
  }

  const { data: participants, error: pErr } = await participantsQuery;
  if (pErr) {
    console.error("[playerSummaryWindow] match_players error", pErr);
    return { stats: null, matchesCount: 0 };
  }

  const validParts = (participants as unknown as RawMatchPlayerRow[])
    .filter((p) => p.match?.match_date)
    .sort((a, b) =>
      (b.match!.match_date).localeCompare(a.match!.match_date),
    );

  let selected: RawMatchPlayerRow[];
  if (window.kind === "lastMatch") selected = validParts.slice(0, 1);
  else if (window.kind === "lastN") selected = validParts.slice(0, window.n);
  else selected = validParts;

  if (selected.length === 0) return { stats: null, matchesCount: 0 };

  const matchIds = selected.map((p) => p.match_id);
  const totalMinutes = selected.reduce((acc, p) => acc + n(p.minutes_played), 0);

  // 2) Buscar stats das partidas selecionadas.
  const { data: statsRows, error: sErr } = await supabase
    .from("match_player_stats")
    .select("*")
    .eq("player_id", playerId)
    .in("match_id", matchIds);

  if (sErr) {
    console.error("[playerSummaryWindow] match_player_stats error", sErr);
    return { stats: null, matchesCount: 0 };
  }

  const rows = (statsRows ?? []) as unknown as RawMatchRow[];

  const empty: AggregatedUnifiedStats = {
    matches: selected.length,
    minutes: totalMinutes,
    goals: 0, assists: 0, shots: 0, shots_on_target: 0, chances_created: 0, key_passes: 0,
    accurate_passes: 0, total_passes: 0, successful_dribbles: 0, total_dribbles: 0,
    tackles: 0, interceptions: 0, recoveries: 0,
    duels_won: 0, total_duels: 0,
    aerial_duels_won: 0, aerial_duels_total: 0,
    ground_duels_won: 0, ground_duels_total: 0,
    saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0, errors_leading_to_goal: 0,
    yellow_cards: 0, red_cards: 0, fouls_committed: 0, fouls_drawn: 0,
    clearances: 0,
  };

  const agg = rows.reduce<AggregatedUnifiedStats>((acc, r) => {
    // duels_total no schema = perdidos; total real = won + lost
    const aerialTotal = n(r.aerial_duels_won) + n(r.aerial_duels_total);
    const allDuelsTotal = n(r.duels_won) + n(r.duels_total);
    const groundWon = Math.max(0, n(r.duels_won) - n(r.aerial_duels_won));
    const groundTotal = Math.max(0, allDuelsTotal - aerialTotal);

    acc.goals += n(r.goals);
    acc.assists += n(r.assists);
    acc.shots += n(r.shots);
    acc.shots_on_target += n(r.shots_on_target);
    acc.chances_created += n(r.chances_created);
    acc.key_passes += n(r.key_passes);
    acc.accurate_passes += n(r.passes_completed);
    acc.total_passes += n(r.passes_total);
    acc.successful_dribbles += n(r.dribbles_success);
    acc.total_dribbles += n(r.dribbles_total);
    acc.tackles += n(r.tackles);
    acc.interceptions += n(r.interceptions);
    acc.recoveries += n(r.recoveries);
    acc.clearances += n(r.clearances);
    acc.duels_won += n(r.duels_won);
    acc.total_duels += allDuelsTotal;
    acc.aerial_duels_won += n(r.aerial_duels_won);
    acc.aerial_duels_total += aerialTotal;
    acc.ground_duels_won += groundWon;
    acc.ground_duels_total += groundTotal;
    acc.saves += n(r.saves);
    acc.goals_conceded += n(r.goals_conceded);
    if (n(r.goals_conceded) === 0 && n(r.saves) > 0) acc.clean_sheets += 1;
    acc.yellow_cards += n(r.yellow_cards);
    acc.red_cards += n(r.red_cards);
    acc.fouls_committed += n(r.fouls_committed);
    acc.fouls_drawn += n(r.fouls_suffered);
    return acc;
  }, empty);

  return { stats: agg, matchesCount: selected.length };
}
