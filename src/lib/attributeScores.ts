/**
 * Attribute Scores Module
 * 
 * Provides functions to calculate, fetch, and manage player attribute scores
 * stored in the player_attribute_scores table.
 */

import { supabase } from "@/integrations/supabase/client";
import { recalculatePlayerScores, recalculateAllPlayerScores } from "@/lib/recalculatePlayerScores";

export interface AttributeScoresData {
  id: string;
  player_id: string;
  competition_id: string;
  season_year: number;
  ata_score_100: number | null;
  tec_score_100: number | null;
  def_score_100: number | null;
  tat_score_100: number | null;
  cri_score_100: number | null;
  attr_confidence: number | null;
  details: AttributeScoreDetails | null;
  updated_at: string;
}

export interface AttributeScoreDetails {
  minutes: number;
  matches: number;
  per90: Record<string, number>;
  ratios: Record<string, number>;
  raw_scores: Record<string, number>;
  final_scores: {
    ata: number;
    tec: number;
    def: number;
    tat: number;
    cri: number;
  };
  caps: Record<string, number>;
}

export interface AttributeScoresResult {
  ata: number;
  tec: number;
  def: number;
  tat: number;
  cri: number;
  confidence: number;
  confidenceLevel: "none" | "low" | "medium" | "high";
}

/**
 * Get confidence level label from numeric confidence
 */
export function getConfidenceLevelFromValue(confidence: number): "none" | "low" | "medium" | "high" {
  if (confidence < 0.2) return "none";
  if (confidence < 0.5) return "low";
  if (confidence < 1.0) return "medium";
  return "high";
}

/**
 * Fetch attribute scores for a specific player/competition/season
 */
export async function fetchAttributeScores(
  playerId: string,
  competitionId: string,
  seasonYear: number
): Promise<AttributeScoresData | null> {
  const { data, error } = await supabase
    .from("player_attribute_scores")
    .select("*")
    .eq("player_id", playerId)
    .eq("competition_id", competitionId)
    .eq("season_year", seasonYear)
    .limit(1);

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] ?? null : null;
  return row as unknown as AttributeScoresData | null;
}

/**
 * Fetch all attribute scores for a player (all competitions/seasons)
 */
export async function fetchPlayerAllAttributeScores(
  playerId: string
): Promise<AttributeScoresData[]> {
  const { data, error } = await supabase
    .from("player_attribute_scores")
    .select("*")
    .eq("player_id", playerId)
    .order("season_year", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as unknown as AttributeScoresData[];
}

/**
 * Calculate and persist attribute scores for a specific player/season.
 * Uses the TypeScript pipeline (mergeSeasonRows + calculateAttributeScores).
 * competitionId parameter kept for backwards compatibility but ignored
 * (scores are computed across all competitions for the year).
 */
export async function calculateAndSaveAttributeScores(
  playerId: string,
  _competitionId: string,
  seasonYear: number
): Promise<{ success: boolean; scores?: AttributeScoresResult; error?: string }> {
  const result = await recalculatePlayerScores(playerId, seasonYear);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const confidence = result.minutes > 0 ? Math.min(1, result.minutes / 900) : 0;
  return {
    success: true,
    scores: {
      ata: result.ata, tec: result.tec, def: result.def, tat: result.tat, cri: result.cri,
      confidence,
      confidenceLevel: getConfidenceLevelFromValue(confidence),
    },
  };
}

/**
 * Recalculate attribute scores for a player across all seasons.
 */
export async function recalculatePlayerAllAttributes(
  playerId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: liveSeasons } = await supabase
      .from("match_players")
      .select("match:matches!inner(season_year)")
      .eq("player_id", playerId)
      .neq("is_removed", true)
      .in("match.status", ["finished", "applied"]);

    const { data: psSeasons } = await supabase
      .from("player_stats")
      .select("season_year")
      .eq("player_id", playerId);

    const years = new Set<number>();
    for (const r of (liveSeasons ?? []) as any[]) if (r.match?.season_year) years.add(r.match.season_year);
    for (const r of (psSeasons ?? [])) years.add(r.season_year);

    const results = await Promise.all(
      Array.from(years).map(yr => recalculatePlayerScores(playerId, yr))
    );
    const count = results.filter(r => r.success).length;
    return { success: true, count };
  } catch (e) {
    console.error("[ATTR_SCORES] Exception:", e);
    return { success: false, count: 0, error: String(e) };
  }
}

