/**
 * recalculatePlayerScores
 *
 * Pipeline TypeScript para recalcular player_attribute_scores.
 * Substitui a lógica SQL (calculate_player_attribute_scores / recalculate_all_attribute_scores).
 *
 * Fluxo:
 *  1. Busca live stats (match_player_stats + player_field_presence)
 *  2. Busca player_stats (manual / live_correction)
 *  3. Converte ambos para PublicSeasonRow[] com a mesma normalização do StatsTab
 *  4. mergeSeasonRows() → deduplica e resolve live_correction vs live
 *  5. Soma todas as competições do ano → MatchDerivedStats total
 *  6. calculateAttributeScores() → ATA/CRI/TEC/DEF/TAT
 *  7. UPSERT em player_attribute_scores
 */

import { supabase } from "@/integrations/supabase/client";
import type { MatchDerivedStats, SeasonCompetitionStats } from "@/hooks/usePlayerMatchStats";
import { mergeSeasonRows, type PublicSeasonRow } from "@/lib/mergeSeasonStats";
import { calculateAttributeScores } from "@/lib/calculateAttributeScores";
import { getRegulationGameMinute } from "@/lib/formatters";

const STANDARD_MATCH_DURATION = 90;
const END_OF_HALF_SECONDS = 45 * 60;

// ─── Presence minutes (capped correctly per half and per match) ───────────────

function computePresenceMinutes(
  rows: { match_id: string; period: number; entered_at_seconds: number; exited_at_seconds: number | null }[]
): Record<string, number> {
  const byMatch: Record<string, number> = {};
  for (const r of rows) {
    const period = r.period ?? 1;
    const entryMin = getRegulationGameMinute(r.entered_at_seconds ?? 0, period);
    const exitSec  = Math.min(r.exited_at_seconds ?? END_OF_HALF_SECONDS, END_OF_HALF_SECONDS);
    const exitMin  = getRegulationGameMinute(exitSec, period);
    byMatch[r.match_id] = (byMatch[r.match_id] ?? 0) + Math.max(0, exitMin - entryMin);
  }
  for (const k of Object.keys(byMatch)) {
    byMatch[k] = Math.min(byMatch[k], STANDARD_MATCH_DURATION);
  }
  return byMatch;
}

// ─── Normalize match_player_stats raw row → MatchDerivedStats ─────────────────
// IMPORTANT: semantic inversions in the DB schema:
//   passes_total    = FAILED (not actual total)
//   dribbles_total  = FAILED (not actual total)
//   duels_total     = LOST   (not actual total)
//   aerial_duels_total = LOST

