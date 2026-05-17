/**
 * mergeSeasonStats
 *
 * Utilitário de agrupamento para a tabela pública de estatísticas.
 *
 * REGRA DE USO:
 *  - Chamar apenas no componente de VISUALIZAÇÃO (StatsTab).
 *  - O componente de EDIÇÃO (PlayerStatsForm) deve continuar consumindo
 *    o array bruto sem aplicar esta função, preservando linhas separadas
 *    por origem (LIVE e MANUAL) para edição individual.
 *
 * LÓGICA:
 *  - Agrupa por chave composta (season_year × competition_id).
 *  - Soma TODOS os campos numéricos de `stats` independentemente da origem
 *    (LIVE + MANUAL são aditivos na visão pública).
 *  - Linhas sem colisão mantêm a `source` original.
 *  - Linhas com origens distintas recebem `source = "mixed"` → badge "LIVE + MANUAL".
 *  - O array original nunca é mutado.
 */

import type { MatchDerivedStats, SeasonCompetitionStats } from "@/hooks/usePlayerMatchStats";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonSource = "live" | "manual" | "mixed";

/** Shape de uma linha no render público — mesma base do hook, source ampliado. */
export type PublicSeasonRow = SeasonCompetitionStats & { source: SeasonSource };

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Soma todos os 36 campos de dois MatchDerivedStats.
 * Retorna um NOVO objeto — os originais não são modificados.
 *
 * Observação sobre campos derivados:
 *   shots_off_target  = total − on_target − blocked   → a₁+a₂ = correto
 *   passes_total      = completed + failed             → a₁+a₂ = correto
 *   dribbles_total    = success + failed               → a₁+a₂ = correto
 *   duels_total       = won + lost                     → a₁+a₂ = correto
 */
function sumStats(a: MatchDerivedStats, b: MatchDerivedStats): MatchDerivedStats {
  return {
    matches:            a.matches            + b.matches,
    minutes:            a.minutes            + b.minutes,
    goals:              a.goals              + b.goals,
    assists:            a.assists            + b.assists,
    shots:              a.shots              + b.shots,
    shots_on_target:    a.shots_on_target    + b.shots_on_target,
    shots_off_target:   a.shots_off_target   + b.shots_off_target,
    shots_blocked:      a.shots_blocked      + b.shots_blocked,
    offsides:           a.offsides           + b.offsides,
    passes_completed:   a.passes_completed   + b.passes_completed,
    passes_failed:      a.passes_failed      + b.passes_failed,
    passes_total:       a.passes_total       + b.passes_total,
    key_passes:         a.key_passes         + b.key_passes,
    chances_created:    a.chances_created    + b.chances_created,
    crosses_success:    a.crosses_success    + b.crosses_success,
    crosses_failed:     a.crosses_failed     + b.crosses_failed,
    ball_actions:       a.ball_actions       + b.ball_actions,
    dribbles_success:   a.dribbles_success   + b.dribbles_success,
    dribbles_failed:    a.dribbles_failed    + b.dribbles_failed,
    dribbles_total:     a.dribbles_total     + b.dribbles_total,
    tackles:            a.tackles            + b.tackles,
    interceptions:      a.interceptions      + b.interceptions,
    recoveries:         a.recoveries         + b.recoveries,
    clearances:         a.clearances         + b.clearances,
    blocked_shots:      a.blocked_shots      + b.blocked_shots,
    was_dribbled:       a.was_dribbled       + b.was_dribbled,
    duels_won:          a.duels_won          + b.duels_won,
    duels_total:        a.duels_total        + b.duels_total,
    aerial_duels_won:   a.aerial_duels_won   + b.aerial_duels_won,
    aerial_duels_total: a.aerial_duels_total + b.aerial_duels_total,
    ground_duels_won:   a.ground_duels_won   + b.ground_duels_won,
    ground_duels_total: a.ground_duels_total + b.ground_duels_total,
    yellow_cards:       a.yellow_cards       + b.yellow_cards,
    red_cards:          a.red_cards          + b.red_cards,
    fouls_committed:    a.fouls_committed    + b.fouls_committed,
    fouls_suffered:     a.fouls_suffered     + b.fouls_suffered,
    possession_lost:    a.possession_lost    + b.possession_lost,
    saves:              a.saves              + b.saves,
    goals_conceded:     a.goals_conceded     + b.goals_conceded,
    clean_sheets:       a.clean_sheets       + b.clean_sheets,
    penalties_saved:    a.penalties_saved    + b.penalties_saved,
  };
}

function resolveSource(a: SeasonSource, b: SeasonSource): SeasonSource {
  return a === b ? a : "mixed";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Agrupa linhas por (season_year × competition_id) e soma os stats.
 *
 * @param rows Array bruto de SeasonCompetitionStats com campo `source`.
 *             Pode conter entradas "live" e "manual" para a mesma competição/ano.
 * @returns    Novo array com no máximo uma entrada por (ano × competição).
 *             O array original e seus objetos NÃO são mutados.
 *
 * @example
 * // Apenas no componente de visualização pública:
 * const publicRows = mergeSeasonRows(mergedBySeason[yr] ?? []);
 * // publicRows.length <= (mergedBySeason[yr] ?? []).length
 */
export function mergeSeasonRows(rows: PublicSeasonRow[]): PublicSeasonRow[] {
  // Step 1 — group all rows by the stable (year × competition) key
  const buckets = rows.reduce<Record<string, PublicSeasonRow[]>>((acc, row) => {
    const key = `${row.season_year}_${row.competition_id ?? row.competition_name ?? "__none__"}`;
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  return Object.values(buckets).map(group => {
    // Sum all rows regardless of source (LIVE + MANUAL are additive in the public view).
    // The edit form receives the raw unmerged array and is never affected by this function.
    return group.reduce<PublicSeasonRow>((acc, row, i) => {
      if (i === 0) return { ...row, stats: { ...row.stats } };
      return {
        ...acc,
        id: `${acc.id}+${row.id}`,
        stats: sumStats(acc.stats, row.stats),
        source: resolveSource(acc.source, row.source),
      };
    }, group[0]);
  });
}
