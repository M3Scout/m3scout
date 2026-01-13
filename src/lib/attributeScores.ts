/**
 * Attribute Scores Module
 * 
 * Provides functions to calculate, fetch, and manage player attribute scores
 * stored in the player_attribute_scores table.
 */

import { supabase } from "@/integrations/supabase/client";

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
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as AttributeScoresData;
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
 * Calculate and persist attribute scores for a specific player/competition/season
 */
export async function calculateAndSaveAttributeScores(
  playerId: string,
  competitionId: string,
  seasonYear: number
): Promise<{ success: boolean; scores?: AttributeScoresResult; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("calculate_player_attribute_scores", {
      p_player_id: playerId,
      p_competition_id: competitionId,
      p_season_year: seasonYear,
    });

    if (error) {
      console.error("[ATTR_SCORES] RPC error:", error);
      return { success: false, error: error.message };
    }

    // Type assert the JSON response
    const result = data as Record<string, unknown> | null;

    if (result?.error) {
      console.error("[ATTR_SCORES] Calculation error:", result.error);
      return { success: false, error: String(result.error) };
    }

    const confidence = (result?.confidence as number) ?? 0;
    return {
      success: true,
      scores: {
        ata: (result?.ata as number) ?? 0,
        tec: (result?.tec as number) ?? 0,
        def: (result?.def as number) ?? 0,
        tat: (result?.tat as number) ?? 0,
        cri: (result?.cri as number) ?? 0,
        confidence,
        confidenceLevel: getConfidenceLevelFromValue(confidence),
      },
    };
  } catch (e) {
    console.error("[ATTR_SCORES] Exception:", e);
    return { success: false, error: String(e) };
  }
}

/**
 * Recalculate all attribute scores for a player (all competitions/seasons)
 */
export async function recalculatePlayerAllAttributes(
  playerId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("recalculate_player_all_attributes", {
      p_player_id: playerId,
    });

    if (error) {
      console.error("[ATTR_SCORES] Recalculate error:", error);
      return { success: false, count: 0, error: error.message };
    }

    const count = Array.isArray(data) ? data.length : 0;
    console.log(`[ATTR_SCORES] Recalculated ${count} rows for player ${playerId}`);
    
    return { success: true, count };
  } catch (e) {
    console.error("[ATTR_SCORES] Exception:", e);
    return { success: false, count: 0, error: String(e) };
  }
}

/**
 * Recalculate all players' attribute scores
 */
export async function recalculateAllAttributeScores(): Promise<{
  success: boolean;
  players: { player_id: string; player_name: string; rows_processed: number }[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("recalculate_all_attribute_scores");

    if (error) {
      console.error("[ATTR_SCORES] Global recalculate error:", error);
      return { success: false, players: [], error: error.message };
    }

    const players = (data || []) as { player_id: string; player_name: string; rows_processed: number }[];
    console.log(`[ATTR_SCORES] Recalculated scores for ${players.length} players`);
    
    return { success: true, players };
  } catch (e) {
    console.error("[ATTR_SCORES] Exception:", e);
    return { success: false, players: [], error: String(e) };
  }
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