function normalizeLiveStat(raw: Record<string, any>, minutes: number): MatchDerivedStats {
  const shotsOff = raw.shots ?? 0;
  const shotsOn  = raw.shots_on_target ?? 0;
  const shotsBlk = raw.shots_blocked ?? 0;
  const shotsPost = raw.shots_on_post ?? 0;

  const passFailed = raw.passes_total ?? 0;
  const passComp   = raw.passes_completed ?? 0;
  const progPass   = raw.progressive_passes ?? 0;

  const dribFailed = raw.dribbles_total ?? 0;
  const dribSucc   = raw.dribbles_success ?? 0;

  const duelsLost = raw.duels_total ?? 0;
  const duelsWon  = raw.duels_won ?? 0;

  const aerLost = raw.aerial_duels_total ?? 0;
  const aerWon  = raw.aerial_duels_won ?? 0;

  return {
    matches: 1,
    minutes,
    goals:              raw.goals ?? 0,
    assists:            raw.assists ?? 0,
    shots:              shotsOff + shotsOn + shotsBlk + shotsPost,
    shots_on_target:    shotsOn,
    shots_off_target:   shotsOff,
    shots_blocked:      shotsBlk,
    shots_on_post:      shotsPost,
    offsides:           raw.offsides ?? 0,
    passes_completed:   passComp,
    passes_failed:      passFailed,
    progressive_passes: progPass,
    passes_total:       passComp + passFailed + progPass,
    key_passes:         raw.key_passes ?? 0,
    chances_created:    raw.chances_created ?? 0,
    crosses_success:    raw.crosses_success ?? 0,
    crosses_failed:     raw.crosses_failed ?? 0,
    ball_actions:       0,
    dribbles_success:   dribSucc,
    dribbles_failed:    dribFailed,
    dribbles_total:     dribSucc + dribFailed,
    penalties_won:      raw.penalties_won ?? 0,
    steals:             raw.steals ?? 0,
    tackles:            raw.tackles ?? 0,
    interceptions:      raw.interceptions ?? 0,
    recoveries:         raw.recoveries ?? 0,
    clearances:         raw.clearances ?? 0,
    blocked_shots:      raw.blocked_shots ?? 0,
    was_dribbled:       raw.was_dribbled ?? 0,
    duels_won:          duelsWon,
    duels_total:        duelsWon + duelsLost,
    aerial_duels_won:   aerWon,
    aerial_duels_total: aerWon + aerLost,
    ground_duels_won:   duelsWon - aerWon,
    ground_duels_total: (duelsWon + duelsLost) - (aerWon + aerLost),
    yellow_cards:       raw.yellow_cards ?? 0,
    red_cards:          raw.red_cards ?? 0,
    fouls_committed:    raw.fouls_committed ?? 0,
    fouls_suffered:     raw.fouls_suffered ?? 0,
    possession_lost:    raw.possession_lost ?? 0,
    saves:              raw.saves ?? 0,
    goals_conceded:     raw.goals_conceded ?? 0,
    clean_sheets:       0,
    penalties_saved:    0,
    long_passes_accurate: 0,
    long_passes_failed:   0,
    long_passes_total:    0,
  };
}

// ─── Normalize player_stats row → MatchDerivedStats ───────────────────────────
// IMPORTANT: mesmas inversões semânticas, nomes de colunas diferentes:
//   total_passes    = FAILED
//   total_dribbles  = FAILED
//   aerial_duels_total  = LOST
//   ground_duels_total  = LOST
//   total_duels     = actual total (excepção!)
//   long_passes_total   = FAILED