/**
 * Recalculate all players' attribute scores.
 * Uses the TypeScript pipeline in chunks of 5 to avoid memory/timeout issues.
 */
export async function recalculateAllAttributeScores(
  onProgress?: (done: number, total: number) => void
): Promise<{
  success: boolean;
  players: { player_id: string; player_name: string; rows_processed: number }[];
  error?: string;
}> {
  const { success, results, error } = await recalculateAllPlayerScores(onProgress);
  const players = results.map(r => ({
    player_id: r.playerId,
    player_name: r.playerId,
    rows_processed: r.success ? 1 : 0,
  }));
  return { success, players, error };
}

/**
 * Get aggregated attribute scores for a player (weighted average across all competitions)
 */
export async function getAggregatedAttributeScores(
  playerId: string,
  seasonFilter?: number
): Promise<AttributeScoresResult | null> {
  let query = supabase
    .from("player_attribute_scores")
    .select("*")
    .eq("player_id", playerId);

  if (seasonFilter) {
    query = query.eq("season_year", seasonFilter);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  // Weight by confidence (minutes played)
  let totalWeight = 0;
  let weightedAta = 0;
  let weightedTec = 0;
  let weightedDef = 0;
  let weightedTat = 0;
  let weightedCri = 0;

  for (const row of data) {
    const typedRow = row as unknown as AttributeScoresData;
    const weight = typedRow.attr_confidence ?? 0.1;
    totalWeight += weight;
    weightedAta += (typedRow.ata_score_100 ?? 50) * weight;
    weightedTec += (typedRow.tec_score_100 ?? 50) * weight;
    weightedDef += (typedRow.def_score_100 ?? 50) * weight;
    weightedTat += (typedRow.tat_score_100 ?? 50) * weight;
    weightedCri += (typedRow.cri_score_100 ?? 50) * weight;
  }

  if (totalWeight <= 0) {
    return null;
  }

  const avgConfidence = totalWeight / data.length;

  return {
    ata: weightedAta / totalWeight,
    tec: weightedTec / totalWeight,
    def: weightedDef / totalWeight,
    tat: weightedTat / totalWeight,
    cri: weightedCri / totalWeight,
    confidence: avgConfidence,
    confidenceLevel: getConfidenceLevelFromValue(avgConfidence),
  };
}

/**
 * Ensure attribute scores exist for all player stats, calculating if missing
 */
export async function ensureAttributeScoresExist(playerId: string): Promise<void> {
  // Fetch player_stats rows with competition_id
  const { data: statsRows, error: statsError } = await supabase
    .from("player_stats")
    .select("player_id, competition_id, season_year, minutes")
    .eq("player_id", playerId)
    .not("competition_id", "is", null)
    .gt("minutes", 0);

  if (statsError || !statsRows || statsRows.length === 0) {
    return;
  }

  // Fetch existing attribute scores
  const { data: existingScores } = await supabase
    .from("player_attribute_scores")
    .select("competition_id, season_year")
    .eq("player_id", playerId);

  const existingSet = new Set(
    (existingScores || []).map((s) => `${s.competition_id}-${s.season_year}`)
  );

  // Calculate missing scores
  const promises: Promise<unknown>[] = [];
  for (const row of statsRows) {
    const key = `${row.competition_id}-${row.season_year}`;
    if (!existingSet.has(key) && row.competition_id) {
      promises.push(
        calculateAndSaveAttributeScores(playerId, row.competition_id, row.season_year)
      );
    }
  }

  if (promises.length > 0) {
    console.log(`[ATTR_SCORES] Calculating ${promises.length} missing score rows for player ${playerId}`);
    await Promise.all(promises);
  }
}