function normalizePlayerStat(ps: Record<string, any>): MatchDerivedStats {
  const aerLost  = ps.aerial_duels_total ?? 0;
  const aerWon   = ps.aerial_duels_won ?? 0;
  const gdLost   = ps.ground_duels_total ?? 0;
  const gdWon    = ps.ground_duels_won ?? 0;
  const lpFailed = ps.long_passes_total ?? 0;
  const lpAcc    = ps.long_passes_accurate ?? 0;

  return {
    matches:            ps.matches ?? 0,
    minutes:            ps.minutes ?? 0,
    goals:              ps.goals ?? 0,
    assists:            ps.assists ?? 0,
    shots:              ps.shots ?? 0,
    shots_on_target:    ps.shots_on_target ?? 0,
    shots_off_target:   Math.max(0, (ps.shots ?? 0) - (ps.shots_on_target ?? 0) - (ps.shots_blocked ?? 0)),
    shots_blocked:      ps.shots_blocked ?? 0,
    shots_on_post:      ps.shots_on_post ?? 0,
    offsides:           ps.offsides ?? 0,
    passes_completed:   ps.accurate_passes ?? 0,
    passes_failed:      ps.total_passes ?? 0,        // total_passes = FAILED
    progressive_passes: ps.progressive_passes ?? 0,
    passes_total:       (ps.accurate_passes ?? 0) + (ps.total_passes ?? 0) + (ps.progressive_passes ?? 0),
    key_passes:         ps.key_passes ?? 0,
    chances_created:    ps.chances_created ?? 0,
    crosses_success:    ps.crosses_success ?? 0,
    crosses_failed:     ps.crosses_failed ?? 0,
    ball_actions:       0,
    dribbles_success:   ps.successful_dribbles ?? 0,
    dribbles_failed:    ps.total_dribbles ?? 0,      // total_dribbles = FAILED
    dribbles_total:     (ps.successful_dribbles ?? 0) + (ps.total_dribbles ?? 0),
    penalties_won:      ps.penalties_won ?? 0,
    steals:             ps.steals ?? 0,
    tackles:            ps.tackles ?? 0,
    interceptions:      ps.interceptions ?? 0,
    recoveries:         ps.recoveries ?? 0,
    clearances:         ps.clearances ?? 0,
    blocked_shots:      ps.shots_blocked ?? 0,
    was_dribbled:       ps.times_dribbled_past ?? 0,
    duels_won:          ps.duels_won ?? 0,
    duels_total:        ps.total_duels ?? 0,         // total_duels = actual total
    aerial_duels_won:   aerWon,
    aerial_duels_total: aerWon + aerLost,            // aerial_duels_total = LOST → derive real
    ground_duels_won:   gdWon,
    ground_duels_total: gdWon + gdLost,             // ground_duels_total = LOST → derive real
    yellow_cards:       ps.yellow_cards ?? 0,
    red_cards:          ps.red_cards ?? 0,
    fouls_committed:    ps.fouls_committed ?? 0,
    fouls_suffered:     ps.fouls_drawn ?? 0,        // fouls_drawn em player_stats = sofridas
    possession_lost:    ps.possession_lost ?? 0,
    saves:              ps.saves ?? 0,
    goals_conceded:     ps.goals_conceded ?? 0,
    clean_sheets:       ps.clean_sheets ?? 0,
    penalties_saved:    ps.penalties_saved ?? 0,
    long_passes_accurate: lpAcc,
    long_passes_failed:   lpFailed,                 // long_passes_total = FAILED
    long_passes_total:    lpAcc + lpFailed,
  };
}

// ─── Empty MatchDerivedStats ───────────────────────────────────────────────────

function emptyStats(): MatchDerivedStats {
  return {
    matches: 0, minutes: 0, goals: 0, assists: 0,
    shots: 0, shots_on_target: 0, shots_off_target: 0, shots_blocked: 0,
    shots_on_post: 0, offsides: 0,
    passes_completed: 0, passes_failed: 0, progressive_passes: 0, passes_total: 0,
    key_passes: 0, chances_created: 0, crosses_success: 0, crosses_failed: 0,
    ball_actions: 0,
    dribbles_success: 0, dribbles_failed: 0, dribbles_total: 0,
    penalties_won: 0, steals: 0,
    tackles: 0, interceptions: 0, recoveries: 0, clearances: 0,
    blocked_shots: 0, was_dribbled: 0,
    duels_won: 0, duels_total: 0,
    aerial_duels_won: 0, aerial_duels_total: 0,
    ground_duels_won: 0, ground_duels_total: 0,
    yellow_cards: 0, red_cards: 0,
    fouls_committed: 0, fouls_suffered: 0, possession_lost: 0,
    saves: 0, goals_conceded: 0, clean_sheets: 0, penalties_saved: 0,
    long_passes_accurate: 0, long_passes_failed: 0, long_passes_total: 0,
  };
}

function sumMatchDerivedStats(a: MatchDerivedStats, b: MatchDerivedStats): MatchDerivedStats {
  const keys = Object.keys(a) as (keyof MatchDerivedStats)[];
  const result = { ...a };
  for (const k of keys) {
    (result as any)[k] = ((a as any)[k] ?? 0) + ((b as any)[k] ?? 0);
  }
  return result;
}

// ─── Fetch live rows for a player ─────────────────────────────────────────────

async function fetchLiveSeasonRows(playerId: string, seasonYear?: number): Promise<PublicSeasonRow[]> {
  let mpQuery = supabase
    .from("match_players")
    .select(`
      match_id, started, entered_minute, exited_minute, minutes_played,
      match:matches!inner (
        id, match_date, competition_id, season_year,
        added_time_first_half, added_time_second_half, status,
        competition:competitions (id, name, display_name)
      )
    `)
    .eq("player_id", playerId)
    .neq("is_removed", true)
    .in("match.status", ["finished", "applied"]);

  if (seasonYear) mpQuery = mpQuery.eq("match.season_year", seasonYear);

  const { data: mpRows, error: mpErr } = await mpQuery;
  if (mpErr) throw mpErr;

  const matchIds = [...new Set((mpRows ?? []).filter(mp => mp.match).map(mp => mp.match_id))];
  if (matchIds.length === 0) return [];

  const [{ data: statsData }, { data: presenceData }] = await Promise.all([
    supabase.from("match_player_stats").select("*").eq("player_id", playerId).in("match_id", matchIds),
    supabase.from("player_field_presence")
      .select("match_id, period, entered_at_seconds, exited_at_seconds")
      .eq("player_id", playerId).in("match_id", matchIds),
  ]);

  const statsMap: Record<string, Record<string, any>> = {};
  for (const s of statsData ?? []) {
    statsMap[s.match_id as string] = s as Record<string, any>;
  }

  const presenceByMatch = computePresenceMinutes(
    (presenceData ?? []) as { match_id: string; period: number; entered_at_seconds: number; exited_at_seconds: number | null }[]
  );

  // Group by season_year × competition_id
  const buckets: Record<string, SeasonCompetitionStats & { source: "live" }> = {};
  const seen = new Set<string>();

  for (const mp of (mpRows ?? []) as any[]) {
    if (!mp.match || seen.has(mp.match_id)) continue;
    seen.add(mp.match_id);

    const match = mp.match;
    const minutes = presenceByMatch[mp.match_id] ?? Math.min(mp.minutes_played ?? 0, STANDARD_MATCH_DURATION);
    if (minutes <= 0) continue;

    const raw = statsMap[mp.match_id] ?? {};
    const derivedStats = normalizeLiveStat(raw, minutes);

    const key = `${match.season_year}_${match.competition_id ?? "__none__"}`;
    if (!buckets[key]) {
      const comp = match.competition;
      buckets[key] = {
        id: key,
        season_year: match.season_year,
        competition_id: match.competition_id,
        competition_name: comp?.display_name || comp?.name || null,
        source: "live",
        stats: emptyStats(),
      };
    }
    buckets[key].stats = sumMatchDerivedStats(buckets[key].stats, derivedStats);
  }

  return Object.values(buckets) as PublicSeasonRow[];
}

// ─── Fetch player_stats rows ───────────────────────────────────────────────────

async function fetchPlayerStatsRows(playerId: string, seasonYear?: number): Promise<PublicSeasonRow[]> {
  let query = supabase
    .from("player_stats")
    .select("*, competition:competitions(id, name, display_name)")
    .eq("player_id", playerId);

  if (seasonYear) query = query.eq("season_year", seasonYear);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((ps: any) => {
    const comp = ps.competition;
    return {
      id: `ps_${ps.id}`,
      season_year: ps.season_year,
      competition_id: ps.competition_id,
      competition_name: comp?.display_name || comp?.name || null,
      source: (ps.is_live_correction ? "live_correction" : "player_stats") as PublicSeasonRow["source"],
      stats: normalizePlayerStat(ps),
    } satisfies PublicSeasonRow;
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface RecalculateResult {
  success: boolean;
  playerId: string;
  seasonYear: number;
  ata: number; cri: number; tec: number; def: number; tat: number;
  matches: number; minutes: number;
  error?: string;
}

/**
 * Recalcula e persiste os scores de atributos de um jogador para uma temporada.
 * Usa mergeSeasonRows como única fonte de verdade para o merge.
 */
export async function recalculatePlayerScores(
  playerId: string,
  seasonYear: number
): Promise<RecalculateResult> {
  try {
    const [liveRows, psRows] = await Promise.all([
      fetchLiveSeasonRows(playerId, seasonYear),
      fetchPlayerStatsRows(playerId, seasonYear),
    ]);

    const merged = mergeSeasonRows([...liveRows, ...psRows] as PublicSeasonRow[]);

    const totalStats = merged.reduce(
      (acc, row) => sumMatchDerivedStats(acc, row.stats),
      emptyStats()
    );

    const output = calculateAttributeScores(totalStats, totalStats.minutes);

    if (output.minutes <= 0) {
      return { success: false, playerId, seasonYear, ata: 0, cri: 0, tec: 0, def: 0, tat: 0,
               matches: 0, minutes: 0, error: "No minutes played" };
    }

    const { error: upsertErr } = await supabase
      .from("player_attribute_scores")
      .delete()
      .eq("player_id", playerId)
      .eq("season_year", seasonYear);

    if (upsertErr) throw upsertErr;

    const { error: insertErr } = await supabase
      .from("player_attribute_scores")
      .insert([{
        player_id:      playerId,
        competition_id: null as any,
        season_year:    seasonYear,
        ata_score_100:  output.ata,
        tec_score_100:  output.tec,
        def_score_100:  output.def,
        tat_score_100:  output.tat,
        cri_score_100:  output.cri,
        attr_confidence: output.confidence,
        details: {
          minutes:        output.minutes,
          matches:        output.matches,
          per90:          output.per90,
          final_scores:   { ata: output.ata, cri: output.cri, tec: output.tec, def: output.def, tat: output.tat },
          raw_stats:      totalStats,
          engine_version: "v25-ts",
          data_source:    "mergeSeasonRows(live + player_stats)",
        },
        updated_at: new Date().toISOString(),
      }]);

    if (insertErr) throw insertErr;

    return {
      success: true, playerId, seasonYear,
      ata: output.ata, cri: output.cri, tec: output.tec, def: output.def, tat: output.tat,
      matches: output.matches, minutes: output.minutes,
    };
  } catch (e) {
    console.error("[recalculatePlayerScores] error", e);
    return { success: false, playerId, seasonYear, ata: 0, cri: 0, tec: 0, def: 0, tat: 0,
             matches: 0, minutes: 0, error: String(e) };
  }
}

/**
 * Recalcula todos os jogadores em lotes para não estourar memória/timeout.
 * Retorna progresso via callback onProgress(done, total).
 */
export async function recalculateAllPlayerScores(
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; results: RecalculateResult[]; error?: string }> {
  try {
    // Coleta todos (player_id, season_year) distintos com jogos
    const [{ data: liveSeasons }, { data: psSeasons }] = await Promise.all([
      supabase.from("match_players").select(`
        player_id,
        match:matches!inner (season_year)
      `).neq("is_removed", true).in("match.status", ["finished", "applied"]),
      supabase.from("player_stats").select("player_id, season_year"),
    ]);

    const combos = new Map<string, { playerId: string; seasonYear: number }>();
    for (const row of (liveSeasons ?? []) as any[]) {
      if (!row.match) continue;
      const key = `${row.player_id}_${row.match.season_year}`;
      combos.set(key, { playerId: row.player_id, seasonYear: row.match.season_year });
    }
    for (const row of (psSeasons ?? []) as any[]) {
      const key = `${row.player_id}_${row.season_year}`;
      combos.set(key, { playerId: row.player_id, seasonYear: row.season_year });
    }

    const entries = Array.from(combos.values());
    const total = entries.length;
    const CHUNK = 5;
    const results: RecalculateResult[] = [];

    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const chunkResults = await Promise.all(
        chunk.map(({ playerId, seasonYear }) => recalculatePlayerScores(playerId, seasonYear))
      );
      results.push(...chunkResults);
      onProgress?.(Math.min(i + CHUNK, total), total);
    }

    return { success: true, results };
  } catch (e) {
    console.error("[recalculateAllPlayerScores] error", e);
    return { success: false, results: [], error: String(e) };
  }
}
